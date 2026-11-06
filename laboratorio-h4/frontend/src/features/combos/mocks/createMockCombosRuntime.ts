import { getCatalogServices } from "../../catalog/services/catalogServices";
import type { PricingRuntime } from "../../pricing/services/pricingRuntime";
import { getInventoryRepository } from "../../inventory/services/inventoryProvider";
import { CatalogCombosAdapter } from "../adapters/catalogCombosAdapter";
import { MockCombosRepository } from "../adapters/mockCombosRepository";
import { PricingCombosAdapter } from "../adapters/pricingCombosAdapter";
import type { CombosRuntime } from "../services/combosService";
import { MockCombosAvailabilityAdapter } from "./mockCombosAvailabilityAdapter";

// Composes the mock Combos runtime against the SAME shared Catalog used by
// MK-003/MK-004 and the SAME Pricing repository used by MK-013. There is no
// parallel combos catalog nor a divergent price list: SKUs, activity, prices and
// the demo clock all come from the shared services.
export function createMockCombosRuntime(pricingRuntime: PricingRuntime): CombosRuntime {
  const catalog = new CatalogCombosAdapter({ catalog: getCatalogServices("mock").catalog });
  const pricing = new PricingCombosAdapter({ pricing: pricingRuntime.service });
  const now = () => Date.parse(pricingRuntime.clock.now());
  const availability = new MockCombosAvailabilityAdapter({ inventory: getInventoryRepository() });
  const combos = new MockCombosRepository({ catalog, pricing, availability, now, persist: true });
  return { combos, catalog, pricing, availability, now };
}
