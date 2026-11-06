// Explicit HTTP fixtures verify the published DTOs and failure handling.
// They do not certify Catalog deployment, G7 grants or backend reference checks.
import { test, expect, type Page } from "@playwright/test";
import { createServer, type IncomingMessage } from "node:http";
import { once } from "node:events";
import { createHttpPromotionServices } from "../src/features/promotions/adapters/httpPromotionServices";

const simple = {
  product_id: "product-simple",
  slug: "zapatilla",
  name: "Zapatilla HTTP",
  categoria_id: "category-sport",
  tipo_producto_id: "type-shoe",
  marca_id: "brand-test",
  tiene_variantes: false,
  sku_base: "SKU-SIMPLE",
};
const variable = {
  ...simple,
  product_id: "product / variants",
  slug: "camiseta",
  name: "Camiseta HTTP",
  tiene_variantes: true,
  sku_base: null,
};
const variants = [
  { variant_id: "variant-one", sku: "SKU-M", status: "ACTIVA" },
  { variant_id: "variant-two", sku: "SKU-L", status: "ACTIVA" },
];
const categories = [
  {
    categoriaId: "category-sport",
    nombre: "Deporte HTTP",
    estado: "ACTIVO",
    version: 1,
  },
  {
    categoriaId: "category-old",
    nombre: "Archivada HTTP",
    estado: "INACTIVO",
    version: 2,
  },
];
function pageBody(
  items: unknown[],
  page = 1,
  size = items.length || 100,
  total = items.length,
  nested = false,
) {
  const meta = {
    pagina: page,
    tamanio: size,
    total,
    totalPaginas: Math.ceil(total / size),
  };
  return nested ? { items, meta } : { items, ...meta };
}
function dto(url: URL, paginated = false): unknown {
  const current = Number(url.searchParams.get("pagina"));
  const slice = (rows: unknown[], nested: boolean) =>
    paginated
      ? pageBody(
          rows.slice(current - 1, current),
          current,
          1,
          rows.length,
          nested,
        )
      : pageBody(rows, 1, 100, rows.length, nested);
  if (url.pathname === "/api/v1/productos")
    return slice([simple, variable], false);
  if (url.pathname.includes("/variantes")) return slice(variants, true);
  if (url.pathname === "/api/v1/categorias/administracion")
    return slice(categories, true);
  throw new Error("Unexpected fixture operation");
}
async function fixture(
  respond: (url: URL) => { body?: unknown; status?: number; location?: string },
  work: (
    origin: string,
    requests: {
      url: URL;
      method: string;
      headers: IncomingMessage["headers"];
    }[],
  ) => Promise<void>,
) {
  const requests: {
    url: URL;
    method: string;
    headers: IncomingMessage["headers"];
  }[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url!, "http://fixture.invalid");
    requests.push({ url, method: request.method!, headers: request.headers });
    const result = respond(url);
    response.writeHead(result.status ?? 200, {
      "content-type": "application/json",
      ...(result.location ? { location: result.location } : {}),
    });
    response.end(JSON.stringify(result.body ?? {}));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing port");
  try {
    await work(`http://127.0.0.1:${address.port}`, requests);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
}
const apiFor = (
  origin: string,
  token: string | null = "synthetic-catalog-user",
) =>
  createHttpPromotionServices({
    gatewayOrigin: origin,
    getAccessToken: async () => token,
  });

function retainedDto(url: URL, inactive: boolean) {
  const state = url.searchParams.get("estado");
  if (url.pathname === "/api/v1/productos")
    return pageBody(state === "INACTIVO"
      ? inactive ? [simple] : []
      : inactive ? [variable] : [simple, variable]);
  if (url.pathname.includes("/variantes"))
    return pageBody(state === "INACTIVA"
      ? inactive ? [{ ...variants[1], status: "INACTIVA" }] : []
      : inactive ? [variants[0]] : variants, 1, 100, state === "INACTIVA" ? (inactive ? 1 : 0) : (inactive ? 1 : 2), true);
  if (url.pathname === "/api/v1/categorias/administracion") return pageBody(categories, 1, 100, categories.length, true);
  throw new Error("Unexpected retained fixture operation");
}

test("Catalog HTTP retain: products/SKUs deactivated after creation remain readable only as existing associations", async () => {
  let inactive = false;
  await fixture(url => ({ body: retainedDto(url, inactive) }), async (origin, requests) => {
    const api = apiFor(origin), signal = new AbortController().signal;
    expect((await api.catalog.products(signal)).every(row => row.active)).toBe(true);
    inactive = true;
    const result = await api.catalog.products(signal, { productIds: [simple.product_id], skus: [simple.sku_base, "SKU-L"] });
    expect(result.find(row => row.id === simple.product_id)).toMatchObject({ name: simple.name, active: false, skus: [{ sku: simple.sku_base, active: false }] });
    expect(result.find(row => row.id === variable.product_id)?.skus).toContainEqual({ sku: "SKU-L", label: "SKU-L", active: false });
    expect(result.find(row => row.id === variable.product_id)?.skus).toContainEqual({ sku: "SKU-M", label: "SKU-M", active: true });
    const choices = await api.catalog.products(signal);
    expect(choices.map(row => row.id)).toEqual([variable.product_id]);
    expect(choices[0]?.skus.map(row => row.sku)).toEqual(["SKU-M"]);
    expect(requests.some(r => r.url.searchParams.get("estado") === "INACTIVO")).toBe(true);
    expect(requests.some(r => r.url.searchParams.get("estado") === "INACTIVA")).toBe(true);
    expect(requests.every(r => r.method === "GET")).toBe(true);
  });
});
for (const retain of [{ productIds: ["missing-product"], skus: [] }, { productIds: [], skus: ["missing-sku"] }]) {
  test(`Catalog HTTP: unresolved historical ${JSON.stringify(retain)} fails explicitly without fabricated references`, async () => {
    await fixture(url => ({ body: retainedDto(url, true) }), async origin => {
      await expect(apiFor(origin).catalog.products(new AbortController().signal, retain)).rejects.toMatchObject({ kind: "unavailable" });
    });
  });
}
for (const skuBase of [null, undefined]) {
  test(`Catalog HTTP retain: unrelated inactive simple product with ${skuBase} SKU cannot block a retained variant`, async () => {
    const unrelated = { ...simple, product_id: "unrelated", sku_base: skuBase };
    await fixture(url => ({ body: url.pathname === "/api/v1/productos" && url.searchParams.get("estado") === "INACTIVO"
      ? pageBody([unrelated]) : retainedDto(url, true) }), async (origin, requests) => {
      const products = await apiFor(origin).catalog.products(new AbortController().signal, { productIds: [], skus: ["SKU-L"] });
      expect(products.map(product => product.id)).toEqual([variable.product_id]);
      expect(products[0]?.skus).toContainEqual({ sku: "SKU-L", label: "SKU-L", active: false });
      expect(requests.every(request => request.method === "GET")).toBe(true);
    });
  });
  test(`Catalog HTTP retain: historical product ID without ${skuBase} SKU keeps identity without inventing a SKU`, async () => {
    const historical = { ...simple, sku_base: skuBase };
    await fixture(url => ({ body: url.pathname === "/api/v1/productos" && url.searchParams.get("estado") === "INACTIVO"
      ? pageBody([historical]) : retainedDto(url, true) }), async origin => {
      const products = await apiFor(origin).catalog.products(new AbortController().signal, { productIds: [simple.product_id], skus: [] });
      expect(products.find(product => product.id === simple.product_id)).toEqual({
        id: simple.product_id, name: simple.name, categoryId: simple.categoria_id, active: false, skus: [],
      });
      await expect(apiFor(origin).catalog.products(new AbortController().signal, {
        productIds: [simple.product_id], skus: [simple.sku_base],
      })).rejects.toMatchObject({ kind: "unavailable" });
    });
  });
}
for (const status of [401, 403, 503]) {
  test(`Catalog HTTP retain: inactive lookup ${status} propagates without silently dropping associations`, async () => {
    await fixture(url => url.searchParams.get("estado") === "INACTIVO" ? { status } : { body: retainedDto(url, true) }, async origin => {
      await expect(apiFor(origin).catalog.products(new AbortController().signal, { productIds: [simple.product_id], skus: [] })).rejects.toMatchObject({ kind: status === 401 ? "session" : status === 403 ? "forbidden" : "unavailable" });
    });
  });
}

test("Catalog HTTP: all product/variant/category pages retain canonical IDs and sellable SKUs", async () => {
  await fixture(
    (url) => ({ body: dto(url, true) }),
    async (origin, requests) => {
      const api = apiFor(origin);
      const signal = new AbortController().signal;
      expect(await api.catalog.products(signal)).toEqual([
        {
          id: simple.product_id,
          name: simple.name,
          categoryId: simple.categoria_id,
          active: true,
          skus: [{ sku: simple.sku_base, label: simple.name, active: true }],
        },
        {
          id: variable.product_id,
          name: variable.name,
          categoryId: variable.categoria_id,
          active: true,
          skus: variants.map((v) => ({
            sku: v.sku,
            label: v.sku,
            active: true,
          })),
        },
      ]);
      expect(await api.catalog.categories(signal)).toEqual([
        {
          id: categories[0]!.categoriaId,
          name: categories[0]!.nombre,
          active: true,
        },
      ]);
      expect(requests).toHaveLength(6);
      expect(
        requests.some((r) =>
          r.url.pathname.includes("product%20%2F%20variants/variantes"),
        ),
      ).toBe(true);
      for (const request of requests) {
        expect(request.method).toBe("GET");
        expect(request.headers.authorization).toBe(
          "Bearer synthetic-catalog-user",
        );
        expect(request.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/i);
        expect(request.url.searchParams.has("canal")).toBe(false);
        expect(request.url.searchParams.get("tamanio")).toBe("100");
      }
    },
  );
});

test("Catalog HTTP: inactive variants are excluded; inactive product extension is never promoted to active", async () => {
  await fixture(
    (url) => ({
      body:
        url.pathname === "/api/v1/productos"
          ? pageBody([variable, { ...simple, status: "INACTIVO" }])
          : pageBody(
              [variants[0], { ...variants[1], status: "INACTIVA" }],
              1,
              100,
              2,
              true,
            ),
    }),
    async (origin) => {
      const result = await apiFor(origin).catalog.products(
        new AbortController().signal,
      );
      expect(result).toHaveLength(1);
      expect(result[0]?.skus.map((v) => v.sku)).toEqual(["SKU-M"]);
    },
  );
});

for (const status of [401, 403, 404, 500, 503]) {
  test(`Catalog HTTP: ${status} fails visibly without an empty/mock fallback`, async () => {
    await fixture(
      () => ({ status }),
      async (origin) => {
        const api = apiFor(origin);
        for (const read of [api.catalog.products, api.catalog.categories])
          await expect(
            read(new AbortController().signal),
          ).rejects.toMatchObject({
            kind:
              status === 401
                ? "session"
                : status === 403
                  ? "forbidden"
                  : "unavailable",
          });
      },
    );
  });
}

for (const [name, body] of [
  [
    "simple product without confirmed SKU",
    pageBody([{ ...simple, sku_base: null }]),
  ],
  ["duplicate product identity", pageBody([simple, simple])],
  ["unknown identity fields", pageBody([{ id: "wrong", sku: "invented" }])],
  ["premature empty page", pageBody([], 1, 100, 1)],
  ["wrong page", pageBody([simple], 2, 1, 1)],
] as const) {
  test(`Catalog HTTP: ${name} is unavailable, not a partial reference list`, async () => {
    await fixture(
      () => ({ body }),
      async (origin) => {
        await expect(
          apiFor(origin).catalog.products(new AbortController().signal),
        ).rejects.toMatchObject({ kind: "unavailable" });
      },
    );
  });
}

test("Catalog HTTP: duplicate sellable SKU across products rejects ambiguous references", async () => {
  await fixture(
    (url) => ({
      body:
        url.pathname === "/api/v1/productos"
          ? pageBody([simple, variable])
          : pageBody(
              [{ ...variants[0], sku: simple.sku_base }],
              1,
              100,
              1,
              true,
            ),
    }),
    async (origin) => {
      await expect(
        apiFor(origin).catalog.products(new AbortController().signal),
      ).rejects.toMatchObject({ kind: "unavailable" });
    },
  );
});

test("Catalog HTTP: missing session or aborted session lookup performs no request", async () => {
  await fixture(
    (url) => ({ body: dto(url) }),
    async (origin, requests) => {
      await expect(
        apiFor(origin, null).catalog.products(new AbortController().signal),
      ).rejects.toMatchObject({ kind: "session" });
      const controller = new AbortController();
      const api = createHttpPromotionServices({
        gatewayOrigin: origin,
        getAccessToken: async () => new Promise(() => {}),
      });
      const pending = api.catalog.categories(controller.signal);
      controller.abort();
      await expect(pending).rejects.toMatchObject({ kind: "unavailable" });
      expect(requests).toHaveLength(0);
    },
  );
});

test("Catalog HTTP: redirects cannot forward the bearer to a second origin", async () => {
  await fixture(
    () => ({ status: 302, location: "https://other.invalid/" }),
    async (origin, requests) => {
      await expect(
        apiFor(origin).catalog.categories(new AbortController().signal),
      ).rejects.toMatchObject({ kind: "unavailable" });
      expect(requests).toHaveLength(1);
    },
  );
});

async function browserFixture(page: Page) {
  const response = await page.request.get("/tests/harness/promotions-http.html");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  await page.addInitScript(() => {
    window.__promotionsHttpTest = { token: "synthetic-selector-user" };
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (
      request.resourceType() === "document" &&
      /^\/(promociones|recomendaciones)\//.test(url.pathname)
    )
      return route.fulfill({ contentType: "text/html", body: html });
    return route.fallback();
  });
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ json: dto(new URL(route.request().url())) }),
  );
}

test("MK006 HTTP selector: product/SKU selection retains the draft; denied fresh load stays blocked", async ({
  page,
}, info) => {
  await browserFixture(page);
  await page.goto("/promociones/nueva");
  await page
    .getByLabel("Nombre de la promoción", { exact: true })
    .fill("Borrador HTTP conservado");
  await page.getByRole("link", { name: /Seleccionar alcance/ }).click();
  await page
    .getByRole("checkbox", {
      name: "Producto completo: Zapatilla HTTP",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", {
      name: "SKU específico: SKU-M · SKU-M",
      exact: true,
    })
    .check();
  await expect(
    page.getByText("Datos de demostración", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirmar alcance", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1440);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("catalog-http-scope-1440.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirmar alcance", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre de la promoción", { exact: true }),
  ).toHaveValue("Borrador HTTP conservado");
  await page.getByRole("link", { name: /Seleccionar alcance/ }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Producto completo: Zapatilla HTTP",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "SKU específico: SKU-M · SKU-M",
      exact: true,
    }),
  ).toBeChecked();
  // A later mount re-reads Catalog; a revoked session must not use cached choices.
  await page
    .getByRole("link", { name: "Cancelar selección", exact: true })
    .click();
  await page.route("**/api/v1/productos?*", (route) =>
    route.fulfill({ status: 403, json: {} }),
  );
  await page.goto("/promociones/nueva/alcance");
  await expect(page.getByRole("alert")).toContainText("No tienes permiso");
  await expect(
    page.getByRole("button", { name: "Confirmar alcance", exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
});

test("MK007 HTTP selector: administrative category and recommended products keep their own IDs", async ({
  page,
}, info) => {
  await browserFixture(page);
  await page.goto("/recomendaciones/nueva/venta-cruzada");
  await page
    .getByRole("combobox", { name: "Tipo de origen", exact: true })
    .click();
  await page.getByRole("option", { name: "Categoría", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Categoría de origen", exact: true })
    .click();
  await page.getByRole("option", { name: "Deporte HTTP", exact: true }).click();
  await page.getByRole("link", { name: /Seleccionar productos/ }).click();
  await page
    .getByRole("checkbox", { name: "Camiseta HTTP", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Confirmar selección", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Categoría de origen", exact: true }),
  ).toHaveValue("Deporte HTTP");
  await expect(page.getByText("Camiseta HTTP", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1440);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("catalog-http-recommendation-1440.png"),
    fullPage: true,
  });
});
