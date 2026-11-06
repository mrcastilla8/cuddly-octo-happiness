import { InventoryError } from "./inventoryErrors";
import type {
  DispositionType,
  InventoryKpiSummary,
  LocationDistribution,
  ReceiveTransferPayload,
  StockStatus,
  ThresholdConfig,
  TransferItem,
  TransferStatus,
} from "./inventoryTypes";

// Mappers centralizados DTO (OpenAPI 0.6.0-rc.1) <-> modelo de presentación.
// Los consume `apiInventoryAdapter` para traducir respuestas tipadas del
// contract vigente y detectar respuestas incompatibles antes de que lleguen a
// la UI. No realizan llamadas HTTP ni inventan campos.

export interface RecepcionTrasladoInventarioRequestDto {
  operation_id: string;
  received_quantity: number;
  disposition: DispositionType;
  final_receipt: boolean;
  received_at: string;
  note?: string;
}

export interface TrasladoInventarioDto {
  traslado_id: string;
  source_incident_id?: string | null;
  sku: string;
  quantity_shipped: number;
  quantity_received: number;
  missing_quantity: number;
  source_location_id: string;
  target_location_id: string;
  estado: TransferStatus;
  created_at: string;
  updated_at: string;
}

// Datos de presentación que el contrato de Inventario NO transporta: código
// legible del traslado, nombre de producto y nombres de ubicación. Los aporta un
// resolvedor autoritativo que inyecta el composition root (Catálogo/ubicaciones);
// nunca se completan con valores simulados.
export type TransferPresentation = Pick<
  TransferItem,
  "transferCode" | "productName" | "sourceLocationName" | "targetLocationName"
>;

export type TransferPresentationResolver = (
  dto: TrasladoInventarioDto,
) => TransferPresentation | Promise<TransferPresentation>;

function incompatible(): never {
  throw new InventoryError(
    "RESPUESTA_INCOMPATIBLE",
    "Inventario devolvió una respuesta incompatible con el contrato vigente.",
  );
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : incompatible();
}

function nonEmptyString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || !value.trim()) return incompatible();
  return value;
}

function nonNegativeInt(
  source: Record<string, unknown>,
  key: string,
  minimum: number,
): number {
  const value = source[key];
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  )
    return incompatible();
  return value;
}

function dateTime(source: Record<string, unknown>, key: string): string {
  const value = nonEmptyString(source, key);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    return incompatible();
  return value;
}

const TRANSFER_STATUSES: readonly TransferStatus[] = [
  "EN_TRANSITO",
  "RECIBIDO_PARCIAL",
  "COMPLETADO",
  "COMPLETADO_CON_DISCREPANCIA",
];

const DISPOSITIONS: readonly DispositionType[] = [
  "REINGRESAR_DISPONIBLE",
  "REINGRESAR_BLOQUEADO",
  "CONFIRMAR_MERMA",
];

export function validateTrasladoDto(value: unknown): TrasladoInventarioDto {
  const dto = record(value);
  const estado = dto.estado;
  if (
    typeof estado !== "string" ||
    !TRANSFER_STATUSES.includes(estado as TransferStatus)
  )
    incompatible();
  const quantityShipped = nonNegativeInt(dto, "quantity_shipped", 1);
  const quantityReceived = nonNegativeInt(dto, "quantity_received", 0);
  const missingQuantity = nonNegativeInt(dto, "missing_quantity", 0);
  if (quantityReceived > quantityShipped || missingQuantity > quantityShipped)
    incompatible();
  const incident = dto.source_incident_id;
  if (incident !== undefined && incident !== null && typeof incident !== "string")
    incompatible();
  return {
    traslado_id: nonEmptyString(dto, "traslado_id"),
    source_incident_id: incident === undefined ? null : (incident as string | null),
    sku: nonEmptyString(dto, "sku"),
    quantity_shipped: quantityShipped,
    quantity_received: quantityReceived,
    missing_quantity: missingQuantity,
    source_location_id: nonEmptyString(dto, "source_location_id"),
    target_location_id: nonEmptyString(dto, "target_location_id"),
    estado: estado as TransferStatus,
    created_at: dateTime(dto, "created_at"),
    updated_at: dateTime(dto, "updated_at"),
  };
}

export interface TrasladoListDto {
  items: TrasladoInventarioDto[];
  pagina: number;
  tamanio: number;
  total: number;
}

export function validateTrasladoListDto(value: unknown): TrasladoListDto {
  const dto = record(value);
  if (!Array.isArray(dto.items)) return incompatible();
  const pagina = nonNegativeInt(dto, "pagina", 1);
  const tamanio = nonNegativeInt(dto, "tamanio", 1);
  const total = nonNegativeInt(dto, "total", 0);
  if (dto.items.length > tamanio) return incompatible();
  return {
    items: dto.items.map(validateTrasladoDto),
    pagina,
    tamanio,
    total,
  };
}

export function validateRecepcionResponse(value: unknown): {
  operationId: string;
  traslado: TrasladoInventarioDto;
  receivedQuantity: number;
  disposition: DispositionType;
} {
  const dto = record(value);
  nonEmptyString(dto, "receipt_id");
  const operationId = nonEmptyString(dto, "operation_id");
  const disposition = dto.disposition;
  if (
    typeof disposition !== "string" ||
    !DISPOSITIONS.includes(disposition as DispositionType)
  )
    incompatible();
  const receivedQuantity = nonNegativeInt(dto, "received_quantity", 1);
  dateTime(dto, "completed_at");
  return {
    operationId,
    traslado: validateTrasladoDto(dto.traslado),
    receivedQuantity,
    disposition: disposition as DispositionType,
  };
}

export function validateTransferPresentation(
  value: unknown,
): TransferPresentation {
  const presentation = record(value);
  return {
    transferCode: nonEmptyString(presentation, "transferCode"),
    productName: nonEmptyString(presentation, "productName"),
    sourceLocationName: nonEmptyString(presentation, "sourceLocationName"),
    targetLocationName: nonEmptyString(presentation, "targetLocationName"),
  };
}

export function toThresholdConfig(value: unknown): ThresholdConfig {
  const dto = record(value);
  const globalThreshold = nonNegativeInt(dto, "umbralGlobal", 0);
  if (!Array.isArray(dto.overrides)) return incompatible();
  const skuOverrides: Record<string, number> = {};
  for (const item of dto.overrides) {
    const override = record(item);
    const sku = nonEmptyString(override, "sku");
    const umbral = nonNegativeInt(override, "umbral", 0);
    if (Object.hasOwn(skuOverrides, sku)) return incompatible();
    skuOverrides[sku] = umbral;
  }
  return { globalThreshold, skuOverrides };
}

export function toDashboardKpiSummary(value: unknown): InventoryKpiSummary {
  const dto = record(value);
  const generatedAt = dateTime(dto, "generatedAt");
  nonNegativeInt(dto, "totalSkus", 0);
  const totalOnHand = nonNegativeInt(dto, "totalOnHand", 0);
  const totalReserved = nonNegativeInt(dto, "totalReserved", 0);
  const totalAvailable = nonNegativeInt(dto, "totalAvailable", 0);
  const skusDisponibles = nonNegativeInt(dto, "skusDisponibles", 0);
  const skusStockBajo = nonNegativeInt(dto, "skusStockBajo", 0);
  const skusAgotados = nonNegativeInt(dto, "skusAgotados", 0);
  if (!Array.isArray(dto.porUbicacion)) return incompatible();
  for (const rawLocation of dto.porUbicacion) {
    const location = record(rawLocation);
    nonEmptyString(location, "location_id");
    nonNegativeInt(location, "on_hand", 0);
    nonNegativeInt(location, "reserved", 0);
    nonNegativeInt(location, "available", 0);
    nonNegativeInt(location, "skusDisponibles", 0);
    nonNegativeInt(location, "skusStockBajo", 0);
    nonNegativeInt(location, "skusAgotados", 0);
  }
  // Los indicadores que `DashboardInventario` no publica se informan como `null`
  // (ausencia de dato verificable, nunca como 0).
  return {
    availableUnits: totalAvailable,
    blockedUnits: null,
    totalPhysicalUnits: totalOnHand,
    totalVendibleSkus: null,
    skusAvailable: skusDisponibles,
    skusLowStock: skusStockBajo,
    skusOutOfStock: skusAgotados,
    reservedUnits: totalReserved,
    totalPendingTransfers: null,
    transfersInTransit: null,
    transfersPartiallyReceived: null,
    transfersWithDiscrepancy: null,
    generatedAt,
  };
}

export function toLocationDistributionList(value: unknown): LocationDistribution[] {
  const dto = record(value);
  dateTime(dto, "generatedAt");
  if (!Array.isArray(dto.porUbicacion)) return incompatible();
  return dto.porUbicacion.map((rawLocation) => {
    const location = record(rawLocation);
    return {
      locationId: nonEmptyString(location, "location_id"),
      // El contrato no publica nombre de ubicación en `porUbicacion`.
      locationName: null,
      onHandTotal: nonNegativeInt(location, "on_hand", 0),
      reservedTotal: nonNegativeInt(location, "reserved", 0),
      // `porUbicacion` no publica unidades bloqueadas.
      blockedTotal: null,
      availableTotal: nonNegativeInt(location, "available", 0),
      skusAvailableCount: nonNegativeInt(location, "skusDisponibles", 0),
      skusLowStockCount: nonNegativeInt(location, "skusStockBajo", 0),
      skusOutOfStockCount: nonNegativeInt(location, "skusAgotados", 0),
    };
  });
}

export function toRecepcionTrasladoRequestDto(
  payload: ReceiveTransferPayload,
): RecepcionTrasladoInventarioRequestDto {
  return {
    operation_id: payload.operationId,
    received_quantity: payload.quantityReceived,
    disposition: payload.disposition,
    final_receipt: payload.finalReceipt,
    received_at: payload.receivedAt,
    ...(payload.note ? { note: payload.note } : {}),
  };
}

export function toStockStatus(available: number, threshold: number): StockStatus {
  if (available <= 0) return "AGOTADO";
  if (available <= threshold) return "STOCK_BAJO";
  return "DISPONIBLE";
}

export function toTransferItem(
  dto: TrasladoInventarioDto,
  presentation: TransferPresentation,
): TransferItem {
  const isCompletedWithDiscrepancy =
    dto.estado === "COMPLETADO_CON_DISCREPANCIA";
  const isCompleted = dto.estado === "COMPLETADO";
  const rawPending = Math.max(
    dto.quantity_shipped - dto.quantity_received,
    0,
  );
  const missing =
    typeof dto.missing_quantity === "number" && dto.missing_quantity >= 0
      ? dto.missing_quantity
      : isCompletedWithDiscrepancy
        ? rawPending
        : 0;

  return {
    id: dto.traslado_id,
    transferCode: presentation.transferCode,
    sku: dto.sku,
    productName: presentation.productName,
    sourceLocationId: dto.source_location_id,
    sourceLocationName: presentation.sourceLocationName,
    targetLocationId: dto.target_location_id,
    targetLocationName: presentation.targetLocationName,
    quantityShipped: dto.quantity_shipped,
    quantityReceived: dto.quantity_received,
    // Un traslado culminado (sea completado limpio o con discrepancia) no tiene unidades pendientes de recepción.
    quantityPending:
      isCompleted || isCompletedWithDiscrepancy ? 0 : rawPending,
    // Los faltantes corresponden a la discrepancia registrada cuando el traslado culmina incompleto.
    missingQuantity: isCompletedWithDiscrepancy ? missing : 0,
    status: dto.estado,
    shippedAt: dto.created_at,
  };
}
