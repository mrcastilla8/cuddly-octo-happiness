import { useState } from "react";
import {
  Button,
  Group,
  Select,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import {
  EmptyState,
  FeedbackAlert,
  SectionCard,
} from "../../../components/shared";
import { usePricingContext } from "../hooks/usePricingContext";
import { useHistoricalPrice } from "../hooks/useHistoricalPrice";
import {
  displayInstant,
  localInstant,
  priceTimeZone,
} from "../services/pricingValidation";
import { PricingPageFrame } from "../components/PricingPageFrame";
import { PriceSummary } from "../components/PriceSummary";

export function HistoricalPricePage() {
  const context = usePricingContext(true);
  return (
    <PricingPageFrame
      title="Precio en una fecha"
      description="Consulta una vigencia por SKU, canal e instante, separada del precio vigente."
    >
      <HistoricalContent
        key={`${context.query.targetId}:${context.query.channel}:${context.params.get("at") ?? ""}`}
      />
    </PricingPageFrame>
  );
}
function HistoricalContent() {
  const context = usePricingContext(true);
  const [draft, setDraft] = useState(context.query);
  const appliedAt = context.params.get("at");
  const [at, setAt] = useState(appliedAt ?? "");
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const instant = appliedAt ? localInstant(appliedAt) : null;
  const response = useHistoricalPrice(context.query, instant, revision);
  function consult() {
    if (!localInstant(at)) {
      setError("Indica un instante válido con fecha y hora.");
      return;
    }
    setError(undefined);
    context.setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("target", draft.targetId);
      next.set("channel", draft.channel);
      next.set("at", at);
      return next;
    });
    setRevision((value) => value + 1);
  }
  return (
    <>
      <SectionCard
        title="Parámetros de consulta"
        description="La referencia del producto usa su SKU base; las variantes usan el SKU seleccionado."
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            consult();
          }}
        >
          <SimpleGrid cols={3} spacing="lg">
            <Select
              label="SKU de referencia"
              value={draft.targetId}
              data={context.targets.flatMap((target) =>
                target.kind === "variant"
                  ? [{ value: target.id, label: target.sku }]
                  : target.referenceSku
                    ? [
                        {
                          value: target.id,
                          label: `${target.referenceSku} · SKU base`,
                        },
                      ]
                    : [],
              )}
              onChange={(value) => {
                if (context.targets.some((row) => row.id === value))
                  setDraft({ ...draft, targetId: value! });
              }}
            />
            <Select
              label="Canal histórico"
              value={draft.channel}
              data={[
                { value: "global", label: "Global" },
                { value: "retail", label: "Retail" },
              ]}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  channel: value === "retail" ? "retail" : "global",
                })
              }
            />
            <TextInput
              type="datetime-local"
              label="Fecha y hora de consulta"
              required
              value={at}
              onChange={(event) => setAt(event.currentTarget.value)}
              description={priceTimeZone}
              error={
                error ??
                (appliedAt && !instant
                  ? "El instante de la dirección no es válido."
                  : undefined)
              }
            />
          </SimpleGrid>
          <Group justify="flex-end" mt="md">
            <Button type="submit">Consultar precio</Button>
          </Group>
        </form>
      </SectionCard>
      {!appliedAt && (
        <Text size="sm">
          Elige un instante y pulsa Consultar precio. La consulta histórica no
          modifica ninguna vigencia.
        </Text>
      )}
      {instant && (
        <>
          <Text size="sm" fw={600}>
            Instante aplicado: {displayInstant(instant)} · {priceTimeZone} ·
            SKU:{" "}
            {context.target?.kind === "variant"
              ? context.target.sku
              : context.target?.referenceSku}
            .
          </Text>
          {response.state.status === "loading" && (
            <Text size="sm" role="status">
              Consultando precio histórico…
            </Text>
          )}
          {response.state.status === "error" && (
            <FeedbackAlert
              semantic="error"
              title="Consulta histórica no disponible"
              actions={
                <Button
                  variant="outline"
                  onClick={() => setRevision((value) => value + 1)}
                >
                  Volver a consultar histórico
                </Button>
              }
            >
              {response.state.message} El instante y la selección se conservan.
            </FeedbackAlert>
          )}
          {response.state.status === "success" &&
            (response.state.result ? (
              <>
                <FeedbackAlert
                  semantic="info"
                  title="Precio del instante consultado"
                >
                  Este precio corresponde al instante aplicado; no se presenta
                  como precio vigente hoy.{" "}
                  {context.query.channel === "retail" &&
                    response.state.result.price.channel === "global" &&
                    "El canal Retail solicitado resolvió al precio global efectivo."}
                </FeedbackAlert>
                <PriceSummary price={response.state.result.price} historical />
                <Text size="sm">
                  Referencia de vigencia: {response.state.result.validityId}.
                </Text>
              </>
            ) : (
              <EmptyState
                title="Sin precio en ese instante"
                description="No encontramos un precio para este SKU en la fecha consultada. No equivale a un importe de cero."
              />
            ))}
        </>
      )}
      <Text size="sm">
        Esta consulta resuelve una vigencia. La bitácora de quién cambió el
        precio corresponde a Auditoría de precios.
      </Text>
    </>
  );
}
