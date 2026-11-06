import { Link, useParams } from "react-router-dom";
import { Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconArrowRight, IconUpload } from "@tabler/icons-react";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { BatchRowsTable } from "../components/BatchRowsTable";
import { BatchStatusPanel } from "../components/BatchStatusPanel";
import { useBulkUploadContext } from "../context/BulkUploadContext";
import { useBulkBatch } from "../hooks/useBulkFlow";

export function BulkProgressPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batch, loading, error, isNotFound, isStale, refreshBatch } =
    useBulkBatch(batchId);
  const { clearSelection } = useBulkUploadContext();

  const isTerminal =
    batch?.status === "COMPLETED" || batch?.status === "FAILED_GENERAL";

  return (
    <>
      <PageHeader
        title={`Seguimiento de importación: ${batchId ?? "Sin identificar"}`}
        description="Consulta del avance asíncrono y estado de procesamiento del lote."
        breadcrumbs={[
          { label: "Carga masiva", to: "/carga-masiva" },
          { label: "Seguimiento de importación" },
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
            {isTerminal && batch && (
              <Button
                component={Link}
                to={`/carga-masiva/importaciones/${batch.batch_id}/resultado`}
                rightSection={<IconArrowRight size={18} stroke={2} aria-hidden="true" />}
              >
                Ver resultado final
              </Button>
            )}
          </Group>
        }
      />

      <Stack gap="lg">
        {loading && !batch && (
          <Stack gap="md" role="status" aria-label="Consultando estado de importación">
            <Text size="sm">Consultando estado del lote…</Text>
            <Skeleton height={140} radius="xs" />
          </Stack>
        )}

        {error && (
          <FeedbackAlert
            semantic="error"
            title="Error al consultar el seguimiento"
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

        {isNotFound && !batch && (
          <EmptyState
            title="Lote no encontrado"
            description={`No se encontró el lote con identificador ${batchId ?? "especificado"}.`}
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

        {batch && (
          <>
            <BatchStatusPanel
              batch={batch}
              onRefresh={refreshBatch}
              refreshing={loading}
              showDetailsLink={isTerminal}
            />
            {batch.rows && batch.rows.length > 0 && (
              <BatchRowsTable
                rows={batch.rows}
                caption={`Progreso por fila del lote ${batch.batch_id}`}
              />
            )}
          </>
        )}
      </Stack>
    </>
  );
}
