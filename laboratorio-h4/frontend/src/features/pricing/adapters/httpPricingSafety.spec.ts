import { describe, expect, it, vi } from "vitest";
import {
  createHttpPricingRepository,
  type PricingHttpRequest,
} from "./httpPricingRepository";
import {
  mapBatchDto,
  mapPriceDto,
  mapSchedulePageDto,
} from "./httpPricingMapper";
import { createPricingRuntime } from "../services/pricingService";
import type { PriceChange } from "../services/pricingModels";
import type { PriceTarget } from "../services/pricingRepository";

const target: PriceTarget = {
  kind: "product",
  id: "target",
  label: "Producto de prueba",
  productId: "product",
};
const price = (overrides: Record<string, unknown> = {}) => ({
  product_id: "product",
  precio_regular: 12.3,
  precio_oferta: null,
  currency: "PEN",
  channel_id: null,
  valid_from: "2026-10-01T00:00:00Z",
  valid_until: null,
  price_version: 1,
  ...overrides,
});
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const signal = () => new AbortController().signal;
const change: PriceChange = {
  target: { targetId: "target", channel: "global" },
  version: 1,
  draft: {
    regular: "14.00",
    currency: "PEN",
    offer: "",
    offerAction: "ELIMINAR",
    reason: "Corrección",
  },
};
const draft = {
  kind: "REGULAR" as const,
  amount: "14",
  currency: "PEN",
  channel: "global" as const,
  start: "2030-01-01T10:00",
  end: "",
  reason: "Temporada",
};

function setup(
  respond: (path: string, init: PricingHttpRequest) => Promise<Response>,
  onUpdated = vi.fn(),
) {
  const request = vi.fn(respond);
  const repository = createHttpPricingRepository({
    transport: { request },
    listCatalogTargets: async () => [target],
    onUpdated,
  });
  return { repository, request, onUpdated };
}

describe("Confirmación y recuperación de escrituras HTTP", () => {
  it.each([
    { product_id: "otro" },
    { precio_regular: 13 },
    { precio_oferta: 5 },
    { currency: "USD" },
    { price_version: 1 },
    { precio_regular: "14.00" },
    { valid_until: "2026-01-01T00:00:00Z" },
  ])(
    "no confirma PATCH con respuesta incompatible %j ni crea auditoría",
    async (override) => {
      const { repository, request, onUpdated } = setup(async (_path, init) =>
        response(
          init.method === "GET"
            ? price()
            : price({ precio_regular: 14, price_version: 2, ...override }),
        ),
      );
      await repository.readEditable(change.target, signal());
      await expect(repository.update(change, signal())).rejects.toMatchObject({
        kind: "unknown",
      });
      await expect(repository.readEditable(change.target, signal()))
        .rejects.toMatchObject({ kind: "unknown" });
      await expect(repository.update(change, signal())).rejects.toMatchObject({
        kind: "unknown",
      });
      expect(request).toHaveBeenCalledTimes(3);
      expect(onUpdated).not.toHaveBeenCalled();
    },
  );

  it("clasifica cancelación después del envío como resultado incierto", async () => {
    const controller = new AbortController();
    const { repository, request, onUpdated } = setup(async (_path, init) => {
      if (init.method === "GET") return response(price());
      controller.abort();
      throw new DOMException("Cancelado", "AbortError");
    });
    await repository.readEditable(change.target, signal());
    await expect(
      repository.update(change, controller.signal),
    ).rejects.toMatchObject({ kind: "unknown" });
    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "unknown",
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("no envía un PATCH cancelado antes de empezar", async () => {
    const { repository, request } = setup(async () => response(price()));
    await repository.readEditable(change.target, signal());
    const controller = new AbortController();
    controller.abort();
    await expect(
      repository.update(change, controller.signal),
    ).rejects.toHaveProperty("name", "AbortError");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("mantiene el bloqueo después de timeout y GET con la versión anterior", async () => {
    const { repository, request } = setup(async (_path, init) => {
      if (init.method === "PATCH") throw new Error("Timeout");
      return response(price());
    });
    await repository.readEditable(change.target, signal());
    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "unknown",
    });
    await expect(
      repository.readEditable(change.target, signal()),
    ).rejects.toMatchObject({ kind: "unknown" });
    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "unknown",
    });
    expect(
      request.mock.calls.filter(([, init]) => init.method === "PATCH"),
    ).toHaveLength(1);
  });

  it.each([
    { precio_regular: 14, price_version: 1 },
    { precio_regular: 13, price_version: 2 },
    { precio_regular: 14, precio_oferta: 5, price_version: 2 },
    { precio_regular: 14, currency: "USD", price_version: 2 },
  ])("no concilia una lectura que no confirma versión y valores: %j", async (later) => {
    let stored = price();
    const { repository, request, onUpdated } = setup(async (_path, init) => {
      if (init.method === "PATCH") throw new Error("Timeout");
      return response(stored);
    });
    await repository.readEditable(change.target, signal());
    await expect(repository.update(change, signal())).rejects.toMatchObject({ kind: "unknown" });
    stored = price(later);
    await expect(repository.readEditable(change.target, signal()))
      .rejects.toMatchObject({ kind: "unknown" });
    await expect(repository.update({ ...change, version: 2 }, signal()))
      .rejects.toMatchObject({ kind: "unknown" });
    expect(request.mock.calls.filter(([, init]) => init.method === "PATCH")).toHaveLength(1);
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("solo concilia con relectura editable confirmada y exige una intención con la nueva versión", async () => {
    let stored = price();
    let patches = 0;
    const { repository, request, onUpdated } = setup(async (_path, init) => {
      if (init.method === "PATCH") {
        if (++patches === 1) throw new Error("Timeout");
        stored = price({ precio_regular: 15, price_version: 3 });
      }
      return response(stored);
    });
    await repository.readEditable(change.target, signal());
    await expect(repository.update(change, signal())).rejects.toMatchObject({ kind: "unknown" });
    stored = price({ precio_regular: 14, price_version: 2 });
    // Una consulta ordinaria no habilita otro PATCH, incluso si los valores coinciden.
    await repository.read({ targetId: target.id, channel: "global" }, signal());
    await expect(repository.update(change, signal())).rejects.toMatchObject({ kind: "unknown" });
    await expect(repository.readEditable(change.target, signal())).resolves.toMatchObject({ version: 2 });
    expect(request.mock.calls.filter(([, init]) => init.method === "PATCH")).toHaveLength(1);
    expect(onUpdated).not.toHaveBeenCalled();
    await expect(repository.update(change, signal())).rejects.toMatchObject({ kind: "conflict" });
    await expect(repository.update({
      ...change, version: 2, draft: { ...change.draft, regular: "15" },
    }, signal())).resolves.toMatchObject({ version: 3 });
    expect(patches).toBe(2);
    expect(onUpdated).toHaveBeenCalledOnce();
  });

  it.each([
    { action: "CONSERVAR", offer: 5 },
    { action: "ELIMINAR", offer: null },
    { action: "ESTABLECER", offer: 6 },
  ] as const)("concilia la acción de oferta $action sin reenviar ni crear auditoría", async ({ action, offer }) => {
    let stored = price({ precio_oferta: 5 });
    const { repository, request, onUpdated } = setup(async (_path, init) => {
      if (init.method === "PATCH") throw new DOMException("Cancelado", "AbortError");
      return response(stored);
    });
    await repository.readEditable(change.target, signal());
    await expect(repository.update({
      ...change, draft: { ...change.draft, offerAction: action, offer: "6" },
    }, signal())).rejects.toMatchObject({ kind: "unknown" });
    await expect(repository.readEditable(change.target, signal())).rejects.toMatchObject({ kind: "unknown" });
    stored = price({ precio_regular: 14, precio_oferta: offer, price_version: 2 });
    await expect(repository.readEditable(change.target, signal())).resolves.toMatchObject({ version: 2 });
    expect(request.mock.calls.filter(([, init]) => init.method === "PATCH")).toHaveLength(1);
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("mantiene el precio confirmado si falla un callback secundario asíncrono", async () => {
    const callback = vi.fn(async () => {
      throw new Error("Auditoría demo caída");
    });
    const { repository, request } = setup(
      async (_path, init) =>
        response(
          init.method === "GET"
            ? price()
            : price({ precio_regular: 14, price_version: 2 }),
        ),
      callback,
    );
    await repository.readEditable(change.target, signal());
    await expect(repository.update(change, signal())).resolves.toMatchObject({
      version: 2,
    });
    expect(callback).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("conserva la propuesta ante 409 y no registra un asiento simulado", async () => {
    const { repository, request, onUpdated } = setup(async (_path, init) =>
      init.method === "GET"
        ? response(price())
        : response({ code: "VERSION_CONFLICT" }, 409),
    );
    await repository.readEditable(change.target, signal());
    const previous = structuredClone(change);
    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "conflict",
    });
    expect(change).toEqual(previous);
    expect(onUpdated).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it.each([500, 503])("no reenvía POST después de HTTP %s", async (status) => {
    const { repository, request } = setup(async () =>
      response({ code: "SERVICIO_NO_DISPONIBLE" }, status),
    );
    await expect(
      repository.schedule(target.id, draft, signal()),
    ).rejects.toMatchObject({ kind: "unknown" });
    await expect(
      repository.schedule(target.id, draft, signal()),
    ).rejects.toMatchObject({ kind: "unknown" });
    expect(request).toHaveBeenCalledOnce();
  });

  it("no reenvía POST tras un 201 de forma incompatible", async () => {
    const { repository, request } = setup(async () =>
      response({ programacionId: "incompleta" }, 201),
    );
    await expect(
      repository.schedule(target.id, draft, signal()),
    ).rejects.toMatchObject({ kind: "unknown" });
    await expect(
      repository.schedule(target.id, draft, signal()),
    ).rejects.toMatchObject({ kind: "unknown" });
    expect(request).toHaveBeenCalledOnce();
  });

  it("rechaza identidad de lote distinta de la solicitada", async () => {
    const { repository } = setup(async () =>
      response({
        batch_id: "otro",
        status: "QUEUED",
        total_rows: 0,
        completed_rows: 0,
        failed_rows: 0,
        allow_partial: false,
      }),
    );
    await expect(
      repository.readBatch("solicitado", signal()),
    ).rejects.toMatchObject({ kind: "error" });
  });

  it("se inyecta en createPricingRuntime sin cargar herramientas o aviso mock", async () => {
    const { repository } = setup(async () => response(price()));
    const runtime = await createPricingRuntime("api", {
      api: async () => repository,
    });
    expect(runtime.service).toBe(repository);
    expect(runtime.ReviewTools).toBeUndefined();
    expect(runtime.notice).toBeUndefined();
    await expect(
      runtime.service.read({ targetId: "target", channel: "global" }, signal()),
    ).resolves.toMatchObject({ price: { regular: "12.3" }, breakdown: [] });
  });
});

describe("Respuestas verificables y sin importes implícitos", () => {
  it.each([
    { precio_regular: 0 },
    { precio_regular: 1.001 },
    { precio_regular: 10000000000 },
    { precio_regular: null },
    { precio_oferta: 20 },
    { precio_oferta: 0 },
    { valid_from: "2026-02-30T10:00:00Z" },
    { valid_until: "2025-01-01T00:00:00Z" },
    { price_version: Number.MAX_SAFE_INTEGER + 1 },
    { currency: "  P" },
    { channel_id: "RETAIL" },
  ])("rechaza un DTO de precio incoherente %j", (override) => {
    expect(() => mapPriceDto(price(override), target)).toThrow();
  });

  it("rechaza una página truncada que aparenta ser completa", () => {
    expect(() =>
      mapSchedulePageDto(
        {
          items: [],
          meta: { pagina: 1, tamanio: 20, total: 3, totalPaginas: 1 },
        },
        target,
        1,
        20,
      ),
    ).toThrow();
  });

  it("rechaza contadores de lote imposibles", () => {
    expect(() =>
      mapBatchDto({
        batch_id: "batch",
        status: "PARTIAL",
        allow_partial: true,
        total_rows: 2,
        completed_rows: 2,
        failed_rows: 1,
      }),
    ).toThrow();
  });
});

describe("Alcance de lectura y doble envío", () => {
  it("no consulta precio Retail de producto usando una ruta que solo resuelve global", async () => {
    const { repository, request } = setup(async () => response(price()));
    await expect(
      repository.read({ targetId: target.id, channel: "retail" }, signal()),
    ).rejects.toMatchObject({ kind: "blocked_contract" });
    expect(request).not.toHaveBeenCalled();
  });

  it("impide un segundo PATCH mientras el primero está pendiente", async () => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { repository, request } = setup(async (_path, init) => {
      if (init.method === "GET") return response(price());
      await pending;
      return response(price({ precio_regular: 14, price_version: 2 }));
    });
    await repository.readEditable(change.target, signal());
    const first = repository.update(change, signal());
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "unknown",
    });
    release?.();
    await expect(first).resolves.toMatchObject({ version: 2 });
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("La ausencia y la admisión no sustituyen una confirmación", () => {
  it("rechaza JSON null con 200 en lugar de interpretarlo como precio ausente", async () => {
    const { repository } = setup(async () => response(null));
    await expect(
      repository.read({ targetId: target.id, channel: "global" }, signal()),
    ).rejects.toMatchObject({ kind: "error" });
  });

  it("no considera un 202 como PATCH confirmado aunque contenga un DTO válido", async () => {
    const { repository, onUpdated } = setup(async (_path, init) =>
      init.method === "GET"
        ? response(price())
        : response(price({ precio_regular: 14, price_version: 2 }), 202),
    );
    await repository.readEditable(change.target, signal());
    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "unknown",
    });
    expect(onUpdated).not.toHaveBeenCalled();
  });
});

describe("Identidad autoritativa y recuperación de escrituras", () => {
  it("exige una nueva lectura si Catálogo cambia el producto de la selección", async () => {
    let selected = { ...target };
    const request = vi.fn(async () => response(price()));
    const repository = createHttpPricingRepository({
      transport: { request },
      listCatalogTargets: async () => [selected],
    });
    await repository.readEditable(change.target, signal());
    selected = { ...target, productId: "otro-producto" };

    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "conflict",
    });
    expect(request).toHaveBeenCalledOnce();
  });

  it.each(["sku", "productId"] as const)(
    "exige releer una variante si cambia su %s",
    async (field) => {
      let selected: PriceTarget = {
        ...target,
        kind: "variant",
        sku: "SKU-1",
        productTargetId: "parent",
      };
      const request = vi.fn(async () => response(price({
        sku: "SKU-1", origen: "SKU_OVERRIDE", vigencia_id: "vigencia-1",
      })));
      const repository = createHttpPricingRepository({
        transport: { request },
        listCatalogTargets: async () => [selected],
      });
      await repository.readEditable(change.target, signal());
      selected = { ...selected, [field]: "otra-identidad" };
      await expect(repository.update(change, signal())).rejects.toMatchObject({
        kind: "conflict",
      });
      expect(request).toHaveBeenCalledOnce();
    },
  );

  it("comparte el bloqueo de PATCH incierto entre selecciones del mismo producto", async () => {
    const alias = { ...target, id: "alias" };
    const request = vi.fn(async (_path: string, init: PricingHttpRequest) => {
      if (init.method === "GET") return response(price());
      throw new Error("Timeout después del envío");
    });
    const repository = createHttpPricingRepository({
      transport: { request },
      listCatalogTargets: async () => [target, alias],
    });
    await repository.readEditable(change.target, signal());
    await repository.readEditable(
      { ...change.target, targetId: alias.id }, signal(),
    );
    await expect(repository.update(change, signal())).rejects.toMatchObject({
      kind: "unknown",
    });
    await expect(repository.update({
      ...change,
      target: { ...change.target, targetId: alias.id },
    }, signal())).rejects.toMatchObject({ kind: "unknown" });
    expect(request.mock.calls.filter(([, init]) => init.method === "PATCH"))
      .toHaveLength(1);
  });

  it("comparte el bloqueo de POST incierto entre selecciones del mismo producto", async () => {
    const alias = { ...target, id: "alias" };
    const request = vi.fn(async () => {
      throw new Error("Timeout después del envío");
    });
    const repository = createHttpPricingRepository({
      transport: { request },
      listCatalogTargets: async () => [target, alias],
    });
    await expect(repository.schedule(target.id, draft, signal()))
      .rejects.toMatchObject({ kind: "unknown" });
    await expect(repository.schedule(alias.id, draft, signal()))
      .rejects.toMatchObject({ kind: "unknown" });
    expect(request).toHaveBeenCalledOnce();
  });

  it.each([true, false])("no relee para edición durante un PATCH pendiente (confirmado=%s)", async (confirmed) => {
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { repository, request } = setup(async (_path, init) => {
      if (init.method === "GET") return response(price());
      await pending;
      if (!confirmed) throw new Error("Timeout después del envío");
      return response(price({ precio_regular: 14, price_version: 2 }));
    });
    await repository.readEditable(change.target, signal());
    const write = repository.update(change, signal());
    // Registrar el rechazo antes de liberar evita una promesa sin manejar.
    const result = confirmed
      ? expect(write).resolves.toMatchObject({ version: 2 })
      : expect(write).rejects.toMatchObject({ kind: "unknown" });
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    try {
      await expect(repository.readEditable(change.target, signal()))
        .rejects.toMatchObject({ kind: "unknown" });
    } finally {
      release?.();
      await result;
    }
    if (!confirmed) {
      await expect(repository.update(change, signal()))
        .rejects.toMatchObject({ kind: "unknown" });
    }
    expect(request).toHaveBeenCalledTimes(2);
  });
});
