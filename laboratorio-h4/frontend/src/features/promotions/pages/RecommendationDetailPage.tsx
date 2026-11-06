import { usePromotionServices } from "../hooks/usePromotionServices";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, Group, Stack, Text } from "@mantine/core";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { AdministrationStateDialog } from "../components/AdministrationStateDialog";
import { RecommendationCandidates } from "../components/RecommendationCandidates";
import { useAdministrationRead } from "../hooks/useAdministrationRead";

import {
  recommendationKindLabel,
  type RecommendationView,
} from "../services/recommendationRepository";
export function RecommendationDetailPage({
  changeState = false,
}: {
  changeState?: boolean;
}) {
  const { ruleId = "" } = useParams();
  const [params] = useSearchParams(),
    suffix = params.size ? `?${params}` : "";
  const {
    services,
    confirmedServices,
    revision: queryRevision,
    retry,
  } = usePromotionServices();
  const [revision, setRevision] = useState(0),
    [opened, setOpened] = useState(false),
    [updated, setUpdated] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null),
    location = useLocation(),
    navigate = useNavigate();
  const read = useCallback(
    (signal: AbortSignal) =>
      services.recommendations.read(ruleId, signal),
    [ruleId, services],
  );
  const state = useAdministrationRead(
    `${ruleId}:${revision + queryRevision}`,
    read,
  );
  const [cachedRecord, setCachedRecord] = useState<RecommendationView | null>(null);
  const [prevResult, setPrevResult] = useState<RecommendationView | null>(null);
  if (state.status === "success" && state.result !== prevResult) {
    setPrevResult(state.result);
    setCachedRecord(state.result);
  }
  const record = state.status === "success" ? state.result : cachedRecord;
  const readCatalog = useCallback(
    async (signal: AbortSignal) => ({
      products: await confirmedServices.catalog.products(signal, record ? {
        productIds: [
          ...(record.configuration.originType === "product" ? [record.configuration.originId] : []),
          ...record.configuration.candidates.map((candidate) => candidate.productId),
        ],
        skus: [],
      } : undefined),
      categories: await confirmedServices.catalog.categories(signal),
    }),
    [confirmedServices, record],
  );
  const catalog = useAdministrationRead(`catalog:${revision + queryRevision}:${record?.id ?? ""}`, readCatalog);
  useEffect(() => {
    if (record && (location.state?.focusState || updated))
      trigger.current?.focus();
  }, [record, location.state, updated]);
  const close = () => {
    setOpened(false);
    if (changeState)
      navigate(`/recomendaciones/${ruleId}${suffix}`, {
        replace: true,
        state: { focusState: true },
      });
  };
  const origins =
    catalog.status === "success"
      ? record?.configuration.originType === "category"
        ? catalog.result.categories
        : catalog.result.products
      : [];
  return (
    <>
      <PageHeader
        title={record?.name ?? "Detalle de regla"}
        actions={
          <Button
            component={Link}
            variant="outline"
            to={`/recomendaciones${suffix}`}
          >
            Volver al listado
          </Button>
        }
      />
      <Stack gap="lg">
        <PromotionDataNotice kind="recommendation-detail" />
        {location.state?.saved && (
          <FeedbackAlert semantic="success" title="Regla guardada">
            La configuración fue confirmada.
          </FeedbackAlert>
        )}
        {updated && (
          <FeedbackAlert semantic="success" title="Estado actualizado">
            El cambio fue confirmado y los candidatos se conservan.
          </FeedbackAlert>
        )}
        {state.status === "loading" && (
          <Text role="status">Consultando regla…</Text>
        )}
        {state.status === "error" && (
          <FeedbackAlert
            semantic="error"
            title="Consulta no disponible"
            actions={
              state.access ? undefined : (
                <Button
                  variant="outline"
                  onClick={retry}
                >
                  Volver a consultar
                </Button>
              )
            }
          >
            {state.message}
          </FeedbackAlert>
        )}
        {state.status === "success" && !record && (
          <EmptyState
            title="Regla no encontrada"
            description="Selecciona otro registro en el listado."
          />
        )}
        {record && (
          <>
            <SectionCard
              title="Configuración de la regla"
              actions={
                <StatusBadge>
                  {record.status === "active" ? "Activa" : "Inactiva"}
                </StatusBadge>
              }
            >
              <Text size="sm">
                Tipo: {recommendationKindLabel(record.configuration.kind)}
              </Text>
              <Text size="sm">
                Origen{" "}
                {record.configuration.originType === "category"
                  ? "por categoría"
                  : "por producto"}
                :{" "}
                {origins.find(
                  (item) => item.id === record.configuration.originId,
                )?.name ?? "No disponible"}
              </Text>
              <Text size="sm">Prioridad: {record.configuration.priority}</Text>
              <Text size="sm">
                Vigencia: {record.configuration.validFrom.replace("T", " ")} al{" "}
                {record.configuration.validUntil.replace("T", " ")} ·
                America/Lima
              </Text>
            </SectionCard>
            <RecommendationCandidates
              draft={record.configuration}
              products={
                catalog.status === "success" ? catalog.result.products : []
              }
            />
            <Text size="sm" c="dimmed">
              Precio y disponibilidad por producto: No disponible.
            </Text>
            <Group gap="sm">
              <Button
                component={Link}
                to={`/recomendaciones/${ruleId}/editar${suffix}`}
              >
                Editar regla
              </Button>
              <Button
                ref={trigger}
                variant="outline"
                onClick={() => setOpened(true)}
              >
                {record.status === "active"
                  ? "Desactivar regla"
                  : "Activar regla"}
              </Button>
            </Group>
            <AdministrationStateDialog
              record={record}
              entityLabel="regla"
              opened={opened || changeState}
              change={(status, signal) =>
                services.recommendations.changeStatus(
                  ruleId,
                  status,
                  signal,
                )
              }
              read={(signal) =>
                confirmedServices.recommendations.read(ruleId, signal)
              }
              onCancel={close}
              onConfirmed={() => {
                close();
                setUpdated(true);
                setRevision((value) => value + 1);
              }}
            />
          </>
        )}
      </Stack>
    </>
  );
}
