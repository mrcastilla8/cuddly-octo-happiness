import type { PriceDraft, ScheduleDraft } from "./pricingModels";
import type { PriceView } from "./pricingRepository";

// Exact decimal comparisons; no commercial calculation or precision limit.
export function positiveDecimal(value: string) {
  return /^\d+(?:\.\d+)?$/.test(value) && /[1-9]/.test(value);
}
export function decimalLess(a: string, b: string) {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const precision = Math.max(af.length, bf.length);
  return (
    BigInt(ai + af.padEnd(precision, "0")) <
    BigInt(bi + bf.padEnd(precision, "0"))
  );
}
export function validatePrice(
  draft: PriceDraft,
  current: Pick<PriceView, "offer" | "currency">,
) {
  const errors: Partial<Record<keyof PriceDraft, string>> = {};
  if (!positiveDecimal(draft.regular))
    errors.regular = "El precio regular debe ser mayor que cero.";
  const offer =
    draft.offerAction === "ESTABLECER"
      ? draft.offer
      : draft.offerAction === "CONSERVAR"
        ? current.offer
        : null;
  if (
    offer !== null &&
    (!positiveDecimal(offer) ||
      (positiveDecimal(draft.regular) && !decimalLess(offer, draft.regular)))
  )
    errors.offer =
      "La oferta debe ser positiva y menor que el precio regular. Revisa la acción de oferta.";
  if (
    !/^[A-Z]{3}$/.test(draft.currency) ||
    draft.currency !== current.currency
  ) {
    errors.currency =
      "La moneda debe coincidir con la lectura. Su cambio requiere una política de Pricing confirmada.";
    if (current.offer !== null && draft.offerAction === "CONSERVAR")
      errors.offer =
        "No se puede conservar automáticamente una oferta al cambiar la moneda.";
  }
  if (!draft.reason.trim()) errors.reason = "Indica el motivo del cambio.";
  return errors;
}
export const priceTimeZone = "America/Bogota (UTC−5)";
export function localInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(value))
    return null;
  const timestamp = Date.parse(`${value}-05:00`);
  const localTimestamp = Date.parse(`${value}Z`);
  if (!Number.isFinite(timestamp) || !Number.isFinite(localTimestamp))
    return null;
  if (
    new Date(localTimestamp).toISOString().slice(0, 16) !== value.slice(0, 16)
  )
    return null;
  return new Date(timestamp).toISOString();
}
export function displayInstant(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
export function validateSchedule(
  draft: ScheduleDraft,
  now: string,
  reference: PriceView | null,
) {
  const errors: Partial<Record<keyof ScheduleDraft, string>> = {};
  if (!positiveDecimal(draft.amount))
    errors.amount = "El importe debe ser mayor que cero.";
  if (
    !/^[A-Z]{3}$/.test(draft.currency) ||
    (reference && draft.currency !== reference.currency)
  )
    errors.currency =
      "La moneda debe coincidir con la vigencia consultada; no se convierte el importe.";
  const start = localInstant(draft.start);
  const end = draft.end ? localInstant(draft.end) : null;
  if (!start || Date.parse(start) <= Date.parse(now))
    errors.start = "El inicio debe ser futuro respecto al reloj de referencia.";
  if (draft.end && (!end || (start && Date.parse(end) <= Date.parse(start))))
    errors.end = "El fin debe ser posterior al inicio.";
  if (draft.kind === "OFERTA" && positiveDecimal(draft.amount) && start) {
    if (!reference)
      errors.amount =
        "Consulta el precio regular correspondiente al inicio antes de proponer una oferta.";
    else if (!decimalLess(draft.amount, reference.regular))
      errors.amount =
        "La oferta debe ser menor que el precio regular de la vigencia consultada.";
    else if (
      reference.validUntil &&
      (!end || Date.parse(end) > Date.parse(reference.validUntil))
    )
      errors.end =
        "La lectura no cubre todo el intervalo de la oferta. Revisa la vigencia antes de confirmar.";
  }
  if (
    draft.kind === "REGULAR" &&
    positiveDecimal(draft.amount) &&
    reference?.offer &&
    !decimalLess(reference.offer, draft.amount)
  )
    errors.amount =
      "El regular programado debe superar la oferta de la vigencia consultada.";
  if (!draft.reason.trim())
    errors.reason = "Indica el motivo de la programación.";
  return errors;
}
