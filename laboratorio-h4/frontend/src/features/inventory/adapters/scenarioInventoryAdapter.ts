import type { InventoryRepository } from "../services/inventoryRepository";
import { MockInventoryAdapter } from "./mockInventoryAdapter";
import type {
  DashboardFiltersQuery,
  InventoryAlert,
  InventoryBrandOption,
  InventoryCategoryOption,
  InventoryKpiSummary,
  InventoryLocationOption,
  LocationDistribution,
  ReceiveTransferPayload,
  StockFiltersQuery,
  StockItem,
  ThresholdConfig,
  TransferFiltersQuery,
  TransferItem,
} from "../services/inventoryTypes";
import { getInventoryScenario } from "../dev/inventoryScenario";

// Decorador de desarrollo/pruebas: permite simular estados (loading/empty/error)
// sin contaminar el contrato de negocio. Se compone SOLO en el punto único de
// selección y vive en el bundle de desarrollo; nunca en producción.

// En el escenario "empty" no hay datos: los indicadores deben mostrarse como
// "sin datos" (null) y no como cero, que afirmaría un dato inexistente.
const NO_DATA_KPIS: InventoryKpiSummary = {
  availableUnits: null,
  blockedUnits: null,
  totalPhysicalUnits: null,
  totalVendibleSkus: null,
  skusAvailable: null,
  skusLowStock: null,
  skusOutOfStock: null,
  reservedUnits: null,
  totalPendingTransfers: null,
  transfersInTransit: null,
  transfersPartiallyReceived: null,
  transfersWithDiscrepancy: null,
};

function pending<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

export class ScenarioInventoryAdapter implements InventoryRepository {
  constructor(private readonly delegate: InventoryRepository) {}

  async getStockItems(filters?: StockFiltersQuery): Promise<StockItem[]> {
    switch (getInventoryScenario()) {
      case "loading":
        return pending();
      case "error":
        return Promise.reject(
          new Error(
            "No se pudo conectar con el servicio de inventario (simulación de error).",
          ),
        );
      case "empty":
        return [];
      default:
        return this.delegate.getStockItems(filters);
    }
  }

  async getStockDetail(
    sku: string,
    locationId: string,
  ): Promise<StockItem | null> {
    switch (getInventoryScenario()) {
      case "loading":
        return pending();
      case "error":
        return Promise.reject(
          new Error("Error al obtener detalle de saldo (simulación de error)."),
        );
      case "empty":
        return null;
      default:
        return this.delegate.getStockDetail(sku, locationId);
    }
  }

  async getThresholds(): Promise<ThresholdConfig> {
    switch (getInventoryScenario()) {
      case "loading":
        return pending();
      case "error":
        return Promise.reject(
          new Error("Error al consultar umbrales (simulación de error)."),
        );
      default:
        return this.delegate.getThresholds();
    }
  }

  updateGlobalThreshold(threshold: number): Promise<ThresholdConfig> {
    return this.delegate.updateGlobalThreshold(threshold);
  }

  updateSkuThreshold(
    sku: string,
    threshold: number,
  ): Promise<ThresholdConfig> {
    return this.delegate.updateSkuThreshold(sku, threshold);
  }

  async getTransfers(filters?: TransferFiltersQuery): Promise<TransferItem[]> {
    switch (getInventoryScenario()) {
      case "loading":
        return pending();
      case "error":
        return Promise.reject(
          new Error("Error al recuperar los traslados (simulación de error)."),
        );
      case "empty":
        return [];
      default:
        return this.delegate.getTransfers(filters);
    }
  }

  receiveTransfer(payload: ReceiveTransferPayload): Promise<TransferItem> {
    return this.delegate.receiveTransfer(payload);
  }

  async getDashboardKpis(
    filters?: DashboardFiltersQuery,
  ): Promise<InventoryKpiSummary> {
    switch (getInventoryScenario()) {
      case "loading":
        return pending();
      case "error":
        return Promise.reject(
          new Error(
            "No se pudo cargar el resumen de métricas (simulación de error).",
          ),
        );
      case "empty":
        return { ...NO_DATA_KPIS };
      default:
        return this.delegate.getDashboardKpis(filters);
    }
  }

  async getDashboardAlerts(
    filters?: DashboardFiltersQuery,
  ): Promise<InventoryAlert[]> {
    switch (getInventoryScenario()) {
      case "loading":
        return pending();
      case "error":
        return Promise.reject(
          new Error("Error al consultar las alertas (simulación de error)."),
        );
      case "empty":
        return [];
      default:
        return this.delegate.getDashboardAlerts(filters);
    }
  }

  async getLocationDistribution(
    filters?: DashboardFiltersQuery,
  ): Promise<LocationDistribution[]> {
    switch (getInventoryScenario()) {
      case "loading":
        return pending();
      case "error":
        return Promise.reject(
          new Error(
            "Error al obtener la distribución por ubicación (simulación de error).",
          ),
        );
      case "empty":
        return [];
      default:
        return this.delegate.getLocationDistribution(filters);
    }
  }

  async getCategories(): Promise<InventoryCategoryOption[]> {
    return this.delegate.getCategories();
  }

  async getBrands(): Promise<InventoryBrandOption[]> {
    return this.delegate.getBrands();
  }

  async getLocations(): Promise<InventoryLocationOption[]> {
    return this.delegate.getLocations();
  }

  applyBulkStock(items: Parameters<MockInventoryAdapter["applyBulkStock"]>[0]): void {
    if (this.delegate instanceof MockInventoryAdapter) {
      this.delegate.applyBulkStock(items);
    }
  }
}
