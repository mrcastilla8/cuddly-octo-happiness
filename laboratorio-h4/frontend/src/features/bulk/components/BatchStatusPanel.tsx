import { Button, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconRefresh, IconArrowRight, IconRotateClockwise } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import {
  FeedbackAlert,
  MetricCard,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import type { BulkImportBatch } from "../types/bulk";
import {
  getQueuedBatchDescription,
  getUnknownRowCountDescription,
} from "./batchStatusMessages";

export interface BatchStatusPanelProps {
  batch: BulkImportBatch;
  onRefresh?: () => void;
  onResume?: () => void;
  refreshing?: boolean;
  resuming?: boolean;
  // Explicit eligibility for the resume action. When omitted, callers that opt
  // into resume keep the legacy terminal+reconciliation rule.
  canResume?: boolean;
  showDetailsLink?: boolean;
}

export function BatchStatusPanel({
  batch,
  onRefresh,
  onResume,
  refreshing = false,
  resuming = false,
  canResume,
  showDetailsLink = false,
}: BatchStatusPanelProps) {
  const isTerminal =
    batch.status === "COMPLETED" || batch.status === "FAILED_GENERAL";
  const isPartial =
    batch.status === "COMPLETED" &&
    (batch.failed_rows > 0 || batch.needs_reconciliation);
  const isSuccess =
    batch.status === "COMPLETED" &&
    batch.failed_rows === 0 &&
    !batch.needs_reconciliation;
  const isFailedGeneral = batch.status === "FAILED_GENERAL";
  const isProcessing = batch.status === "PROCESSING";
  const isQueued = batch.status === "QUEUED";
  const resumeEligible =
    canResume ?? (isTerminal && batch.needs_reconciliation);

  // Semantic presentation for StatusBadge
  const statusSemantic = isSuccess
    ? "success"
    : isProcessing
      ? "info"
      : isPartial
        ? "warning"
        : isFailedGeneral
          ? "error"
          : "neutral";

  const statusLabel = isSuccess
    ? "Completado"
    : isPartial
      ? "Completado con observaciones"
      : isFailedGeneral
        ? "Fallo general"
        : isProcessing
          ? "Procesando lote"
          : "En cola de procesamiento";

  const concludedCount = batch.completed_rows + batch.failed_rows;

  return (
    <SectionCard
      title={`Lote de importación: ${batch.batch_id}`}
      description={
        batch.file_name
          ? `Archivo de origen: ${batch.file_name} · Actualizado: ${new Date(batch.updated_at).toLocaleTimeString("es-PE")}`
          : batch.updated_at
            ? `Actualizado: ${new Date(batch.updated_at).toLocaleTimeString("es-PE")}`
            : "Hora de actualización no informada por el servicio"
      }
      actions={
        <Group gap="sm">
          <StatusBadge semantic={statusSemantic} size="md">
            {statusLabel}
          </StatusBadge>
          {onRefresh && (
            <Button
              variant="outline"
              size="xs"
              leftSection={<IconRefresh size={16} stroke={2} aria-hidden="true" />}
              onClick={onRefresh}
              loading={refreshing}
            >
              Actualizar estado
            </Button>
          )}
        </Group>
      }
    >
      <Stack gap="lg">
        {/* KPI Metrics */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <MetricCard
            label="Total de filas"
            value={typeof batch.total_rows === "number" ? batch.total_rows : "No determinado"}
            description={
              typeof batch.total_rows === "number"
                ? "Filas declaradas en el lote"
                : "Recuento no informado o no verificado"
            }
          />
          <MetricCard
            label="Filas completadas exitosamente"
            value={batch.completed_rows}
            description={
              isProcessing
                ? typeof batch.total_rows === "number"
                  ? `${concludedCount} de ${batch.total_rows} filas concluidas`
                  : `${concludedCount} filas procesadas hasta el momento`
                : "Aplicadas en todos los dominios"
            }
          />
          <MetricCard
            label="Filas con fallos"
            value={batch.failed_rows}
            description={
              batch.failed_rows === 0
                ? "Sin fallos registrados"
                : batch.needs_reconciliation
                  ? "Fallos registrados; requieren reconciliación"
                  : "Fallos registrados; no hay reconciliación pendiente"
            }
          />
        </SimpleGrid>

        {/* Feedback Alert according to batch state */}
        {isSuccess && (
          <FeedbackAlert semantic="success" title="Importación completada satisfactoriamente">
            Todas las {batch.total_rows ?? batch.completed_rows} filas del catálogo fueron inicializadas correctamente en Catálogo, Precios e Inventario.
          </FeedbackAlert>
        )}

        {isPartial && (
          <FeedbackAlert
            semantic="warning"
            title="Importación completada con observaciones"
          >
            Se procesaron {batch.completed_rows} filas exitosamente y {batch.failed_rows} presentaron rechazo en algún dominio.
            {batch.needs_reconciliation &&
              " Los dominios completados conservan sus registros (no hay rollback destructivo). Puede descargar el reporte de errores o reanudar el lote para reintentar operaciones pendientes."}
          </FeedbackAlert>
        )}

        {isFailedGeneral && (
          <FeedbackAlert
            semantic="error"
            title="Fallo general en la importación"
          >
            No se pudo completar el procesamiento del lote. Revisa el archivo y vuelve a intentarlo.
          </FeedbackAlert>
        )}

        {(isProcessing || isQueued) && (batch.total_rows === null || batch.total_rows === undefined) && (!batch.rows || batch.rows.length === 0) && (
          <FeedbackAlert
            semantic="warning"
            title="Lote en procesamiento — Verificación dependiente del proveedor"
          >
            {getUnknownRowCountDescription()}
          </FeedbackAlert>
        )}

        {isProcessing && typeof batch.total_rows === "number" && (
          <FeedbackAlert semantic="info" title="Lote en procesamiento asíncrono">
            El lote sigue en proceso. Selecciona &quot;Actualizar estado&quot; para comprobar el avance.
          </FeedbackAlert>
        )}

        {isQueued && typeof batch.total_rows === "number" && (
          <FeedbackAlert semantic="info" title="Solicitud en cola">
            {getQueuedBatchDescription()}
          </FeedbackAlert>
        )}

        {/* Breakdown by domain when rows are available */}
        {batch.rows && batch.rows.length > 0 && (
          <Stack gap="xs">
            <Group justify="space-between" align="baseline">
              <Text size="sm" fw={600}>
                Desglose por dominio
              </Text>
              {typeof batch.total_rows === "number" && batch.rows.length < batch.total_rows && (
                <Text size="xs" c="dimmed">
                  Filas consultadas: {batch.rows.length} de {batch.total_rows}
                </Text>
              )}
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <MetricCard
                label="Catálogo"
                value={`${batch.rows.filter((r) => r.applied_domains.includes("CATALOGO") || r.steps.some((s) => s.domain === "CATALOGO" && s.status === "COMPLETED")).length} / ${batch.rows.length}`}
                description={
                  typeof batch.total_rows === "number" && batch.rows.length < batch.total_rows
                    ? "Filas con resultado disponible"
                    : "Filas con borrador creado"
                }
              />
              <MetricCard
                label="Precios (Pricing)"
                value={`${batch.rows.filter((r) => r.applied_domains.includes("PRICING") || r.steps.some((s) => s.domain === "PRICING" && s.status === "COMPLETED")).length} / ${batch.rows.length}`}
                description={
                  typeof batch.total_rows === "number" && batch.rows.length < batch.total_rows
                    ? "Filas con resultado disponible"
                    : "Filas con precio base registrado"
                }
              />
              <MetricCard
                label="Inventario"
                value={`${batch.rows.filter((r) => r.applied_domains.includes("INVENTARIO") || r.steps.some((s) => s.domain === "INVENTARIO" && s.status === "COMPLETED")).length} / ${batch.rows.length}`}
                description={
                  typeof batch.total_rows === "number" && batch.rows.length < batch.total_rows
                    ? "Filas con resultado disponible"
                    : "Filas con SKU inicializado"
                }
              />
            </SimpleGrid>
          </Stack>
        )}

        {/* Action buttons */}
        {((onResume && resumeEligible) ||
          (showDetailsLink && isTerminal)) && (
          <Group justify="flex-end" gap="sm">
            {onResume && resumeEligible && (
              <Button
                variant="outline"
                leftSection={<IconRotateClockwise size={18} stroke={2} aria-hidden="true" />}
                onClick={onResume}
                loading={resuming}
              >
                Reanudar lote
              </Button>
            )}

            {showDetailsLink && isTerminal && (
              <Button
                component={Link}
                to={`/carga-masiva/importaciones/${batch.batch_id}/resultado`}
                rightSection={<IconArrowRight size={18} stroke={2} aria-hidden="true" />}
              >
                Ver resultado final
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </SectionCard>
  );
}
