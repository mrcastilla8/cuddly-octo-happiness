import { campaignFixtures } from "./campaigns";
import { recommendationFixtures } from "./recommendations";

// Explicit demo references to the existing MK-003/004 seed. These are NOT an
// ID conversion or a catalog copy. Names/status/SKUs always come from its port.
// Keep administration record IDs, history and coupon associations stable.
export const integratedCampaignFixtures = campaignFixtures.map(record => ({
  ...structuredClone(record),
  configuration: {
    ...structuredClone(record.configuration),
    productIds: ["PROD-RUN-001"],
    skus: record.configuration.skus.length ? ["CAS-COR-001"] : [],
  },
}));

export const integratedRecommendationFixtures = recommendationFixtures.map(record => ({
  ...structuredClone(record),
  configuration: {
    ...structuredClone(record.configuration),
    originId: record.configuration.originType === "category" ? "CAT-ROPA" : "PROD-RUN-001",
    candidates: record.configuration.candidates.map(candidate => ({
      ...candidate,
      productId: "PROD-CAS-001",
    })),
  },
}));
