import { useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { ConfirmDialog, FeedbackAlert } from "../../../components/shared";
import { usePromotionCommand } from "../hooks/usePromotionCommand";
import {
  CouponWriteError,
  type CouponView,
  type CouponRepository,
} from "../services/couponRepository";
import {
  couponStatusLabel,
  couponUsageLabel,
} from "../services/couponPresentation";

export function CouponStateDialog({
  coupon,
  repository,
  confirmedRepository = repository,
  opened,
  onCancel,
  onConfirmed,
}: {
  coupon: CouponView;
  repository: CouponRepository;
  confirmedRepository?: CouponRepository;
  opened: boolean;
  onCancel: () => void;
  onConfirmed: (coupon: CouponView) => void;
}) {
  const command = usePromotionCommand<CouponView>();
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string>();
  const [target, setTarget] = useState<"active" | "inactive">(
    coupon.status === "active" ? "inactive" : "active",
  );
  const [prevOpened, setPrevOpened] = useState(false);
  if (opened && !prevOpened) {
    setPrevOpened(true);
    setTarget(coupon.status === "active" ? "inactive" : "active");
  } else if (!opened && prevOpened) {
    setPrevOpened(false);
  }
  const unknown =
    command.error instanceof CouponWriteError &&
    command.error.kind === "unknown";
  const confirm = async () => {
    if (unknown) {
      if (checking) return;
      setChecking(true);
      try {
        const result = await confirmedRepository.read(
          coupon.id,
          new AbortController().signal,
        );
        if (result?.status === target) onConfirmed(result);
        else
          setCheckError(
            "La consulta no confirmó el estado solicitado. No se reenviará el cambio automáticamente.",
          );
      } catch {
        setCheckError(
          "No se pudo consultar el estado. La confirmación sigue pendiente.",
        );
      } finally {
        setChecking(false);
      }
      return;
    }
    const result = await command.run((signal) =>
      repository.changeStatus(coupon.id, target, signal),
    );
    if (result) onConfirmed(result);
  };
  return (
    <ConfirmDialog
      opened={opened}
      title={target === "inactive" ? "Desactivar cupón" : "Activar cupón"}
      confirmLabel={
        unknown
          ? "Consultar estado"
          : target === "inactive"
            ? "Desactivar cupón"
            : "Activar cupón"
      }
      submitting={command.submitting || checking}
      destructive={!unknown && target === "inactive"}
      onCancel={() => {
        command.clearError();
        setCheckError(undefined);
        onCancel();
      }}
      onConfirm={() => void confirm()}
      error={
        command.error instanceof Error ? (
          <FeedbackAlert
            semantic={unknown ? "warning" : "error"}
            title={unknown ? "Estado sin confirmar" : "No se cambió el estado"}
          >
            {command.error.message}
            {checkError && <Text size="sm">{checkError}</Text>}
          </FeedbackAlert>
        ) : undefined
      }
    >
      <Stack gap="sm">
        <Text fw={600}>{coupon.code}</Text>
        <Text size="sm">
          Estado actual: {couponStatusLabel(coupon.status)}. Estado solicitado:{" "}
          {couponStatusLabel(target)}.
        </Text>
        <Text size="sm">
          {target === "inactive"
            ? "Desactivar este cupón impide nuevos usos. Sus usos registrados se conservan."
            : "El cupón participará en nuevas validaciones, sujeto a la vigencia y condiciones de su promoción."}
        </Text>
        <Text size="sm">
          Uso global registrado: {couponUsageLabel(coupon.consumedUses)}. Esta
          acción no modifica pedidos ni sus consumos.
        </Text>
        {unknown && (
          <Button variant="subtle" onClick={onCancel}>
            Volver al detalle sin reenviar
          </Button>
        )}
      </Stack>
    </ConfirmDialog>
  );
}
