import { SimpleGrid, Stack, Text } from "@mantine/core";
import {
  MetricCard,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import type { CouponView } from "../services/couponRepository";
import {
  couponDateLabel,
  couponLimitLabel,
  couponPolicyLabel,
  couponPromotionValidity,
  couponPromotionValidityLabel,
  couponRemainingLabel,
  couponStatusLabel,
  couponUsageLabel,
} from "../services/couponPresentation";

export function CouponSummary({
  coupon,
  limitsOnly = false,
}: {
  coupon: CouponView;
  limitsOnly?: boolean;
}) {
  return (
    <Stack gap="lg">
      {!limitsOnly && (
        <SectionCard
          title="Configuración del cupón"
          actions={
            <StatusBadge>{couponStatusLabel(coupon.status)}</StatusBadge>
          }
        >
          <SimpleGrid cols={2} spacing="lg" verticalSpacing="md">
            <Value label="Código" value={coupon.code} />
            <Value
              label="Promoción asociada"
              value={coupon.promotion?.name ?? "No disponible"}
            />
            <Value
              label="Vigencia de la promoción"
              value={
                coupon.promotion?.validFrom && coupon.promotion.validUntil
                  ? `${couponDateLabel(coupon.promotion.validFrom)} al ${couponDateLabel(coupon.promotion.validUntil)} (hora de Lima)`
                  : "No disponible"
              }
            />
            <Value
              label="Estado de vigencia"
              value={couponPromotionValidityLabel(couponPromotionValidity(coupon))}
            />
            <Value
              label="Usos permitidos por cliente"
              value={
                coupon.customerLimit === undefined
                  ? "No disponible"
                  : coupon.customerLimit === null
                    ? "Sin límite por cliente"
                    : `${coupon.customerLimit} uso${coupon.customerLimit === 1 ? "" : "s"} por cliente`
              }
            />
            <Value
              label="Monto mínimo"
              value={
                coupon.minimumAmount === undefined
                  ? "No disponible"
                  : coupon.minimumAmount === null
                    ? "Sin monto mínimo"
                    : `${coupon.minimumAmount} (moneda no disponible)`
              }
            />
          </SimpleGrid>
          <Text size="sm" c="dimmed">
            El estado activo del cupón no garantiza que una compra cumpla las
            condiciones de la promoción.
          </Text>
        </SectionCard>
      )}
      <SectionCard
        title="Uso global y límites"
        description="Lectura de la capacidad informada; el uso no se modifica desde esta pantalla."
        actions={
          limitsOnly ? (
            <StatusBadge>{couponStatusLabel(coupon.status)}</StatusBadge>
          ) : undefined
        }
      >
        <SimpleGrid cols={3} spacing="lg">
          <MetricCard
            label="Uso global"
            value={couponUsageLabel(coupon.consumedUses)}
            description="Usos confirmados"
          />
          <MetricCard
            label="Límite global"
            value={couponLimitLabel(coupon.globalLimit)}
            description="Usos permitidos"
          />
          <MetricCard
            label="Usos disponibles"
            value={couponRemainingLabel(coupon)}
            description="Capacidad informada"
          />
        </SimpleGrid>
        <SimpleGrid cols={2} spacing="lg">
          <Value
            label="Límite por cliente"
            value={couponLimitLabel(coupon.customerLimit)}
          />
          <Value
            label="Política de restitución"
            value={couponPolicyLabel(coupon)}
          />
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          Validar un cupón en una compra no consume un uso. El consumo y la
          restitución corresponden al proceso del pedido.
        </Text>
      </SectionCard>
    </Stack>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={600}>
        {value}
      </Text>
    </Stack>
  );
}
