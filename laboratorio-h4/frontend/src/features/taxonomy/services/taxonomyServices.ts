import type { DataMode } from "../../../app/config/dataMode";
import { resolveDataMode } from "../../../app/config/dataMode";
import { mockBrandAdapter } from "../adapters/mockBrandAdapter";
import { mockCategoryAdapter } from "../adapters/mockCategoryAdapter";
import { mockCharacteristicAdapter } from "../adapters/mockCharacteristicAdapter";
import { mockProductTypeAdapter } from "../adapters/mockProductTypeAdapter";
import { mockSeoAdapter } from "../adapters/mockSeoAdapter";
import type { BrandRepository } from "./brandRepository";
import type { CategoryRepository } from "./categoryRepository";
import type { CharacteristicRepository } from "./characteristicRepository";
import type { ProductTypeRepository } from "./productTypeRepository";
import type { SeoRepository } from "./seoRepository";

export const TAXONOMY_API_UNAVAILABLE_MESSAGE =
  "Integración con API real no disponible actualmente para el módulo de Taxonomía.";

export interface TaxonomyServices {
  category: CategoryRepository;
  brand: BrandRepository;
  productType: ProductTypeRepository;
  seo: SeoRepository;
  characteristic: CharacteristicRepository;
}

// Composition boundary for the whole Taxonomy module. The adapter set is chosen from
// the global data mode; in api mode there is no automatic fallback to mocks and the
// resolution fails explicitly instead of serving simulated data.
export function createTaxonomyServices(mode: DataMode): TaxonomyServices {
  if (mode === "api") {
    throw new Error(TAXONOMY_API_UNAVAILABLE_MESSAGE);
  }
  return {
    category: mockCategoryAdapter,
    brand: mockBrandAdapter,
    productType: mockProductTypeAdapter,
    seo: mockSeoAdapter,
    characteristic: mockCharacteristicAdapter,
  };
}

const cache = new Map<DataMode, TaxonomyServices>();

export function getTaxonomyServices(mode: DataMode): TaxonomyServices {
  const cached = cache.get(mode);
  if (cached) return cached;
  const services = createTaxonomyServices(mode);
  cache.set(mode, services);
  return services;
}

// Reads the validated global configuration (VITE_DATA_MODE). The React tree observes
// the same value through DataModeContext, so the UI gate and the service layer never
// disagree about the active mode.
export function resolveTaxonomyServices(): TaxonomyServices {
  const env = import.meta.env;
  const mode = resolveDataMode(env?.VITE_DATA_MODE, env?.DEV ?? true);
  return getTaxonomyServices(mode);
}
