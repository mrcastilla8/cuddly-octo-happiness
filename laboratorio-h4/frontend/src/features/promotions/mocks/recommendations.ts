import type {
  RecommendationDraft,
  RecommendationView,
} from "../services/recommendationRepository";
const common: RecommendationDraft = {
  name: "",
  kind: "cross-sell",
  originType: "product",
  originId: "running-essential",
  priority: "1",
  status: "active",
  validFrom: "2026-10-01T00:00",
  validUntil: "2026-11-01T00:00",
  candidates: [
    {
      productId: "medias-tecnicas",
      order: "1",
      criterion: "",
      justification: "",
    },
  ],
};
export const recommendationFixtures: readonly RecommendationView[] = [
  {
    id: "completa-carrera",
    name: "Completa tu carrera",
    status: "active",
    configuration: { ...common, name: "Completa tu carrera" },
  },
  {
    id: "mejora-rendimiento",
    name: "Mejora tu rendimiento",
    status: "inactive",
    configuration: {
      ...common,
      name: "Mejora tu rendimiento",
      kind: "upsell",
      priority: "2",
      status: "inactive",
      candidates: [
        {
          productId: "running-pro",
          order: "1",
          criterion: "MAYOR_RENDIMIENTO",
          justification: "Alternativa clasificada manualmente para corredores.",
        },
      ],
    },
  },
  {
    id: "categoria-running",
    name: "Complementos para Running",
    status: "active",
    configuration: {
      ...common,
      name: "Complementos para Running",
      originType: "category",
      originId: "running",
      priority: "3",
    },
  },
];
