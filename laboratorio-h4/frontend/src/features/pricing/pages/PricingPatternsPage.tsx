import { useContext } from "react";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Stack, Tabs } from "@mantine/core";
import { PageHeader, FeedbackAlert } from "../../../components/shared";
import { PriceEditExample } from "../components/PriceEditExample";
import { ScheduleExample } from "../components/ScheduleExample";
import { ImportExample } from "../components/ImportExample";
import { ImportResultExample } from "../components/ImportResultExample";

export function PricingPatternsPage() {
  const [params, setParams] = useSearchParams();
  const mode = useContext(DataModeContext);
  const validPanels = ["edit", "schedule", "import", "result"];
  const panel = validPanels.includes(params.get("panel") ?? "")
    ? params.get("panel")!
    : "edit";
  const returnParams = new URLSearchParams({
    target: params.get("target") ?? "base",
    channel: params.get("channel") ?? "global",
  });
  if (mode !== "mock") {
    return (
      <Stack gap="lg">
        <PageHeader
          title="Componentes para Pricing"
          description="Galería de muestras de Pricing."
        />
        <FeedbackAlert semantic="info" title="Muestras no disponibles">
          Las muestras no representan los datos del servicio conectado. Consulta
          los precios publicados desde la pantalla de gestión.
        </FeedbackAlert>
        <Button
          component={Link}
          to={"/precios?" + returnParams}
          variant="outline"
        >
          Volver a precio vigente
        </Button>
      </Stack>
    );
  }
  return (
    <>
      <PageHeader
        title="Componentes para Pricing"
        description="Explora los formularios y estados de gestión de precios."
        breadcrumbs={[
          { label: "Precios", to: `/precios?${returnParams}` },
          { label: "Componentes" },
        ]}
        actions={
          <Button
            component={Link}
            to={`/precios?${returnParams}`}
            variant="outline"
          >
            Volver a precio vigente
          </Button>
        }
      />
      <Stack gap="lg">
        <Tabs
          value={panel}
          onChange={(value) => {
            if (value) {
              const next = new URLSearchParams(params);
              next.set("panel", value);
              setParams(next);
            }
          }}
        >
          <Tabs.List aria-label="Patrones de Pricing">
            <Tabs.Tab value="edit">Editar precio</Tabs.Tab>
            <Tabs.Tab value="schedule">Programaciones futuras</Tabs.Tab>
            <Tabs.Tab value="import">Carga masiva</Tabs.Tab>
            <Tabs.Tab value="result">Resultado de carga</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="edit" pt="lg" maw={880}>
            <PriceEditExample />
          </Tabs.Panel>
          <Tabs.Panel value="schedule" pt="lg">
            <ScheduleExample />
          </Tabs.Panel>
          <Tabs.Panel value="import" pt="lg">
            <ImportExample />
          </Tabs.Panel>
          <Tabs.Panel value="result" pt="lg">
            <ImportResultExample />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </>
  );
}
