import type {
  AdministrationRecord,
  AdministrationRepository,
} from "./administration";
export type RecommendationKind = "cross-sell" | "upsell";
export type SuperiorityCriterion =
  | "MAYOR_RENDIMIENTO"
  | "MEJOR_MATERIAL"
  | "MAYOR_CAPACIDAD"
  | "FUNCIONALIDAD_ADICIONAL";
export const superiorityChoices: {
  value: SuperiorityCriterion;
  label: string;
}[] = [
  { value: "MAYOR_RENDIMIENTO", label: "Mayor rendimiento" },
  { value: "MEJOR_MATERIAL", label: "Mejor material" },
  { value: "MAYOR_CAPACIDAD", label: "Mayor capacidad" },
  { value: "FUNCIONALIDAD_ADICIONAL", label: "Funcionalidad adicional" },
];
export interface RecommendedProduct {
  productId: string;
  order: string;
  criterion: SuperiorityCriterion | "";
  justification: string;
}
export interface RecommendationDraft {
  name: string;
  kind: RecommendationKind;
  originType: "product" | "category" | "";
  originId: string;
  priority: string;
  status: "active" | "inactive" | "";
  validFrom: string;
  validUntil: string;
  candidates: RecommendedProduct[];
}
export interface RecommendationView extends AdministrationRecord {
  configuration: RecommendationDraft;
}
export type RecommendationRepository = AdministrationRepository<
  RecommendationView,
  RecommendationDraft
>;
export const emptyRecommendation: RecommendationDraft = {
  name: "",
  kind: "cross-sell",
  originType: "",
  originId: "",
  priority: "",
  status: "",
  validFrom: "",
  validUntil: "",
  candidates: [],
};
export const recommendationKindLabel = (kind: RecommendationKind) =>
  kind === "upsell" ? "Upselling" : "Venta cruzada";
export const criterionLabel = (value: SuperiorityCriterion | "") =>
  superiorityChoices.find((item) => item.value === value)?.label ??
  "Sin criterio";
