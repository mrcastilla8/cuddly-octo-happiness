import type { TaxonomyRepository } from "../services/taxonomyRepository";

// Deliberately fail closed. No endpoint, credentials or fallback are invented.
export function createUnavailableApiTaxonomyRepository(): TaxonomyRepository {
  async function unavailable(): Promise<never> {
    throw new Error(
      "La consulta de categorías, marcas y tipos de producto no está disponible.",
    );
  }

  return {
    getCategories: unavailable,
    getBrands: unavailable,
    getProductTypes: unavailable,
    getAttributeSchema: unavailable,
  };
}
