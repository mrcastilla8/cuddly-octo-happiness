import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import {
  IconDownload,
  IconRotateClockwise,
  IconUpload,
  IconArrowLeft,
} from "@tabler/icons-react";
import {
  ConfirmDialog,
  EmptyState,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { BatchRowsTable } from "../components/BatchRowsTable";
import { BatchStatusPanel } from "../components/BatchStatusPanel";
import { useBulkUploadContext } from "../context/BulkUploadContext";
import { useBulkBatch } from "../hooks/useBulkFlow";

export function BulkResultPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [confirmResumeOpen, setConfirmResumeOpen] = useState(false);
  const { clearSelection } = useBulkUploadContext();

  const {
    batch,
    loading,
    error,
    isNotFound,
    isStale,
    resuming,
    resumeError,
    canResume,
    downloadingReport,
    reportError,
    reportAvailable,
    refreshBatch,
    resumeBatch,
    downloadReport,
  } = useBulkBatch(batchId);

  const isTerminal =
    batch?.status === "COMPLETED" || batch?.status === "FAILED_GENERAL";

  const handleConfirmResume = async () => {
    try {
      await resumeBatch();
      setConfirmResumeOpen(false);
      // After resuming, navigate to progress tracking S03 with same batchId
      navigate(`/carga-masiva/importaciones/${batchId}`);
    } catch {
      // Error handled in hook state
    }
  };

  return (
    <>
      <PageHeader
        title={`Resultado de importación: ${batchId ?? "Sin identificar"}`}
        description="Resumen consolidado del lote, resultados por fila y acciones de recuperación."
        breadcrumbs={[
          { label: "Carga masiva", to: "/carga-masiva" },
          {
            label: "Seguimiento",
            to: batchId ? `/carga-masiva/importaciones/${batchId}` : undefined,
          },
          { label: "Resultado del lote" },
        ]}
        actions={
          <Group gap="xs">
            <Button
              component={Link}
              to="/carga-masiva"
              variant="outline"
              leftSection={<IconUpload size={18} stroke={2} aria-hidden="true" />}
              onClick={clearSelection}
            >
              Nueva carga masiva
            </Button>
            {batch && isTerminal && reportAvailable && (
              <Button
                variant="outline"
                leftSection={<IconDownload size={18} stroke={2} aria-hidden="true" />}
                onClick={downloadReport}
                loading={downloadingReport}
                disabled={downloadingReport}
              >
                Descargar reporte de errores
              </Button>
            )}
            {batch && canResume && (
              <Button
                leftSection={
                  <IconRotateClockwise size={18} stroke={2} aria-hidden="true" />
                }
                onClick={() => setConfirmResumeOpen(true)}
                loading={resuming}
                disabled={resuming || loading}
              >
                Reanudar operaciones pendientes
              </Button>
            )}
          </Group>
        }
      />

      <Stack gap="lg">
        {loading && !batch && (
          <Stack gap="md" role="status" aria-label="Cargando resultado del lote">
            <Text size="sm">Cargando resultado del lote…</Text>
            <Skeleton height={140} radius="xs" />
            <Skeleton height={260} radius="xs" />
          </Stack>
        )}

        {error && (
          <FeedbackAlert
            semantic="error"
            title="Error al consultar el lote"
            actions={
              <Button size="xs" variant="outline" onClick={refreshBatch}>
                Reintentar consulta
              </Button>
            }
          >
            {error}
            {isStale && (
              <Text size="xs" mt="xs" c="dimmed">
                Se muestra la última información confirmada del lote.
              </Text>
            )}
          </FeedbackAlert>
        )}

        {reportError && (
          <FeedbackAlert semantic="error" title="Reporte no disponible">
            {reportError}
          </FeedbackAlert>
        )}

        {batch && isTerminal && batch.failed_rows > 0 && !reportAvailable && (
          <FeedbackAlert semantic="info" title="Reporte de errores no disponible">
            No hay un reporte descargable para este lote.
          </FeedbackAlert>
        )}

        {resumeError && (
          <FeedbackAlert semantic="error" title="No se pudo reanudar el lote">
            {resumeError}
          </FeedbackAlert>
        )}

        {isNotFound && !batch && (
          <EmptyState
            title="Lote no encontrado"
            description="No se encontró información para el identificador de lote especificado."
            action={
              <Button
                component={Link}
                to="/carga-masiva"
                leftSection={<IconArrowLeft size={18} stroke={2} aria-hidden="true" />}
              >
                Volver a carga masiva
              </Button>
            }
          />
        )}

        {batch && !isTerminal && (
          <FeedbackAlert
            semantic="warning"
            title="Lote en procesamiento"
            actions={
              <Button
                component={Link}
                to={`/carga-masiva/importaciones/${batch.batch_id}`}
                size="xs"
                variant="outline"
              >
                Ir al seguimiento del lote
              </Button>
            }
          >
            El lote {batch.batch_id} aún se encuentra en estado {batch.status}. Los resultados finales consolidados se presentarán únicamente cuando el procesamiento concluya.
          </FeedbackAlert>
        )}

        {batch && isTerminal && (
          <>
            <BatchStatusPanel
              batch={batch}
              onRefresh={refreshBatch}
              onResume={
                canResume
                  ? () => setConfirmResumeOpen(true)
                  : undefined
              }
              canResume={canResume}
              refreshing={loading}
              resuming={resuming}
            />

            <BatchRowsTable
              rows={batch.rows ?? []}
              caption={`Detalle de filas del lote ${batch.batch_id}`}
            />
          </>
        )}
      </Stack>

      <ConfirmDialog
        opened={confirmResumeOpen}
        title="Reanudar lote de importación"
        confirmLabel="Confirmar reanudación"
        onCancel={() => setConfirmResumeOpen(false)}
        onConfirm={handleConfirmResume}
        submitting={resuming}
        confirmDisabled={!canResume}
      >
        <Stack gap="sm">
          <Text size="sm">
            Se reanudarán únicamente las filas que presentaron fallos o requieren
            reconciliación en Catálogo, Precios o Inventario.
          </Text>
          <Text size="sm" c="dimmed">
            Las filas y dominios confirmados previamente no serán duplicados ni
            reprocesados destructivamente. Identificador del lote: <strong>{batchId}</strong>.
          </Text>
        </Stack>
      </ConfirmDialog>
    </>
  );
}
