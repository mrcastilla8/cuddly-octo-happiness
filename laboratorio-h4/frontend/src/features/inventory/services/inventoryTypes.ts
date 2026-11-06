export type StockStatus = "DISPONIBLE" | "STOCK_BAJO" | "AGOTADO";

export type TransferStatus =
  | "EN_TRANSITO"
  | "RECIBIDO_PARCIAL"
  | "COMPLETADO"
  | "COMPLETADO_CON_DISCREPANCIA";

export type DispositionType =
  | "REINGRESAR_DISPONIBLE"
  | "REINGRESAR_BLOQUEADO"
  | "CONFIRMAR_MERMA";

export const TERMINAL_TRANSFER_STATUSES: TransferStatus[] = [
  "COMPLETADO",
  "COMPLETADO_CON_DISCREPANCIA",
];

export function isTerminalTransferStatus(status: TransferStatus): boolean {
  return TERMINAL_TRANSFER_STATUSES.includes(status);
}

export interface StockItem {
  sku: string;
  productName: string;
  categoryName: string;
  brandName: string;
  locationId: string;
  locationName: string;
  onHand: number;
  reserved: number;
  blocked: number;
  available: number;
  threshold: number;
  status: StockStatus;
  stockVersion: number;
  updatedAt: string;
}

export interface ThresholdConfig {
  globalThreshold: number;
  skuOverrides: Record<string, number>;
}

export interface TransferItem {
  id: string;
  transferCode: string;
  sku: string;
  productName: string;
  sourceLocationId: string;
  sourceLocationName: string;
  targetLocationId: string;
  targetLocationName: string;
  quantityShipped: number;
  quantityReceived: number;
  quantityPending: number;
  missingQuantity?: number;
  status: TransferStatus;
  shippedAt: string;
  notes?: string;
}

export interface ReceiveTransferPayload {
  transferId: string;
  quantityReceived: number;
  disposition: DispositionType;
  finalReceipt: boolean;
  operationId: string;
  receivedAt: string;
  note?: string;
}

export interface LocationDistribution {
  locationId: string;
  // `null` cuando el contrato no publica el nombre de la ubicación.
  locationName: string | null;
  onHandTotal: number;
  reservedTotal: number;
  // `null` cuando el contrato no publica unidades bloqueadas por ubicación.
  blockedTotal: number | null;
  availableTotal: number;
  skusAvailableCount: number;
  skusLowStockCount: number;
  skusOutOfStockCount: number;
}

// Un KPI puede ser un valor numérico (incluido el cero real) o `null` cuando
// no existe dato para la selección consultada. Mostrar "0" en ese caso
// sustituiría información ausente por un valor, lo que la auditoría prohíbe.
export type KpiMetricValue = number | null;

export interface InventoryKpiSummary {
  availableUnits: KpiMetricValue;
  blockedUnits: KpiMetricValue;
  totalPhysicalUnits: KpiMetricValue;
  totalVendibleSkus: KpiMetricValue;
  skusAvailable: KpiMetricValue;
  skusLowStock: KpiMetricValue;
  skusOutOfStock: KpiMetricValue;
  reservedUnits: KpiMetricValue;
  totalPendingTransfers: KpiMetricValue;
  transfersInTransit: KpiMetricValue;
  transfersPartiallyReceived: KpiMetricValue;
  transfersWithDiscrepancy: KpiMetricValue;
  // Fecha/hora de generación del snapshot según DashboardInventario (OpenAPI)
  generatedAt?: string | null;
}

export interface InventoryAlert {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  message: string;
  actionLabel: string;
  targetRoute: string;
  sku?: string;
  locationId?: string;
  transferId?: string;
}

export interface StockFiltersQuery {
  search?: string;
  category?: string;
  brand?: string;
  locationId?: string;
  status?: string;
}

export interface DashboardFiltersQuery {
  search?: string;
  category?: string;
  brand?: string;
  locationId?: string;
  status?: string;
}

export interface TransferFiltersQuery {
  targetLocationId?: string;
  status?: string;
}

export interface InventoryCategoryOption {
  id: string;
  name: string;
  active: boolean;
}

export interface InventoryBrandOption {
  id: string;
  name: string;
  active: boolean;
}

export interface InventoryLocationOption {
  id: string;
  name: string;
  active: boolean;
}
