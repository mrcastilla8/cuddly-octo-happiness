import type {
  BulkExportJob,
  BulkImportBatch,
  BulkImportRow,
} from "../types/bulk";

export const sampleCompletedRows: BulkImportRow[] = [
  {
    row_id: 1,
    sku: "NK-RN-001-42",
    nombre: "Zapatilla Running Air Sprint - Talla 42",
    status: "COMPLETED",
    applied_domains: ["CATALOGO", "PRICING", "INVENTARIO"],
    failed_domain: null,
    needs_reconciliation: false,
    detail: "Producto, precio base y SKU inicializados correctamente",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio regular S/ 299.00 registrado" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU inicializado y stock 50 u. aplicado" },
    ],
  },
  {
    row_id: 2,
    sku: "NK-RN-001-43",
    nombre: "Zapatilla Running Air Sprint - Talla 43",
    status: "COMPLETED",
    applied_domains: ["CATALOGO", "PRICING", "INVENTARIO"],
    failed_domain: null,
    needs_reconciliation: false,
    detail: "Producto, precio base y SKU inicializados correctamente",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio regular S/ 299.00 registrado" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU inicializado y stock 30 u. aplicado" },
    ],
  },
  {
    row_id: 3,
    sku: "AD-TR-002-M",
    nombre: "Camiseta Entrenamiento DryFit - Talla M",
    status: "COMPLETED",
    applied_domains: ["CATALOGO", "PRICING", "INVENTARIO"],
    failed_domain: null,
    needs_reconciliation: false,
    detail: "Producto, precio base y SKU inicializados correctamente",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio regular S/ 89.00 registrado" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU inicializado sin ubicación por defecto" },
    ],
  },
];

// 6 failed rows for batch-partial (114 completed + 6 failed = 120 total)
export const samplePartialFailedRows: BulkImportRow[] = [
  {
    row_id: 4,
    sku: "PUM-FT-004-L",
    nombre: "Short Futbol Pro - Talla L",
    status: "FAILED",
    applied_domains: ["CATALOGO", "PRICING"],
    failed_domain: "INVENTARIO",
    needs_reconciliation: true,
    code: "UBICACION_NO_ENCONTRADA",
    detail: "Ubicación de inventario no configurada para ajuste de stock inicial (default_location_id no encontrado)",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio regular S/ 79.00 registrado" },
      { domain: "INVENTARIO", status: "FAILED", code: "UBICACION_NO_ENCONTRADA", detail: "Rechazado por ajuste de stock sin ubicación válida" },
    ],
  },
  {
    row_id: 5,
    sku: "UND-CP-005-S",
    nombre: "Gorra Competición Vent - Talla S",
    status: "FAILED",
    applied_domains: ["CATALOGO", "INVENTARIO"],
    failed_domain: "PRICING",
    needs_reconciliation: true,
    code: "PRECIO_INVALIDO",
    detail: "Moneda no habilitada para lista de precios local en canal seleccionado",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Rechazado por validación de moneda" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU inicializado" },
    ],
  },
  {
    row_id: 6,
    sku: "AS-GL-006-U",
    nombre: "Guantes Training Grip - Talla Única",
    status: "FAILED",
    applied_domains: [],
    failed_domain: "CATALOGO",
    needs_reconciliation: false,
    code: "SKU_DUPLICADO",
    detail: "SKU duplicado en catálogo maestro existente",
    steps: [
      { domain: "CATALOGO", status: "FAILED", code: "SKU_DUPLICADO", detail: "Rechazo de creación de borrador" },
      { domain: "PRICING", status: "PENDING", detail: "No iniciado debido a fallo en Catálogo" },
      { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado debido a fallo en Catálogo" },
    ],
  },
  {
    row_id: 7,
    sku: "NK-SK-007-40",
    nombre: "Medias Compresión Pro - Talla 40",
    status: "FAILED",
    applied_domains: ["CATALOGO", "PRICING"],
    failed_domain: "INVENTARIO",
    needs_reconciliation: true,
    code: "SERVICIO_NO_DISPONIBLE",
    detail: "Servicio de inventario no disponible temporalmente al inicializar existencias",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio regular S/ 45.00 registrado" },
      { domain: "INVENTARIO", status: "FAILED", code: "SERVICIO_NO_DISPONIBLE", detail: "Nodo de inventario ocupado" },
    ],
  },
  {
    row_id: 8,
    sku: "AD-JK-008-XL",
    nombre: "Casaca Cortaviento - Talla XL",
    status: "FAILED",
    applied_domains: ["CATALOGO", "INVENTARIO"],
    failed_domain: "PRICING",
    needs_reconciliation: true,
    code: "PRECIO_INVALIDO",
    detail: "Precio base fuera del rango comercial permitido para la categoría",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Validación de precio rechazada" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU inicializado" },
    ],
  },
  {
    row_id: 9,
    sku: "PM-BG-009-U",
    nombre: "Mochila Deportiva 25L - Talla Única",
    status: "FAILED",
    applied_domains: [],
    failed_domain: "CATALOGO",
    needs_reconciliation: false,
    code: "CATEGORIA_INVALIDA",
    detail: "Categoría no encontrada en el árbol taxonómico activo",
    steps: [
      { domain: "CATALOGO", status: "FAILED", code: "CATEGORIA_INVALIDA", detail: "Categoría inexistente" },
      { domain: "PRICING", status: "PENDING", detail: "No ejecutado" },
      { domain: "INVENTARIO", status: "PENDING", detail: "No ejecutado" },
    ],
  },
];

export const samplePartialRows: BulkImportRow[] = [
  ...sampleCompletedRows,
  ...samplePartialFailedRows,
];

// 5 failed rows for batch-inventory-failed (45 completed + 5 failed = 50 total)
export const sampleInventoryFailedRows: BulkImportRow[] = [
  {
    row_id: 1,
    sku: "NK-RN-001-42",
    nombre: "Zapatilla Running Air Sprint - Talla 42",
    status: "COMPLETED",
    applied_domains: ["CATALOGO", "PRICING", "INVENTARIO"],
    failed_domain: null,
    needs_reconciliation: false,
    steps: [
      { domain: "CATALOGO", status: "COMPLETED" },
      { domain: "PRICING", status: "COMPLETED" },
      { domain: "INVENTARIO", status: "COMPLETED" },
    ],
  },
  {
    row_id: 2,
    sku: "NK-RN-002-44",
    nombre: "Zapatilla Trail Max - Talla 44",
    status: "FAILED",
    applied_domains: ["CATALOGO", "PRICING"],
    failed_domain: "INVENTARIO",
    needs_reconciliation: true,
    code: "SERVICIO_NO_DISPONIBLE",
    detail: "Inventario rechazó la inicialización de SKU por indisponibilidad temporal del nodo",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador persistido" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio base S/ 349.00 registrado" },
      { domain: "INVENTARIO", status: "FAILED", code: "SERVICIO_NO_DISPONIBLE", detail: "Fallo de conexión en nodo de almacén" },
    ],
  },
  {
    row_id: 3,
    sku: "NK-RN-002-45",
    nombre: "Zapatilla Trail Max - Talla 45",
    status: "FAILED",
    applied_domains: ["CATALOGO", "PRICING"],
    failed_domain: "INVENTARIO",
    needs_reconciliation: true,
    code: "UBICACION_NO_ENCONTRADA",
    detail: "Ubicación de inventario predeterminada no encontrada",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador persistido" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio base S/ 349.00 registrado" },
      { domain: "INVENTARIO", status: "FAILED", code: "UBICACION_NO_ENCONTRADA", detail: "Ubicación inválida" },
    ],
  },
  {
    row_id: 4,
    sku: "AD-TR-003-L",
    nombre: "Camiseta Climacool - Talla L",
    status: "FAILED",
    applied_domains: ["CATALOGO", "PRICING"],
    failed_domain: "INVENTARIO",
    needs_reconciliation: true,
    code: "SERVICIO_NO_DISPONIBLE",
    detail: "Timeout en servicio de inventario",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio base S/ 99.00 registrado" },
      { domain: "INVENTARIO", status: "FAILED", code: "SERVICIO_NO_DISPONIBLE", detail: "Timeout en comunicación asíncrona" },
    ],
  },
  {
    row_id: 5,
    sku: "AD-TR-003-XL",
    nombre: "Camiseta Climacool - Talla XL",
    status: "FAILED",
    applied_domains: ["CATALOGO", "PRICING"],
    failed_domain: "INVENTARIO",
    needs_reconciliation: true,
    code: "UBICACION_NO_ENCONTRADA",
    detail: "Ubicación de inventario no encontrada",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio base S/ 99.00 registrado" },
      { domain: "INVENTARIO", status: "FAILED", code: "UBICACION_NO_ENCONTRADA", detail: "Ubicación no asignada" },
    ],
  },
  {
    row_id: 6,
    sku: "PUM-SH-005-41",
    nombre: "Calzado Smash - Talla 41",
    status: "FAILED",
    applied_domains: ["CATALOGO", "PRICING"],
    failed_domain: "INVENTARIO",
    needs_reconciliation: true,
    code: "STOCK_INSUFICIENTE",
    detail: "Saldo inicial inconsistente en Inventario",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "COMPLETED", detail: "Precio base S/ 189.00 registrado" },
      { domain: "INVENTARIO", status: "FAILED", code: "STOCK_INSUFICIENTE", detail: "Rechazo de inventario" },
    ],
  },
];

// 5 failed rows for batch-pricing-failed (20 completed + 5 failed = 25 total)
export const samplePricingFailedRows: BulkImportRow[] = [
  {
    row_id: 1,
    sku: "NK-RN-003-40",
    nombre: "Zapatilla Marathon Elite - Talla 40",
    status: "FAILED",
    applied_domains: ["CATALOGO", "INVENTARIO"],
    failed_domain: "PRICING",
    needs_reconciliation: true,
    code: "PRECIO_INVALIDO",
    detail: "Precio base fuera de rango permitido por política comercial",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Regla de precio base rechazada" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU registrado sin saldo" },
    ],
  },
  {
    row_id: 2,
    sku: "NK-RN-003-41",
    nombre: "Zapatilla Marathon Elite - Talla 41",
    status: "FAILED",
    applied_domains: ["CATALOGO", "INVENTARIO"],
    failed_domain: "PRICING",
    needs_reconciliation: true,
    code: "PRECIO_INVALIDO",
    detail: "Moneda especificada no admitida en canal de venta",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Moneda no reconocida" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU registrado" },
    ],
  },
  {
    row_id: 3,
    sku: "NK-RN-003-42",
    nombre: "Zapatilla Marathon Elite - Talla 42",
    status: "FAILED",
    applied_domains: ["CATALOGO", "INVENTARIO"],
    failed_domain: "PRICING",
    needs_reconciliation: true,
    code: "PRECIO_INVALIDO",
    detail: "Formato de precio numérico inválido",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Valor numérico no admisible" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU registrado" },
    ],
  },
  {
    row_id: 4,
    sku: "NK-RN-003-43",
    nombre: "Zapatilla Marathon Elite - Talla 43",
    status: "FAILED",
    applied_domains: ["CATALOGO", "INVENTARIO"],
    failed_domain: "PRICING",
    needs_reconciliation: true,
    code: "PRECIO_INVALIDO",
    detail: "Precio base por debajo del umbral mínimo de costo",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Precio inferior a costo" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU registrado" },
    ],
  },
  {
    row_id: 5,
    sku: "NK-RN-003-44",
    nombre: "Zapatilla Marathon Elite - Talla 44",
    status: "FAILED",
    applied_domains: ["CATALOGO", "INVENTARIO"],
    failed_domain: "PRICING",
    needs_reconciliation: true,
    code: "SERVICIO_NO_DISPONIBLE",
    detail: "Servicio de precios no disponible",
    steps: [
      { domain: "CATALOGO", status: "COMPLETED", detail: "Borrador creado" },
      { domain: "PRICING", status: "FAILED", code: "SERVICIO_NO_DISPONIBLE", detail: "Indisponibilidad en Pricing" },
      { domain: "INVENTARIO", status: "COMPLETED", detail: "SKU registrado" },
    ],
  },
];

// 10 failed rows for batch-catalog-failed (0 completed + 10 failed = 10 total)
export const sampleCatalogFailedRows: BulkImportRow[] = Array.from({ length: 10 }, (_, i) => ({
  row_id: i + 1,
  sku: `CAT-ERR-${i + 1}`,
  nombre: `Producto observado #${i + 1}`,
  status: "FAILED",
  applied_domains: [],
  failed_domain: "CATALOGO",
  needs_reconciliation: false,
  code: i % 2 === 0 ? "CATEGORIA_INVALIDA" : "SKU_DUPLICADO",
  detail: i % 2 === 0 ? "La categoría especificada no existe en la taxonomía" : "SKU duplicado en catálogo maestro",
  steps: [
    {
      domain: "CATALOGO",
      status: "FAILED",
      code: i % 2 === 0 ? "CATEGORIA_INVALIDA" : "SKU_DUPLICADO",
      detail: i % 2 === 0 ? "Categoría inexistente" : "SKU duplicado",
    },
    { domain: "PRICING", status: "PENDING", detail: "No ejecutado" },
    { domain: "INVENTARIO", status: "PENDING", detail: "No ejecutado" },
  ],
}));

export const mockBatches: Record<string, BulkImportBatch> = {
  "batch-queued": {
    batch_id: "batch-queued",
    status: "QUEUED",
    total_rows: 120,
    completed_rows: 0,
    failed_rows: 0,
    needs_reconciliation: false,
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:00:00Z",
    file_name: "catalogo_primavera_2026.csv",
    file_size: 48290,
  },
  "batch-processing": {
    batch_id: "batch-processing",
    status: "PROCESSING",
    total_rows: 120,
    completed_rows: 82,
    failed_rows: 4,
    needs_reconciliation: true,
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:02:30Z",
    file_name: "catalogo_primavera_2026.csv",
    file_size: 48290,
    rows: samplePartialRows,
  },
  "batch-completed": {
    batch_id: "batch-completed",
    status: "COMPLETED",
    total_rows: 120,
    completed_rows: 120,
    failed_rows: 0,
    needs_reconciliation: false,
    created_at: "2026-10-10T11:45:00Z",
    updated_at: "2026-10-10T11:48:15Z",
    file_name: "lote_completo_120.csv",
    file_size: 45100,
    rows: sampleCompletedRows,
  },
  "batch-partial": {
    batch_id: "batch-partial",
    status: "COMPLETED",
    total_rows: 120,
    completed_rows: 114,
    failed_rows: 6,
    needs_reconciliation: true,
    created_at: "2026-10-10T11:30:00Z",
    updated_at: "2026-10-10T11:33:40Z",
    file_name: "lote_parcial_120.csv",
    file_size: 46200,
    rows: samplePartialRows,
  },
  "batch-catalog-failed": {
    batch_id: "batch-catalog-failed",
    status: "COMPLETED",
    total_rows: 10,
    completed_rows: 0,
    failed_rows: 10,
    needs_reconciliation: false,
    created_at: "2026-10-10T11:15:00Z",
    updated_at: "2026-10-10T11:16:00Z",
    file_name: "lote_cat_error.csv",
    file_size: 5120,
    rows: sampleCatalogFailedRows,
  },
  "batch-pricing-failed": {
    batch_id: "batch-pricing-failed",
    status: "COMPLETED",
    total_rows: 25,
    completed_rows: 20,
    failed_rows: 5,
    needs_reconciliation: true,
    created_at: "2026-10-10T11:00:00Z",
    updated_at: "2026-10-10T11:02:10Z",
    file_name: "lote_pricing_error.csv",
    file_size: 10240,
    rows: samplePricingFailedRows,
  },
  "batch-inventory-failed": {
    batch_id: "batch-inventory-failed",
    status: "COMPLETED",
    total_rows: 50,
    completed_rows: 45,
    failed_rows: 5,
    needs_reconciliation: true,
    created_at: "2026-10-10T10:45:00Z",
    updated_at: "2026-10-10T10:47:30Z",
    file_name: "lote_inv_error.csv",
    file_size: 18400,
    rows: sampleInventoryFailedRows,
  },
  "batch-failed-general": {
    batch_id: "batch-failed-general",
    status: "FAILED_GENERAL",
    total_rows: 80,
    completed_rows: 0,
    failed_rows: 80,
    needs_reconciliation: false,
    created_at: "2026-10-10T10:30:00Z",
    updated_at: "2026-10-10T10:31:05Z",
    file_name: "lote_corrupto.csv",
    file_size: 25000,
    rows: [],
  },
  "batch-resume-accepted": {
    batch_id: "batch-resume-accepted",
    status: "QUEUED",
    total_rows: 120,
    completed_rows: 114,
    failed_rows: 6,
    needs_reconciliation: true,
    created_at: "2026-10-10T11:30:00Z",
    updated_at: "2026-10-10T12:05:00Z",
    file_name: "lote_parcial_120.csv",
    file_size: 46200,
  },
};

export const mockExports: Record<string, BulkExportJob> = {
  "export-queued": {
    export_id: "export-queued",
    status: "QUEUED",
    format: "CSV",
    created_at: "2026-10-10T12:10:00Z",
    updated_at: "2026-10-10T12:10:00Z",
  },
  "export-processing": {
    export_id: "export-processing",
    status: "PROCESSING",
    format: "XLSX",
    created_at: "2026-10-10T12:08:00Z",
    updated_at: "2026-10-10T12:09:15Z",
  },
  "export-completed": {
    export_id: "export-completed",
    status: "COMPLETED",
    format: "CSV",
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:01:45Z",
    file_name: "catalogo_completo_20261010.csv",
    file_size: 328,
    download_url: "mock://download/export-completed.csv",
  },
  "export-completed-xlsx": {
    export_id: "export-completed-xlsx",
    status: "COMPLETED",
    format: "XLSX",
    created_at: "2026-10-10T11:40:00Z",
    updated_at: "2026-10-10T11:42:00Z",
    file_name: "catalogo_completo.xlsx",
  },
  "export-failed": {
    export_id: "export-failed",
    status: "FAILED_GENERAL",
    format: "CSV",
    created_at: "2026-10-10T11:50:00Z",
    updated_at: "2026-10-10T11:51:10Z",
    error_message: "Error interno al consolidar snapshot de inventario para exportación",
  },
};

// Sample demonstration CSV (not claimed as normative official template)
export const MOCK_CSV_SAMPLE_DATA = `sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial
NK-RN-001-42,Zapatilla Running Air Sprint - Talla 42,Zapatilla deportiva para running,Calzado,Nike,Zapatilla,299.00,PEN,50
AD-TR-002-M,Camiseta Entrenamiento DryFit - Talla M,Camiseta transpirable,Ropa,Adidas,Camiseta deportiva,89.00,PEN,30
INK-FT-004-L,Short Futbol Pro - Talla L,Short de entrenamiento,Ropa,Inka Athletic,Ropa de entrenamiento,79.00,PEN,20
`;

export const MOCK_EXPORT_CSV_DATA = `sku,nombre,categoria,marca,precio_regular,precio_oferta,moneda,stock_disponible,estado
NK-RN-001-42,Zapatilla Running Air Sprint - Talla 42,Calzado,Nike,299.00,249.00,PEN,50,ACTIVO
NK-RN-001-43,Zapatilla Running Air Sprint - Talla 43,Calzado,Nike,299.00,,PEN,30,ACTIVO
AD-TR-002-M,Camiseta Entrenamiento DryFit - Talla M,Ropa,Adidas,89.00,,PEN,30,ACTIVO
`;

/**
 * Serializes failed rows to RFC 4180 CSV safely preventing formula injection.
 */
export function generateFailedRowsCsv(rows: BulkImportRow[]): string {
  const failed = rows.filter((r) => r.status === "FAILED");
  const headers = [
    "row_id",
    "sku",
    "nombre",
    "estado",
    "dominio_fallido",
    "codigo_error",
    "detalle_error",
    "necesita_reconciliacion",
  ];

  const lines = [headers.join(",")];

  for (const r of failed) {
    const values = [
      r.row_id.toString(),
      escapeCsvCell(r.sku ?? ""),
      escapeCsvCell(r.nombre ?? ""),
      r.status,
      r.failed_domain ?? "",
      r.code ?? "",
      escapeCsvCell(r.detail ?? ""),
      r.needs_reconciliation ? "true" : "false",
    ];
    lines.push(values.join(","));
  }

  return lines.join("\n") + "\n";
}

function escapeCsvCell(text: string): string {
  if (!text) return "";
  // Escape potential formula injection
  let sanitized = text;
  if (/^[=+\-@]/.test(sanitized)) {
    sanitized = `'${sanitized}`;
  }
  if (sanitized.includes(",") || sanitized.includes('"') || sanitized.includes("\n") || sanitized.includes("\r")) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}
