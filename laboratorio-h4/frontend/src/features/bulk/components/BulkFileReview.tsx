import { Badge, Group, List, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { FeedbackAlert, MetricCard, SectionCard } from "../../../components/shared";
import type { LocalFileCheckResult } from "../types/bulk";

export interface BulkFileReviewProps {
  check: LocalFileCheckResult;
}

export function BulkFileReview({ check }: BulkFileReviewProps) {
  const isCsv = check.format === "CSV";

  return (
    <Stack gap="lg">
      <FeedbackAlert semantic="info" title="Alcance de la revisión preliminar">
        Esta revisión comprueba el archivo y su estructura antes del envío. El resultado definitivo se confirma durante el procesamiento del lote.
      </FeedbackAlert>

      {/* File metadata section */}
      <SectionCard
        title="Datos del archivo seleccionado"
        description="Propiedades obtenidas en el navegador antes de la transmisión"
      >
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <MetricCard
            label="Nombre del archivo"
            value={
              <Text size="md" fw={600} lineClamp={2}>
                {check.fileName}
              </Text>
            }
            description={`Formato: ${check.format}`}
          />
          <MetricCard
            label="Tamaño"
            value={
              check.fileSize < 1024
                ? `${check.fileSize} B`
                : `${(check.fileSize / 1024).toFixed(1)} KB`
            }
            description={`${new Intl.NumberFormat("es-PE").format(check.fileSize)} bytes`}
          />
          <MetricCard
            label="Filas detectadas"
            value={check.detectedRows !== undefined ? check.detectedRows : "Pendiente"}
            description={
              isCsv
                ? "Excluyendo fila de encabezados"
                : "Validación diferida a servidor"
            }
          />
        </SimpleGrid>
      </SectionCard>

      {/* Structural observations & Warnings */}
      {check.warnings.length > 0 && (
        <FeedbackAlert semantic="warning" title="Observaciones estructurales detectadas">
          <List size="sm" spacing="xs" mt="xs">
            {check.warnings.map((warning, index) => (
              <List.Item key={index}>{warning}</List.Item>
            ))}
          </List>
        </FeedbackAlert>
      )}

      {/* Errors if any */}
      {check.errors.length > 0 && (
        <FeedbackAlert semantic="error" title="Errores bloqueantes en el archivo">
          <List size="sm" spacing="xs" mt="xs">
            {check.errors.map((error, index) => (
              <List.Item key={index}>{error}</List.Item>
            ))}
          </List>
        </FeedbackAlert>
      )}

      {/* Detected columns for CSV */}
      {check.detectedColumns && check.detectedColumns.length > 0 && (
        <SectionCard
          title="Columnas detectadas en el encabezado"
          description="Estructura de campos identificada en la primera línea del archivo CSV"
        >
          <Group gap="xs">
            {check.detectedColumns.map((col) => (
              <Badge key={col} variant="outline" color="gray" size="md">
                {col}
              </Badge>
            ))}
          </Group>
        </SectionCard>
      )}

      {/* Explicitly unverified aspects */}
      {check.unverifiedAspects.length > 0 && (
        <Paper p="md" style={{ background: "var(--po-background-subtle)" }}>
          <Stack gap="xs">
            <Group gap="xs">
              <IconInfoCircle size={18} color="var(--po-text-dimmed)" />
              <Text size="sm" fw={600}>
                Aspectos no verificados en esta fase (responsabilidad del proveedor):
              </Text>
            </Group>
            <List size="xs" c="dimmed" spacing="xs" pl="md">
              {check.unverifiedAspects.map((aspect, index) => (
                <List.Item key={index}>{aspect}</List.Item>
              ))}
            </List>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
