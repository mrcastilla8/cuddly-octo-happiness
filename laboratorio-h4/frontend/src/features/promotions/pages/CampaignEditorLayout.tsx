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
  campaignErrors,
  normalizeCampaignDraft,
} from "../services/campaignValidation";
import {
  emptyCampaign,
  type CampaignDraft,
  type CampaignView,
} from "../services/campaignRepository";
import type { CatalogProductChoice } from "../services/catalogRepository";
const draftOf = (record: CampaignView) => structuredClone(record.configuration);
export interface CampaignEditorContext {
  form: ReturnType<typeof useAdministrationEditor<CampaignView, CampaignDraft>>;
  initial: CampaignView | null;
  root: string;
  suffix: string;
  products: CatalogProductChoice[];
  catalogLoading: boolean;
  catalogError: string | undefined;
}
export function CampaignEditorLayout() {
  const { promotionId } = useParams();
  const { services, prepareCreation } = usePromotionServices();
  const read = useCallback(
    (signal: AbortSignal) =>
      promotionId
        ? services.campaigns.read(promotionId, signal)
        : prepareCreation(signal).then(() => null),
    [promotionId, services, prepareCreation],
  );
  const state = useAdministrationRead(promotionId ?? "new", read);
  if (state.status === "loading")
    return (
      <Stack role="status">
        <Text>Cargando promoción…</Text>
        <Skeleton height={200} />
      </Stack>
    );
  if (state.status === "error")
    return (
      <Stack>
        <FeedbackAlert semantic="error" title="No se puede editar">
          {state.message}
        </FeedbackAlert>
        <Button component={Link} to="/promociones" variant="outline">
          Volver al listado
        </Button>
      </Stack>
    );
  if (promotionId && !state.result)
    return (
      <EmptyState
        title="Promoción no encontrada"
        description="Selecciona otro registro para editar."
        action={
          <Button component={Link} to="/promociones">
            Volver al listado
          </Button>
        }
      />
    );
  return (
    <CampaignEditorProvider key={promotionId ?? "new"} initial={state.result} />
  );
}
function CampaignEditorProvider({ initial }: { initial: CampaignView | null }) {
  const [params] = useSearchParams();
  const { services, confirmedServices, clearTransientParams, revision } =
    usePromotionServices();
  const suffix = params.size ? `?${params}` : "";
  const root = initial
    ? `/promociones/${initial.id}/editar`
    : "/promociones/nueva";
  const form = useAdministrationEditor(
    initial,
    emptyCampaign,
    draftOf,
    campaignErrors,
    services.campaigns,
    normalizeCampaignDraft,
    confirmedServices.campaigns,
  );
  const guard = useUnsavedChanges(
    form.dirty && !form.confirmed,
    form.submitting,
    root,
  );
  const readProducts = useCallback(
    (signal: AbortSignal) => services.catalog.products(signal, initial
      ? { productIds: initial.configuration.productIds, skus: initial.configuration.skus }
      : undefined),
    [services, initial],
  );
  const catalog = useAdministrationRead(`catalog:${revision}:${initial?.id ?? "new"}`, readProducts);
  if (form.confirmed) {
    const next = clearTransientParams(params);
    return (
      <Navigate
        replace
        to={`/promociones/${form.confirmed.id}?${next}`}
        state={{ saved: true }}
      />
    );
  }
  const context: CampaignEditorContext = {
    form,
    initial,
    root,
    suffix,
    products: catalog.status === "success" ? catalog.result : [],
    catalogLoading: catalog.status === "loading",
    catalogError: catalog.status === "error" ? catalog.message : undefined,
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
