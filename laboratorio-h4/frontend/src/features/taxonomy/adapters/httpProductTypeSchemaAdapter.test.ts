import { describe, expect, it, vi } from "vitest";
import { createHttpProductTypeSchemaAdapter } from "./httpProductTypeSchemaAdapter";

const payload = {
  tipoProducto: {
    tipoProductoId: "type-1",
    nombre: "Calzado",
    estado: "ACTIVO",
    schemaVersion: 0,
  },
  caracteristicas: [
    {
      caracteristicaId: "attr-1",
      obligatoria: true,
      estado: "ACTIVO",
      schemaVersion: 0,
      caracteristica: {
        caracteristicaId: "attr-1",
        nombre: "Talla",
        tipo: "LISTA",
        unidadMedida: null,
        estado: "ACTIVO",
        version: 0,
        valores: [{ valorId: "size-1", nombre: "38", estado: "ACTIVO", version: 0 }],
      },
    },
  ],
  schemaVersion: 0,
};

function adapter(response: Response | ((signal: AbortSignal) => Promise<Response>), timeoutMs?: number) {
  const request = vi.fn((_path: string, signal: AbortSignal) =>
    typeof response === "function" ? response(signal) : Promise.resolve(response));
  return { api: createHttpProductTypeSchemaAdapter({ request }, timeoutMs), request };
}

describe("GET esquema de tipo de producto", () => {
  it("lee la ruta contractual, acepta schemaVersion 0 y valida el DTO", async () => {
    const response = {
      ...payload,
      tipoProducto: { ...payload.tipoProducto, tipoProductoId: "type/1" },
    };
    const { api, request } = adapter(Response.json(response));
    const result = await api.obtenerEsquema("type/1");
    expect(request).toHaveBeenCalledWith(
      "/api/v1/tipos-producto/type%2F1/caracteristicas",
      expect.any(AbortSignal),
    );
    expect(result.schemaVersion).toBe(0);
    expect(result.caracteristicas[0]?.caracteristica?.nombre).toBe("Talla");
  });

  it.each([401, 403, 404, 500, 503])("expone HTTP %i sin fallback", async (status) => {
    const { api, request } = adapter(new Response(null, { status }));
    await expect(api.obtenerEsquema("type-1")).rejects.toThrow(`HTTP ${status}`);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ...payload, schemaVersion: -1 },
    { ...payload, tipoProducto: { ...payload.tipoProducto, estado: "PENDING_DEACTIVATION" } },
    { ...payload, caracteristicas: [{ ...payload.caracteristicas[0], obligatoria: "si" }] },
    { ...payload, caracteristicas: [null] },
  ])("rechaza payloads fuera de esquema", async (invalid) => {
    const { api } = adapter(Response.json(invalid));
    await expect(api.obtenerEsquema("type-1")).rejects.toThrow("Respuesta de esquema de Taxonomía inválida.");
  });

  it("acepta que caracteristica esté ausente y la representa como null", async () => {
    const { caracteristica: _omitted, ...association } = payload.caracteristicas[0]!;
    expect(_omitted).toBeDefined();
    const { api } = adapter(Response.json({
      ...payload,
      caracteristicas: [association],
    }));
    const result = await api.obtenerEsquema("type-1");
    expect(result.caracteristicas[0]?.caracteristica).toBeNull();
  });

  it("conserva el null explícito de caracteristica", async () => {
    const { api } = adapter(Response.json({
      ...payload,
      caracteristicas: [{ ...payload.caracteristicas[0], caracteristica: null }],
    }));
    const result = await api.obtenerEsquema("type-1");
    expect(result.caracteristicas[0]?.caracteristica).toBeNull();
  });

  it("rechaza una respuesta cuyo tipoProductoId no coincide con el solicitado", async () => {
    const { api } = adapter(Response.json(payload));
    await expect(api.obtenerEsquema("different-id")).rejects.toThrow(
      "Respuesta de esquema de Taxonomía inválida.",
    );
  });

  it.each([
    (characteristic: typeof payload.caracteristicas[0]["caracteristica"]) => {
      const { version: _version, ...withoutVersion } = characteristic!;
      expect(_version).toBe(0);
      return withoutVersion;
    },
    (characteristic: typeof payload.caracteristicas[0]["caracteristica"]) => ({
      ...characteristic,
      version: -1,
    }),
  ])("rechaza CaracteristicaAdmin sin version válida", async (change) => {
    const association = payload.caracteristicas[0]!;
    const characteristic = change(association.caracteristica);
    const { api } = adapter(Response.json({
      ...payload,
      caracteristicas: [{ ...association, caracteristica: characteristic }],
    }));
    await expect(api.obtenerEsquema("type-1")).rejects.toThrow(
      "Respuesta de esquema de Taxonomía inválida.",
    );
  });

  it("rechaza valores anidados sin version contractual", async () => {
    const { version: _version, ...valor } = payload.caracteristicas[0]!.caracteristica!.valores![0]!;
    expect(_version).toBe(0);
    const association = payload.caracteristicas[0]!;
    const { api } = adapter(Response.json({
      ...payload,
      caracteristicas: [{
        ...association,
        caracteristica: { ...association.caracteristica!, valores: [valor] },
      }],
    }));
    await expect(api.obtenerEsquema("type-1")).rejects.toThrow(
      "Respuesta de esquema de Taxonomía inválida.",
    );
  });

  it("propaga cancelación antes de enviar la petición", async () => {
    const { api, request } = adapter(Response.json(payload));
    const controller = new AbortController();
    controller.abort(new DOMException("Cancelada", "AbortError"));
    await expect(api.obtenerEsquema("type-1", controller.signal)).rejects.toThrow("Cancelada");
    expect(request).not.toHaveBeenCalled();
  });

  it("aborta el transporte en curso cuando se cancela desde la pantalla", async () => {
    let transportAborted = false;
    const { api } = adapter((signal) => new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        transportAborted = true;
        reject(signal.reason);
      });
    }));
    const controller = new AbortController();
    const pending = api.obtenerEsquema("type-1", controller.signal);
    controller.abort(new DOMException("Consulta cancelada", "AbortError"));
    await expect(pending).rejects.toThrow("Consulta cancelada");
    expect(transportAborted).toBe(true);
  });

  it("cancela y reporta timeout si el transporte no termina", async () => {
    let aborted = false;
    const { api } = adapter(
      (signal) => new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => {
          aborted = true;
          reject(signal.reason);
        });
        if (signal.aborted) reject(signal.reason);
      }),
      10,
    );
    await expect(api.obtenerEsquema("type-1")).rejects.toThrow("excedió el tiempo permitido");
    expect(aborted).toBe(true);
  });
});
