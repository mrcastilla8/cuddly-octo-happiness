import type { CharacteristicRepository } from "./characteristicRepository";
import { resolveTaxonomyServices } from "./taxonomyServices";

// Single adapter selection point for Taxonomy driven by the global data mode.
// In api mode there is no mock fallback: resolution fails explicitly instead.
export const characteristicService: CharacteristicRepository =
  resolveTaxonomyServices().characteristic;
