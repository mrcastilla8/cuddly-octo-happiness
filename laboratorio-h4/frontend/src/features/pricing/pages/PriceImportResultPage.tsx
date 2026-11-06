import { Button, Group, SimpleGrid, Text } from "@mantine/core";
import { Link, useParams } from "react-router-dom";
import {
  EmptyState,
  FeedbackAlert,
  MetricCard,
} from "../../../components/shared";
import { usePricingContext } from "../hooks/usePricingContext";
import { usePriceBatch } from "../hooks/usePriceBatch";
import { PricingPageFrame } from "../components/PricingPageFrame";
import { ImportRowsTable } from "../components/ImportRowsTable";

const labels = {
  QUEUED: "Solicitud recibida — en cola",
  PROCESSING: "En proceso",
  COMPLETED: "Completado",
  PARTIAL: "Completado parcialmente",
  FAILED: "Fallido",
};
export function PriceImportResultPage() {
  const { batchId = "" } = useParams();
  return (
    <PricingPageFrame
      title="Resultado de importación"
      description="Consulta el estado y los resultados publicados de un lote identificado."
      requiresTarget={false}
    >
      <BatchContent key={batchId} id={batchId} />
    </PricingPageFrame>
  );
}
function BatchContent({ id }: { id: string }) {
  const context = usePricingContext();
  const response = usePriceBatch(id);
  const batch =
    response.state.status === "success"
      ? response.state.result
      : response.previous;
  const fresh = response.state.status === "success";
  const terminal =
    batch && ["PARTIAL", "COMPLETED", "FAILED"].includes(batch.status);
  return (
    <>
      <Text size="sm" fw={600}>
        Lote: {id}
      </Text>
      <Button
        variant="outline"
        onClick={response.refresh}
        style={{ alignSelf: "flex-start" }}
      >
        Consultar estado
      </Button>
      {response.state.status === "loading" && (
        <Text size="sm" role="status">
          Consultando estado del lote…
        </Text>
      )}
      {response.state.status === "error" && (
        <FeedbackAlert semantic="error" title="No se pudo actualizar el lote">
          {response.state.message}
        </FeedbackAlert>
      )}
      {batch && (
        <>
          {!fresh && (
            <FeedbackAlert semantic="warning" title="Última consulta del lote">
              Se conserva el último resultado conocido. No acredita una
              actualización; la descarga está bloqueada.
            </FeedbackAlert>
          )}
          <FeedbackAlert
            semantic={
              batch.status === "PARTIAL"
                ? "warning"
                : batch.status === "FAILED"
                  ? "error"
                  : batch.status === "COMPLETED"
                    ? "success"
                    : "info"
            }
            title={labels[batch.status]}
          >
            Política del lote:{" "}
            {batch.allowPartial
              ? "Permitir resultados parciales"
              : "Rechazar el lote si hay errores"}
            .{" "}
            {terminal
              ? "Resultado terminal publicado para este lote."
              : "La admisión no confirma que los precios se hayan actualizado. No hay reporte terminal disponible."}
          </FeedbackAlert>
          <SimpleGrid cols={3} spacing="lg">
            <MetricCard label="Total de filas" value={String(batch.total)} />
            <MetricCard label="Confirmadas" value={String(batch.completed)} />
            <MetricCard label="Rechazadas" value={String(batch.failed)} />
          </SimpleGrid>
          {batch.rows ? (
            <ImportRowsTable
              caption="Resultados por fila del lote"
              rows={batch.rows}
            />
          ) : (
            <EmptyState
              title="Detalle de filas no disponible"
              description="La ausencia de filas no implica que todas se hayan confirmado."
            />
          )}
          <Group gap="sm">
            <Button
              variant="outline"
              disabled={!terminal || !fresh || response.report.busy}
              loading={response.report.busy}
              onClick={() => void response.download()}
            >
              Descargar reporte
            </Button>
            {batch.failed > 0 && (
              <Button
                component={Link}
                to={`/precios/importar${context.suffix}`}
                variant="outline"
              >
                Corregir archivo
              </Button>
            )}
          </Group>
          {response.report.result && terminal && fresh && (
            <Text size="sm" role="status">
              Reporte descargado: {response.report.result.filename}.
            </Text>
          )}
          {response.report.error && (
            <FeedbackAlert semantic="error" title="Reporte no disponible">
              {response.report.error.message}
            </FeedbackAlert>
          )}
          <Text size="sm">
            Las filas confirmadas se conservan en el resultado. Para corregir
            debes revisar un archivo nuevo; no se reenvía el lote ni se duplican
            automáticamente las filas confirmadas.
          </Text>
        </>
      )}
      {fresh && !batch && (
        <EmptyState
          title="Lote no encontrado"
          description="La referencia no corresponde a un lote disponible. No se ha creado otro lote."
        />
      )}
    </>
  );
}
