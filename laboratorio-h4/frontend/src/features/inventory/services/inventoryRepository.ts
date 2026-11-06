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
} from "./inventoryTypes";

// Contrato de negocio del feature de inventario.
// SIN referencias a InventoryScenario ni lógica de mocks.
// Los escenarios de desarrollo se orquestan externamente mediante
// ScenarioInventoryAdapter (decorador) antes de llegar aquí.

export interface InventoryRepository {
  getStockItems(filters?: StockFiltersQuery): Promise<StockItem[]>;

  getStockDetail(
    sku: string,
    locationId: string,
  ): Promise<StockItem | null>;

  getThresholds(): Promise<ThresholdConfig>;

  updateGlobalThreshold(threshold: number): Promise<ThresholdConfig>;

  updateSkuThreshold(sku: string, threshold: number): Promise<ThresholdConfig>;

  getTransfers(filters?: TransferFiltersQuery): Promise<TransferItem[]>;

  receiveTransfer(payload: ReceiveTransferPayload): Promise<TransferItem>;

  getDashboardKpis(filters?: DashboardFiltersQuery): Promise<InventoryKpiSummary>;

  getDashboardAlerts(filters?: DashboardFiltersQuery): Promise<InventoryAlert[]>;

  getLocationDistribution(
    filters?: DashboardFiltersQuery,
  ): Promise<LocationDistribution[]>;

  // Catálogos para filtros (BLOCKED_CONTRACT para ubicaciones)
  getCategories(): Promise<InventoryCategoryOption[]>;
  getBrands(): Promise<InventoryBrandOption[]>;
  getLocations(): Promise<InventoryLocationOption[]>;
}
