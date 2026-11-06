import type {
  BulkExportFormat,
  BulkExportJob,
  BulkImportBatch,
} from "../types/bulk";

export interface DownloadResource {
  blob: Blob;
  fileName: string;
}

export interface BulkRepository {
  getTemplate(
    format: BulkExportFormat,
    signal?: AbortSignal,
  ): Promise<DownloadResource | null>;

  createImport(
    file: File,
    localSummary?: { detectedRows?: number; correlationId?: string },
    signal?: AbortSignal,
  ): Promise<BulkImportBatch>;

  getImport(
    batchId: string,
    signal?: AbortSignal,
  ): Promise<BulkImportBatch | null>;

  getImportReport(
    batchId: string,
    signal?: AbortSignal,
  ): Promise<DownloadResource | null>;

  /** Mock adapters can report known artifact availability; API availability stays unknown. */
  canDownloadImportReport?(batch: BulkImportBatch): boolean;

  resumeImport(
    batchId: string,
    signal?: AbortSignal,
  ): Promise<BulkImportBatch>;

  createExport(
    format: BulkExportFormat,
    signal?: AbortSignal,
  ): Promise<BulkExportJob>;

  getExport(
    exportId: string,
    signal?: AbortSignal,
  ): Promise<BulkExportJob | null>;

  getExportFile(
    exportId: string,
    signal?: AbortSignal,
  ): Promise<DownloadResource | null>;
}

export function canRequestImportReport(
  repository: BulkRepository,
  batch: BulkImportBatch,
): boolean {
  return (
    batch.failed_rows > 0 &&
    (repository.canDownloadImportReport?.(batch) ?? true)
  );
}
