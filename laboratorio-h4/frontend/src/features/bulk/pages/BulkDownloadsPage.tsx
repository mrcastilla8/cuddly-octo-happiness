import { useState } from "react";
import { Button, Group, Radio, Stack } from "@mantine/core";
import {
  IconArrowLeft,
  IconDownload,
} from "@tabler/icons-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
} from "../../../components/shared";
import { ExportJobPanel } from "../components/ExportJobPanel";
import { useBulkDownloads } from "../hooks/useBulkFlow";
import type { BulkExportFormat } from "../types/bulk";

export function BulkDownloadsPage() {
  const [searchParams] = useSearchParams();
  const initialExportId = searchParams.get("export_id") ?? undefined;
  const [templateFormat, setTemplateFormat] = useState<BulkExportFormat>("CSV");

  const {
    exportJob,
    dataMode,
    submittingExport,
    refreshingJob,
    downloadingExport,
    downloadingTemplate,
    error,
    initialQueryStatus,
    initialQueryError,
    isStale,
    requestExport,
    refreshJob,
    retryInitialQuery,
    downloadExportFile,
    downloadTemplate,
  } = useBulkDownloads(initialExportId);

  return (
    <>
      <PageHeader
        title="Descargas y exportación masiva"
        description="Descarga de archivos de ejemplo de carga y generación asíncrona del catálogo consolidado."
        breadcrumbs={[
          { label: "Carga masiva", to: "/carga-masiva" },
          { label: "Descargas y exportación" },
        ]}
        actions={
          <Button
            component={Link}
            to="/carga-masiva"
            variant="outline"
            leftSection={<IconArrowLeft size={18} stroke={2} aria-hidden="true" />}
          >
            Volver a carga de archivo
          </Button>
        }
      />

      <Stack gap="lg">
        {initialQueryStatus === "loading" && (
          <FeedbackAlert semantic="info" title="Consultando exportación">
            Consultando el trabajo {initialExportId}…
          </FeedbackAlert>
        )}
        {initialQueryStatus === "not_found" && (
          <FeedbackAlert semantic="warning" title="Exportación no encontrada">
            No existe un trabajo de exportación con identificador {initialExportId}.
          </FeedbackAlert>
        )}
        {initialQueryError && (
          <FeedbackAlert
            semantic="error"
            title="No se pudo consultar la exportación"
            actions={
              <Button size="xs" variant="outline" onClick={retryInitialQuery}>
                Reintentar consulta
              </Button>
            }
          >
            {initialQueryError}
          </FeedbackAlert>
        )}
        {error && (
          <FeedbackAlert semantic="error" title="No se completó la descarga o consulta">
            {error}
          </FeedbackAlert>
        )}
        {exportJob && isStale && (
          <FeedbackAlert semantic="warning" title="Información de exportación desactualizada">
            Se conserva la última respuesta conocida para {exportJob.export_id}; la consulta más reciente no confirmó su estado actual.
          </FeedbackAlert>
        )}

        {/* Template Downloads Section */}
        <SectionCard
          title="Archivos de ejemplo para importación"
          description="Estructura de referencia para preparar archivos de importación masiva"
        >
          <Stack gap="md">

            <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
              <Radio.Group
                label="Formato de plantilla"
                description="Selecciona el formato del archivo."
                value={templateFormat}
                onChange={(value) => setTemplateFormat(value as BulkExportFormat)}
              >
                <Group mt="xs" gap="lg">
                  <Radio value="CSV" label="CSV de ejemplo" />
                  <Radio value="XLSX" label="XLSX" />
                </Group>
              </Radio.Group>
              <Button
                variant="outline"
                size="sm"
                leftSection={<IconDownload size={16} stroke={2} aria-hidden="true" />}
                onClick={() => downloadTemplate(templateFormat)}
                loading={downloadingTemplate}
                disabled={downloadingTemplate}
              >
                Descargar {templateFormat} {templateFormat === "CSV" ? "de ejemplo" : ""}
              </Button>
            </Group>
          </Stack>
        </SectionCard>

        {/* Catalog Export Section */}
        <ExportJobPanel
          job={exportJob}
          onRequestExport={requestExport}
          onRefreshJob={refreshJob}
          onDownloadExport={downloadExportFile}
          submitting={submittingExport}
          refreshing={refreshingJob}
          downloading={downloadingExport}
          stale={isStale}
          dataMode={dataMode}
        />
      </Stack>
    </>
  );
}
