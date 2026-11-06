import {
  MOCK_CSV_SAMPLE_DATA,
  MOCK_EXPORT_CSV_DATA,
  generateFailedRowsCsv,
  mockBatches,
  mockExports,
} from "../mocks/bulkFixtures";
import type {
  BulkExportFormat,
  BulkExportJob,
  BulkImportBatch,
  BulkImportRow,
} from "../types/bulk";
import type {
  BulkRepository,
  DownloadResource,
} from "../services/bulkRepository";
import { BulkRepositoryError } from "../services/bulkErrors";
import { canMockProvideImportReport } from "../services/reportAvailability";
import { mockCatalogRepository } from "../../catalog/adapters/mockCatalogRepository";
import { sharedMockInventoryAdapter } from "../../inventory/adapters/mockInventoryAdapter";
import { createPricingRuntime } from "../../pricing/services/pricingService";
import {
  clearMockState,
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

export const DEMO_CONFIG = {
  PROCESSING_DELAY_MS: 1200,
  COMPLETION_DELAY_MS: 2400,
  AUTO_ADVANCE: true,
};

// In-memory state store for dynamic test interactions and active sessions
const dynamicBatches: Map<string, BulkImportBatch> = new Map();
const dynamicExports: Map<string, BulkExportJob> = new Map();
const activeTimers: Set<ReturnType<typeof setTimeout>> = new Set();
const activeBatchSimulations: Set<string> = new Set();
const activeExportSimulations: Set<string> = new Set();
const resumingBatches = new Set<string>();

let batchSequence = 1000;
let exportSequence = 1000;
let createImportCallCount = 0;

interface MockBulkState {
  batches: [string, BulkImportBatch][];
  exports: [string, BulkExportJob][];
  batchSequence: number;
  exportSequence: number;
  createImportCallCount: number;
}

function isBatchEntry(entry: unknown): boolean {
  if (!Array.isArray(entry) || entry.length !== 2) return false;
  const [id, batch] = entry;
  return (
    typeof id === "string" &&
    isRecord(batch) &&
    typeof batch.batch_id === "string" &&
    batch.batch_id === id &&
    typeof batch.status === "string" &&
    ["QUEUED", "PROCESSING", "COMPLETED", "FAILED_GENERAL"].includes(batch.status) &&
    (batch.total_rows === undefined || batch.total_rows === null || (typeof batch.total_rows === "number" && Number.isFinite(batch.total_rows) && batch.total_rows >= 0)) &&
    typeof batch.completed_rows === "number" &&
    Number.isFinite(batch.completed_rows) &&
    batch.completed_rows >= 0 &&
    typeof batch.failed_rows === "number" &&
    Number.isFinite(batch.failed_rows) &&
    batch.failed_rows >= 0 &&
    typeof batch.needs_reconciliation === "boolean" &&
    typeof batch.created_at === "string" &&
    typeof batch.updated_at === "string"
  );
}

function isExportEntry(entry: unknown): boolean {
  if (!Array.isArray(entry) || entry.length !== 2) return false;
  const [id, job] = entry;
  return (
    typeof id === "string" &&
    isRecord(job) &&
    typeof job.export_id === "string" &&
    job.export_id === id &&
    typeof job.status === "string" &&
    ["QUEUED", "PROCESSING", "COMPLETED", "FAILED_GENERAL"].includes(job.status) &&
    typeof job.format === "string" &&
    ["CSV", "XLSX"].includes(job.format) &&
    typeof job.created_at === "string" &&
    typeof job.updated_at === "string"
  );
}

function isMockBulkState(value: unknown): value is MockBulkState {
  return (
    isRecord(value) &&
    Array.isArray(value.batches) &&
    value.batches.every(isBatchEntry) &&
    Array.isArray(value.exports) &&
    value.exports.every(isExportEntry) &&
    typeof value.batchSequence === "number" &&
    Number.isFinite(value.batchSequence) &&
    value.batchSequence >= 0 &&
    typeof value.exportSequence === "number" &&
    Number.isFinite(value.exportSequence) &&
    value.exportSequence >= 0 &&
    typeof value.createImportCallCount === "number" &&
    Number.isFinite(value.createImportCallCount) &&
    value.createImportCallCount >= 0
  );
}

// Dynamic loads and exports live in the mock demonstration only. When a real browser
// session is available they are restored and persisted per browser, without promising
// cross-device synchronization.
const persistEnabled = isMockPersistenceAvailable();

function persistBulkState(): boolean {
  if (!persistEnabled) return true;
  const ok = saveMockState("bulk", {
    batches: [...dynamicBatches.entries()],
    exports: [...dynamicExports.entries()],
    batchSequence,
    exportSequence,
    createImportCallCount,
  } satisfies MockBulkState);
  publishMockChange("bulk");
  return ok;
}

function hydrateBulkStateFromStorage(): void {
  if (!persistEnabled) return;
  const stored = readMockState<MockBulkState>("bulk", isMockBulkState);
  if (!stored) return;
  dynamicBatches.clear();
  for (const [id, batch] of stored.batches) dynamicBatches.set(id, batch);
  dynamicExports.clear();
  for (const [id, job] of stored.exports) dynamicExports.set(id, job);
  batchSequence = stored.batchSequence;
  exportSequence = stored.exportSequence;
  createImportCallCount = stored.createImportCallCount;
  // In-flight work lost its timers on reload: reschedule it deterministically.
  for (const [id, batch] of dynamicBatches) {
    if (batch.status === "QUEUED" || batch.status === "PROCESSING") {
      if (batch.needs_reconciliation || batch.rows?.some((r) => r.needs_reconciliation)) {
        scheduleResumeSimulation(id);
      } else {
        scheduleImportSimulation(id);
      }
    }
  }
  for (const [id, job] of dynamicExports) {
    if (job.status === "QUEUED" || job.status === "PROCESSING") {
      scheduleExportSimulation(id);
    }
  }
  publishMockChange("bulk");
}

function deepCloneBatch(batch: BulkImportBatch): BulkImportBatch {
  return JSON.parse(JSON.stringify(batch)) as BulkImportBatch;
}

function deepCloneExport(job: BulkExportJob): BulkExportJob {
  return JSON.parse(JSON.stringify(job)) as BulkExportJob;
}

async function applyBatchRowsToConsumerModules(batch: BulkImportBatch) {
  if (!batch.rows || batch.rows.length === 0) return;

  for (const row of batch.rows) {
    if (!row.sku || !row.nombre) continue;
    if (row.status === "FAILED" && !row.needs_reconciliation) continue;
    if (row.status === "COMPLETED" && row.applied_domains.length === 3) continue;

    // 1. Comprobar si la fila ya fue aplicada para cada dominio.
    const catalogDone = row.applied_domains.includes("CATALOGO");
    const pricingDone = row.applied_domains.includes("PRICING");
    const inventoryDone = row.applied_domains.includes("INVENTARIO");

    // 2. Aplicar Catalog
    if (!catalogDone) {
      try {
        await mockCatalogRepository.applyBulkProducts(
          [
            {
              rowId: row.row_id,
              sku: row.sku,
              name: row.nombre,
              description: row.descripcion,
              categoryName: row.categoria,
              brandName: row.marca,
              typeName: row.tipo_producto,
              priceInitial: row.precio_regular,
            },
          ],
          batch.batch_id,
        );
        // 3. Confirmar que Catalog guardó correctamente.
        row.applied_domains.push("CATALOGO");
        const catalogStep = row.steps.find((s) => s.domain === "CATALOGO");
        if (catalogStep) {
          catalogStep.status = "COMPLETED";
          catalogStep.detail = "Borrador creado e inicializado";
          catalogStep.code = null;
        }
      } catch (err) {
        // Catalog failed! Do not continue to Inventory.
        row.status = "FAILED";
        row.failed_domain = "CATALOGO";
        row.needs_reconciliation = true;
        const msg = err instanceof Error ? err.message : "Error al aplicar producto en Catálogo";
        if (msg.includes("ya existe en el catálogo")) {
          row.code = "SKU_DUPLICADO";
          row.needs_reconciliation = false;
        } else if (msg.includes("Categoría") && (msg.includes("no encontrada") || msg.includes("inactiva"))) {
          row.code = "CATEGORIA_INVALIDA";
        } else if (msg.includes("Múltiples categorías")) {
          row.code = "CATEGORIA_DUPLICADA";
        } else if (msg.includes("Marca") && (msg.includes("no encontrada") || msg.includes("inactiva"))) {
          row.code = "MARCA_INVALIDA";
        } else if (msg.includes("Múltiples marcas")) {
          row.code = "MARCA_INVALIDA";
        } else if (msg.includes("Tipo de producto") && (msg.includes("no encontrado") || msg.includes("inactivo"))) {
          row.code = "TIPO_PRODUCTO_NO_ENCONTRADO";
        } else if (msg.includes("Múltiples tipos de producto") || msg.includes("tipo de producto es obligatorio")) {
          row.code = "TIPO_PRODUCTO_INVALIDO";
        } else {
          row.code = "ERROR_INTERNO";
        }
        row.detail = msg;
        const catalogStep = row.steps.find((s) => s.domain === "CATALOGO");
        if (catalogStep) {
          catalogStep.status = "FAILED";
          catalogStep.code = row.code;
          catalogStep.detail = msg;
        }
        const pricingStep = row.steps.find((s) => s.domain === "PRICING");
        if (pricingStep) {
          pricingStep.status = "PENDING";
          pricingStep.detail = "No iniciado debido a fallo en Catálogo";
        }
        const invStep = row.steps.find((s) => s.domain === "INVENTARIO");
        if (invStep) {
          invStep.status = "PENDING";
          invStep.detail = "No iniciado debido a fallo en Catálogo";
        }
        continue;
      }
    }

    // 4. Confirmar el precio regular a través de Pricing, utilizando la proyección desde Catalog; no crear un segundo precio independiente.
    if (!pricingDone) {
      try {
        const pricingRuntime = await createPricingRuntime("mock");
        const targets = await pricingRuntime.service.listTargets(new AbortController().signal);
        const normSku = row.sku.trim().toUpperCase();
        const foundTarget = targets.find(
          (t) =>
            (t.kind === "product" && t.referenceSku?.trim().toUpperCase() === normSku) ||
            (t.kind === "variant" && t.sku.trim().toUpperCase() === normSku),
        );

        if (!foundTarget) {
          throw new Error(`Objetivo de precio no encontrado para el SKU ${row.sku}`);
        }

        const snapshot = await pricingRuntime.service.read(
          { targetId: foundTarget.id, channel: "global" },
          new AbortController().signal,
        );

        if (!snapshot || !snapshot.price) {
          throw new Error(`Precio vigente no disponible para el SKU ${row.sku}`);
        }

        if (snapshot.price.currency !== "PEN") {
          throw new Error(`Moneda inválida en Pricing: esperada PEN, encontrada ${snapshot.price.currency}`);
        }

        const currentRegularVal = Number(snapshot.price.regular);
        const expectedRegularVal = Number(row.precio_regular);
        if (
          !Number.isFinite(currentRegularVal) ||
          !Number.isFinite(expectedRegularVal) ||
          Math.abs(currentRegularVal - expectedRegularVal) > 0.001
        ) {
          throw new Error(
            `Discrepancia en precio regular: esperado ${expectedRegularVal}, registrado ${currentRegularVal}`,
          );
        }

        row.applied_domains.push("PRICING");
        const pricingStep = row.steps.find((s) => s.domain === "PRICING");
        if (pricingStep) {
          pricingStep.status = "COMPLETED";
          pricingStep.detail =
            row.precio_regular !== undefined
              ? `Precio regular S/ ${expectedRegularVal.toFixed(2)} registrado`
              : "Precio regular registrado";
          pricingStep.code = null;
        }
      } catch (err) {
        row.status = "FAILED";
        row.failed_domain = "PRICING";
        row.needs_reconciliation = true;
        const msg = err instanceof Error ? err.message : "Error al confirmar precio en Pricing";
        row.code = "ERROR_INTERNO";
        row.detail = msg;
        const pricingStep = row.steps.find((s) => s.domain === "PRICING");
        if (pricingStep) {
          pricingStep.status = "FAILED";
          pricingStep.code = "ERROR_INTERNO";
          pricingStep.detail = msg;
        }
        const invStep = row.steps.find((s) => s.domain === "INVENTARIO");
        if (invStep) {
          invStep.status = "PENDING";
          invStep.detail = "No iniciado debido a fallo en Pricing";
        }
        continue;
      }
    }

    // 5. Aplicar Inventory
    if (!inventoryDone) {
      try {
        sharedMockInventoryAdapter.applyBulkStock(
          [
            {
              batchId: batch.batch_id,
              rowId: row.row_id,
              sku: row.sku,
              productName: row.nombre,
              categoryName: row.categoria,
              brandName: row.marca,
              stock: row.stock_inicial,
            },
          ],
          batch.batch_id,
        );
        // 6. Confirmar que Inventory guardó correctamente.
        row.applied_domains.push("INVENTARIO");
        const invStep = row.steps.find((s) => s.domain === "INVENTARIO");
        if (invStep) {
          invStep.status = "COMPLETED";
          invStep.detail =
            row.stock_inicial !== undefined
              ? `SKU inicializado y stock ${row.stock_inicial} u. aplicado`
              : "SKU inicializado";
          invStep.code = null;
        }
      } catch (err) {
        // Inventory failed! Keep Catalog and Pricing as applied, and leave Inventory pending reconciliation
        row.status = "FAILED";
        row.failed_domain = "INVENTARIO";
        row.needs_reconciliation = true;
        const msg = err instanceof Error ? err.message : "Error al aplicar existencias en Inventario";
        if (msg.includes("Conflicto de idempotencia")) {
          row.code = "IDEMPOTENCY_CONFLICT";
        } else if (msg.includes("variantes")) {
          row.code = "SKU_INVALIDO";
        } else {
          row.code = "ERROR_INTERNO";
        }
        row.detail = msg;
        const invStep = row.steps.find((s) => s.domain === "INVENTARIO");
        if (invStep) {
          invStep.status = "FAILED";
          invStep.code = row.code;
          invStep.detail = msg;
        }
        continue;
      }
    }

    // 7. Solo entonces marcar los tres dominios como completados.
    row.status = "COMPLETED";
    row.failed_domain = null;
    row.code = null;
    row.needs_reconciliation = false;
    row.detail = "Producto, precio base y SKU inicializados correctamente";
  }

  // 8. Persistir el resultado de la fila en Bulk.
  publishMockChange("pricing");
  publishMockChange("inventory");
}

function scheduleImportSimulation(batchId: string) {
  if (!DEMO_CONFIG.AUTO_ADVANCE || activeBatchSimulations.has(batchId)) return;
  activeBatchSimulations.add(batchId);

  const t1 = setTimeout(() => {
    activeTimers.delete(t1);
    const batch = dynamicBatches.get(batchId);
    if (batch && batch.status === "QUEUED") {
      const prev = deepCloneBatch(batch);
      batch.status = "PROCESSING";
      const total = typeof batch.total_rows === "number" ? batch.total_rows : null;
      batch.completed_rows = total !== null ? Math.floor(total * 0.7) : 0;
      batch.failed_rows = 0;
      if (batch.rows && batch.rows.length > 0) {
        for (const row of batch.rows) {
          if (row.status !== "FAILED") {
            row.status = "PROCESSING";
            row.detail = "Procesando dominios";
            row.steps = row.steps.map((s) => ({ ...s, status: "PROCESSING" }));
          }
        }
      }
      batch.updated_at = new Date().toISOString();
      const ok = persistBulkState();
      if (!ok && persistEnabled) {
        dynamicBatches.set(batchId, prev);
      }
    }
  }, DEMO_CONFIG.PROCESSING_DELAY_MS);
  activeTimers.add(t1);

  const t2 = setTimeout(async () => {
    activeTimers.delete(t2);
    activeBatchSimulations.delete(batchId);
    const batch = dynamicBatches.get(batchId);
    if (batch && (batch.status === "PROCESSING" || batch.status === "QUEUED")) {
      const prev = deepCloneBatch(batch);
      const total = typeof batch.total_rows === "number" ? batch.total_rows : null;
      // An XLSX without verified rows in browser does not finalize as COMPLETED with 0 rows in simulation
      if (total === null && (!batch.rows || batch.rows.length === 0)) {
        batch.status = "PROCESSING";
        batch.completed_rows = 0;
        batch.failed_rows = 0;
        batch.updated_at = new Date().toISOString();
      } else {
        await applyBatchRowsToConsumerModules(batch);
        batch.completed_rows = batch.rows && batch.rows.length > 0
          ? batch.rows.filter(r => r.status === "COMPLETED").length
          : (total ?? 0);
        batch.failed_rows = batch.rows && batch.rows.length > 0
          ? batch.rows.filter(r => r.status === "FAILED").length
          : 0;
        batch.needs_reconciliation = batch.failed_rows > 0;
        batch.status = "COMPLETED";
        batch.updated_at = new Date().toISOString();
        if (!batch.rows) {
          batch.rows = [];
        }
      }
      const ok = persistBulkState();
      if (!ok && persistEnabled) {
        dynamicBatches.set(batchId, prev);
      }
    }
  }, DEMO_CONFIG.COMPLETION_DELAY_MS);
  activeTimers.add(t2);
}

async function applyReconciliationCompletion(batch: BulkImportBatch) {
  batch.updated_at = new Date().toISOString();

  if (batch.rows && batch.rows.length > 0) {
    for (const row of batch.rows) {
      if (row.status === "FAILED" && row.needs_reconciliation) {
        row.status = "PROCESSING";
        row.detail = "Reintentando dominios pendientes";
      }
    }
    await applyBatchRowsToConsumerModules(batch);
    batch.completed_rows = batch.rows.filter((r) => r.status === "COMPLETED").length;
    batch.failed_rows = batch.rows.filter((r) => r.status === "FAILED").length;
    batch.needs_reconciliation = batch.rows.some(
      (r) => r.status === "FAILED" && r.needs_reconciliation,
    );
    batch.status = "COMPLETED";
  } else {
    const total = typeof batch.total_rows === "number" ? batch.total_rows : null;
    batch.completed_rows = total ?? 0;
    batch.failed_rows = 0;
    batch.needs_reconciliation = false;
    batch.status = "COMPLETED";
  }
}

function scheduleResumeSimulation(batchId: string) {
  if (!DEMO_CONFIG.AUTO_ADVANCE || activeBatchSimulations.has(batchId)) return;
  activeBatchSimulations.add(batchId);

  const t1 = setTimeout(() => {
    activeTimers.delete(t1);
    const batch = dynamicBatches.get(batchId);
    if (batch && batch.status === "QUEUED") {
      const prev = deepCloneBatch(batch);
      batch.status = "PROCESSING";
      batch.updated_at = new Date().toISOString();
      const ok = persistBulkState();
      if (!ok && persistEnabled) {
        dynamicBatches.set(batchId, prev);
      }
    }
  }, DEMO_CONFIG.PROCESSING_DELAY_MS);
  activeTimers.add(t1);

  const t2 = setTimeout(async () => {
    activeTimers.delete(t2);
    activeBatchSimulations.delete(batchId);
    const batch = dynamicBatches.get(batchId);
    if (batch && (batch.status === "PROCESSING" || batch.status === "QUEUED")) {
      const prev = deepCloneBatch(batch);
      await applyReconciliationCompletion(batch);
      const ok = persistBulkState();
      if (!ok && persistEnabled) {
        dynamicBatches.set(batchId, prev);
      }
    }
  }, DEMO_CONFIG.COMPLETION_DELAY_MS);
  activeTimers.add(t2);
}

function scheduleExportSimulation(exportId: string) {
  if (!DEMO_CONFIG.AUTO_ADVANCE || activeExportSimulations.has(exportId)) return;
  activeExportSimulations.add(exportId);

  const t1 = setTimeout(() => {
    activeTimers.delete(t1);
    const job = dynamicExports.get(exportId);
    if (job && job.status === "QUEUED") {
      const prev = structuredClone(job);
      job.status = "PROCESSING";
      job.updated_at = new Date().toISOString();
      const ok = persistBulkState();
      if (!ok && persistEnabled) {
        dynamicExports.set(exportId, prev);
      }
    }
  }, DEMO_CONFIG.PROCESSING_DELAY_MS);
  activeTimers.add(t1);

  const t2 = setTimeout(() => {
    activeTimers.delete(t2);
    activeExportSimulations.delete(exportId);
    const job = dynamicExports.get(exportId);
    if (job && (job.status === "PROCESSING" || job.status === "QUEUED")) {
      const prev = structuredClone(job);
      job.status = "COMPLETED";
      job.updated_at = new Date().toISOString();
      if (job.format === "CSV") {
        job.file_name = `catalogo_completo_${exportId}.csv`;
        job.file_size = MOCK_EXPORT_CSV_DATA.length;
        job.download_url = `mock://download/${exportId}.csv`;
      } else {
        job.file_name = `catalogo_completo_${exportId}.xlsx`;
      }
      const ok = persistBulkState();
      if (!ok && persistEnabled) {
        dynamicExports.set(exportId, prev);
      }
    }
  }, DEMO_CONFIG.COMPLETION_DELAY_MS);
  activeTimers.add(t2);
}
export interface CsvParsedRow {
  rowNumber: number;
  columns: string[];
  hasUnclosedQuote?: boolean;
  syntaxError?: string;
}

export function parseCsvRecords(text: string): CsvParsedRow[] {
  const rows: CsvParsedRow[] = [];
  let currentFields: string[] = [];
  let currentField = "";
  let state: "START_FIELD" | "UNQUOTED_FIELD" | "QUOTED_FIELD" | "AFTER_QUOTE" = "START_FIELD";
  let rowNumber = 1;
  let rowHasError: string | null = null;
  let hasUnclosedQuote = false;

  let i = 0;
  const len = text.length;

  const pushField = () => {
    currentFields.push(currentField);
    currentField = "";
    state = "START_FIELD";
  };

  const pushRow = () => {
    pushField();
    rows.push({
      rowNumber,
      columns: currentFields,
      hasUnclosedQuote,
      syntaxError: rowHasError ?? undefined,
    });
    rowNumber++;
    currentFields = [];
    rowHasError = null;
    hasUnclosedQuote = false;
  };

  while (i < len) {
    const ch = text[i];

    if (state === "START_FIELD") {
      if (ch === '"') {
        state = "QUOTED_FIELD";
        i++;
      } else if (ch === ",") {
        currentFields.push("");
        i++;
      } else if (ch === "\r") {
        if (i + 1 < len && text[i + 1] === "\n") {
          i++;
        }
        if (currentFields.length > 0) {
          pushRow();
        }
        i++;
      } else if (ch === "\n") {
        if (currentFields.length > 0) {
          pushRow();
        }
        i++;
      } else {
        currentField += ch;
        state = "UNQUOTED_FIELD";
        i++;
      }
    } else if (state === "UNQUOTED_FIELD") {
      if (ch === '"') {
        rowHasError = "Comilla no permitida dentro de campo sin comillas";
        currentField += ch;
        i++;
      } else if (ch === ",") {
        pushField();
        i++;
      } else if (ch === "\r") {
        if (i + 1 < len && text[i + 1] === "\n") {
          i++;
        }
        pushRow();
        i++;
      } else if (ch === "\n") {
        pushRow();
        i++;
      } else {
        currentField += ch;
        i++;
      }
    } else if (state === "QUOTED_FIELD") {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          state = "AFTER_QUOTE";
          i++;
        }
      } else {
        currentField += ch;
        i++;
      }
    } else if (state === "AFTER_QUOTE") {
      if (ch === ",") {
        pushField();
        i++;
      } else if (ch === "\r") {
        if (i + 1 < len && text[i + 1] === "\n") {
          i++;
        }
        pushRow();
        i++;
      } else if (ch === "\n") {
        pushRow();
        i++;
      } else {
        rowHasError = "Caracteres no permitidos después de comilla de cierre";
        currentField += ch;
        i++;
      }
    }
  }

  if (state === "QUOTED_FIELD") {
    hasUnclosedQuote = true;
    pushRow();
  } else if (currentFields.length > 0 || currentField.length > 0 || state === "AFTER_QUOTE") {
    pushRow();
  }

  return rows;
}

export const mockBulkRepository: BulkRepository & {
  advanceMockImport?: (batchId: string) => Promise<BulkImportBatch | null>;
  advanceMockExport?: (exportId: string) => Promise<BulkExportJob | null>;
  resetMockState?: () => void;
  clearMockTimers?: () => void;
  getCreateImportCallCount?: () => number;
} = {
  async getTemplate(
    format: BulkExportFormat,
    signal?: AbortSignal,
  ): Promise<DownloadResource | null> {
    signal?.throwIfAborted();
    if (format === "CSV") {
      const blob = new Blob([MOCK_CSV_SAMPLE_DATA], {
        type: "text/csv;charset=utf-8;",
      });
      return {
        blob,
        fileName: "ejemplo_carga_productos.csv",
      };
    }
    // Official XLSX template is pending integration with bulk-svc provider
    return null;
  },

  async createImport(
    file: File,
    _localSummary?: { detectedRows?: number },
    signal?: AbortSignal,
  ): Promise<BulkImportBatch> {
    createImportCallCount++;
    signal?.throwIfAborted();

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xlsx")) {
      throw new BulkRepositoryError(
        "La importación Excel no está disponible en este entorno.",
        "configuration",
      );
    }

    // Rejection scenarios based on scenario param or file naming
    if (lowerName.includes("invalido")) {
      throw new BulkRepositoryError(
        "El archivo seleccionado no tiene una estructura legible o contiene caracteres corruptos.",
        "rejected",
      );
    }
    if (lowerName.includes("excede")) {
      throw new BulkRepositoryError(
        "El archivo excede el tamaño máximo permitido por el servicio.",
        "rejected",
      );
    }
    if (
      lowerName.includes("incompatible")
    ) {
      throw new BulkRepositoryError(
        "La plantilla no coincide con la versión vigente de carga masiva.",
        "rejected",
      );
    }
    if (
      lowerName.includes("macros")
    ) {
      throw new BulkRepositoryError(
        "El archivo contiene macros o contenido activo no admitido por la política de seguridad.",
        "rejected",
      );
    }

    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx")) {
      throw new BulkRepositoryError(
        `Formato no admitido. Se requiere un archivo con extensión .csv o .xlsx (recibido: ${file.name})`,
        "rejected",
      );
    }
    const parsedRows: BulkImportRow[] = [];
    if (lowerName.endsWith(".csv")) {
      let text: string;
      try {
        text = await file.text();
      } catch {
        throw new BulkRepositoryError(
          "No se pudo leer el archivo CSV. Vuelve a intentarlo.",
          "communication",
        );
      }

      if (!text.trim()) {
        throw new BulkRepositoryError("El archivo CSV está vacío.", "rejected");
      }

      const records = parseCsvRecords(text);
      if (records.length === 0 || (records.length === 1 && !records[0]!.columns.some((column) => column.trim()))) {
        throw new BulkRepositoryError("El archivo CSV no contiene filas de datos.", "rejected");
      }
      const headerRecord = records[0]!;
      if (records.length === 1 && (headerRecord.hasUnclosedQuote || headerRecord.syntaxError)) {
        throw new BulkRepositoryError("La cabecera del archivo CSV está malformada.", "rejected");
      }

      if (records.length > 0) {
          const headerRow = records[0]!;
          const MANDATORY_COLUMNS = [
            "sku",
            "nombre",
            "descripcion",
            "categoria",
            "marca",
            "tipo_producto",
            "precio_regular",
            "moneda",
            "stock_inicial",
          ] as const;

          const headerCols = headerRow.columns.map((h) => h.trim().toLowerCase());
          const missingHeaderCols = MANDATORY_COLUMNS.filter((col) => !headerCols.includes(col));

          const skuIdx = headerCols.indexOf("sku");
          const nameIdx = headerCols.indexOf("nombre");
          const descIdx = headerCols.indexOf("descripcion");
          const catIdx = headerCols.indexOf("categoria");
          const brandIdx = headerCols.indexOf("marca");
          const typeIdx = headerCols.indexOf("tipo_producto");
          const priceIdx = headerCols.indexOf("precio_regular");
          const currencyIdx = headerCols.indexOf("moneda");
          const stockIdx = headerCols.indexOf("stock_inicial");

          const seenSkusInFile = new Set<string>();

          for (let i = 1; i < records.length; i++) {
            const rowRecord = records[i]!;
            const rowId = i;

            if (headerRow.hasUnclosedQuote || headerRow.syntaxError) {
              parsedRows.push({
                row_id: rowId,
                sku: `ROW-${rowId}`,
                nombre: "Fila con cabecera inválida",
                status: "FAILED",
                applied_domains: [],
                failed_domain: "CATALOGO",
                needs_reconciliation: false,
                code: "VALIDACION",
                detail: headerRow.hasUnclosedQuote ? "Cabecera con comilla sin cerrar." : headerRow.syntaxError!,
                steps: [
                  { domain: "CATALOGO", status: "FAILED", code: "VALIDACION", detail: "Cabecera inválida" },
                  { domain: "PRICING", status: "PENDING", detail: "No iniciado por formato inválido" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado por formato inválido" },
                ],
              });
              continue;
            }

            if (missingHeaderCols.length > 0) {
              parsedRows.push({
                row_id: rowId,
                sku: `ROW-${rowId}`,
                nombre: "Fila con plantilla incompleta",
                status: "FAILED",
                applied_domains: [],
                failed_domain: "CATALOGO",
                needs_reconciliation: false,
                code: "DATOS_INCOMPLETOS",
                detail: `Columnas obligatorias ausentes en la cabecera: ${missingHeaderCols.join(", ")}.`,
                steps: [
                  { domain: "CATALOGO", status: "FAILED", code: "DATOS_INCOMPLETOS", detail: `Faltan columnas: ${missingHeaderCols.join(", ")}` },
                  { domain: "PRICING", status: "PENDING", detail: "No iniciado por plantilla incompleta" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado por plantilla incompleta" },
                ],
              });
              continue;
            }

            if (rowRecord.hasUnclosedQuote || rowRecord.syntaxError) {
              parsedRows.push({
                row_id: rowId,
                sku: `ROW-${rowId}`,
                nombre: "Fila con formato CSV inválido",
                status: "FAILED",
                applied_domains: [],
                failed_domain: "CATALOGO",
                needs_reconciliation: false,
                code: "VALIDACION",
                detail: rowRecord.hasUnclosedQuote ? "Fila inválida: comilla sin cerrar." : rowRecord.syntaxError!,
                steps: [
                  { domain: "CATALOGO", status: "FAILED", code: "VALIDACION", detail: rowRecord.hasUnclosedQuote ? "Comilla sin cerrar" : "Error sintaxis CSV" },
                  { domain: "PRICING", status: "PENDING", detail: "No iniciado por formato inválido" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado por formato inválido" },
                ],
              });
              continue;
            }

            if (rowRecord.columns.length !== headerCols.length) {
              parsedRows.push({
                row_id: rowId,
                sku: `ROW-${rowId}`,
                nombre: "Fila con columnas inconsistentes",
                status: "FAILED",
                applied_domains: [],
                failed_domain: "CATALOGO",
                needs_reconciliation: false,
                code: "VALIDACION",
                detail: `Número de columnas (${rowRecord.columns.length}) no coincide con la cabecera (${headerCols.length}).`,
                steps: [
                  { domain: "CATALOGO", status: "FAILED", code: "VALIDACION", detail: "Columnas inconsistentes" },
                  { domain: "PRICING", status: "PENDING", detail: "No iniciado por formato inválido" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado por formato inválido" },
                ],
              });
              continue;
            }

            const cols = rowRecord.columns.map((c) => c.trim());
            const sku = skuIdx !== -1 ? cols[skuIdx] : "";
            const nombre = nameIdx !== -1 ? cols[nameIdx] : "";
            const descripcion = descIdx !== -1 ? cols[descIdx] : undefined;
            const categoria = catIdx !== -1 ? cols[catIdx] : undefined;
            const marca = brandIdx !== -1 ? cols[brandIdx] : undefined;
            const tipo_producto = typeIdx !== -1 ? cols[typeIdx] : undefined;
            const priceRaw = priceIdx !== -1 ? cols[priceIdx] : "";
            const currencyRaw = currencyIdx !== -1 && cols[currencyIdx] ? cols[currencyIdx].toUpperCase() : "";
            const stockRaw = stockIdx !== -1 ? cols[stockIdx] : "";

            if (!sku || !nombre) {
              parsedRows.push({
                row_id: rowId,
                sku: sku || `ROW-${rowId}`,
                nombre: nombre || "Producto sin nombre",
                status: "FAILED",
                applied_domains: [],
                failed_domain: "CATALOGO",
                needs_reconciliation: false,
                code: "DATOS_INCOMPLETOS",
                detail: "SKU y nombre son obligatorios y no pueden estar vacíos.",
                steps: [
                  { domain: "CATALOGO", status: "FAILED", code: "DATOS_INCOMPLETOS", detail: "SKU y nombre obligatorios" },
                  { domain: "PRICING", status: "PENDING", detail: "No iniciado" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado" },
                ],
              });
              continue;
            }

            const skuUpper = sku.toUpperCase();
            if (seenSkusInFile.has(skuUpper)) {
              parsedRows.push({
                row_id: rowId,
                sku,
                nombre,
                status: "FAILED",
                applied_domains: [],
                failed_domain: "CATALOGO",
                needs_reconciliation: false,
                code: "SKU_DUPLICADO",
                detail: `SKU "${sku}" duplicado dentro del mismo archivo.`,
                steps: [
                  { domain: "CATALOGO", status: "FAILED", code: "SKU_DUPLICADO", detail: "SKU duplicado en archivo" },
                  { domain: "PRICING", status: "PENDING", detail: "No iniciado" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado" },
                ],
              });
              continue;
            }
            seenSkusInFile.add(skuUpper);

            const priceNum = priceRaw ? Number(priceRaw) : NaN;
            if (!priceRaw || isNaN(priceNum) || !Number.isFinite(priceNum) || priceNum <= 0) {
              parsedRows.push({
                row_id: rowId,
                sku,
                nombre,
                status: "FAILED",
                applied_domains: [],
                failed_domain: "PRICING",
                needs_reconciliation: false,
                code: "PRECIO_INVALIDO",
                detail: `El precio regular es obligatorio y debe ser un decimal positivo finito (recibido: "${priceRaw}").`,
                steps: [
                  { domain: "CATALOGO", status: "PENDING", detail: "Pendiente" },
                  { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Precio inválido o ausente" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado" },
                ],
              });
              continue;
            }

            if (!currencyRaw || currencyRaw !== "PEN") {
              parsedRows.push({
                row_id: rowId,
                sku,
                nombre,
                status: "FAILED",
                applied_domains: [],
                failed_domain: "PRICING",
                needs_reconciliation: false,
                code: "PRECIO_INVALIDO",
                detail: `Moneda no admitida o ausente: "${currencyRaw}". Solo se admite PEN.`,
                steps: [
                  { domain: "CATALOGO", status: "PENDING", detail: "Pendiente" },
                  { domain: "PRICING", status: "FAILED", code: "PRECIO_INVALIDO", detail: "Moneda no admitida" },
                  { domain: "INVENTARIO", status: "PENDING", detail: "No iniciado" },
                ],
              });
              continue;
            }

            const stockNum = stockRaw ? Number(stockRaw) : NaN;
            if (!stockRaw || !/^\d+$/.test(stockRaw) || !Number.isSafeInteger(stockNum) || stockNum < 0) {
              parsedRows.push({
                row_id: rowId,
                sku,
                nombre,
                status: "FAILED",
                applied_domains: [],
                failed_domain: "INVENTARIO",
                needs_reconciliation: false,
                code: "CANTIDAD_INVALIDA",
                detail: `El stock inicial es obligatorio y debe ser un entero no negativo (recibido: "${stockRaw}").`,
                steps: [
                  { domain: "CATALOGO", status: "PENDING", detail: "Pendiente" },
                  { domain: "PRICING", status: "PENDING", detail: "Pendiente" },
                  { domain: "INVENTARIO", status: "FAILED", code: "CANTIDAD_INVALIDA", detail: "Stock inválido o ausente" },
                ],
              });
              continue;
            }

            // Valid row
            parsedRows.push({
              row_id: rowId,
              sku,
              nombre,
              descripcion,
              categoria,
              marca,
              tipo_producto,
              moneda: currencyRaw,
              precio_regular: priceNum,
              stock_inicial: stockNum,
              status: "PENDING",
              applied_domains: [],
              failed_domain: null,
              needs_reconciliation: false,
              detail: "Pendiente de procesamiento",
              steps: [
                { domain: "CATALOGO", status: "PENDING", detail: "Pendiente" },
                { domain: "PRICING", status: "PENDING", detail: `Precio regular S/ ${priceNum.toFixed(2)} registrado` },
                { domain: "INVENTARIO", status: "PENDING", detail: `SKU inicializado y stock ${stockNum} u. aplicado` },
              ],
            });
          }
      }

      if (parsedRows.length === 0) {
        throw new BulkRepositoryError("El archivo CSV no contiene filas procesables.", "rejected");
      }
    }

    // CSV row counts come only from the content parsed by this repository.
    const estimatedRows = parsedRows.length > 0 ? parsedRows.length : undefined;

    batchSequence++;
    const batchId = `lote-imp-${batchSequence}-${Math.random().toString(36).slice(2, 6)}`;
    const newBatch: BulkImportBatch = {
      batch_id: batchId,
      status: "QUEUED",
      total_rows: estimatedRows,
      completed_rows: 0,
      failed_rows: 0,
      needs_reconciliation: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_name: file.name,
      file_size: file.size,
      rows: parsedRows,
    };

    dynamicBatches.set(batchId, newBatch);
    const ok = persistBulkState();
    if (!ok && persistEnabled) {
      dynamicBatches.delete(batchId);
      throw new BulkRepositoryError(
        "No se pudo iniciar la importación. Vuelve a intentarlo.",
        "communication",
      );
    }
    scheduleImportSimulation(batchId);

    return deepCloneBatch(newBatch);
  },

  /**
   * Pure, idempotent read of batch state with ZERO side-effects.
   * Priority: 1) Dynamic instance, 2) Static fixture, 3) null.
   */
  async getImport(
    batchId: string,
    signal?: AbortSignal,
  ): Promise<BulkImportBatch | null> {
    signal?.throwIfAborted();

    if (batchId === "batch-status-unavailable") {
      throw new Error(
        "No se pudo consultar el estado del lote en este momento. La última información confirmada se conserva.",
      );
    }

    // 1. Check dynamic in-memory batch first (e.g. newly created or resumed)
    const dynamic = dynamicBatches.get(batchId);
    if (dynamic) {
      return deepCloneBatch(dynamic);
    }

    // 2. Fallback to fixed static fixture
    const fixture = mockBatches[batchId];
    if (fixture) {
      return deepCloneBatch(fixture);
    }

    return null;
  },

  async getImportReport(
    batchId: string,
    signal?: AbortSignal,
  ): Promise<DownloadResource | null> {
    signal?.throwIfAborted();
    const batch = await this.getImport(batchId, signal);
    if (!batch || !canMockProvideImportReport(batch)) {
      return null;
    }

    const failedRows = (batch.rows ?? []).filter((r) => r.status === "FAILED");
    if (failedRows.length === 0) {
      return null;
    }

    const csvContent = generateFailedRowsCsv(failedRows);
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    return {
      blob,
      fileName: `reporte_errores_${batchId}.csv`,
    };
  },

  canDownloadImportReport(batch: BulkImportBatch) {
    return canMockProvideImportReport(batch);
  },

  /**
   * Idempotent resume of an eligible batch.
   * Preserves batch_id, total_rows, and confirmed completed rows.
   */
  async resumeImport(
    batchId: string,
    signal?: AbortSignal,
  ): Promise<BulkImportBatch> {
    signal?.throwIfAborted();

    const existing = await this.getImport(batchId, signal);
    if (!existing) {
      throw new Error(`No se encontró el lote ${batchId} para reanudar.`);
    }

    // Validate eligibility for resume
    if (existing.status === "QUEUED" || existing.status === "PROCESSING") {
      throw new Error(
        `El lote ${batchId} ya se encuentra en proceso de reanudación o ejecución.`,
      );
    }

    if (!existing.needs_reconciliation || existing.failed_rows === 0) {
      throw new Error(
        `El lote ${batchId} no contiene operaciones pendientes ni requiere reconciliación.`,
      );
    }

    if (resumingBatches.has(batchId)) {
      throw new Error(`El lote ${batchId} ya tiene una reanudación en curso.`);
    }
    resumingBatches.add(batchId);

    const resumedBatch: BulkImportBatch = {
      ...existing,
      status: "QUEUED",
      updated_at: new Date().toISOString(),
    };

    const previousBatch = dynamicBatches.get(batchId)
      ? deepCloneBatch(dynamicBatches.get(batchId)!)
      : undefined;
    dynamicBatches.set(batchId, resumedBatch);
    const ok = persistBulkState();
    if (!ok && persistEnabled) {
      if (previousBatch) {
        dynamicBatches.set(batchId, previousBatch);
      } else {
        dynamicBatches.delete(batchId);
      }
      resumingBatches.delete(batchId);
      throw new BulkRepositoryError(
        "No se pudo reanudar la importación. Vuelve a intentarlo.",
        "communication",
      );
    }
    scheduleResumeSimulation(batchId);
    // The demo returns the 202-shaped response synchronously. The guard remains active
    // until the next turn so a rapid duplicate cannot schedule a second run.
    queueMicrotask(() => resumingBatches.delete(batchId));

    return deepCloneBatch(resumedBatch);
  },

  async createExport(
    format: BulkExportFormat,
    signal?: AbortSignal,
  ): Promise<BulkExportJob> {
    signal?.throwIfAborted();

    exportSequence++;
    const exportId = `exp-${exportSequence}-${Math.random().toString(36).slice(2, 6)}`;
    const newJob: BulkExportJob = {
      export_id: exportId,
      status: "QUEUED",
      format,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    dynamicExports.set(exportId, newJob);
    const ok = persistBulkState();
    if (!ok && persistEnabled) {
      dynamicExports.delete(exportId);
      throw new BulkRepositoryError(
        "No se pudo iniciar la exportación. Vuelve a intentarlo.",
        "communication",
      );
    }
    scheduleExportSimulation(exportId);

    return deepCloneExport(newJob);
  },

  /**
   * Pure, idempotent read of export job state with ZERO side-effects.
   */
  async getExport(
    exportId: string,
    signal?: AbortSignal,
  ): Promise<BulkExportJob | null> {
    signal?.throwIfAborted();

    if (exportId === "export-status-unavailable") {
      throw new Error(
        "No se pudo consultar el estado de la exportación. Reintente en unos momentos.",
      );
    }

    const dynamic = dynamicExports.get(exportId);
    if (dynamic) {
      return deepCloneExport(dynamic);
    }

    const fixture = mockExports[exportId];
    if (fixture) {
      return deepCloneExport(fixture);
    }

    return null;
  },

  /**
   * Pure download resource retrieval with ZERO state transition side-effects.
   */
  async getExportFile(
    exportId: string,
    signal?: AbortSignal,
  ): Promise<DownloadResource | null> {
    signal?.throwIfAborted();

    // Read job directly without mutating state
    const job = dynamicExports.get(exportId) ?? mockExports[exportId];
    if (!job || job.status !== "COMPLETED") {
      return null;
    }

    if (job.format === "CSV") {
      const blob = new Blob([MOCK_EXPORT_CSV_DATA], {
        type: "text/csv;charset=utf-8;",
      });
      return {
        blob,
        fileName: job.file_name ?? `exportacion_catalogo_${exportId}.csv`,
      };
    }

    // XLSX format requires real backend export service
    return null;
  },

  /**
   * Internal simulation transition helper for testing and development.
   */
  async advanceMockImport(batchId: string): Promise<BulkImportBatch | null> {
    let batch = dynamicBatches.get(batchId);
    if (!batch) {
      const fixture = mockBatches[batchId];
      if (fixture) {
        batch = deepCloneBatch(fixture);
        dynamicBatches.set(batchId, batch);
      } else {
        return null;
      }
    }

    if (batch.status === "QUEUED") {
      batch.status = "PROCESSING";
      const total = typeof batch.total_rows === "number" ? batch.total_rows : null;
      batch.completed_rows = total !== null ? Math.floor(total * 0.7) : 0;
      batch.failed_rows = 0;
      batch.updated_at = new Date().toISOString();
    } else if (batch.status === "PROCESSING") {
      await applyReconciliationCompletion(batch);
    }

    const ok = persistBulkState();
    if (!ok && persistEnabled) {
      throw new BulkRepositoryError(
        "No se pudo reanudar la importación. Vuelve a intentarlo.",
        "communication",
      );
    }
    return deepCloneBatch(batch);
  },

  /**
   * Internal simulation transition helper for testing exports.
   */
  async advanceMockExport(exportId: string): Promise<BulkExportJob | null> {
    let job = dynamicExports.get(exportId);
    if (!job) {
      const fixture = mockExports[exportId];
      if (fixture) {
        job = deepCloneExport(fixture);
        dynamicExports.set(exportId, job);
      } else {
        return null;
      }
    }

    if (job.status === "QUEUED") {
      job.status = "PROCESSING";
      job.updated_at = new Date().toISOString();
    } else if (job.status === "PROCESSING") {
      job.status = "COMPLETED";
      if (job.format === "CSV") {
        job.file_name = `catalogo_csv_${exportId}.csv`;
        job.file_size = MOCK_EXPORT_CSV_DATA.length;
        job.download_url = `mock://download/${exportId}`;
      } else {
        job.file_name = `catalogo_xlsx_${exportId}.xlsx`;
      }
      job.updated_at = new Date().toISOString();
    }

    persistBulkState();
    return deepCloneExport(job);
  },

  getCreateImportCallCount() {
    return createImportCallCount;
  },

  clearMockTimers() {
    for (const t of activeTimers) {
      clearTimeout(t);
    }
    activeTimers.clear();
    activeBatchSimulations.clear();
    activeExportSimulations.clear();
  },

  resetMockState() {
    for (const t of activeTimers) {
      clearTimeout(t);
    }
    activeTimers.clear();
    activeBatchSimulations.clear();
    activeExportSimulations.clear();
    dynamicBatches.clear();
    dynamicExports.clear();
    resumingBatches.clear();
    batchSequence = 1000;
    exportSequence = 1000;
    createImportCallCount = 0;
    if (persistEnabled) {
      clearMockState("bulk");
      publishMockChange("bulk");
    }
  },
};

// Restore this session's dynamic bulk work before the first query and keep it in sync
// with other tabs. No-op outside a real mock browser session (tests, SSR, API mode).
if (persistEnabled) {
  subscribeExternalMockChanges("bulk", hydrateBulkStateFromStorage);
  hydrateBulkStateFromStorage();
}
