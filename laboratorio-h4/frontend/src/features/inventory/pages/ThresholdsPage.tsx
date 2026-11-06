import { Link, useSearchParams } from "react-router-dom";
import { Button, Skeleton, Stack } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { ThresholdConfigForm } from "../components/ThresholdConfigForm";
import { DevScenarioSelector } from "../dev/DevScenarioSelector";
import { useInventoryStock } from "../hooks/useInventoryStock";
import { useThresholds } from "../hooks/useThresholds";
import type { StockFiltersQuery } from "../services/inventoryTypes";

export function ThresholdsPage() {
  const [params] = useSearchParams();
  const isRevisionMode =
    import.meta.env.DEV && params.get("modoRevision") === "1";
  const {
    thresholds,
    loading,
    saving,
    error,
    feedback,
    refreshWarning,
    updateGlobal,
    updateSku,
    clearFeedback,
  } = useThresholds();

  const { items: stockItems } = useInventoryStock({} as StockFiltersQuery);

  return (
    <>
      <PageHeader
        title="Configuración de umbrales de stock"
        description="Establece los niveles mínimos de alerta de stock bajo a nivel global o por SKU."
        breadcrumbs={[
          { label: "Inventario" },
          { label: "Control de stock", to: "/inventario" },
          { label: "Umbrales" },
        ]}
        actions={
          <Button
            component={Link}
            to="/inventario"
            variant="outline"
            leftSection={<IconArrowLeft size={16} />}
          >
            Volver a Control de stock
          </Button>
        }
      />

      <Stack gap="lg">
        {isRevisionMode && <DevScenarioSelector />}

        {loading && !thresholds && (
          <Stack gap="md">
            <Skeleton height={140} radius="md" />
            <Skeleton height={260} radius="md" />
          </Stack>
        )}

        {error && (
          <FeedbackAlert semantic="error" title="Error al cargar configuración de umbrales">
            {error}
          </FeedbackAlert>
        )}

        {refreshWarning && !error && (
          <FeedbackAlert
            semantic="warning"
            title="No se pudo refrescar la configuración"
          >
            {refreshWarning}
          </FeedbackAlert>
        )}

        {feedback && (
          <FeedbackAlert semantic={feedback.semantic} title={feedback.title}>
            {feedback.message}
          </FeedbackAlert>
        )}

        {thresholds && (
          <ThresholdConfigForm
            thresholds={thresholds}
            stockItems={stockItems}
            saving={saving}
            onUpdateGlobal={updateGlobal}
            onUpdateSku={updateSku}
            onUpdateStart={clearFeedback}
          />
        )}
      </Stack>
    </>
  );
}
