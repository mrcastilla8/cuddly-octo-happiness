import type { G7Session } from "../../promotions/adapters/g7Session";
import type { BulkRepository, DownloadResource } from "../services/bulkRepository";
import { BulkRepositoryError } from "../services/bulkErrors";
import type {
  BulkDomainStep,
  BulkExportFormat,
  BulkExportJob,
  BulkImportBatch,
  BulkImportRow,
} from "../types/bulk";

const root = "/api/v1/carga-masiva/productos";
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
type HttpInit = { method: "GET" | "POST"; signal: AbortSignal; headers: Record<string, string>; body?: BodyInit };
export interface BulkHttpTransport { request(path: string, init: HttpInit): Promise<Response> }
type AuthSession = Pick<G7Session, "getAccessToken" | "refreshAccessToken" | "invalidateAccessToken">;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid("La respuesta del servicio no tiene la estructura esperada.");
  return value as Record<string, unknown>;
}
function invalid(message = "La respuesta del servicio está incompleta."): never {
  throw new BulkRepositoryError(message, "unknown");
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return invalid();
  return value;
}
function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return invalid();
  return value;
}
function oneOf<T extends string>(value: unknown, values: readonly T[]): T {
  if (typeof value !== "string" || !values.includes(value as T)) return invalid("El servicio devolvió un estado no compatible con el contrato.");
  return value as T;
}
const batchStatuses = ["QUEUED", "PROCESSING", "COMPLETED", "FAILED_GENERAL"] as const;
const rowStatuses = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
const domains = ["CATALOGO", "PRICING", "INVENTARIO"] as const;
const exportStatuses = batchStatuses;

function mapStep(value: unknown): BulkDomainStep {
  const item = record(value);
  return {
    domain: oneOf(item.dominio, domains),
    status: oneOf(item.status, rowStatuses),
    code: typeof item.code === "string" ? item.code as BulkDomainStep["code"] : null,
    detail: typeof item.detail === "string" ? item.detail : null,
  };
}
function mapRow(value: unknown): BulkImportRow {
  const item = record(value);
  if (!Array.isArray(item.applied_domains) || !Array.isArray(item.steps) || typeof item.needs_reconciliation !== "boolean") return invalid();
  const row: BulkImportRow = {
    row_id: text(item.row_id),
    status: oneOf(item.status, rowStatuses),
    applied_domains: item.applied_domains.map((domain) => oneOf(domain, domains)),
    needs_reconciliation: item.needs_reconciliation,
    steps: item.steps.map(mapStep),
  };
  if (typeof item.sku === "string") row.sku = item.sku;
  if (typeof item.nombre === "string") row.nombre = item.nombre;
  if (typeof item.failed_domain === "string") row.failed_domain = oneOf(item.failed_domain, domains);
  else row.failed_domain = null;
  if (typeof item.code === "string") row.code = item.code as BulkImportRow["code"];
  if (typeof item.detail === "string") row.detail = item.detail;
  return row;
}
function mapBatch(value: unknown): BulkImportBatch {
  const item = record(value);
  const batch: BulkImportBatch = {
    batch_id: text(item.batch_id),
    status: oneOf(item.status, batchStatuses),
    total_rows: item.total_rows === undefined ? null : count(item.total_rows),
    completed_rows: count(item.completed_rows),
    failed_rows: count(item.failed_rows),
    needs_reconciliation: typeof item.needs_reconciliation === "boolean" ? item.needs_reconciliation : invalid(),
    // The status contract has no timestamps; use a blank value until a status response supplies them.
    created_at: typeof item.created_at === "string" ? item.created_at : "",
    updated_at: typeof item.updated_at === "string" ? item.updated_at : "",
  };
  if (Array.isArray(item.rows)) batch.rows = item.rows.map(mapRow);
  return batch;
}
function mapAccepted(value: unknown): BulkImportBatch {
  const accepted = record(value);
  if (oneOf(accepted.status, ["QUEUED"] as const) !== "QUEUED" || count(accepted.template_version) !== 2) return invalid();
  return {
    batch_id: text(accepted.batch_id), status: "QUEUED", total_rows: null,
    completed_rows: 0, failed_rows: 0, needs_reconciliation: false,
    created_at: "", updated_at: "",
  };
}
function mapExport(value: unknown): BulkExportJob {
  const item = record(value);
  return {
    export_id: text(item.export_id),
    status: oneOf(item.status, exportStatuses),
    format: oneOf(item.formato, ["CSV", "XLSX"] as const),
    created_at: text(item.created_at),
    updated_at: typeof item.completed_at === "string" ? item.completed_at : text(item.created_at),
    ...(typeof item.download_url === "string" ? { download_url: item.download_url } : {}),
  };
}
function safeFileName(value: string | null, fallback: string): string {
  const candidate = value?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  let decoded = candidate?.[2];
  if (candidate?.[1]) {
    try { decoded = decodeURIComponent(candidate[1]); }
    catch { decoded = undefined; }
  }
  return decoded && !/[\\/\r\n]/.test(decoded) ? decoded : fallback;
}

export function createBulkFetchTransport(origin: string, fetcher: typeof fetch = fetch): BulkHttpTransport {
  const url = new URL(origin);
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash ||
      (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new BulkRepositoryError("VITE_GATEWAY_ORIGIN debe ser un origen HTTPS o loopback HTTP, sin credenciales ni ruta.", "configuration");
  }
  return { request: (path, init) => fetcher(url.origin + path, { ...init, credentials: "omit", redirect: "error", cache: "no-store" }) };
}

export function createHttpBulkRepository(transport: BulkHttpTransport, session: AuthSession): BulkRepository {
  async function send(path: string, method: HttpInit["method"], signal?: AbortSignal, body?: BodyInit, json = false, correlationId: string = crypto.randomUUID()): Promise<Response> {
    const bounded = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
    bounded.throwIfAborted();
    let token: string | null;
    try { token = await session.getAccessToken(bounded); }
    catch (error) { if (bounded.aborted) throw error; throw new BulkRepositoryError("No se pudo renovar la sesión. Inicia sesión de nuevo.", "configuration"); }
    if (!token || /[\r\n]/.test(token)) throw new BulkRepositoryError("Inicia sesión para usar la carga masiva en modo API.", "configuration");
    const request = (accessToken: string) => transport.request(path, {
      method, signal: bounded,
      headers: { Accept: "application/json, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Authorization: `Bearer ${accessToken}`, "X-Correlation-Id": correlationId, ...(json ? { "Content-Type": "application/json" } : {}) },
      ...(body === undefined ? {} : { body }),
    });
    let response: Response;
    try { response = await request(token); }
    catch (error) { if (signal?.aborted || bounded.aborted) throw error; throw new BulkRepositoryError("No se pudo conectar con Gateway. Revisa la conexión e inténtalo de nuevo.", "communication"); }
    if (response.status === 401 && method === "GET") {
      const problem = await response.clone().json().catch(() => null) as { code?: unknown } | null;
      if (problem?.code === "TOKEN_INVALIDO") {
        const renewed = await session.refreshAccessToken(token, bounded).catch(() => null);
        if (renewed && !/[\r\n]/.test(renewed)) {
          response = await request(renewed).catch(() => { throw new BulkRepositoryError("No se pudo conectar con Gateway.", "communication"); });
          if (response.status === 401) session.invalidateAccessToken(renewed);
        }
      }
    }
    if (!response.ok) {
      const problem = await response.clone().json().catch(() => null) as { code?: unknown } | null;
      const code = typeof problem?.code === "string" ? problem.code : "ERROR_HTTP";
      const statusMessage: Record<number, string> = {
        401: "La sesión expiró o no es válida. Inicia sesión de nuevo.",
        403: "Tu sesión no tiene permiso para esta operación (SCOPE_INSUFICIENTE).",
        404: "El recurso solicitado no existe o la operación aún no está disponible en el backend.",
        409: "El lote cambió o tiene un conflicto; actualiza su estado antes de volver a intentarlo.",
        503: "El servicio de carga masiva no está disponible temporalmente.",
      };
      throw new BulkRepositoryError(`HTTP ${response.status}. ${statusMessage[response.status] ?? "La solicitud falló."} Código: ${code}.`, response.status === 401 || response.status === 403 ? "configuration" : response.status >= 500 ? "communication" : "rejected", response.status, code);
    }
    return response;
  }
  async function json(response: Response, expected: number, signal?: AbortSignal): Promise<unknown> {
    if (response.status !== expected || !response.headers.get("content-type")?.toLowerCase().includes("application/json")) invalid("La respuesta HTTP no coincide con el contrato publicado.");
    try { signal?.throwIfAborted(); return await response.json(); }
    catch (error) { if (error instanceof BulkRepositoryError || signal?.aborted) throw error; return invalid("El servicio devolvió JSON ilegible."); }
  }
  async function download(path: string, fallback: string, signal?: AbortSignal, expectedMime?: string): Promise<DownloadResource> {
    const response = await send(path, "GET", signal);
    const type = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (response.status !== 200 || (type !== "text/csv" && type !== xlsxMime)) invalid("El servicio no entregó un archivo CSV o XLSX válido.");
    if (expectedMime && type !== expectedMime) invalid("El tipo MIME del archivo no coincide con el formato solicitado.");
    return { blob: await response.blob(), fileName: safeFileName(response.headers.get("content-disposition"), fallback) };
  }
  return {
    async getTemplate(format, signal) { return download(`${root}/plantilla?formato=${format}`, `plantilla-productos.${format.toLowerCase()}`, signal); },
    async createImport(file, summary, signal) {
      const form = new FormData(); form.append("archivo", file); form.append("template_version", "2");
      return mapAccepted(await json(await send(`${root}/importaciones`, "POST", signal, form, false, summary?.correlationId), 202, signal));
    },
    async getImport(batchId, signal) {
      try { return mapBatch(await json(await send(`${root}/importaciones/${encodeURIComponent(batchId)}`, "GET", signal), 200, signal)); }
      catch (error) { if (error instanceof BulkRepositoryError && error.status === 404 && error.code === "LOTE_NO_ENCONTRADO") return null; throw error; }
    },
    async getImportReport(batchId, signal) { return download(`${root}/importaciones/${encodeURIComponent(batchId)}/reporte`, `reporte-${batchId}.csv`, signal); },
    async resumeImport(batchId, signal) { return mapAccepted(await json(await send(`${root}/importaciones/${encodeURIComponent(batchId)}/reanudar`, "POST", signal), 202, signal)); },
    async createExport(format: BulkExportFormat, signal) {
      return mapExport(await json(await send(`${root}/exportaciones`, "POST", signal, JSON.stringify({ formato: format }), true), 202, signal));
    },
    async getExport(exportId, signal) {
      try { return mapExport(await json(await send(`${root}/exportaciones/${encodeURIComponent(exportId)}`, "GET", signal), 200, signal)); }
      catch (error) { if (error instanceof BulkRepositoryError && error.status === 404 && error.code === "LOTE_NO_ENCONTRADO") return null; throw error; }
    },
    async getExportFile(exportId, signal) {
      const job = await this.getExport(exportId, signal);
      if (!job) return null;
      const expectedMime = job.format === "XLSX" ? xlsxMime : "text/csv";
      const extension = job.format.toLowerCase();
      const resource = await download(`${root}/exportaciones/${encodeURIComponent(exportId)}/archivo`, `exportacion-${exportId}.${extension}`, signal, expectedMime);
      return resource;
    },
  };
}
