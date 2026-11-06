import { usePromotionServices } from "../hooks/usePromotionServices";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
import { useCallback, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Button, Skeleton, Stack, Text } from "@mantine/core";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { CouponForm } from "../components/CouponForm";
import { CouponSummary } from "../components/CouponSummary";
import { UnsavedChangesDialog } from "../components/UnsavedChangesDialog";
import { useCoupon } from "../hooks/useCoupons";
import { useCouponForm } from "../hooks/useCouponForm";
import { useAdministrationRead } from "../hooks/useAdministrationRead";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";
import type { CouponView } from "../services/couponRepository";

export function CouponFormPage() {
  const { couponId } = useParams();
  const { services } = usePromotionServices();
  const state = useCoupon(couponId, services.coupons, 0);
  if (couponId && state.status === "loading")
    return (
      <Stack role="status">
        <Text>Cargando cupón…</Text>
        <Skeleton height={240} />
      </Stack>
    );
  if (couponId && state.status === "error")
    return (
      <Stack>
        <PageHeader title="Editar cupón" />
        <FeedbackAlert semantic="error" title="No se puede editar el cupón">
          {state.message}
        </FeedbackAlert>
        <Button component={Link} to="/cupones" variant="outline">
          Volver al listado
        </Button>
      </Stack>
    );
  const initial = couponId && state.status === "success" ? state.result : null;
  if (couponId && !initial)
    return (
      <EmptyState
        title="Cupón no encontrado"
        description="No hay un registro para editar."
        action={
          <Button component={Link} to="/cupones">
            Volver al listado
          </Button>
        }
      />
    );
  if (
    initial &&
    (initial.globalLimit === undefined ||
      initial.customerLimit === undefined ||
      initial.minimumAmount === undefined)
  )
    return (
      <FeedbackAlert semantic="warning" title="Configuración no disponible">
        Consulta la configuración completa antes de editar. No se sustituyen
        datos desconocidos por límites vacíos.
      </FeedbackAlert>
    );
  return <CouponFormContent key={couponId ?? "new"} initial={initial} />;
}

function CouponFormContent({ initial }: { initial: CouponView | null }) {
  const [params] = useSearchParams();
  const { services, confirmedServices, prepareCreation, clearTransientParams, revision: queryRevision } =
    usePromotionServices();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const suffix = params.size ? `?${params.toString()}` : "";
  const form = useCouponForm(initial, services.coupons, confirmedServices.coupons);
  const guard = useUnsavedChanges(
    form.dirty && !form.confirmed,
    form.submitting,
  );
  const readChoices = useCallback(
    async (signal: AbortSignal) => {
      await prepareCreation(signal);
      return (await services.coupons.promotions(signal)).filter(
        (item) => item.mode === "coupon",
      );
    },
    [services, prepareCreation],
  );
  const choices = useAdministrationRead(`promotions:${revision + queryRevision}`, readChoices);
  const cancel = () =>
    navigate(initial ? `/cupones/${initial.id}${suffix}` : `/cupones${suffix}`);
  if (form.confirmed) {
    const next = clearTransientParams(params);
    if (form.confirmed.relatedDataUnavailable)
      return (
        <Stack gap="lg">
          <PageHeader title={`Cupón — ${form.confirmed.code}`} />
          <FeedbackAlert semantic="success" title="Cupón guardado">
            La propuesta quedó guardada.
          </FeedbackAlert>
          <FeedbackAlert semantic="warning" title="Datos relacionados no disponibles">
            El cambio del cupón fue confirmado. No se pudieron consultar los
            datos actuales de su promoción. Puedes consultar el detalle sin
            reenviar el cambio.
          </FeedbackAlert>
          <CouponSummary coupon={form.confirmed} />
          <Button component={Link} to={`/cupones/${form.confirmed.id}?${next.toString()}`}>
            Consultar detalle
          </Button>
        </Stack>
      );
    return (
      <Navigate
        to={`/cupones/${form.confirmed.id}?${next.toString()}`}
        replace
        state={{ couponSaved: true }}
      />
    );
  }
  return (
    <>
      <PageHeader
        title={initial ? `Editar cupón — ${initial.code}` : "Crear cupón"}
        breadcrumbs={[
          { label: "Cupones de descuento", to: `/cupones${suffix}` },
          { label: initial ? "Editar cupón" : "Crear cupón" },
        ]}
      />
      <Stack gap="lg">
        <PromotionDataNotice kind="coupon-form" />
        {choices.status === "error" && choices.access ? (
          <FeedbackAlert semantic="warning" title="Acceso no disponible">
            No tienes acceso para guardar cupones. La información anterior se
            conserva.
          </FeedbackAlert>
        ) : choices.status === "error" ? (
          <FeedbackAlert
            semantic="error"
            title="Promociones no disponibles"
            actions={
              <Button
                variant="outline"
                onClick={() => setRevision((value) => value + 1)}
              >
                Consultar promociones
              </Button>
            }
          >
            No se pudo consultar las promociones. No se puede guardar una
            asociación sin comprobar.
          </FeedbackAlert>
        ) : choices.status === "success" ? (
          <CouponForm
            form={form}
            promotions={choices.result}
            initial={initial}
            onCancel={cancel}
            onReload={() => navigate(`/cupones/${initial?.id ?? ""}${suffix}`)}
          />
        ) : (
          <Text role="status">Consultando promociones…</Text>
        )}
      </Stack>
      <UnsavedChangesDialog
        opened={guard.blocked}
        submitting={form.submitting}
        onStay={guard.stay}
        onDiscard={guard.discard}
      />
    </>
  );
}
