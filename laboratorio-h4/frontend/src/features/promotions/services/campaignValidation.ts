import {
  positiveInteger,
  positiveDecimal,
  percentageValid,
  validPeriod,
} from "./administration";
import { channelChoices, type CampaignDraft } from "./campaignRepository";
export function normalizeCampaignDraft(draft: CampaignDraft): CampaignDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    benefit: draft.benefit.trim().replace(",", "."),
    channels: [...new Set(draft.channels)],
    productIds: [...new Set(draft.productIds)],
    skus: [...new Set(draft.skus)],
  };
}
export function campaignErrors(draft: CampaignDraft) {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = "Ingresa el nombre de la promoción.";
  if (draft.mode !== "automatic" && draft.mode !== "coupon")
    errors.mode = "Selecciona una modalidad.";
  if (draft.status !== "active" && draft.status !== "inactive")
    errors.status = "Selecciona el estado inicial.";
  if (draft.discountType !== "percentage" && draft.discountType !== "amount")
    errors.discountType = "Selecciona el tipo de beneficio.";
  const amount = draft.benefit.trim().replace(",", ".");
  if (
    draft.discountType === "percentage"
      ? !percentageValid(amount)
      : !positiveDecimal(amount)
  )
    errors.benefit =
      draft.discountType === "percentage"
        ? "El porcentaje debe ser mayor que cero y como máximo 100."
        : "El monto fijo debe ser mayor que cero.";
  if (!positiveInteger(draft.priority))
    errors.priority = "Ingresa una prioridad entera positiva.";
  if (!validPeriod(draft.validFrom, draft.validUntil))
    errors.validFrom =
      "Ingresa inicio y fin válidos; el fin debe ser posterior al inicio (hora de Lima).";
  if (
    !draft.channels.length ||
    draft.channels.some(
      (value) => !channelChoices.some((item) => item.value === value),
    )
  )
    errors.channels = "Selecciona al menos un canal habilitado.";
  if (!draft.productIds.length && !draft.skus.length)
    errors.scope = "Selecciona al menos un producto completo o SKU activo.";
  if (
    !draft.combination ||
    Object.values(draft.combination).some(
      (value) => typeof value !== "boolean",
    ) ||
    [
      draft.combination.pricing,
      draft.combination.automatic,
      draft.combination.coupon,
    ].some((value) => typeof value !== "boolean")
  )
    errors.combination = "Selecciona una política de combinación válida.";
  return errors;
}
