import type { DataMode } from "../../../app/config/dataMode";
import type { PricingRuntime } from "../../pricing/services/pricingRuntime";
import type {
  CombosAvailabilityPort,
  CombosCatalogPort,
  CombosPricingPort,
  CombosRepository,
} from "../types/combos";
import { createUnavailableCombosAdapters } from "../adapters/unavailableCombosAdapters";

export interface CombosRuntime {
  combos: CombosRepository;
  catalog: CombosCatalogPort;
  pricing: CombosPricingPort;
  availability: CombosAvailabilityPort;
  // Shared demo time. In mock mode it mirrors PricingRuntime.clock so the editor,
  // the Pricing references and the final save validation agree on "now".
  now: () => number;
}

export async function createCombosRuntime(mode: DataMode, pricing: PricingRuntime): Promise<CombosRuntime> {
  if (mode === "api") return createUnavailableCombosAdapters();
  const { createMockCombosRuntime } = await import("../mocks/createMockCombosRuntime");
  return createMockCombosRuntime(pricing);
}
