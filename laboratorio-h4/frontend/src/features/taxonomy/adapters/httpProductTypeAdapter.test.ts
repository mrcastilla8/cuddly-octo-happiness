import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpProductTypeAdapter } from "./httpProductTypeAdapter";

const row = (id: string) => ({
  tipoProductoId: id,
  nombre: `Tipo ${id}`,
  estado: "ACTIVO",
  schemaVersion: 1,
});
const page = (
  pagina: number,
  items: unknown[],
  total: number,
  totalPaginas = Math.ceil(total / 200),
  tamanio = 200,
) =>
  new Response(
    JSON.stringify({
      items,
      meta: { pagina, tamanio, total, totalPaginas },
    }),
    { status: 200 },
  );

afterEach(() => vi.restoreAllMocks());

describe("listado HTTP de tipos de producto", () => {
  it("mapea elementos contractuales sin inventar conteos ni límites", async () => {
    const request = vi.fn().mockResolvedValue(page(1, [row("type-1")], 1));
    const result = await createHttpProductTypeAdapter({ request }).list();
    expect(request).toHaveBeenCalledWith(
      "/api/v1/tipos-producto?pagina=1&tamanio=200",
      expect.any(AbortSignal),
    );
    expect(result).toEqual({
      items: [
        {
          tipoProductoId: "type-1",
          nombre: "Tipo type-1",
          estado: "Activo",
          schemaVersion: 1,
          caracteristicasAsignadas: null,
          limiteCaracteristicas: null,
        },
      ],
      limite: null,
    });
  });

  it("acepta el listado vacío contractual", async () => {
    const result = await createHttpProductTypeAdapter({
      request: async () => page(1, [], 0, 0),
    }).list();
    expect(result.items).toEqual([]);
  });

  it("recorre todas las páginas sin perder registros", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(page(1, Array.from({ length: 200 }, (_, i) => row(`id-${i}`)), 201))
      .mockResolvedValueOnce(page(2, [row("id-200")], 201));
    const result = await createHttpProductTypeAdapter({ request }).list();
    expect(result.items).toHaveLength(201);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1]?.[0]).toBe(
      "/api/v1/tipos-producto?pagina=2&tamanio=200",
    );
  });

  it.each([
    ["página distinta", 1, 1, 2, 1, 200, [row("a")]],
    ["tamaño distinto", 1, 1, 1, 1, 100, [row("a")]],
    ["total de páginas incoherente", 1, 1, 1, 2, 200, [row("a")]],
    ["elementos incompletos", 1, 2, 1, 1, 200, []],
    ["total inválido", 1, -1, 0, 0, 200, []],
  ])("rechaza metadatos inconsistentes: %s", async (_case, _requested, total, actualPage, totalPages, size, items) => {
    const adapter = createHttpProductTypeAdapter({
      request: async () => page(Number(actualPage), items as unknown[], Number(total), Number(totalPages), Number(size)),
    });
    await expect(adapter.list()).rejects.toThrow("Respuesta de Taxonomía inválida");
  });

  it.each([
    ["identificador vacío", { ...row(" "), tipoProductoId: "  " }],
    ["nombre vacío", { ...row("a"), nombre: " " }],
    ["schemaVersion no positivo", { ...row("a"), schemaVersion: 0 }],
    ["estado desconocido", { ...row("a"), estado: "PENDING_DEACTIVATION" }],
    ["objeto incompleto", { tipoProductoId: "a" }],
  ])("rechaza datos inválidos: %s", async (_case, invalidRow) => {
    const adapter = createHttpProductTypeAdapter({
      request: async () => page(1, [invalidRow], 1),
    });
    await expect(adapter.list()).rejects.toThrow("Respuesta de Taxonomía inválida");
  });

  it("rechaza identidades duplicadas entre páginas", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(page(1, Array.from({ length: 200 }, (_, i) => row(`id-${i}`)), 201))
      .mockResolvedValueOnce(page(2, [row("id-0")], 201));
    await expect(createHttpProductTypeAdapter({ request }).list()).rejects.toThrow(
      "Respuesta de Taxonomía inválida",
    );
  });

  it.each([401, 403, 500, 503])("muestra el error HTTP %s sin usar mock", async (status) => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status }));
    await expect(createHttpProductTypeAdapter({ request }).list()).rejects.toThrow(
      `HTTP ${status}`,
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("propaga el fallo de conexión y no sustituye por fixtures", async () => {
    const request = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(createHttpProductTypeAdapter({ request }).list()).rejects.toThrow(
      "Failed to fetch",
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("cancela efectivamente una petición pendiente", async () => {
    const controller = new AbortController();
    const request = vi.fn((_path: string, signal: AbortSignal) =>
      new Promise<Response>((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
      ),
    );
    const pending = createHttpProductTypeAdapter({ request }).list(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("limita el tiempo de espera aunque el transporte no responda", async () => {
    const request = vi.fn(() => new Promise<Response>(() => {}));
    await expect(createHttpProductTypeAdapter({ request }, 5).list()).rejects.toThrow(
      "excedió el tiempo permitido",
    );
  });

  it("mantiene cerradas las operaciones administrativas en API", async () => {
    const request = vi.fn();
    const adapter = createHttpProductTypeAdapter({ request });
    await expect(adapter.desactivar("id")).rejects.toThrow("no está disponible");
    await expect(adapter.crear({} as never)).rejects.toThrow("no está disponible");
    expect(request).not.toHaveBeenCalled();
  });
});
