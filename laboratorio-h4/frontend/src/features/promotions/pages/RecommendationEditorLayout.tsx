import { usePromotionServices } from "../hooks/usePromotionServices";
import { useCallback } from "react";
import {
  Link,
  Navigate,
  Outlet,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, Skeleton, Stack, Text } from "@mantine/core";
import { EmptyState, FeedbackAlert } from "../../../components/shared";
import { useAdministrationRead } from "../hooks/useAdministrationRead";
import { useAdministrationEditor } from "../hooks/useAdministrationEditor";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";

import {
  recommendationErrors,
  normalizeRecommendationDraft,
} from "../services/recommendationValidation";
import {
  emptyRecommendation,
  type RecommendationDraft,
  type RecommendationKind,
  type RecommendationView,
} from "../services/recommendationRepository";
import type {
  CatalogCategoryChoice,
  CatalogProductChoice,
} from "../services/catalogRepository";
const draftOf = (record: RecommendationView) =>
  structuredClone(record.configuration);
export interface RecommendationEditorContext {
  form: ReturnType<
    typeof useAdministrationEditor<RecommendationView, RecommendationDraft>
  >;
  initial: RecommendationView | null;
  root: string;
  suffix: string;
  products: CatalogProductChoice[];
  categories: CatalogCategoryChoice[];
  catalogLoading: boolean;
  catalogError: string | undefined;
  navigationBlocked: boolean;
}
export function RecommendationEditorLayout({
  kind = "cross-sell",
}: {
  kind?: RecommendationKind;
}) {
  const { ruleId } = useParams();
  const { services, prepareCreation } = usePromotionServices();
  const read = useCallback(
    (signal: AbortSignal) =>
      ruleId
        ? services.recommendations.read(ruleId, signal)
        : prepareCreation(signal).then(() => null),
    [ruleId, services, prepareCreation],
  );
  const state = useAdministrationRead(ruleId ?? kind, read);
  if (state.status === "loading")
    return (
      <Stack role="status">
        <Text>Cargando regla…</Text>
        <Skeleton height={200} />
      </Stack>
    );
  if (state.status === "error")
    return (
      <Stack>
        <FeedbackAlert semantic="error" title="No se puede editar">
          {state.message}
        </FeedbackAlert>
        <Button component={Link} to="/recomendaciones">
          Volver al listado
        </Button>
      </Stack>
    );
  if (ruleId && !state.result)
    return (
      <EmptyState
        title="Regla no encontrada"
        description="Selecciona otro registro para editar."
        action={
          <Button component={Link} to="/recomendaciones">
            Volver al listado
          </Button>
        }
      />
    );
  return (
    <RecommendationEditorProvider
      key={ruleId ?? kind}
      kind={kind}
      initial={state.result}
    />
  );
}
function RecommendationEditorProvider({
  initial,
  kind,
}: {
  initial: RecommendationView | null;
  kind: RecommendationKind;
}) {
  const [params] = useSearchParams();
  const { services, confirmedServices, clearTransientParams, revision } =
    usePromotionServices();
  const suffix = params.size ? `?${params}` : "";
  const root = initial
    ? `/recomendaciones/${initial.id}/editar`
    : `/recomendaciones/nueva/${kind === "upsell" ? "upselling" : "venta-cruzada"}`;
  const form = useAdministrationEditor(
    initial,
    { ...emptyRecommendation, kind },
    draftOf,
    recommendationErrors,
    services.recommendations,
    normalizeRecommendationDraft,
    confirmedServices.recommendations,
  );
  const guard = useUnsavedChanges(
    form.dirty && !form.confirmed,
    form.submitting,
    root,
  );
  const readCatalog = useCallback(
    async (signal: AbortSignal) => ({
      products: await services.catalog.products(signal, initial ? {
        productIds: [
          ...(initial.configuration.originType === "product" ? [initial.configuration.originId] : []),
          ...initial.configuration.candidates.map((candidate) => candidate.productId),
        ],
        skus: [],
      } : undefined),
      categories: await services.catalog.categories(signal),
    }),
    [services, initial],
  );
  const catalog = useAdministrationRead(`catalog:${revision}:${initial?.id ?? "new"}`, readCatalog);
  if (form.confirmed) {
    const next = clearTransientParams(params);
    return (
      <Navigate
        replace
        to={`/recomendaciones/${form.confirmed.id}?${next}`}
        state={{ saved: true }}
      />
    );
  }
  const context: RecommendationEditorContext = {
    form,
    initial,
    root,
    suffix,
    products: catalog.status === "success" ? catalog.result.products : [],
    categories: catalog.status === "success" ? catalog.result.categories : [],
    catalogLoading: catalog.status === "loading",
    catalogError: catalog.status === "error" ? catalog.message : undefined,
    navigationBlocked: guard.blocked,
  };
  return (
    <>
      <Outlet context={context} />
      <UnsavedChangesDialog
        opened={guard.blocked}
        submitting={form.submitting}
        onStay={guard.stay}
        onDiscard={guard.discard}
      />
    </>
  );
}
