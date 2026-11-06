import { useCallback, useMemo } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { Link, useSearchParams } from "react-router-dom";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { AuditScope } from "../components/AuditScope";
import { AuditDataNotice } from "../components/AuditDataNotice";
import { useAuditRead } from "../hooks/useAuditRead";
import { useAuditExport } from "../hooks/useAuditExport";
import { useAuditRuntime } from "../services/AuditRuntimeContext";
import {
  appliedFilters,
  dateLabel,
  readAuditQuery,
  validateAuditFilters,
} from "../services/auditPresentation";
import type { AuditFilters, AuditFormat } from "../services/auditRepository";

export function AuditExportPage({ format }: { format: AuditFormat }) {
  const [params] = useSearchParams();
  const filters = appliedFilters(readAuditQuery(params));
  return (
    <AuditExportFlow
      key={`${format}:${JSON.stringify(filters)}`}
      format={format}
      filters={filters}
    />
  );
}
function AuditExportFlow({
  format,
  filters,
}: {
  format: AuditFormat;
  filters: AuditFilters;
}) {
  const [params, setParams] = useSearchParams();
  const { repository } = useAuditRuntime();
  const filterKey = JSON.stringify(filters);
  const query = useMemo(
    () => ({ ...(JSON.parse(filterKey) as AuditFilters), page: 1, size: 1 }),
    [filterKey],
  );
  const inputError = validateAuditFilters(filters);
  const read = useCallback(
    (signal: AbortSignal) =>
      inputError
        ? Promise.reject(new Error(inputError))
        : repository.list(query, signal),
    [repository, query, inputError],
  );
  const count = useAuditRead(`${filterKey}:${params}`, read);
  const total = count.status === "success" ? count.result.total : undefined;
  const limit = format === "CSV" ? 100000 : 500;
  const id = params.get("exportId");
  const exportation = useAuditExport(
    { format, filters },
    id,
    (nextId) =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set("exportId", nextId);
          return next;
        },
        { replace: true },
      ),
    params.toString(),
  );
  const { job, requestError, readError, downloadError } = exportation;
  const accessError = [
    requestError,
    readError,
    downloadError,
    count.status === "error" ? count.error : undefined,
  ].find(
    (error) =>
      error && ["forbidden", "session", "configuration"].includes(error.kind),
  );
  const limited =
    !id &&
    !job &&
    (requestError?.kind === "limit" || (total !== undefined && total > limit));
  const historyParams = new URLSearchParams(params);
  historyParams.delete("exportId");
  const suffix = `?${historyParams}`;
  const labels = {
    QUEUED: "Solicitud recibida",
    PROCESSING: "Generando archivo",
    COMPLETED: "Archivo generado",
    FAILED_GENERAL: "No se pudo generar el archivo",
  };
  return (
    <>
      <PageHeader
        title={`Exportar historial en ${format}`}
        description="Solicita una exportación del conjunto completo correspondiente a los filtros aplicados."
        breadcrumbs={[
          { label: "Precios", to: "/precios" },
          { label: "Historial de precios", to: `/precios/auditoria${suffix}` },
          { label: `Exportar ${format}` },
        ]}
        actions={
          <Button
            component={Link}
            variant="outline"
            to={`/precios/auditoria${suffix}`}
          >
            Volver al historial
          </Button>
        }
      />
      <Stack gap="lg" maw={880}>
        <AuditDataNotice />
        {accessError ? (
          <FeedbackAlert semantic="error" title="Acceso no disponible">
            {accessError.message}
          </FeedbackAlert>
        ) : (
          <>
            <AuditScope filters={filters} total={total} />
            <Text size="sm">
              {format} admite hasta {limit.toLocaleString("es-PE")} registros,
              inclusive.
            </Text>
            {inputError && (
              <FeedbackAlert semantic="error" title="Revisa las fechas">
                {inputError}
              </FeedbackAlert>
            )}
            {count.status === "loading" && (
              <Text role="status">Consultando alcance de exportación…</Text>
            )}
            {count.status === "error" && (
              <FeedbackAlert semantic="error" title="Cantidad no disponible">
                {count.error.message}
              </FeedbackAlert>
            )}
            {limited && (
              <FeedbackAlert
                semantic="warning"
                title={`Límite de ${format} excedido`}
                actions={
                  format === "PDF" && total !== undefined && total <= 100000 ? (
                    <Button
                      component={Link}
                      variant="outline"
                      to={`/precios/auditoria/exportar/csv${suffix}`}
                    >
                      Exportar CSV
                    </Button>
                  ) : undefined
                }
              >
                El {format} admite hasta {limit.toLocaleString("es-PE")}{" "}
                registros. Reduce los filtros. No se ha creado una exportación.
              </FeedbackAlert>
            )}
            {requestError && requestError.kind !== "limit" && (
              <FeedbackAlert
                semantic="error"
                title={
                  requestError.kind === "unknown"
                    ? "No pudimos confirmar la solicitud"
                    : "No se pudo solicitar la exportación"
                }
              >
                {requestError.message}
              </FeedbackAlert>
            )}
            {!id && !job && (
              <Button
                disabled={
                  !!inputError ||
                  limited ||
                  count.status !== "success" ||
                  total === 0 ||
                  requestError?.kind === "unknown"
                }
                loading={exportation.submitting}
                onClick={() => void exportation.submit()}
              >
                Solicitar {format}
              </Button>
            )}
            {id && (
              <SectionCard title="Seguimiento de exportación">
                <Text size="sm" style={{ overflowWrap: "anywhere" }}>
                  Referencia: {id}
                </Text>
                {job === undefined && !readError && (
                  <Text role="status">Consultando estado…</Text>
                )}
                {job === null && (
                  <FeedbackAlert
                    semantic="warning"
                    title="Exportación no disponible"
                  >
                    No encontramos el trabajo solicitado. Vuelve al historial.
                  </FeedbackAlert>
                )}
                {readError && (
                  <FeedbackAlert
                    semantic="error"
                    title="No se pudo consultar el estado"
                    actions={
                      <Button variant="outline" onClick={exportation.retry}>
                        Consultar estado
                      </Button>
                    }
                  >
                    {readError.message}
                  </FeedbackAlert>
                )}
                {job && (
                  <>
                    <StatusBadge
                      semantic={
                        job.status === "COMPLETED"
                          ? "success"
                          : job.status === "FAILED_GENERAL"
                            ? "error"
                            : "info"
                      }
                    >
                      {labels[job.status]}
                    </StatusBadge>
                    <Text size="sm" role="status" aria-live="polite">
                      {labels[job.status]}
                      {readError ? " · Último estado recibido" : ""}
                    </Text>
                    <Text size="sm">Solicitud: {dateLabel(job.createdAt)}</Text>
                    {job.completedAt && (
                      <Text size="sm">
                        Finalización: {dateLabel(job.completedAt)}
                      </Text>
                    )}
                    {!readError &&
                      ["QUEUED", "PROCESSING"].includes(job.status) && (
                        <Button variant="outline" onClick={exportation.retry}>
                          Consultar estado
                        </Button>
                      )}
                    {job.status === "COMPLETED" && !job.fileAvailable && (
                      <Text size="sm">
                        El servicio todavía no informa un archivo disponible.
                      </Text>
                    )}
                    {job.status === "FAILED_GENERAL" && (
                      <Text size="sm">
                        La solicitud fue recibida, pero la generación falló.
                        Vuelve al historial para revisar los criterios; este
                        trabajo no se reanuda desde la interfaz.
                      </Text>
                    )}
                    <Button
                      disabled={
                        job.status !== "COMPLETED" ||
                        !job.fileAvailable ||
                        !!readError
                      }
                      loading={exportation.downloading}
                      onClick={() => void exportation.save()}
                    >
                      Descargar {format}
                    </Button>
                  </>
                )}
                {downloadError && (
                  <FeedbackAlert
                    semantic="error"
                    title="No se pudo descargar el archivo"
                  >
                    {downloadError.message}
                  </FeedbackAlert>
                )}
              </SectionCard>
            )}
          </>
        )}
      </Stack>
    </>
  );
}
