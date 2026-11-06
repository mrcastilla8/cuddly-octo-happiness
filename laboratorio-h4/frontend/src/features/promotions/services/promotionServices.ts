import type {
  CouponRepository,
  CouponView,
  CouponPromotion,
} from "./couponRepository";
import type { CampaignRepository, CampaignView } from "./campaignRepository";
import type {
  RecommendationRepository,
  RecommendationView,
} from "./recommendationRepository";
import type { PromotionCatalogRepository } from "./catalogRepository";
import { createMockCouponRepository } from "../adapters/mockCouponRepository";
import { createMockCampaignRepository } from "../adapters/mockCampaignRepository";
import { createMockRecommendationRepository } from "../adapters/mockRecommendationRepository";
import { createMockPromotionCatalogRepository } from "../adapters/mockPromotionCatalogRepository";
import {
  createPromotionHistory,
  promotionHistoryFixtures,
} from "../mocks/promotionHistory";
import { campaignFixtures } from "../mocks/campaigns";
import { couponFixtures } from "../mocks/coupons";
import { recommendationFixtures } from "../mocks/recommendations";
import { createReviewServiceResolver } from "../dev/reviewServices";
import type { DataMode } from "../../../app/config/dataMode";
import {
  getCatalogServices,
  type CatalogServices,
} from "../../catalog/services/catalogServices";
import { createCatalogPromotionRepository } from "../adapters/catalogPromotionRepository";
import {
  integratedCampaignFixtures,
  integratedRecommendationFixtures,
} from "../mocks/integratedFixtures";

export interface PromotionServices {
  coupons: CouponRepository;
  campaigns: CampaignRepository;
  recommendations: RecommendationRepository;
  catalog: PromotionCatalogRepository;
}

export interface PromotionServiceContext {
  services: PromotionServices;
  confirmedServices: PromotionServices;
  prepareCreation(signal: AbortSignal): Promise<void>;
  clearTransientParams(params: URLSearchParams): URLSearchParams;
}
export interface PromotionRuntime {
  mode: DataMode;
  resolve(params: URLSearchParams): PromotionServiceContext;
}
export interface PromotionRuntimeDependencies {
  api?: () => PromotionServices;
  mock?: () => PromotionServices;
}

// Source and DEV selection live at the composition boundary, not in consumers.
export function createPromotionRuntime(
  mode: DataMode,
  dependencies: PromotionRuntimeDependencies = {},
): PromotionRuntime {
  if (mode !== "mock" && mode !== "api")
    throw new Error("VITE_DATA_MODE debe ser mock o api.");
  if (mode === "api" && !dependencies.api)
    throw new Error("La administración de promociones no está disponible.");
  const services =
    mode === "mock"
      ? (dependencies.mock?.() ?? createMockPromotionServices({}, { persist: true }))
      : createPromotionServices(dependencies.api!());
  const context: PromotionServiceContext = {
    services,
    confirmedServices: services,
    async prepareCreation(signal) {
      signal.throwIfAborted();
    },
    clearTransientParams: (params) => new URLSearchParams(params),
  };
  return {
    mode,
    resolve:
      mode === "mock" && import.meta.env?.DEV
        ? createReviewServiceResolver(context)
        : () => context,
  };
}

// Composition point: a supplied HTTP adapter implements the same presentation port.
// No endpoint, token, HTTP DTO or demonstration parameter belongs to this interface.
export function createPromotionServices(
  adapters: PromotionServices,
): PromotionServices {
  return adapters;
}

export function createMockPromotionServices(
  overrides: Partial<PromotionServices> = {},
  options: {
    persist?: boolean;
    campaigns?: readonly CampaignView[];
    recommendations?: readonly RecommendationView[];
  } = {},
): PromotionServices {
  const history = createPromotionHistory(promotionHistoryFixtures, options);
  const observe = (record: CouponView | null) => {
    if (record) history.observe(record);
    return record;
  };
  async function observeAll(signal: AbortSignal) {
    const rows: CouponView[] = [];
    for (let page = 1; ; page++) {
      // Association/history reads use the coupon port directly. Presentation
      // enrichment below queries Campaigns and must not recurse through itself.
      const result = await couponAdapter.list(
        { status: "all", page, pageSize: 100 },
        signal,
      );
      result.items.forEach(observe);
      rows.push(...result.items);
      if (rows.length >= result.total || !result.items.length) break;
    }
    return rows;
  }
  async function promotions(signal: AbortSignal): Promise<CouponPromotion[]> {
    const rows: CouponPromotion[] = [];
    for (let page = 1; ; page++) {
      const result = await campaigns.list(
        { status: "all", kind: "coupon", page, pageSize: 100 },
        signal,
      );
      rows.push(
        ...result.items
          .filter((row) => row.configuration.mode === "coupon")
          .map((row) => ({
            id: row.id,
            name: row.name,
            mode: "coupon" as const,
            validFrom: `${row.configuration.validFrom}:00-05:00`,
            validUntil: `${row.configuration.validUntil}:00-05:00`,
          })),
      );
      if (page * 100 >= result.total || !result.items.length) break;
    }
    return rows;
  }
  const catalog = overrides.catalog ?? createMockPromotionCatalogRepository();
  const campaigns =
    overrides.campaigns ??
    createMockCampaignRepository(
      {
        catalog: () => catalog,
        history,
        hasCoupons: async (id, signal) =>
          (await observeAll(signal)).some((coupon) => coupon.promotionId === id),
      },
      options.campaigns ?? campaignFixtures,
      options,
    );
  const couponAdapter =
    overrides.coupons ?? createMockCouponRepository({ promotions }, couponFixtures, options);
  async function withCurrentPromotion(
    record: CouponView,
    signal: AbortSignal,
  ): Promise<CouponView> {
    const promotion = await campaigns.read(record.promotionId, signal);
    signal.throwIfAborted();
    return {
      ...record,
      promotion: promotion
        ? {
            name: promotion.name,
            validFrom: `${promotion.configuration.validFrom}:00-05:00`,
            validUntil: `${promotion.configuration.validUntil}:00-05:00`,
          }
        : null,
    };
  }
  const coupons: CouponRepository = {
    promotions: (signal) => couponAdapter.promotions(signal),
    async list(query, signal) {
      const result = await couponAdapter.list(query, signal);
      result.items.forEach(observe);
      return {
        ...result,
        items: await Promise.all(
          result.items.map((item) => withCurrentPromotion(item, signal)),
        ),
      };
    },
    async read(id, signal) {
      const record = observe(await couponAdapter.read(id, signal));
      return record ? withCurrentPromotion(record, signal) : null;
    },
    async create(input, signal) {
      const result = await couponAdapter.create(input, signal);
      observe(result);
      return result;
    },
    async update(id, input, signal) {
      const previous = await couponAdapter.read(id, signal);
      const result = await couponAdapter.update(id, input, signal);
      observe(previous);
      observe(result);
      return result;
    },
    async changeStatus(id, status, signal) {
      const result = await couponAdapter.changeStatus(id, status, signal);
      observe(result);
      return result;
    },
  };
  const recommendations =
    overrides.recommendations ??
    createMockRecommendationRepository(
      () => catalog, options.recommendations ?? recommendationFixtures, options,
    );
  return createPromotionServices({
    coupons,
    campaigns,
    recommendations,
    catalog,
  });
}

// Read the application's validated mode through DataModeContext. No environment
// variable or mock instance is selected at module import time.
const runtimes = new Map<DataMode, PromotionRuntime>();
export function createCatalogMockPromotionServices(
  catalog: CatalogServices,
  options: { persist?: boolean } = {},
): PromotionServices {
  return createMockPromotionServices(
    { catalog: createCatalogPromotionRepository(catalog) },
    {
      ...options,
      campaigns: integratedCampaignFixtures,
      recommendations: integratedRecommendationFixtures,
    },
  );
}
const dependencies: PromotionRuntimeDependencies = {
  mock: () => createCatalogMockPromotionServices(getCatalogServices("mock"), { persist: true }),
};
export function getPromotionRuntime(mode: DataMode): PromotionRuntime {
  let runtime = runtimes.get(mode);
  if (!runtime) {
    runtime = createPromotionRuntime(mode, dependencies);
    runtimes.set(mode, runtime);
  }
  return runtime;
}
