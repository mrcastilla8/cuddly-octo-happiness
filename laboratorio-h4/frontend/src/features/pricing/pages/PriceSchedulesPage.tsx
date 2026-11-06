import { Button } from "@mantine/core";
import { FeedbackAlert } from "../../../components/shared";
import { usePricingContext } from "../hooks/usePricingContext";
import { useEditableRead } from "../hooks/usePriceEdit";
import { usePriceSchedules } from "../hooks/usePriceSchedules";
import {
  PricingContextLabel,
  PricingPageFrame,
} from "../components/PricingPageFrame";
import { SchedulesTable } from "../components/SchedulesTable";
import { ScheduleForm } from "../components/ScheduleForm";

export function PriceSchedulesPage() {
  const context = usePricingContext();
  return (
    <PricingPageFrame
      title="Programaciones de precio"
      description="Consulta las vigencias y registra propuestas futuras para el objetivo seleccionado."
    >
      <SchedulesContent
        key={`${context.query.targetId}:${context.query.channel}`}
      />
    </PricingPageFrame>
  );
}
function SchedulesContent() {
  const context = usePricingContext();
  const list = usePriceSchedules(context.query.targetId);
  const objective = useEditableRead(context.query);
  const state = list.listing.state;
  return (
    <>
      <PricingContextLabel
        label={context.target?.label ?? "Objetivo no disponible"}
        channel={context.query.channel}
      />
      <Button
        style={{ alignSelf: "flex-start" }}
        variant="outline"
        onClick={list.refresh}
      >
        Consultar programaciones
      </Button>
      <SchedulesTable
        result={state.status === "success" ? state.result : undefined}
        state={
          state.status === "error"
            ? { status: "error", message: state.message }
            : { status: state.status }
        }
        page={list.page}
        onPage={list.setPage}
      />
      {objective.state.status === "success" && objective.state.result ? (
        <ScheduleForm
          targetId={context.query.targetId}
          currency={objective.state.result.currency}
          channel={context.query.channel}
          onCreated={list.refresh}
        />
      ) : (
        <FeedbackAlert semantic="info" title="Lectura del objetivo requerida">
          {objective.state.status === "loading"
            ? "Cargando contexto…"
            : "La creación está bloqueada hasta disponer de una lectura del objetivo."}
        </FeedbackAlert>
      )}
    </>
  );
}
