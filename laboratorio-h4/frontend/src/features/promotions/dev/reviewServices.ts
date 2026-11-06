import type { PromotionServiceContext } from "../services/promotionServices";
import { createDemoServices } from "./demoServices";
import {
  administrationScenario,
  checkAdministrationRead,
  readCouponScenario,
} from "./demoScenarios";

// Bound once to the selected composition; pages never select demonstrations.
export function createReviewServiceResolver(base: PromotionServiceContext) {
  const contexts = new Map<string, PromotionServiceContext>();
  const clearTransientParams = (params: URLSearchParams) => {
    const next = new URLSearchParams(params);
    next.delete("escenario");
    return next;
  };
  return (params: URLSearchParams): PromotionServiceContext => {
    const couponScenario = readCouponScenario(params);
    const scenario =
      couponScenario === "usage-unavailable" || couponScenario === "expired"
        ? couponScenario
        : administrationScenario(params);
    let context = contexts.get(scenario);
    if (!context) {
      context = {
        services: createDemoServices(base.services, scenario),
        confirmedServices: base.confirmedServices,
        prepareCreation: (signal) =>
          checkAdministrationRead(
            scenario === "session" || scenario === "forbidden"
              ? scenario
              : "default",
            signal,
          ),
        clearTransientParams,
      };
      contexts.set(scenario, context);
    }
    return context;
  };
}
