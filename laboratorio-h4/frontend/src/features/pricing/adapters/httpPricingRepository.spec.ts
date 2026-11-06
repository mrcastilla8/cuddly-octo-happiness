import { describe, expect, it, vi } from "vitest";
import { PricingFailure, type PriceChange } from "../services/pricingModels";
import type { PriceTarget } from "../services/pricingRepository";
import {
  createHttpPricingRepository,
  type HttpPricingRepositoryDependencies,
  type PricingHttpRequest,
} from "./httpPricingRepository";
import { requestMoney } from "./httpPricingMapper";

const product: PriceTarget = {
  id: "product-target",
  label: "Producto A",
  productId: "product-a",
  kind: "product",
  referenceSku: "SKU-A",
};
const variant: Extract<PriceTarget, { kind: "variant" }> = {
  id: "variant-target",
  label: "Producto A · Azul",
  productId: "product-a",
  kind: "variant",
  sku: "SKU/A",
  productTargetId: "product-target",
};
const targets = [product, variant];

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function skuPrice(overrides: Record<string, unknown> = {}) {
  return {
    sku: variant.sku,
    precio_regular: 12.5,
    precio_oferta: null,
    currency: "COP",
    channel_id: null,
    valid_from: "2026-10-01T00:00:00.000Z",
    valid_until: null,
    price_version: 4,
    vigencia_id: "validity-4",
    origen: "SKU_OVERRIDE",
    ...overrides,
  };
}

function productPrice(overrides: Record<string, unknown> = {}) {
  return {
    product_id: product.productId,
    precio_regular: 12.5,
    precio_oferta: null,
    currency: "COP",
    channel_id: null,
    valid_from: "2026-10-01T00:00:00.000Z",
    valid_until: null,
    price_version: 3,
    ...overrides,
  };
}

function setup(
  respond: (path: string, request: PricingHttpRequest) => Promise<Response> =
    async () => jsonResponse(skuPrice()),
  options: {
    targets?: PriceTarget[];
    retailChannelId?: string;
    onUpdated?: HttpPricingRepositoryDependencies["onUpdated"];
  } = {},
) {
  const calls: { path: string; request: PricingHttpRequest }[] = [];
  const request = vi.fn(async (path: string, init: PricingHttpRequest) => {
    calls.push({ path, request: init });
    return respond(path, init);
  });
  const repository = createHttpPricingRepository({
    transport: { request },
    listCatalogTargets: async (signal) => {
      signal.throwIfAborted();
      return options.targets ?? targets;
    },
    channelIds: options.retailChannelId
      ? { retail: options.retailChannelId }
      : undefined,
    onUpdated: options.onUpdated,
  });
  return { repository, request, calls };
}

function firstCall(calls: { path: string; request: PricingHttpRequest }[]) {
  const call = calls[0];
  if (!call) throw new Error("La solicitud HTTP esperada no ocurrió.");
  return call;
}

function change(overrides: Partial<PriceChange> = {}): PriceChange {
  return {
    target: { targetId: variant.id, channel: "global" },
    version: 4,
    draft: {
      regular: "13.20",
      offer: "10.00",
      offerAction: "ELIMINAR",
      currency: "COP",
      reason: "Corrección comercial",
    },
    ...overrides,
  };
}

describe("createHttpPricingRepository", () => {
  it("falla cerrado si no recibe selección autoritativa de Catálogo", async () => {
    const request = vi.fn();
    const repository = createHttpPricingRepository({
      transport: { request },
    });

    await expect(repository.listTargets(new AbortController().signal)).rejects.toMatchObject({
      kind: "blocked_contract",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("consulta el precio base del producto y deja vacío el desglose no disponible", async () => {
    const { repository, calls } = setup(async () => jsonResponse(productPrice()));
    const result = await repository.read(
      { targetId: product.id, channel: "global" },
      new AbortController().signal,
    );

    expect(firstCall(calls).path).toBe("/api/v1/precios/productos/product-a");
    expect(firstCall(calls).request.method).toBe("GET");
    expect(result).toMatchObject({
      price: {
        id: product.id,
        regular: "12.5",
        offer: null,
        currency: "COP",
        channel: "global",
        version: 3,
        validUntil: null,
      },
      breakdown: [],
    });
  });

  it("consulta un SKU por su identidad real y canal contractual", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse(skuPrice({ channel_id: "RETAIL" })),
    );
    const result = await repository.read(
      { targetId: variant.id, channel: "retail" },
      new AbortController().signal,
    );

    expect(firstCall(calls).path).toBe("/api/v1/precios/skus/SKU%2FA?canal=RETAIL");
    expect(result?.price).toMatchObject({
      id: variant.id,
      sku: variant.sku,
      channel: "retail",
      origin: "sku",
      inherited: false,
      validityId: "validity-4",
    });
  });

  it("usa el SKU de referencia para histórico y conserva la vigencia recibida", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse(
        skuPrice({ sku: "SKU-A", origen: "PRODUCTO", vigencia_id: "validity-old" }),
      ),
    );
    const result = await repository.readHistorical(
      { targetId: product.id, channel: "global" },
      "2026-10-05T12:00:00.000Z",
      new AbortController().signal,
    );

    expect(firstCall(calls).path).toContain("/api/v1/precios/skus/SKU-A?");
    expect(firstCall(calls).path).toContain("at=2026-10-05T12%3A00%3A00.000Z");
    expect(firstCall(calls).path).not.toContain("productos/");
    expect(result).toMatchObject({
      validityId: "validity-old",
      price: { id: product.id, sku: "SKU-A", origin: "product", inherited: false },
    });
  });

  it("lee la variante exacta al preparar una edición, no la definición padre", async () => {
    const { repository, calls } = setup();
    await repository.readEditable(
      { targetId: variant.id, channel: "global" },
      new AbortController().signal,
    );

    expect(firstCall(calls).path).toBe("/api/v1/precios/skus/SKU%2FA");
  });

  it("bloquea la edición de una variante heredada para no crear un override", async () => {
    const { repository, request } = setup(async () =>
      jsonResponse(skuPrice({ origen: "PRODUCTO" })),
    );
    await expect(
      repository.readEditable(
        { targetId: variant.id, channel: "global" },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: "blocked_contract" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("envía PATCH con PrecioUpdateRequest y no reenvía la mutación", async () => {
    let responses = 0;
    const { repository, request, calls } = setup(async () =>
      jsonResponse(
        responses++ === 0
          ? skuPrice()
          : skuPrice({ precio_regular: 13.2, price_version: 5 }),
      ),
    );
    await repository.readEditable(
      { targetId: variant.id, channel: "global" },
      new AbortController().signal,
    );
    const saved = await repository.update(change(), new AbortController().signal);
    const patchCall = calls.at(-1);
    if (!patchCall) throw new Error("No se envió PATCH.");
    const sent = JSON.parse(patchCall.request.body ?? "{}");

    expect(patchCall.request.method).toBe("PATCH");
    expect(patchCall.path).toBe("/api/v1/precios/skus/SKU%2FA");
    expect(sent).toEqual({
      precioRegular: 13.2,
      accionPrecioOferta: "ELIMINAR",
      moneda: "COP",
      motivoCambio: "Corrección comercial",
      priceVersion: 4,
      channelId: null,
      precioOferta: null,
    });
    expect(saved.version).toBe(5);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("notifica la auditoría demo solo después de confirmar PATCH y no pierde el precio si falla", async () => {
    let responses = 0;
    const onUpdated = vi.fn(() => {
      throw new Error("registro simulado no disponible");
    });
    const { repository, request } = setup(
      async () =>
        jsonResponse(
          responses++ === 0
            ? skuPrice()
            : skuPrice({ precio_regular: 13.2, price_version: 5 }),
        ),
      { onUpdated },
    );
    const signal = new AbortController().signal;
    await repository.readEditable({ targetId: variant.id, channel: "global" }, signal);
    const saved = await repository.update(change(), signal);

    expect(saved.version).toBe(5);
    expect(onUpdated).toHaveBeenCalledTimes(1);
    expect(onUpdated).toHaveBeenCalledWith(
      variant,
      expect.objectContaining({ regular: "12.5", version: 4 }),
      expect.objectContaining({ regular: "13.2", version: 5 }),
      "Corrección comercial",
    );
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("no convierte Retail en un channelId inventado", async () => {
    const { repository, request } = setup(async () =>
      jsonResponse(skuPrice({ channel_id: "RETAIL" })),
    );
    const retailTarget = { targetId: variant.id, channel: "retail" as const };
    await repository.readEditable(retailTarget, new AbortController().signal);
    await expect(
      repository.update(
        change({ target: retailTarget }),
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: "blocked_contract" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("clasifica errores HTTP y solo interpreta los 404 contractuales como ausencia", async () => {
    for (const [status, code, kind] of [
      [400, "VALIDACION", "error"],
      [401, "TOKEN_INVALIDO", "unauthorized"],
      [403, "SCOPE_INSUFICIENTE", "forbidden"],
      [409, "VERSION_CONFLICT", "conflict"],
      [409, "VIGENCIA_SUPERPUESTA", "overlap"],
      [422, "PRECIO_INVALIDO", "error"],
      [500, "ERROR_INTERNO", "error"],
      [503, "SERVICIO_NO_DISPONIBLE", "error"],
    ] as const) {
      const { repository } = setup(async () =>
        jsonResponse({ status, code }, status),
      );
      await expect(
        repository.read(
          { targetId: variant.id, channel: "global" },
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ kind });
    }

    const absent = setup(async () =>
      jsonResponse({ status: 404, code: "PRECIO_NO_ENCONTRADO" }, 404),
    );
    await expect(
      absent.repository.read(
        { targetId: variant.id, channel: "global" },
        new AbortController().signal,
      ),
    ).resolves.toBeNull();

    const missingSku = setup(async () =>
      jsonResponse({ status: 404, code: "SKU_NO_ENCONTRADO" }, 404),
    );
    await expect(
      missingSku.repository.read(
        { targetId: variant.id, channel: "global" },
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(PricingFailure);
  });

  it("valida programación y meta de paginación sin perder versión ni alcance", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse({
        items: [
          {
            programacionId: "schedule-1",
            sku: variant.sku,
            tipoPrecio: "REGULAR",
            importe: 14,
            moneda: "COP",
            channelId: null,
            validFrom: "2026-11-01T00:00:00.000Z",
            validUntil: null,
            estado: "SCHEDULED",
            priceVersion: 5,
          },
        ],
        meta: { pagina: 2, tamanio: 20, total: 21, totalPaginas: 2 },
      }),
    );
    const page = await repository.listSchedules(
      variant.id,
      2,
      new AbortController().signal,
    );

    expect(firstCall(calls).path).toBe(
      "/api/v1/precios/skus/SKU%2FA/programaciones?pagina=2&tamanio=20",
    );
    expect(page).toMatchObject({
      page: 2,
      pageSize: 20,
      total: 21,
      items: [
        {
          targetId: variant.id,
          amount: "14",
          channel: "global",
          version: 5,
        },
      ],
    });
  });

  it("envía POST de programación con campos oficiales y sin versión", async () => {
    const { repository, calls } = setup(async () =>
      jsonResponse({
        programacionId: "schedule-2",
        sku: variant.sku,
        tipoPrecio: "OFERTA",
        importe: 10,
        moneda: "COP",
        channelId: null,
        validFrom: "2026-10-20T15:00:00.000Z",
        validUntil: null,
        estado: "SCHEDULED",
        priceVersion: 5,
      }, 201),
    );
    await repository.schedule(
      variant.id,
      {
        kind: "OFERTA",
        amount: "10.00",
        currency: "COP",
        channel: "global",
        start: "2026-10-20T10:00",
        end: "",
        reason: "Oferta de temporada",
      },
      new AbortController().signal,
    );
    const body = JSON.parse(firstCall(calls).request.body ?? "{}");

    expect(firstCall(calls).request.method).toBe("POST");
    expect(body).toEqual({
      tipoPrecio: "OFERTA",
      importe: 10,
      moneda: "COP",
      channelId: null,
      validFrom: "2026-10-20T15:00:00.000Z",
      validUntil: null,
      motivoCambio: "Oferta de temporada",
    });
    expect(body).not.toHaveProperty("priceVersion");
  });

  it("no envía archivos a la prevalidación bloqueada", async () => {
    const { repository, request } = setup();
    await expect(
      repository.prevalidate(
        { file: new File(["sample"], "sample.csv"), allowPartial: false },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: "blocked_contract" });
    expect(request).not.toHaveBeenCalled();
  });

  it("mapea lotes reales y obtiene el CSV desde el endpoint de reporte", async () => {
    const batch = setup(async () =>
      jsonResponse({
        batch_id: "batch-1",
        status: "PARTIAL",
        allow_partial: true,
        total_rows: 2,
        completed_rows: 1,
        failed_rows: 1,
        rows: [
          {
            row_id: "row-1",
            sku: "SKU-A",
            status: "COMPLETED",
            code: null,
          },
          { row_id: "row-2", sku: null, status: "FAILED", code: "PRECIO_INVALIDO" },
        ],
      }),
    );
    const result = await batch.repository.readBatch(
      "batch-1",
      new AbortController().signal,
    );
    expect(result).toMatchObject({
      id: "batch-1",
      status: "PARTIAL",
      total: 2,
      completed: 1,
      failed: 1,
      rows: [
        { id: "row-1", sku: "SKU-A", status: "COMPLETED" },
        { id: "row-2", sku: null, status: "FAILED", code: "PRECIO_INVALIDO" },
      ],
    });

    const report = setup(async () =>
      new Response("sku,status\nSKU-A,COMPLETED\n", {
        status: 200,
        headers: { "content-type": "text/csv; charset=utf-8" },
      }),
    );
    const file = await report.repository.report(
      "batch-1",
      new AbortController().signal,
    );
    expect(firstCall(report.calls).path).toBe(
      "/api/v1/precios/importaciones/batch-1/reporte",
    );
    expect(await file.data.text()).toContain("SKU-A,COMPLETED");
    expect(file.filename).toBe("reporte-precios.csv");
  });

  it("propaga AbortSignal y no reintenta escrituras de resultado incierto", async () => {
    const controller = new AbortController();
    const read = setup(async (_path, request) => {
      expect(request.signal).toBe(controller.signal);
      return jsonResponse(productPrice());
    });
    await read.repository.read(
      { targetId: product.id, channel: "global" },
      controller.signal,
    );

    let requests = 0;
    const onUpdated = vi.fn();
    const write = setup(async () => {
      if (requests++ === 0) return jsonResponse(skuPrice());
      throw new Error("timeout");
    }, { onUpdated });
    const signal = new AbortController().signal;
    await write.repository.readEditable(
      { targetId: variant.id, channel: "global" },
      signal,
    );
    await expect(
      write.repository.update(change(), signal),
    ).rejects.toMatchObject({ kind: "unknown" });
    await expect(
      write.repository.update(change(), signal),
    ).rejects.toMatchObject({ kind: "unknown" });
    expect(write.request).toHaveBeenCalledTimes(2);
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("rechaza importes que no caben en el contrato sin redondearlos", () => {
    expect(requestMoney("12.30")).toBe(12.3);
    expect(() => requestMoney("12.345")).toThrow(PricingFailure);
    expect(() => requestMoney("10000000000.00")).toThrow(PricingFailure);
  });
});
