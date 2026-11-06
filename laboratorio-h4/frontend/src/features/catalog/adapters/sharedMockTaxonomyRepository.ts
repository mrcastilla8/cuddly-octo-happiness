import { getTaxonomyServices } from "../../taxonomy/services/taxonomyServices";
import type { AttributeSchema, TaxonomyRepository } from "../services/taxonomyRepository";
import { isCharacteristicValuePending } from "../../taxonomy/adapters/mockCharacteristicAdapter";
import { MockTaxonomyRepository } from "./mockTaxonomyRepository";
import { createTaxonomyServicesAdapter } from "./taxonomyServicesAdapter";

// MK-009: a value with an admitted, still-unresolved deactivation request must not be
// offered as selectable in Catalog. The barrier lives in the effective mock composition
// (official Taxonomy bridge) so every Catalog consumer is protected. Catalog-native
// TIP-* fixtures are not filtered: there is no verified value-level mapping between
// their option IDs and Taxonomy `valorId`s, so applying the rule there would invent an
// equivalence. The historical repository only serves those fixtures.
const withoutPendingValues = (schemas: AttributeSchema[]): AttributeSchema[] =>
  schemas.map(schema => schema.opciones
    ? {
        ...schema,
        opciones: schema.opciones.filter(option =>
          !isCharacteristicValuePending(schema.caracteristicaId, option.id)),
      }
    : schema);

// Explicit compatibility for the pre-existing demo IDs. Never equate two IDs by
// name, migrate products, or fill missing official schema roles from these records.
// Taxonomy owns all editable/new masters; historical records remain immutable.
export function createSharedMockTaxonomyRepository(): TaxonomyRepository {
  const historical = new MockTaxonomyRepository();
  const official = createTaxonomyServicesAdapter(getTaxonomyServices("mock"));
  const merge = <T extends { id: string }>(old: T[], current: T[]): T[] => [
    ...old.filter(item => !current.some(row => row.id === item.id)), ...current,
  ];
  return {
    getCategories: async signal => merge(await historical.getCategories(), await official.getCategories(signal)),
    getBrands: async signal => merge(await historical.getBrands(), await official.getBrands(signal)),
    getProductTypes: async signal => merge(await historical.getProductTypes(), await official.getProductTypes(signal)),
    async getAttributeSchema(typeId, signal) {
      const currentTypes = await official.getProductTypes(signal);
      if (currentTypes.some(type => type.id === typeId)) {
        return withoutPendingValues(await official.getAttributeSchema(typeId, signal));
      }
      const historicalTypes = await historical.getProductTypes();
      return historicalTypes.some(type => type.id === typeId)
        ? historical.getAttributeSchema(typeId)
        : withoutPendingValues(await official.getAttributeSchema(typeId, signal));
    },
  };
}

export const sharedMockTaxonomyRepository = createSharedMockTaxonomyRepository();
