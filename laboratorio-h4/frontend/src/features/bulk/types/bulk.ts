// Domain & UI models for MK-001 (Bulk Upload and Export)
// Aligned with OpenAPI 0.5.0 schemas (ImportacionGeneralAceptada, EstadoImportacionGeneral, FilaBulk, PasoDominioBulk)

export type BulkImportStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED_GENERAL";

export type BulkRowStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type BulkDomain = "CATALOGO" | "PRICING" | "INVENTARIO";

// Canonical error codes from OpenAPI 0.5.0 ErrorCode enum
export type BulkErrorCode =
  | "VALIDACION"
  | "TOKEN_INVALIDO"
  | "SCOPE_INSUFICIENTE"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "ERROR_INTERNO"
  | "SERVICIO_NO_DISPONIBLE"
  | "PRODUCTO_NO_ENCONTRADO"
  | "SKU_DUPLICADO"
  | "CATEGORIA_INVALIDA"
  | "TIPO_PRODUCTO_INVALIDO"
  | "TIPO_PRODUCTO_NO_ENCONTRADO"
  | "MARCA_INVALIDA"
  | "DATOS_INCOMPLETOS"
  | "CAMBIO_ESTRUCTURAL_NO_PERMITIDO"
  | "VARIANTE_NO_ENCONTRADA"
  | "SKU_INVALIDO"
  | "UBICACION_NO_ENCONTRADA"
  | "CANTIDAD_INVALIDA"
  | "STOCK_INSUFICIENTE"
  | "PRECIO_INVALIDO"
  | "CATEGORIA_NO_ENCONTRADA"
  | "CATEGORIA_DUPLICADA"
  | "PROFUNDIDAD_CATEGORIA_EXCEDIDA";

export interface BulkDomainStep {
  domain: BulkDomain;
  status: BulkRowStatus;
  code?: BulkErrorCode | null;
  detail?: string | null;
}

export interface BulkImportRow {
  row_id: string | number;
  sku?: string;
  nombre?: string;
  status: BulkRowStatus;
  applied_domains: BulkDomain[];
  failed_domain?: BulkDomain | null;
  needs_reconciliation: boolean;
  code?: BulkErrorCode | null;
  detail?: string | null;
  steps: BulkDomainStep[];
  precio_regular?: number;
  stock_inicial?: number;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  tipo_producto?: string;
  moneda?: string;
}

export interface BulkImportBatch {
  batch_id: string;
  status: BulkImportStatus;
  total_rows?: number | null;
  completed_rows: number;
  failed_rows: number;
  needs_reconciliation: boolean;
  created_at: string;
  updated_at: string;
  file_name?: string;
  file_size?: number;
  rows?: BulkImportRow[];
}

export type BulkExportFormat = "CSV" | "XLSX";

export type BulkExportStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED_GENERAL";

export interface BulkExportJob {
  export_id: string;
  status: BulkExportStatus;
  format: BulkExportFormat;
  created_at: string;
  updated_at: string;
  file_name?: string;
  file_size?: number;
  download_url?: string;
  error_message?: string;
}

export interface LocalFileCheckResult {
  valid: boolean;
  format: "CSV" | "XLSX" | "UNKNOWN";
  fileName: string;
  fileSize: number;
  detectedRows?: number;
  detectedColumns?: string[];
  warnings: string[];
  errors: string[];
  unverifiedAspects: string[];
}
