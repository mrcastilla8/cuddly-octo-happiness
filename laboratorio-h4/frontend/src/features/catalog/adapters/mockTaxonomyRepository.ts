import type {
  TaxonomyBrand,
  TaxonomyCategory,
  TaxonomyProductType,
  AttributeSchema,
  TaxonomyRepository,
} from "../services/taxonomyRepository";
import {
  initialBrands,
  initialCategories,
  initialProductTypes,
  attributeSchemasByType,
} from "../mocks/taxonomyFixtures";

export class MockTaxonomyRepository implements TaxonomyRepository {
  async getCategories(): Promise<TaxonomyCategory[]> {
    return [...initialCategories];
  }

  async getBrands(): Promise<TaxonomyBrand[]> {
    return [...initialBrands];
  }

  async getProductTypes(): Promise<TaxonomyProductType[]> {
    return [...initialProductTypes];
  }

  async getAttributeSchema(
    typeId: string,
  ): Promise<AttributeSchema[]> {
    return (attributeSchemasByType[typeId] ?? []).map(schema => ({
      ...schema,
      // SPEC-009 initial configurable limit; only this demo provider supplies the default.
      maxLength: schema.tipo === "TEXTO" ? 100 : schema.maxLength,
    }));
  }
}

export const mockTaxonomyRepository = new MockTaxonomyRepository();
