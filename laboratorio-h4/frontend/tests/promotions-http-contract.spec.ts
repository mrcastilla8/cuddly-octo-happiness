// Explicit HTTP DTO fixtures test mapping/cancellation only. The separate Gateway
// suite verifies actual JWT/JWKS, native services and PostgreSQL persistence.
import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { once } from "node:events";
import { createHttpPromotionServices } from "../src/features/promotions/adapters/httpPromotionServices";

const parent = {
  promotionId: "parent",
  nombre: "Campaña HTTP",
  tipoDescuento: "PORCENTAJE",
  valor: 10,
  modalidad: "CUPON",
  estado: "ACTIVO",
  validFrom: "2026-10-01T00:00:21.123Z",
  validUntil: "2026-12-01T00:00:22.456Z",
  alcance: { productIds: ["P"], skus: [] },
  prioridad: 1,
  canalesHabilitados: ["MARKETPLACE", "VENTAS"],
  politicaCombinacion: {
    ofertaPricing: false,
    promocionAutomatica: false,
    cupon: false,
  },
  puedeCambiarModalidad: false,
};
async function fixture(
  work: (
    origin: string,
    requests: { path: string; body: unknown }[],
  ) => Promise<void>,
) {
  const requests: { path: string; body: unknown }[] = [];
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const part of request) body += String(part);
    requests.push({
      path: request.url!,
      body: body ? JSON.parse(body) : undefined,
    });
    response.setHeader("content-type", "application/json");
    if (request.url?.startsWith("/api/v1/cupones/"))
      response.end(
        JSON.stringify({
          cuponId: "coupon",
          codigo: "CODE",
          promocionId: "parent",
          estado: "INACTIVO",
          politicaCancelacion: "NO_RESTAURAR",
          usosGlobalesConsumidos: 0,
          createdAt: parent.validFrom,
          updatedAt: parent.validFrom,
        }),
      );
    else if (request.url?.startsWith("/api/v1/promociones/"))
      response.end(
        JSON.stringify({ ...parent, ...(body ? JSON.parse(body) : {}) }),
      );
    else if (request.url?.startsWith("/api/v1/recomendaciones/reglas/"))
      response.end(
        JSON.stringify({
          reglaId: "rule",
          nombre: "Regla",
          tipo: "CROSS_SELL",
          origen: { tipo: "PRODUCTO", id: "P" },
          prioridad: 1,
          estado: "INACTIVO",
          validFrom: parent.validFrom,
          validUntil: parent.validUntil,
          recomendados: [{ productId: "Q", orden: 1 }],
        }),
      );
    else response.writeHead(404).end("{}");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port");
  try {
    await work("http://127.0.0.1:" + address.port, requests);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
}
test("HTTP DTO: optional coupon limits remain unknown; current parent instants keep seconds", async () => {
  await fixture(async (origin) => {
    const api = createHttpPromotionServices({
      gatewayOrigin: origin,
      getAccessToken: async () => "synthetic-unit-token",
    });
    const coupon = await api.coupons.read(
      "coupon",
      new AbortController().signal,
    );
    expect(coupon).toMatchObject({
      code: "CODE",
      globalLimit: undefined,
      customerLimit: undefined,
      minimumAmount: undefined,
      remainingUses: undefined,
      consumedUses: 0,
      promotion: {
        name: parent.nombre,
        validFrom: parent.validFrom,
        validUntil: parent.validUntil,
      },
    });
  });
});
test("HTTP DTO: absent optional recommendation criterion/justification do not fabricate enrichment", async () => {
  await fixture(async (origin) => {
    const api = createHttpPromotionServices({
      gatewayOrigin: origin,
      getAccessToken: async () => "synthetic-unit-token",
    });
    const rule = await api.recommendations.read(
      "rule",
      new AbortController().signal,
    );
    expect(rule?.configuration.candidates).toEqual([
      { productId: "Q", order: "1", criterion: "", justification: "" },
    ]);
  });
});
test("PATCH sends only changed fields, preserving contractual instants with subsecond precision", async () => {
  await fixture(async (origin, requests) => {
    const api = createHttpPromotionServices({
      gatewayOrigin: origin,
      getAccessToken: async () => "synthetic-unit-token",
    });
    const signal = new AbortController().signal;
    const current = await api.campaigns.read("parent", signal);
    expect(current?.configuration.channels).toEqual(["marketplace", "sales"]);
    await api.campaigns.save(
      "parent",
      { ...current!.configuration, name: "Nueva etiqueta" },
      signal,
    );
    expect(requests.at(-1)?.body).toEqual({ nombre: "Nueva etiqueta" });
  });
});
test("canceling a hanging session callback settles without an HTTP request or fallback", async () => {
  await fixture(async (origin, requests) => {
    const controller = new AbortController();
    const api = createHttpPromotionServices({
      gatewayOrigin: origin,
      getAccessToken: async () => new Promise(() => {}),
    });
    const result = api.coupons.read("coupon", controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ kind: "unavailable" });
    expect(requests).toHaveLength(0);
  });
});
