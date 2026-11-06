import { describe, expect, it, vi } from "vitest";
import {
  describeThresholdMutationError,
  describeThresholdMutationSuccess,
  updateGlobalThresholdWithReconciliation,
  updateSkuThresholdWithReconciliation,
} from "../hooks/useThresholds";
import { InventoryError } from "../services/inventoryErrors";
import type { InventoryRepository } from "../services/inventoryRepository";
import type { ThresholdConfig } from "../services/inventoryTypes";
import {
  createHttpInventoryRepository,
  type InventoryHttpTransport,
} from "./apiInventoryAdapter";

function createMockRepository(overrides: Partial<InventoryRepository> = {}): InventoryRepository {
  return {
    getStockItems: vi.fn(),
    getStockDetail: vi.fn(),
    getThresholds: vi.fn(),
    updateGlobalThreshold: vi.fn(),
    updateSkuThreshold: vi.fn(),
    getTransfers: vi.fn(),
    receiveTransfer: vi.fn(),
    getDashboardKpis: vi.fn(),
    getDashboardAlerts: vi.fn(),
    getLocationDistribution: vi.fn(),
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    getLocations: vi.fn(),
    ...overrides,
  };
}

describe("Presentación del resultado de mutación de umbrales (P1-01)", () => {
  const configValida: ThresholdConfig = {
    globalThreshold: 12,
    skuOverrides: {},
  };

  it("CONFIRMED se presenta como escritura confirmada", () => {
    expect(
      describeThresholdMutationSuccess({
        status: "CONFIRMED",
        config: configValida,
        message: "Umbral global actualizado correctamente.",
      }),
    ).toEqual({
      semantic: "success",
      title: "Escritura confirmada",
      message: "Umbral global actualizado correctamente.",
    });
  });

  it("VERIFIED se presenta como valor verificado sin atribuir la escritura", () => {
    expect(
      describeThresholdMutationSuccess({
        status: "VERIFIED",
        config: configValida,
        message: "El valor deseado fue verificado en el servidor.",
      }),
    ).toEqual({
      semantic: "warning",
      title: "Valor verificado, escritura no atribuida",
      message: "El valor deseado fue verificado en el servidor.",
    });
  });

  it("un error se presenta como error de actualización", () => {
    expect(
      describeThresholdMutationError(
        new Error("No se pudo contactar al servidor."),
        "Error al actualizar umbral.",
      ),
    ).toEqual({
      semantic: "error",
      title: "Error al actualizar umbral",
      message: "No se pudo contactar al servidor.",
    });
  });

  it("un resultado incierto se presenta como advertencia, no como error definitivo", () => {
    const feedback = describeThresholdMutationError(
      new InventoryError("RESULTADO_INCIERTO", "El umbral podría haberse actualizado."),
      "Error al actualizar umbral.",
    );

    expect(feedback.semantic).toBe("warning");
    expect(feedback.title).toBe("Resultado no confirmado");
    expect(feedback.message).toBe("El umbral podría haberse actualizado.");
  });
});

describe("Conciliación de umbrales (P1 — useThresholds)", () => {
  describe("updateGlobalThresholdWithReconciliation (Umbral Global)", () => {
    it("1. PUT 200 válido actualiza el estado directamente sin dependencia de un GET posterior", async () => {
      const configValida: ThresholdConfig = {
        globalThreshold: 12,
        skuOverrides: { "SKU-A": 4 },
      };
      const updateGlobalThreshold = vi.fn().mockResolvedValue(configValida);
      const getThresholds = vi.fn();

      const repo = createMockRepository({
        updateGlobalThreshold,
        getThresholds,
      });

      const result = await updateGlobalThresholdWithReconciliation(12, repo);

      expect(result).toEqual({
        status: "CONFIRMED",
        config: configValida,
        message: "Umbral global actualizado correctamente.",
      });
      expect(updateGlobalThreshold).toHaveBeenCalledTimes(1);
      expect(updateGlobalThreshold).toHaveBeenCalledWith(12);
      // P1: No depender de un GET posterior para reconocer una escritura confirmada
      expect(getThresholds).not.toHaveBeenCalled();
    });

    it("2. PUT incierto seguido de GET coincidente: comunica verificación en el servidor sin reintento de escritura", async () => {
      const configAutoritativa: ThresholdConfig = {
        globalThreshold: 15,
        skuOverrides: {},
      };
      const putError = new InventoryError(
        "RESULTADO_INCIERTO",
        "La respuesta del servidor no llegó a tiempo.",
      );
      const updateGlobalThreshold = vi.fn().mockRejectedValue(putError);
      const getThresholds = vi.fn().mockResolvedValue(configAutoritativa);

      const repo = createMockRepository({
        updateGlobalThreshold,
        getThresholds,
      });

      const result = await updateGlobalThresholdWithReconciliation(15, repo);

      expect(result).toEqual({
        status: "VERIFIED",
        config: configAutoritativa,
        message: "El valor deseado fue verificado en el servidor.",
      });
      expect(updateGlobalThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });

    it("3. PUT incierto seguido de GET no coincidente: conserva estado incierto y no reintenta la escritura", async () => {
      const configAntigua: ThresholdConfig = {
        globalThreshold: 5,
        skuOverrides: {},
      };
      const putError = new InventoryError(
        "RESULTADO_INCIERTO",
        "Timeout de transporte.",
      );
      const updateGlobalThreshold = vi.fn().mockRejectedValue(putError);
      const getThresholds = vi.fn().mockResolvedValue(configAntigua);

      const repo = createMockRepository({
        updateGlobalThreshold,
        getThresholds,
      });

      await expect(
        updateGlobalThresholdWithReconciliation(15, repo),
      ).rejects.toMatchObject({
        code: "RESULTADO_INCIERTO",
      });

      // No realizar reintentos automáticos de escritura
      expect(updateGlobalThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });

    it("4. PUT incierto seguido de GET fallido: conserva estado incierto y no reintenta la escritura", async () => {
      const putError = new InventoryError(
        "RESULTADO_INCIERTO",
        "Conexión reiniciada.",
      );
      const updateGlobalThreshold = vi.fn().mockRejectedValue(putError);
      const getThresholds = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));

      const repo = createMockRepository({
        updateGlobalThreshold,
        getThresholds,
      });

      await expect(
        updateGlobalThresholdWithReconciliation(15, repo),
      ).rejects.toMatchObject({
        code: "RESULTADO_INCIERTO",
      });

      expect(updateGlobalThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });
  });

  describe("P1-03 — validación semántica del DTO devuelto por el PUT (umbral global)", () => {
    it("5. PUT 200 con DTO contradictorio y lectura que confirma el valor: VERIFIED sin repetir el PUT", async () => {
      const contradictorio: ThresholdConfig = {
        globalThreshold: 99,
        skuOverrides: {},
      };
      const autoritativo: ThresholdConfig = {
        globalThreshold: 12,
        skuOverrides: {},
      };
      const updateGlobalThreshold = vi.fn().mockResolvedValue(contradictorio);
      const getThresholds = vi.fn().mockResolvedValue(autoritativo);

      const repo = createMockRepository({
        updateGlobalThreshold,
        getThresholds,
      });

      const result = await updateGlobalThresholdWithReconciliation(12, repo);

      expect(result.status).toBe("VERIFIED");
      expect(result.config.globalThreshold).toBe(12);
      expect(result.message).toBe(
        "El valor deseado fue verificado en el servidor.",
      );
      expect(updateGlobalThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });

    it("6. PUT 200 con DTO contradictorio y lectura no coincidente: resultado no acreditado sin reintento", async () => {
      const contradictorio: ThresholdConfig = {
        globalThreshold: 99,
        skuOverrides: {},
      };
      const updateGlobalThreshold = vi.fn().mockResolvedValue(contradictorio);
      const getThresholds = vi.fn().mockResolvedValue(contradictorio);

      const repo = createMockRepository({
        updateGlobalThreshold,
        getThresholds,
      });

      await expect(
        updateGlobalThresholdWithReconciliation(12, repo),
      ).rejects.toMatchObject({ code: "RESULTADO_INCIERTO" });

      expect(updateGlobalThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateSkuThresholdWithReconciliation (Umbral por SKU)", () => {
    it("1. PUT 200 válido actualiza el estado directamente sin dependencia de un GET posterior", async () => {
      const configValida: ThresholdConfig = {
        globalThreshold: 10,
        skuOverrides: { "SKU-ESPECIAL": 3 },
      };
      const updateSkuThreshold = vi.fn().mockResolvedValue(configValida);
      const getThresholds = vi.fn();

      const repo = createMockRepository({
        updateSkuThreshold,
        getThresholds,
      });

      const result = await updateSkuThresholdWithReconciliation("SKU-ESPECIAL", 3, repo);

      expect(result).toEqual({
        status: "CONFIRMED",
        config: configValida,
        message: "Umbral para SKU SKU-ESPECIAL actualizado correctamente.",
      });
      expect(updateSkuThreshold).toHaveBeenCalledTimes(1);
      expect(updateSkuThreshold).toHaveBeenCalledWith("SKU-ESPECIAL", 3);
      // P1: No depender de un GET posterior para reconocer una escritura confirmada
      expect(getThresholds).not.toHaveBeenCalled();
    });

    it("2. PUT incierto seguido de GET coincidente: comunica verificación en el servidor sin reintento de escritura", async () => {
      const configAutoritativa: ThresholdConfig = {
        globalThreshold: 10,
        skuOverrides: { "SKU-ESPECIAL": 7 },
      };
      const putError = new InventoryError(
        "RESULTADO_INCIERTO",
        "Respuesta truncada durante la transmisión.",
      );
      const updateSkuThreshold = vi.fn().mockRejectedValue(putError);
      const getThresholds = vi.fn().mockResolvedValue(configAutoritativa);

      const repo = createMockRepository({
        updateSkuThreshold,
        getThresholds,
      });

      const result = await updateSkuThresholdWithReconciliation("SKU-ESPECIAL", 7, repo);

      expect(result).toEqual({
        status: "VERIFIED",
        config: configAutoritativa,
        message: "El valor deseado fue verificado en el servidor.",
      });
      expect(updateSkuThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });

    it("3. PUT incierto seguido de GET no coincidente: conserva estado incierto y no reintenta la escritura", async () => {
      const configAntigua: ThresholdConfig = {
        globalThreshold: 10,
        skuOverrides: { "SKU-ESPECIAL": 2 },
      };
      const putError = new InventoryError(
        "RESULTADO_INCIERTO",
        "Conexión interrumpida.",
      );
      const updateSkuThreshold = vi.fn().mockRejectedValue(putError);
      const getThresholds = vi.fn().mockResolvedValue(configAntigua);

      const repo = createMockRepository({
        updateSkuThreshold,
        getThresholds,
      });

      await expect(
        updateSkuThresholdWithReconciliation("SKU-ESPECIAL", 7, repo),
      ).rejects.toMatchObject({
        code: "RESULTADO_INCIERTO",
      });

      expect(updateSkuThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });

    it("4. PUT incierto seguido de GET fallido: conserva estado incierto y no reintenta la escritura", async () => {
      const putError = new InventoryError(
        "RESULTADO_INCIERTO",
        "Timeout en gateway.",
      );
      const updateSkuThreshold = vi.fn().mockRejectedValue(putError);
      const getThresholds = vi.fn().mockRejectedValue(new Error("504 Gateway Timeout"));

      const repo = createMockRepository({
        updateSkuThreshold,
        getThresholds,
      });

      await expect(
        updateSkuThresholdWithReconciliation("SKU-ESPECIAL", 7, repo),
      ).rejects.toMatchObject({
        code: "RESULTADO_INCIERTO",
      });

      expect(updateSkuThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });
  });

  describe("P1-03 — validación semántica del DTO devuelto por el PUT (umbral por SKU)", () => {
    it("5. PUT 200 con DTO contradictorio y lectura que confirma el valor: VERIFIED sin repetir el PUT", async () => {
      const contradictorio: ThresholdConfig = {
        globalThreshold: 10,
        skuOverrides: { "SKU-ESPECIAL": 99 },
      };
      const autoritativo: ThresholdConfig = {
        globalThreshold: 10,
        skuOverrides: { "SKU-ESPECIAL": 7 },
      };
      const updateSkuThreshold = vi.fn().mockResolvedValue(contradictorio);
      const getThresholds = vi.fn().mockResolvedValue(autoritativo);

      const repo = createMockRepository({
        updateSkuThreshold,
        getThresholds,
      });

      const result = await updateSkuThresholdWithReconciliation(
        "SKU-ESPECIAL",
        7,
        repo,
      );

      expect(result.status).toBe("VERIFIED");
      expect(result.config.skuOverrides["SKU-ESPECIAL"]).toBe(7);
      expect(updateSkuThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });

    it("6. PUT 200 con DTO contradictorio y lectura no coincidente: resultado no acreditado sin reintento", async () => {
      const contradictorio: ThresholdConfig = {
        globalThreshold: 10,
        skuOverrides: { "SKU-ESPECIAL": 99 },
      };
      const updateSkuThreshold = vi.fn().mockResolvedValue(contradictorio);
      const getThresholds = vi.fn().mockResolvedValue(contradictorio);

      const repo = createMockRepository({
        updateSkuThreshold,
        getThresholds,
      });

      await expect(
        updateSkuThresholdWithReconciliation("SKU-ESPECIAL", 7, repo),
      ).rejects.toMatchObject({ code: "RESULTADO_INCIERTO" });

      expect(updateSkuThreshold).toHaveBeenCalledTimes(1);
      expect(getThresholds).toHaveBeenCalledTimes(1);
    });
  });

  describe("Integración con createHttpInventoryRepository a través del transporte HTTP", () => {
    function jsonResponse(data: unknown, status = 200): Response {
      return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      });
    }

    it("PUT 200 de umbral global retorna config confirmada y el transporte no recibe GET de conciliación", async () => {
      const requests: { path: string; method: string }[] = [];
      const transport: InventoryHttpTransport = {
        request: async (path, init) => {
          requests.push({ path, method: init?.method ?? "GET" });
          return jsonResponse({
            umbralGlobal: 14,
            overrides: [{ sku: "SKU-B", umbral: 6 }],
          });
        },
      };

      const repo = createHttpInventoryRepository({
        transport,
      });

      const result = await updateGlobalThresholdWithReconciliation(14, repo);

      expect(result.status).toBe("CONFIRMED");
      expect(result.config.globalThreshold).toBe(14);
      expect(requests).toHaveLength(1);
      expect(requests[0]?.path).toBe("/api/v1/inventario/umbrales/global");
      expect(requests[0]?.method).toBe("PUT");
    });

    it("PUT 503 (incierto) con conciliación exitosa vía GET 200 verifica el valor deseado", async () => {
      const requests: { path: string; method: string }[] = [];
      let callCount = 0;
      const transport: InventoryHttpTransport = {
        request: async (path, init) => {
          callCount++;
          requests.push({ path, method: init?.method ?? "GET" });
          if (callCount === 1) {
            // El PUT falla con 503 servicio no disponible (incierto)
            return new Response(
              JSON.stringify({
                code: "SERVICIO_NO_DISPONIBLE",
                title: "Servicio no disponible",
                status: 503,
              }),
              {
                status: 503,
                headers: { "content-type": "application/problem+json" },
              },
            );
          }
          // El GET de conciliación subsiguiente confirma que el servidor ya tiene 18
          return jsonResponse({
            umbralGlobal: 18,
            overrides: [],
          });
        },
      };

      const repo = createHttpInventoryRepository({
        transport,
      });

      const result = await updateGlobalThresholdWithReconciliation(18, repo);

      expect(result.status).toBe("VERIFIED");
      expect(result.message).toBe("El valor deseado fue verificado en el servidor.");
      expect(result.config.globalThreshold).toBe(18);
      expect(requests).toHaveLength(2);
      expect(requests[0]?.method).toBe("PUT");
      expect(requests[1]?.method).toBe("GET");
      expect(requests[1]?.path).toBe("/api/v1/inventario/umbrales");
    });

    it("PUT 200 de umbral por SKU retorna config confirmada y no llama a GET", async () => {
      const requests: { path: string; method: string }[] = [];
      const transport: InventoryHttpTransport = {
        request: async (path, init) => {
          requests.push({ path, method: init?.method ?? "GET" });
          return jsonResponse({
            umbralGlobal: 10,
            overrides: [{ sku: "SKU/ESPECIAL", umbral: 9 }],
          });
        },
      };

      const repo = createHttpInventoryRepository({
        transport,
      });

      const result = await updateSkuThresholdWithReconciliation("SKU/ESPECIAL", 9, repo);

      expect(result.status).toBe("CONFIRMED");
      expect(result.config.skuOverrides["SKU/ESPECIAL"]).toBe(9);
      expect(requests).toHaveLength(1);
      expect(requests[0]?.path).toBe("/api/v1/inventario/umbrales/skus/SKU%2FESPECIAL");
      expect(requests[0]?.method).toBe("PUT");
    });

    it("PUT 503 de umbral por SKU con conciliación GET coincidente verifica el valor", async () => {
      const requests: { path: string; method: string }[] = [];
      let callCount = 0;
      const transport: InventoryHttpTransport = {
        request: async (path, init) => {
          callCount++;
          requests.push({ path, method: init?.method ?? "GET" });
          if (callCount === 1) {
            return new Response(
              JSON.stringify({ code: "TIMEOUT", title: "Timeout", status: 504 }),
              { status: 504, headers: { "content-type": "application/problem+json" } },
            );
          }
          return jsonResponse({
            umbralGlobal: 10,
            overrides: [{ sku: "SKU-99", umbral: 4 }],
          });
        },
      };

      const repo = createHttpInventoryRepository({
        transport,
      });

      const result = await updateSkuThresholdWithReconciliation("SKU-99", 4, repo);

      expect(result.status).toBe("VERIFIED");
      expect(result.message).toBe("El valor deseado fue verificado en el servidor.");
      expect(result.config.skuOverrides["SKU-99"]).toBe(4);
      expect(requests).toHaveLength(2);
      expect(requests[0]?.method).toBe("PUT");
      expect(requests[1]?.method).toBe("GET");
    });

    it("PUT 503 con conciliación GET de valor no coincidente preserva RESULTADO_INCIERTO y no repite PUT", async () => {
      const requests: { path: string; method: string }[] = [];
      let callCount = 0;
      const transport: InventoryHttpTransport = {
        request: async (path, init) => {
          callCount++;
          requests.push({ path, method: init?.method ?? "GET" });
          if (callCount === 1) {
            return new Response(
              JSON.stringify({ code: "TIMEOUT", title: "Timeout", status: 504 }),
              { status: 504, headers: { "content-type": "application/problem+json" } },
            );
          }
          return jsonResponse({
            umbralGlobal: 10,
            overrides: [{ sku: "SKU-99", umbral: 1 }], // valor antiguo
          });
        },
      };

      const repo = createHttpInventoryRepository({
        transport,
      });

      await expect(
        updateSkuThresholdWithReconciliation("SKU-99", 4, repo),
      ).rejects.toMatchObject({
        code: "RESULTADO_INCIERTO",
      });

      expect(requests).toHaveLength(2);
      expect(requests[0]?.method).toBe("PUT");
      expect(requests[1]?.method).toBe("GET");
      // Sin segundo PUT
      expect(requests.filter((r) => r.method === "PUT")).toHaveLength(1);
    });

    it("PUT 503 con conciliación GET fallida preserva RESULTADO_INCIERTO y no repite PUT", async () => {
      const requests: { path: string; method: string }[] = [];
      const transport: InventoryHttpTransport = {
        request: async (path, init) => {
          requests.push({ path, method: init?.method ?? "GET" });
          return new Response(
            JSON.stringify({ code: "FALLO", title: "Fallo", status: 500 }),
            { status: 500, headers: { "content-type": "application/problem+json" } },
          );
        },
      };

      const repo = createHttpInventoryRepository({
        transport,
      });

      await expect(
        updateGlobalThresholdWithReconciliation(22, repo),
      ).rejects.toMatchObject({
        code: "RESULTADO_INCIERTO",
      });

      expect(requests).toHaveLength(2);
      expect(requests[0]?.method).toBe("PUT");
      expect(requests[1]?.method).toBe("GET");
      // Sin segundo PUT
      expect(requests.filter((r) => r.method === "PUT")).toHaveLength(1);
    });
  });
});
