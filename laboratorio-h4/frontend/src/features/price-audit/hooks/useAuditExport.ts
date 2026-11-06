import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuditRuntime } from "../services/AuditRuntimeContext";
import {
  AuditFailure,
  type AuditExportInput,
  type AuditJob,
} from "../services/auditRepository";

const failure = (error: unknown) =>
  error instanceof AuditFailure
    ? error
    : new AuditFailure(
        "unavailable",
        "No se pudo confirmar el resultado de la operación.",
      );

export function useAuditExport(
  input: AuditExportInput,
  id: string | null,
  onAccepted: (id: string) => void,
  navigationKey: string,
) {
  const { repository, downloader } = useAuditRuntime();
  const filters = JSON.stringify(input.filters);
  const context = useMemo(
    () => ({ repository, id, format: input.format, filters }),
    [repository, id, input.format, filters],
  );
  type State = {
    context: typeof context;
    job?: AuditJob | null;
    requestError?: AuditFailure;
    readError?: AuditFailure;
    downloadError?: AuditFailure;
    submitting?: boolean;
    downloading?: boolean;
  };
  const [stored, setStored] = useState<State>({ context });
  // Invalidate during render, before effects: never expose a prior reference.
  const state: State = stored.context === context ? stored : { context };
  const { job, requestError, readError } = state;
  const [revision, setRevision] = useState(0);
  const request = useRef<AbortController | null>(null);
  const download = useRef<AbortController | null>(null);
  const update = (patch: Partial<Omit<State, "context">>) =>
    setStored((previous) => ({
      ...(previous.context === context ? previous : { context }),
      ...patch,
    }));
  useLayoutEffect(
    () => () => {
      request.current?.abort();
      download.current?.abort();
      request.current = null;
      download.current = null;
    },
    [context],
  );
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const record = (patch: Partial<Omit<State, "context">>) =>
      setStored((previous) => ({
        ...(previous.context === context ? previous : { context }),
        ...patch,
      }));
    void repository.getExport(id, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        if (result && (result.id !== id || result.format !== context.format)) {
          record({
            job: undefined,
            readError: new AuditFailure(
              "unavailable",
              "El servicio devolvió un trabajo distinto de la referencia o formato solicitados. Vuelve al historial.",
            ),
          });
          return;
        }
        record({ job: result, readError: undefined });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const value = failure(error);
        record({
          readError: value,
          ...(["session", "forbidden"].includes(value.kind)
            ? { job: undefined }
            : {}),
        });
      },
    );
    return () => controller.abort();
  }, [context, id, repository, revision, navigationKey]);
  useEffect(() => {
    if (
      !id ||
      !job ||
      job.id !== id ||
      readError ||
      !["QUEUED", "PROCESSING"].includes(job.status)
    )
      return;
    const timer = setTimeout(() => setRevision((value) => value + 1), 2000);
    return () => clearTimeout(timer);
  }, [id, job, readError, revision]);
  async function submit() {
    if (request.current || id || job || requestError?.kind === "unknown")
      return;
    const controller = new AbortController();
    request.current = controller;
    let repeatable = false;
    update({ submitting: true, requestError: undefined });
    try {
      const result = await repository.requestExport(input, controller.signal);
      if (!controller.signal.aborted) {
        if (!result.id || result.format !== input.format)
          throw new AuditFailure(
            "unknown",
            "No pudimos confirmar la referencia de la solicitud. No la hemos repetido.",
          );
        onAccepted(result.id);
      }
    } catch (error: unknown) {
      repeatable = error instanceof AuditFailure && error.kind !== "unknown";
      if (!controller.signal.aborted)
        update({
          requestError:
            error instanceof AuditFailure
              ? error
              : new AuditFailure(
                  "unknown",
                  "No pudimos confirmar la solicitud. No la hemos repetido.",
                ),
        });
    } finally {
      // Keep the latch until the accepted reference is committed to navigation.
      // Unknown outcomes also stay latched, even before React paints the error.
      if (repeatable && request.current === controller) request.current = null;
      if (!controller.signal.aborted) update({ submitting: false });
    }
  }
  async function save() {
    if (
      download.current ||
      !id ||
      !job ||
      job.id !== id ||
      job.format !== input.format ||
      job.status !== "COMPLETED" ||
      !job.fileAvailable ||
      readError
    )
      return;
    const controller = new AbortController();
    download.current = controller;
    update({ downloading: true, downloadError: undefined });
    try {
      const file = await repository.download(id, controller.signal);
      if (!controller.signal.aborted) downloader.save(file);
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        const value = failure(error);
        update({
          downloadError: value,
          ...(["session", "forbidden"].includes(value.kind)
            ? { job: undefined }
            : {}),
        });
      }
    } finally {
      if (download.current === controller) download.current = null;
      if (!controller.signal.aborted) update({ downloading: false });
    }
  }
  return {
    job,
    requestError,
    readError,
    downloadError: state.downloadError,
    submitting: !!state.submitting,
    downloading: !!state.downloading,
    submit,
    save,
    retry: () => setRevision((value) => value + 1),
  };
}
