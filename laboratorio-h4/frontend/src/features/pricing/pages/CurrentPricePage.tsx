import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Skeleton, Stack, Text } from "@mantine/core";
import { EmptyState, FeedbackAlert } from "../../../components/shared";
import { PriceSummary } from "../components/PriceSummary";
import { PriceBreakdown } from "../components/PriceBreakdown";
import { PriceFilters } from "../components/PriceFilters";
import { useCurrentPrice } from "../hooks/useCurrentPrice";
import { usePricingContext } from "../hooks/usePricingContext";
import type { PriceQuery } from "../services/pricingRepository";
import { PricingLinks, PricingPageFrame } from "../components/PricingPageFrame";

export function CurrentPricePage() {
  const context = usePricingContext();
  return (
    <PricingPageFrame
      title="Gestión de precios"
      description="Consulta los precios vigentes de productos y variantes (SKU)."
      actions={
        <Button
          component={Link}
          to={`/precios/importar${context.suffix}`}
          variant="outline"
        >
          Importar precios
        </Button>
      }
    >
      <CurrentPriceContent
        key={`${context.query.targetId}:${context.query.channel}`}
        query={context.query}
        onApply={(next) =>
          context.setParams((prev) => {
            const values = new URLSearchParams(prev);
            values.set("target", next.targetId);
            values.set("channel", next.channel);
            return values;
          })
        }
      />
    </PricingPageFrame>
  );
}
function CurrentPriceContent({
  query,
  onApply,
}: {
  query: PriceQuery;
  onApply: (query: PriceQuery) => void;
}) {
  const context = usePricingContext();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState(query);
  const [revision, setRevision] = useState(0);
  const { state, previous } = useCurrentPrice(query, revision);
  const snapshot = state.status === "success" ? state.result : previous;
  const fresh = state.status === "success" && state.result !== null;
  return (
    <Stack gap="lg">
      <PriceFilters
        targets={context.targets}
        draft={draft}
        applied={query}
        onChange={setDraft}
        onConsult={() => {
          onApply(draft);
          setRevision((value) => value + 1);
        }}
      />
      {state.status === "loading" && (
        <Stack gap="sm" role="status">
          <Text size="sm">
            {previous ? "Actualizando consulta…" : "Cargando precio…"}
          </Text>
          {!previous && <Skeleton height={120} radius="md" />}
        </Stack>
      )}
      {state.status === "error" && (
        <FeedbackAlert
          semantic="error"
          title="Precio no disponible"
          actions={
            <Button
              variant="outline"
              onClick={() => setRevision((value) => value + 1)}
            >
              Volver a consultar
            </Button>
          }
        >
          {state.message}
        </FeedbackAlert>
      )}
      {snapshot && (
        <>
          {!fresh && (
            <FeedbackAlert
              semantic="warning"
              title="Última consulta disponible"
            >
              Se conserva la última lectura de este objetivo; no se presenta
              como una consulta actualizada. Las acciones que requieren lectura
              vigente están bloqueadas.
            </FeedbackAlert>
          )}
          {query.channel === "retail" &&
            snapshot.price.channel === "global" && (
              <FeedbackAlert semantic="info" title="Fallback al precio global">
                Para el canal Retail seleccionado, el precio disponible
                corresponde al alcance global.
              </FeedbackAlert>
            )}
          <PriceSummary price={snapshot.price} />
          {fresh && <PricingLinks suffix={`?${params.toString()}`} />}
          <PriceBreakdown rows={snapshot.breakdown} />
        </>
      )}
      {state.status === "success" && !state.result && (
        <EmptyState
          title="Sin precio aplicable"
          description="No hay un precio disponible para la selección."
        />
      )}
    </Stack>
  );
}
