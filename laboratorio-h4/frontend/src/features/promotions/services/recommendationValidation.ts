import { positiveInteger, validPeriod } from "./administration";
import {
  superiorityChoices,
  type RecommendationDraft,
} from "./recommendationRepository";
export function normalizeRecommendationDraft(
  draft: RecommendationDraft,
): RecommendationDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    candidates: draft.candidates.map((item) => ({
      ...item,
      criterion: draft.kind === "cross-sell" ? "" : item.criterion,
      justification: draft.kind === "cross-sell" ? "" : item.justification,
    })),
  };
}
export function recommendationErrors(draft: RecommendationDraft) {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = "Ingresa un nombre para la regla.";
  if (
    (draft.originType !== "product" && draft.originType !== "category") ||
    !draft.originId
  )
    errors.origin = "Selecciona un origen válido por producto o categoría.";
  if (!positiveInteger(draft.priority))
    errors.priority = "Ingresa una prioridad entera positiva.";
  if (draft.status !== "active" && draft.status !== "inactive")
    errors.status = "Selecciona el estado inicial.";
  if (draft.kind !== "cross-sell" && draft.kind !== "upsell")
    errors.kind = "Selecciona un tipo de regla válido.";
  if (!validPeriod(draft.validFrom, draft.validUntil))
    errors.validFrom =
      "Ingresa inicio y fin válidos; el fin debe ser posterior al inicio (hora de Lima).";
  if (!draft.candidates.length)
    errors.candidates = "Selecciona al menos un producto recomendado.";
  const seen = new Set<string>();
  draft.candidates.forEach((candidate, index) => {
    if (
      !candidate.productId ||
      seen.has(candidate.productId) ||
      (draft.originType === "product" && candidate.productId === draft.originId)
    )
      errors[`candidate-${index}`] =
        "No se admite el origen como recomendado ni productos repetidos.";
    seen.add(candidate.productId);
    if (!positiveInteger(candidate.order))
      errors[`order-${index}`] = "El orden debe ser un entero positivo.";
    if (
      draft.kind === "upsell" &&
      !superiorityChoices.some((choice) => choice.value === candidate.criterion)
    )
      errors[`criterion-${index}`] =
        "Selecciona el criterio de superioridad para este producto.";
    if (candidate.justification.length > 500)
      errors[`justification-${index}`] =
        "La justificación admite hasta 500 caracteres.";
  });
  return errors;
}
