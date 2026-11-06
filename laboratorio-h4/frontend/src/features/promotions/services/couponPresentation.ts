import type { CouponStatus, CouponView } from "./couponRepository";

export const couponStatusLabel = (status: CouponStatus) =>
  status === "active" ? "Activo" : "Inactivo";
export const couponLimitLabel = (limit: number | null | undefined) =>
  limit === undefined
    ? "No disponible"
    : limit === null
      ? "Sin límite"
      : String(limit);
export const couponUsageLabel = (uses: number | undefined) =>
  uses === undefined ? "No disponible" : String(uses);
export function couponRemainingLabel(coupon: CouponView) {
  if (coupon.remainingUses === undefined) return "No disponible";
  if (coupon.remainingUses === null)
    return coupon.globalLimit === null ? "Sin límite" : "No disponible";
  return String(coupon.remainingUses);
}

export type CouponPromotionValidity =
  | "available"
  | "not-started"
  | "expired"
  | "unknown";

export function couponPromotionValidity(
  coupon: CouponView,
  now = new Date(),
): CouponPromotionValidity {
  const from = coupon.promotion?.validFrom
    ? new Date(coupon.promotion.validFrom).getTime()
    : Number.NaN;
  const until = coupon.promotion?.validUntil
    ? new Date(coupon.promotion.validUntil).getTime()
    : Number.NaN;
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(until) ||
    until <= from
  )
    return "unknown";
  const timestamp = now.getTime();
  if (timestamp < from) return "not-started";
  if (timestamp >= until) return "expired";
  return "available";
}

export const couponPromotionValidityLabel = (
  validity: CouponPromotionValidity,
) =>
  ({
    available: "Vigente",
    "not-started": "Aún no vigente",
    expired: "Vigencia finalizada",
    unknown: "No disponible",
  })[validity];

export const couponPolicyLabel = (coupon: CouponView) =>
  coupon.cancellationPolicy === "restore"
    ? "Restaurar uso al cancelar"
    : "No restaurar uso al cancelar";

export function couponDateLabel(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}
export function readPositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0
    ? Math.min(number, maximum)
    : fallback;
}
