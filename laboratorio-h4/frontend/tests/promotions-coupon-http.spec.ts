// Explicit HTTP fixtures, not homologation of G7 or Catalog services.
import { expect, test, type Page } from "@playwright/test";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import { createHttpPromotionServices } from "../src/features/promotions/adapters/httpPromotionServices";
import type { CouponInput } from "../src/features/promotions/services/couponRepository";

const parent = {
  promotionId: "parent", nombre: "Promoción actual", modalidad: "CUPON",
  estado: "ACTIVO", tipoDescuento: "PORCENTAJE", valor: 10, prioridad: 1,
  validFrom: "2026-10-01T00:00:21.123Z", validUntil: "2026-12-01T00:00:22.456Z",
  alcance: { productIds: ["P"], skus: [] }, canalesHabilitados: ["MARKETPLACE"],
  politicaCombinacion: { ofertaPricing: false, promocionAutomatica: false, cupon: false },
  puedeCambiarModalidad: false,
};
const coupon = {
  cuponId: "coupon", codigo: "CODE", promocionId: "parent", estado: "INACTIVO",
  politicaCancelacion: "NO_RESTAURAR", usosGlobalesConsumidos: 2,
  maxUsosGlobal: 10, maxUsosPorCliente: null, montoMinimo: null, usosDisponibles: 8,
  createdAt: parent.validFrom, updatedAt: parent.validUntil,
};
const input: CouponInput = {
  code: "CODE", promotionId: "parent", status: "inactive", globalLimit: 10,
  customerLimit: null, minimumAmount: null, cancellationPolicy: "keep",
};
const signal = () => new AbortController().signal;
const pageDto = (items: unknown[]) => ({ items, meta: { pagina: 1, tamanio: 100, total: items.length } });
const json = (response: ServerResponse, body: unknown, status = 200) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};
async function fixture(
  respond: (request: IncomingMessage, response: ServerResponse) => void,
  work: (api: ReturnType<typeof createHttpPromotionServices>, calls: string[]) => Promise<void>,
) {
  const calls: string[] = [];
  const server = createServer((request, response) => {
    calls.push(`${request.method} ${request.url}`);
    respond(request, response);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing fixture port");
  try {
    await work(createHttpPromotionServices({
      gatewayOrigin: `http://127.0.0.1:${address.port}`,
      getAccessToken: async () => "synthetic-coupon-user",
    }), calls);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
}
const writes = ["create", "update", "activate", "deactivate"] as const;
function mutate(api: ReturnType<typeof createHttpPromotionServices>, action: typeof writes[number]) {
  if (action === "create") return api.coupons.create(input, signal());
  if (action === "update") return api.coupons.update("coupon", input, signal());
  return api.coupons.changeStatus("coupon", action === "activate" ? "active" : "inactive", signal());
}

for (const action of writes) {
  for (const failure of [503, "timeout", 404] as const) {
    test(`confirmed coupon ${action} survives promotion GET ${failure} without replay`, async () => {
      await fixture((request, response) => {
        if (request.method !== "GET")
          json(response, { ...coupon, estado: action === "activate" ? "ACTIVO" : "INACTIVO" }, action === "create" ? 201 : 200);
        else if (failure !== "timeout") json(response, {}, failure);
      }, async (api, calls) => {
        const result = await mutate(api, action);
        expect(result).toMatchObject({
          id: "coupon", code: "CODE", consumedUses: 2, remainingUses: 8,
          status: action === "activate" ? "active" : "inactive",
          promotion: null, relatedDataUnavailable: true,
        });
        expect(calls).toHaveLength(2);
        expect(calls[0]).toBe(action === "create" ? "POST /api/v1/cupones" :
          action === "update" ? "PATCH /api/v1/cupones/coupon" :
          `POST /api/v1/cupones/coupon/${action === "activate" ? "activar" : "desactivar"}`);
        expect(calls[1]).toBe("GET /api/v1/promociones/parent");
      });
    });
  }
}
for (const failure of ["invalid DTO", "invalid date", "invalid limit", "write 503", "write timeout"] as const) {
  test(`unconfirmed ${failure} remains unknown and never reads enrichment or replays`, async () => {
    await fixture((_request, response) => {
      if (failure === "invalid DTO") json(response, { cuponId: "coupon" }, 201);
      else if (failure === "invalid date") json(response, { ...coupon, updatedAt: "invalid" }, 201);
      else if (failure === "invalid limit") json(response, { ...coupon, maxUsosGlobal: 1.5 }, 201);
      else if (failure === "write 503") json(response, {}, 503);
    }, async (api, calls) => {
      await expect(api.coupons.create(input, signal())).rejects.toMatchObject({ kind: "unknown" });
      expect(calls).toEqual(["POST /api/v1/cupones"]);
    });
  });
}
test("100 coupons share one promotion promise; the next list reads current data again", async () => {
  let name = "Antes";
  const rows = Array.from({ length: 100 }, (_, i) => ({ ...coupon, cuponId: `coupon-${i}` }));
  await fixture((request, response) => {
    if (request.url?.startsWith("/api/v1/cupones?")) json(response, pageDto(rows));
    else json(response, { ...parent, nombre: name });
  }, async (api, calls) => {
    for (const label of ["Antes", "Después"]) {
      name = label;
      const result = await api.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal());
      expect(result.items).toHaveLength(100);
      expect(result.items.every(row => row.promotion?.name === label)).toBe(true);
      expect(result.items[0]?.promotion?.validFrom).toBe(parent.validFrom);
    }
    expect(calls.filter(call => call === "GET /api/v1/promociones/parent")).toHaveLength(2);
    expect(calls).toHaveLength(4);
  });
});
test("multiple promotions are read once each with at most four simultaneous GETs", async () => {
  let active = 0, peak = 0;
  const ids = Array.from({ length: 12 }, (_, i) => `parent-${i}`);
  const rows = Array.from({ length: 100 }, (_, i) => ({ ...coupon, cuponId: `coupon-${i}`, promocionId: ids[i % ids.length] }));
  await fixture((request, response) => {
    if (request.url?.startsWith("/api/v1/cupones?")) return json(response, pageDto(rows));
    const id = request.url!.split("/").at(-1)!;
    peak = Math.max(peak, ++active);
    setTimeout(() => { active--; json(response, { ...parent, promotionId: id, nombre: id }); }, 40);
  }, async (api, calls) => {
    const result = await api.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal());
    expect(result.items.map(row => row.promotion?.name)).toEqual(rows.map(row => row.promocionId));
    expect(peak).toBe(4);
    for (const id of ids) expect(calls.filter(call => call === `GET /api/v1/promociones/${id}`)).toHaveLength(1);
    expect(calls).toHaveLength(13);
  });
});
for (const status of [401, 403]) {
  test(`shared promotion GET ${status} rejects the entire list preserving error classification`, async () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ ...coupon, cuponId: `coupon-${i}` }));
    await fixture((request, response) => {
      if (request.url?.startsWith("/api/v1/cupones?")) json(response, pageDto(rows));
      else json(response, {}, status);
    }, async (api, calls) => {
      await expect(api.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal())).rejects.toMatchObject({
        kind: status === 401 ? "session" : status === 403 ? "forbidden" : "unavailable",
      });
      expect(calls).toHaveLength(2);
    });
  });
}
for (const invalid of ["coupon", "page"] as const) {
  test(`invalid coupon list ${invalid} is rejected before any enrichment`, async () => {
    await fixture((_request, response) => json(response, invalid === "coupon"
      ? pageDto([{ cuponId: "coupon" }])
      : { ...pageDto([coupon]), meta: { pagina: 0, total: 1 } }), async (api, calls) => {
      await expect(api.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal())).rejects.toMatchObject({ kind: "unavailable" });
      expect(calls).toHaveLength(1);
    });
  });
}
for (const status of [404, 503, "timeout"] as const) {
  test(`shared promotion GET ${status} preserves confirmed coupons with a warning and no cache`, async () => {
    let fail = true;
    const rows = Array.from({ length: 100 }, (_, i) => ({ ...coupon, cuponId: `coupon-${i}` }));
    await fixture((request, response) => {
      if (request.url?.startsWith("/api/v1/cupones?")) json(response, pageDto(rows));
      else if (!fail) json(response, parent);
      else if (status !== "timeout") json(response, {}, status);
    }, async (api, calls) => {
      const query = { status: "all", page: 1, pageSize: 100 } as const;
      const result = await api.coupons.list(query, signal());
      expect(result.total).toBe(100);
      expect(result.items).toHaveLength(100);
      expect(result.items.every(row => row.promotion === null && row.relatedDataUnavailable)).toBe(true);
      expect(result.items[0]).toMatchObject({ code: "CODE", status: "inactive", consumedUses: 2 });
      expect(calls).toHaveLength(2);
      fail = false;
      const current = await api.coupons.list(query, signal());
      expect(current.items.every(row => row.promotion?.name === parent.nombre && !row.relatedDataUnavailable)).toBe(true);
      expect(calls).toHaveLength(4);
    });
  });
}
test("mixed promotion reads keep successful enrichment and degrade only affected rows", async () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ ...coupon, cuponId: `coupon-${i}`, promocionId: `parent-${i % 12}` }));
  let active = 0, peak = 0;
  await fixture((request, response) => {
    if (request.url?.startsWith("/api/v1/cupones?")) return json(response, pageDto(rows));
    const id = request.url!.split("/").at(-1)!;
    peak = Math.max(peak, ++active);
    setTimeout(() => { active--; json(response, id === "parent-3" ? {} : { ...parent, promotionId: id }, id === "parent-3" ? 503 : 200); }, 30);
  }, async (api, calls) => {
    const result = await api.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal());
    expect(peak).toBe(4);
    expect(calls).toHaveLength(13);
    expect(result.items.every(row => row.promotionId === "parent-3" ? row.relatedDataUnavailable && row.promotion === null : row.promotion?.name === parent.nombre)).toBe(true);
  });
});
test("coupon list displays confirmed rows and a visible warning after related 503", async ({ page }) => {
  const html = await (await page.request.get("/tests/harness/promotions-http.html")).text();
  await page.addInitScript(() => { window.__promotionsHttpTest = { token: "synthetic-list-user" }; });
  await page.route("**/cupones", route => route.request().resourceType() === "document" ? route.fulfill({ contentType: "text/html", body: html }) : route.fallback());
  await page.route("**/api/v1/**", route => route.fulfill(new URL(route.request().url()).pathname === "/api/v1/cupones" ? { json: pageDto([coupon]) } : { status: 503, json: {} }));
  await page.goto("/cupones");
  await expect(page.getByText("Datos relacionados no disponibles", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("CODE");
  await expect(page.getByRole("table")).toContainText("No disponible");
  await expect(page.getByRole("link", { name: "Ver detalle de CODE", exact: true })).toBeVisible();
});
test("canceling a list aborts four active requests and never sends queued promotion GETs", async () => {
  const controller = new AbortController();
  let started = 0;
  const rows = Array.from({ length: 12 }, (_, i) => ({ ...coupon, cuponId: `coupon-${i}`, promocionId: `parent-${i}` }));
  await fixture((request, response) => {
    if (request.url?.startsWith("/api/v1/cupones?")) json(response, pageDto(rows));
    else if (++started === 4) controller.abort();
  }, async (api, calls) => {
    await expect(api.coupons.list({ status: "all", page: 1, pageSize: 100 }, controller.signal)).rejects.toMatchObject({ kind: "unavailable" });
    expect(started).toBe(4);
    expect(calls).toHaveLength(5);
  });
});

async function browserFixture(page: Page) {
  const html = await (await page.request.get("/tests/harness/promotions-http.html")).text();
  await page.addInitScript(() => { window.__promotionsHttpTest = { token: "synthetic-coupon-user" }; });
  await page.route("**/*", route => {
    const req = route.request();
    if (req.resourceType() === "document" && new URL(req.url()).pathname.startsWith("/cupones/"))
      return route.fulfill({ contentType: "text/html", body: html });
    return route.fallback();
  });
  let writes = 0;
  await page.route("**/api/v1/**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      writes++;
      return route.fulfill({ status: path === "/api/v1/cupones" ? 201 : 200, json: { ...coupon, estado: path.endsWith("/activar") ? "ACTIVO" : "INACTIVO" } });
    }
    if (path === "/api/v1/promociones/administracion") return route.fulfill({ json: pageDto([parent]) });
    if (path.startsWith("/api/v1/promociones/")) return route.fulfill(writes ? { status: 503, json: {} } : { json: parent });
    return route.fulfill({ json: coupon });
  });
  return () => writes;
}
for (const action of ["create", "update", "activate"] as const) {
  test(`coupon UI ${action}: confirmed result and warning remain in component memory after enrichment fails`, async ({ page }, info) => {
    const writes = await browserFixture(page);
    await page.goto(action === "create" ? "/cupones/nuevo" : action === "update" ? "/cupones/coupon/editar" : "/cupones/coupon");
    if (action === "create") {
      await page.getByLabel("Código del cupón", { exact: true }).fill("CODE");
      await page.getByRole("combobox", { name: "Promoción asociada", exact: true }).click();
      await page.getByRole("option", { name: parent.nombre, exact: true }).click();
      await page.getByRole("combobox", { name: "Estado inicial", exact: true }).click();
      await page.getByRole("option", { name: "Inactivo", exact: true }).click();
      await page.getByRole("radio", { name: "No restaurar uso al cancelar", exact: true }).check();
      await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
    } else if (action === "update") {
      await page.getByLabel("Límite global", { exact: true }).fill("10");
      await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Activar cupón", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Activar cupón", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await expect(page.getByText("Datos relacionados no disponibles", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cupón — CODE", exact: true })).toBeVisible();
    await expect(page.getByText(action === "activate" ? "Estado actualizado" : "Cupón guardado", { exact: true })).toBeVisible();
    await expect(page.getByText("Resultado sin confirmar", { exact: true })).toHaveCount(0);
    expect(writes()).toBe(1);
    expect(await page.evaluate(() => JSON.stringify(history.state))).not.toContain('"cuponId"');
    expect(await page.evaluate(() => JSON.stringify(history.state))).not.toContain('"confirmedCoupon"');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
    await page.screenshot({ path: info.outputPath(`confirmed-${action}-warning-1440.png`), fullPage: true });
  });
}
