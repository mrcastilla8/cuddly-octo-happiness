import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BulkExportFormat,
  BulkExportJob,
  BulkImportBatch,
} from "../types/bulk";
import { canRequestImportReport, type DownloadResource } from "../services/bulkRepository";
import {
  getDownloadFailureMessage,
  getUnavailableDownloadMessage,
} from "../services/downloadMessages";
import { triggerDownload } from "../utils/downloadAsset";
import { useBulkRepository, useBulkRepositorySelection } from "./useBulkRepository";
import {
  canDownloadExport,
  canResumeBatch,
  isExportSnapshotStale,
  resumeBatchWhenAllowed,
  selectBatchQueryView,
  type BatchQueryState,
} from "./bulkQueryState";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

export function useBulkBatch(batchId: string | undefined) {
  const repository = useBulkRepository();
  const [revision, setRevision] = useState(0);
  const mockRevision = useMockStateRevision(["bulk"]);
  const [response, setResponse] = useState<{
    key: string;
    state: BatchQueryState;
  }>();
  const [lastSuccess, setLastSuccess] = useState<{
    batchId: string;
    batch: BulkImportBatch;
  }>();
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const resumeInFlight = useRef(false);
  const reportInFlight = useRef(false);

  const requestKey = JSON.stringify([batchId, revision + mockRevision]);

  useEffect(() => {
    if (!batchId) return;
    const controller = new AbortController();
    void repository.getImport(batchId, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        if (result) {
          setLastSuccess({ batchId, batch: result });
          setResponse({ key: requestKey, state: { status: "success", batch: result } });
        } else {
          setResponse({ key: requestKey, state: { status: "not_found" } });
        }
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo consultar la información del lote.";
        setResponse({ key: requestKey, state: { status: "error", message } });
      },
    );
    return () => controller.abort();
  }, [batchId, requestKey, repository]);

  const batchView = selectBatchQueryView({
    batchId,
    requestKey,
    response,
    lastSuccess,
  });
  const reportAvailable = Boolean(
    batchView.batch && canRequestImportReport(repository, batchView.batch),
  );
  // Eligibility is derived from the visible snapshot; a stale/loading/errored
  // batch never authorizes a resumption write.
  const canResume = canResumeBatch({
    batch: batchView.batch,
    loading: batchView.loading,
    error: batchView.error,
    isStale: batchView.isStale,
    isNotFound: batchView.isNotFound,
    resuming,
  });

  const refreshBatch = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  const resumeBatch = useCallback(async () => {
    return resumeBatchWhenAllowed(canResume, async () => {
      if (!batchId || resumeInFlight.current) return undefined;
      resumeInFlight.current = true;
      setResuming(true);
      setResumeError(null);
      try {
        const resumed = await repository.resumeImport(batchId);
        setLastSuccess({ batchId, batch: resumed });
        setResponse({ key: requestKey, state: { status: "success", batch: resumed } });
        return resumed;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo reanudar el lote de importación.";
        setResumeError(message);
        throw err;
      } finally {
        resumeInFlight.current = false;
        setResuming(false);
      }
    });
  }, [batchId, canResume, repository, requestKey]);

  const downloadReport = useCallback(async () => {
    if (!batchId || reportInFlight.current) return;
    reportInFlight.current = true;
    setDownloadingReport(true);
    setReportError(null);
    try {
      const resource = await repository.getImportReport(batchId);
      if (resource) {
        triggerDownload(resource);
      } else {
        setReportError("El servicio no entregó un reporte descargable para este lote.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al descargar el reporte de errores.";
      setReportError(message);
    } finally {
      reportInFlight.current = false;
      setDownloadingReport(false);
    }
  }, [batchId, repository]);

  return {
    batch: batchView.batch,
    loading: batchView.loading,
    error: batchView.error,
    isNotFound: batchView.isNotFound,
    isStale: batchView.isStale,
    resuming,
    resumeError,
    canResume,
    downloadingReport,
    reportError,
    reportAvailable,
    refreshBatch,
    resumeBatch,
    downloadReport,
  };
}

type ExportQueryState =
  | { exportId: string; revision: number; status: "success"; job: BulkExportJob }
  | { exportId: string; revision: number; status: "not_found" }
  | { exportId: string; revision: number; status: "error"; message: string };

export function useBulkDownloads(initialExportId?: string) {
  const { mode, repository } = useBulkRepositorySelection();
  const [exportJobState, setExportJobState] = useState<{
    routeExportId?: string;
    job: BulkExportJob;
  }>();
  const [createdJob, setCreatedJob] = useState<{
    routeExportId?: string;
    job: BulkExportJob;
  }>();
  const [queryState, setQueryState] = useState<ExportQueryState>();
  const [refreshErrorForExport, setRefreshErrorForExport] = useState<{
    exportId: string;
    message: string;
  }>();
  const [queryRevision, setQueryRevision] = useState(0);
  const [submittingExport, setSubmittingExport] = useState(false);
  const [refreshingJob, setRefreshingJob] = useState(false);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);
  const exportInFlight = useRef(false);

  useEffect(() => {
    if (!initialExportId) return;
    const controller = new AbortController();
    void repository.getExport(initialExportId, controller.signal).then(
      (job) => {
        if (controller.signal.aborted) return;
        if (job) {
          setExportJobState({ routeExportId: initialExportId, job });
          setRefreshErrorForExport(undefined);
          setQueryState({ exportId: initialExportId, revision: queryRevision, status: "success", job });
        } else {
          setExportJobState(undefined);
          setRefreshErrorForExport(undefined);
          setQueryState({ exportId: initialExportId, revision: queryRevision, status: "not_found" });
        }
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setQueryState({
          exportId: initialExportId,
          revision: queryRevision,
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "No se pudo consultar el trabajo de exportación.",
        });
      },
    );
    return () => controller.abort();
  }, [initialExportId, queryRevision, repository]);

  const queryMatches = Boolean(
    queryState &&
      queryState.exportId === initialExportId &&
      queryState.revision === queryRevision,
  );
  const matchingQuery = queryMatches ? queryState : undefined;
  const createdJobMatches = Boolean(
    createdJob && createdJob.routeExportId === initialExportId,
  );
  const jobMatchesCurrentRoute =
    exportJobState?.routeExportId === initialExportId;
  const visibleJob = createdJobMatches
    ? createdJob?.job ?? null
    : matchingQuery?.status === "success"
      ? matchingQuery.job
      : jobMatchesCurrentRoute
        ? exportJobState?.job ?? null
        : null;
  const initialQueryStatus = initialExportId && !createdJobMatches
    ? matchingQuery
      ? matchingQuery.status
      : "loading"
    : null;
  const initialQueryError =
    !createdJobMatches && matchingQuery?.status === "error"
      ? matchingQuery.message
      : null;
  const exportJobStale = isExportSnapshotStale({
    visibleExportId: visibleJob?.export_id,
    initialExportId,
    routeExportId: exportJobState?.routeExportId,
    createdJobMatches,
    currentQueryStatus: matchingQuery?.status,
    refreshErrorExportId: refreshErrorForExport?.exportId,
  });
  // Only a completed, current job with a genuine resource may be downloaded. A
  // stale snapshot never authorizes a download.
  const downloadExportAllowed = canDownloadExport({
    job: visibleJob,
    isStale: exportJobStale,
    dataMode: mode,
  });

  const requestExport = useCallback(
    async (format: BulkExportFormat) => {
      if (exportInFlight.current) return;
      exportInFlight.current = true;
      setSubmittingExport(true);
      setError(null);
      try {
        const job = await repository.createExport(format);
        setCreatedJob({ routeExportId: initialExportId, job });
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo iniciar el trabajo de exportación.",
        );
      } finally {
        exportInFlight.current = false;
        setSubmittingExport(false);
      }
    },
    [initialExportId, repository],
  );

  const refreshJob = useCallback(async () => {
    if (!visibleJob || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshingJob(true);
    setError(null);
    try {
      const updated = await repository.getExport(visibleJob.export_id);
      if (updated) {
        setRefreshErrorForExport(undefined);
        if (createdJobMatches) {
          setCreatedJob({ routeExportId: initialExportId, job: updated });
        } else {
          setExportJobState({ routeExportId: initialExportId, job: updated });
        }
        if (initialExportId === updated.export_id) {
          setQueryState({ exportId: updated.export_id, revision: queryRevision, status: "success", job: updated });
        }
      } else if (initialExportId === visibleJob.export_id) {
        setRefreshErrorForExport(undefined);
        setExportJobState(undefined);
        setCreatedJob(undefined);
        setQueryState({ exportId: visibleJob.export_id, revision: queryRevision, status: "not_found" });
      } else {
        const message = "El trabajo de exportación ya no está disponible.";
        setRefreshErrorForExport({ exportId: visibleJob.export_id, message });
        setError(message);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado de la exportación.";
      setRefreshErrorForExport({ exportId: visibleJob.export_id, message });
      setError(message);
    } finally {
      refreshInFlight.current = false;
      setRefreshingJob(false);
    }
  }, [createdJobMatches, initialExportId, queryRevision, repository, visibleJob]);

  const retryInitialQuery = useCallback(() => {
    if (initialExportId) setQueryRevision((revision) => revision + 1);
  }, [initialExportId]);

  const downloadExportFile = useCallback(async () => {
    if (!downloadExportAllowed || !visibleJob) return;
    setDownloadingExport(true);
    setError(null);
    try {
      const resource = await repository.getExportFile(visibleJob.export_id);
      if (resource) {
        triggerDownload(resource);
      } else {
        setError(getUnavailableDownloadMessage(mode, "exportación", visibleJob.format));
      }
    } catch (err: unknown) {
      setError(getDownloadFailureMessage(err, "exportación"));
    } finally {
      setDownloadingExport(false);
    }
  }, [downloadExportAllowed, mode, repository, visibleJob]);

  const downloadTemplate = useCallback(
    async (format: BulkExportFormat) => {
      setDownloadingTemplate(true);
      setError(null);
      try {
        const resource: DownloadResource | null = await repository.getTemplate(format);
        if (resource) {
          triggerDownload(resource);
        } else {
          setError(getUnavailableDownloadMessage(mode, "plantilla", format));
        }
      } catch (err: unknown) {
        setError(getDownloadFailureMessage(err, "plantilla"));
      } finally {
        setDownloadingTemplate(false);
      }
    },
    [mode, repository],
  );

  return {
    exportJob: visibleJob,
    dataMode: mode,
    submittingExport,
    refreshingJob,
    downloadingExport,
    downloadingTemplate,
    error,
    initialQueryStatus,
    initialQueryError,
    isStale: exportJobStale,
    canDownloadExport: downloadExportAllowed,
    requestExport,
    refreshJob,
    retryInitialQuery,
    downloadExportFile,
    downloadTemplate,
  };
}
