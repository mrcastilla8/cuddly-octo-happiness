import { useCallback, useLayoutEffect, useState } from "react";
import { Button, Modal, ScrollArea, Stack, Text } from "@mantine/core";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { FeedbackAlert, SectionCard } from "../../../components/shared";
import { useAuditRuntime } from "../services/AuditRuntimeContext";
import {
  dateLabel,
  displayAuditId,
  nextValue,
  operationLabel,
  originLabel,
  previousValue,
  typeLabel,
  variation,
} from "../services/auditPresentation";
import { useAuditRead } from "../hooks/useAuditRead";
import { useAuditHistoryContext } from "../hooks/useAuditHistoryContext";

export function AuditDetailPage() {
  const { auditId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { repository } = useAuditRuntime();
  const { denyAccess } = useAuditHistoryContext();
  const [revision, setRevision] = useState(0);
  const read = useCallback(
    (signal: AbortSignal) => repository.detail(auditId, signal),
    [repository, auditId],
  );
  const state = useAuditRead(`${auditId}:${params}`, read, revision);
  useLayoutEffect(() => {
    if (
      state.status === "error" &&
      ["session", "forbidden"].includes(state.error.kind)
    )
      denyAccess(state.error.message);
    else if (state.status === "success") denyAccess(undefined);
  }, [state, denyAccess]);
  const back = () => {
    const openedFromTable = location.state?.auditOpener === auditId;
    if (openedFromTable) navigate(-1);
    else navigate(`/precios/auditoria?${params}`, { replace: true });
    setTimeout(() => {
      const activator = openedFromTable
        ? Array.from(
            document.querySelectorAll<HTMLAnchorElement>("a[data-audit-id]"),
          ).find((element) => element.dataset.auditId === auditId)
        : undefined;
      const target =
        activator ?? document.querySelector<HTMLElement>("main h1");
      if (target) {
        if (!activator) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    }, 180);
  };
  const field = (label: string, value: string | null) => (
    <Text size="sm" style={{ overflowWrap: "anywhere" }}>
      <strong>{label}:</strong> {value ?? "No informado"}
    </Text>
  );
  return (
    <Modal
      opened
      onClose={back}
      title="Detalle del cambio de precio"
      size={640}
      scrollAreaComponent={ScrollArea.Autosize}
      returnFocus
      onExitTransitionEnd={() => {
        if (
          !(document.activeElement instanceof HTMLElement) ||
          document.activeElement === document.body
        )
          document.querySelector<HTMLElement>("main h1")?.focus();
      }}
    >
      <Stack gap="lg">
        {state.status === "loading" ? (
          <Text role="status">Cargando asiento…</Text>
        ) : state.status === "error" ? (
          <FeedbackAlert
            semantic="error"
            title={
              ["forbidden", "session"].includes(state.error.kind)
                ? "Acceso no disponible"
                : "No se pudo consultar el asiento"
            }
            actions={
              state.error.kind === "unavailable" ? (
                <Button
                  variant="outline"
                  onClick={() => setRevision((value) => value + 1)}
                >
                  Volver a consultar el asiento
                </Button>
              ) : undefined
            }
          >
            {state.error.message}
          </FeedbackAlert>
        ) : state.result === null ? (
          <FeedbackAlert
            semantic="warning"
            title="No encontramos este registro de auditoría"
          >
            El asiento solicitado no está disponible. Puedes volver al historial
            sin cambiar los filtros.
          </FeedbackAlert>
        ) : (
          <>
            <SectionCard title="Identificación">
              {field("SKU", state.result.sku)}
              {field("Asiento", displayAuditId(state.result.id))}
              {field("Producto", state.result.productId)}
              {field("Fecha y hora", dateLabel(state.result.at))}
            </SectionCard>
            <SectionCard
              title="Cambio de precio"
              description="Moneda no informada"
            >
              {field("Operación", operationLabel[state.result.operation])}
              {field("Tipo", typeLabel[state.result.priceType])}
              {field("Precio anterior", previousValue(state.result))}
              {field("Precio nuevo", nextValue(state.result))}
              {field("Variación", variation(state.result))}
            </SectionCard>
            <SectionCard title="Motivo y origen">
              {field("Motivo", state.result.reason)}
              {field("Origen", originLabel(state.result.origin))}
              {field("Lote", state.result.batchId ?? "Sin lote")}
            </SectionCard>
            <SectionCard title="Actor y datos informados">
              {field(
                "Usuario",
                state.result.actorId === "demo-pricing"
                  ? null
                  : state.result.actorId,
              )}
              {field("Correo", state.result.email)}
              {field("IP de origen", state.result.ip)}
            </SectionCard>
          </>
        )}
        <Button onClick={back}>Volver al historial</Button>
      </Stack>
    </Modal>
  );
}
