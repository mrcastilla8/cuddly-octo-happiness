import type { DataMode } from "../../../app/config/dataMode";
import type { BulkExportJob, BulkImportBatch } from "../types/bulk";

export type BatchQueryState =
  | { status: "loading" }
  | { status: "success"; batch: BulkImportBatch }
  | { status: "not_found" }
  | { status: "error"; message: string };

export interface BatchQueryResponse {
  key: string;
  state: BatchQueryState;
}

export interface LastSuccessfulBatch {
  batchId: string;
  batch: BulkImportBatch;
}

export function selectBatchQueryView(input: {
  batchId: string | undefined;
  requestKey: string;
  response?: BatchQueryResponse;
  lastSuccess?: LastSuccessfulBatch;
}) {
  const responseIsCurrent = input.response?.key === input.requestKey;
  const state = responseIsCurrent ? input.response?.state : undefined;
  const isNotFound = state?.status === "not_found";
  const lastSuccess = input.lastSuccess;
  const batch = isNotFound
    ? null
    : state?.status === "success"
      ? state.batch
      : lastSuccess && lastSuccess.batchId === input.batchId
        ? lastSuccess.batch
        : null;
  const error = state?.status === "error" ? state.message : null;

  return {
    batch,
    loading: !responseIsCurrent || state?.status === "loading",
    error,
    isNotFound,
    isStale: Boolean(batch && (error || !responseIsCurrent)),
  };
}

export function isExportSnapshotStale(input: {
  visibleExportId?: string;
  initialExportId?: string;
  routeExportId?: string;
  createdJobMatches: boolean;
  currentQueryStatus?: "success" | "not_found" | "error";
  refreshErrorExportId?: string;
}): boolean {
  if (!input.visibleExportId) return false;
  const initialQueryIsStale = Boolean(
    input.initialExportId &&
      input.routeExportId === input.initialExportId &&
      !input.createdJobMatches &&
      input.currentQueryStatus !== "success",
  );
  return (
    initialQueryIsStale ||
    input.refreshErrorExportId === input.visibleExportId
  );
}

// A batch only has reconcilable work when it still holds failed rows flagged for
// reconciliation. When the provider returned row detail we trust it; otherwise we
// fall back to the aggregate counters, never inventing pending operations.
export function hasReconcilableOperations(batch: BulkImportBatch): boolean {
  if (batch.rows && batch.rows.length > 0) {
    return batch.rows.some((row) => row.status === "FAILED" && row.needs_reconciliation);
  }
  return batch.needs_reconciliation && batch.failed_rows > 0;
}

// Single source of truth for "resume is allowed". It refuses to operate on a
// terminal-but-not-confirmed snapshot: no write may be issued while the visible
// batch is stale, loading, errored or already resuming.
export function canResumeBatch(input: {
  batch?: BulkImportBatch | null;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  isNotFound: boolean;
  resuming: boolean;
}): boolean {
  const { batch } = input;
  if (!batch) return false;
  if (input.loading || input.error !== null || input.isStale || input.isNotFound || input.resuming) {
    return false;
  }
  if (batch.status !== "COMPLETED" && batch.status !== "FAILED_GENERAL") return false;
  if (!batch.needs_reconciliation) return false;
  return hasReconcilableOperations(batch);
}

// Runs the resume only when eligible. Returned undefined means "no write issued",
// which is the contract the hook and its tests rely on.
export function resumeBatchWhenAllowed<T>(
  canResume: boolean,
  resume: () => Promise<T>,
): Promise<T> | undefined {
  if (!canResume) return undefined;
  return resume();
}

// An export resource is downloadable only when the job completed, the visible
// snapshot is current (not stale) and the format has a genuine downloadable
// resource. In mock mode only CSV has a real artifact; XLSX is never faked.
export function canDownloadExport(input: {
  job?: BulkExportJob | null;
  isStale: boolean;
  dataMode: DataMode;
}): boolean {
  const { job } = input;
  if (!job) return false;
  if (input.isStale) return false;
  if (job.status !== "COMPLETED") return false;
  if (input.dataMode === "mock") return job.format === "CSV";
  return true;
}
