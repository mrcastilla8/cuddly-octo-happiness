import { usePromotionServices } from "../hooks/usePromotionServices";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { CouponSummary } from "../components/CouponSummary";
import { CouponStateDialog } from "../components/CouponStateDialog";
import { useCoupon } from "../hooks/useCoupons";
import type { CouponView } from "../services/couponRepository";

export function CouponDetailPage({
  limitsOnly = false,
  changeState = false,
}: {
  limitsOnly?: boolean;
  changeState?: boolean;
}) {
  const { couponId = "" } = useParams();
  const [params] = useSearchParams();
  const {
    services,
    confirmedServices,
    revision: queryRevision,
    retry,
  } = usePromotionServices();
  const [revision, setRevision] = useState(0);
  const [dialogOpened, setDialogOpened] = useState(false);
  const [stateUpdated, setStateUpdated] = useState(false);
  const [relatedDataUnavailable, setRelatedDataUnavailable] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const state = useCoupon(couponId, services.coupons, revision + queryRevision);
  const [cachedCoupon, setCachedCoupon] = useState<CouponView | null>(null);
  const [prevResult, setPrevResult] = useState<CouponView | null>(null);
  if (state.status === "success" && state.result !== prevResult) {
    setPrevResult(state.result);
    setCachedCoupon(state.result);
  }
  const coupon = state.status === "success" ? state.result : cachedCoupon;
  const suffix = params.size ? `?${params.toString()}` : "";
  useEffect(() => {
    if (coupon && (location.state?.focusState || stateUpdated))
      trigger.current?.focus();
  }, [coupon, location.state, stateUpdated]);
  const closeState = () => {
    setDialogOpened(false);
    if (changeState)
      navigate(`/cupones/${couponId}${suffix}`, {
        replace: true,
        state: { focusState: true },
      });
  };
  const back = (
    <Button
      component={Link}
      variant="outline"
      to={limitsOnly ? `/cupones/${couponId}${suffix}` : `/cupones${suffix}`}
    >
      {limitsOnly ? "Volver al detalle" : "Volver al listado"}
    </Button>
  );
  return (
    <>
      <PageHeader
        title={
          coupon
            ? `${limitsOnly ? "Límites y uso" : "Cupón"} — ${coupon.code}`
            : limitsOnly
              ? "Límites y uso"
              : "Detalle de cupón"
        }
        breadcrumbs={[
          { label: "Promociones" },
          { label: "Cupones de descuento", to: `/cupones${suffix}` },
          {
            label: coupon?.code ?? "Detalle",
            to: limitsOnly ? `/cupones/${couponId}${suffix}` : undefined,
          },
          ...(limitsOnly ? [{ label: "Límites y uso" }] : []),
        ]}
        actions={back}
      />
      <Stack gap="lg">
        <PromotionDataNotice kind="coupons" />
        {location.state?.couponSaved && (
          <FeedbackAlert semantic="success" title="Cupón guardado">
            La propuesta quedó guardada.
          </FeedbackAlert>
        )}
        {stateUpdated && (
          <FeedbackAlert semantic="success" title="Estado actualizado">
            El nuevo estado fue confirmado. Los usos registrados se conservan.
          </FeedbackAlert>
        )}
        {relatedDataUnavailable && (
          <FeedbackAlert semantic="warning" title="Datos relacionados no disponibles">
            El backend confirmó el cambio del cupón. No se pudieron consultar
            los datos actuales de su promoción. Puedes volver a consultar el
            detalle; no es necesario reenviar el cambio.
          </FeedbackAlert>
        )}
        {state.status === "loading" && !coupon && (
          <Stack role="status" aria-label="Cargando cupón">
            <Text size="sm">Cargando cupón…</Text>
            <Skeleton height={180} />
            <Skeleton height={180} />
          </Stack>
        )}
        {state.status === "error" && (
          <FeedbackAlert
            semantic={state.kind === "unavailable" ? "error" : "warning"}
            title={
              state.kind === "session"
                ? "Verifica tu sesión"
                : state.kind === "forbidden"
                  ? "Acceso no disponible"
                  : "No se pudo consultar el cupón"
            }
            actions={
              state.kind === "unavailable" ? (
                <Button variant="outline" onClick={retry}>
                  Volver a consultar
                </Button>
              ) : undefined
            }
          >
            {state.message}
          </FeedbackAlert>
        )}
        {state.status === "success" && !coupon && (
          <EmptyState
            title="Cupón no encontrado"
            description="El cupón solicitado no está disponible. Vuelve al listado para seleccionar otro."
          />
        )}
        {coupon && (
          <>
            <CouponSummary coupon={coupon} limitsOnly={limitsOnly} />
            {!limitsOnly && (
              <Group gap="sm">
                <Button
                  component={Link}
                  variant="outline"
                  to={`/cupones/${couponId}/limites${suffix}`}
                >
                  Ver límites y uso
                </Button>
                <Button
                  component={Link}
                  to={`/cupones/${couponId}/editar${suffix}`}
                >
                  Editar cupón
                </Button>
                <Button
                  ref={trigger}
                  variant="outline"
                  onClick={() => {
                    setStateUpdated(false);
                    setDialogOpened(true);
                  }}
                >
                  {coupon.status === "active"
                    ? "Desactivar cupón"
                    : "Activar cupón"}
                </Button>
              </Group>
            )}
            <CouponStateDialog
              key={coupon.id}
              coupon={coupon}
              repository={services.coupons}
              confirmedRepository={confirmedServices.coupons}
              opened={dialogOpened || changeState}
              onCancel={closeState}
              onConfirmed={(confirmed) => {
                setCachedCoupon(confirmed);
                setRelatedDataUnavailable(confirmed.relatedDataUnavailable === true);
                setRevision((value) => value + 1);
                setStateUpdated(true);
                closeState();
              }}
            />
          </>
        )}
      </Stack>
    </>
  );
}
