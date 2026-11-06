import { catalogCategories, catalogProducts } from "../mocks/catalogChoices";
import { readMockCatalogCategories, readMockCatalogProducts } from "../../catalog/adapters/mockCatalogConsumers";
import type { PromotionCatalogRepository } from "../services/catalogRepository";
export function createMockPromotionCatalogRepository(): PromotionCatalogRepository {
  return {
    async products(signal, retain) {
      signal.throwIfAborted();
      const current = await readMockCatalogProducts(signal);
      const retainedIds = new Set(retain?.productIds ?? []);
      const retainedSkus = new Set(retain?.skus ?? []);
      const available = current.filter(item => item.active || retainedIds.has(item.id) ||
        item.skus.some(sku => retainedSkus.has(sku.sku)));
      const historical = catalogProducts.filter(item =>
        (retainedIds.has(item.id) || item.skus.some(sku => retainedSkus.has(sku.sku))) &&
        !current.some(row => row.id === item.id),
      ).map(item => ({
        ...item,
        // Historical labels stay readable/editable only for the references that
        // already belong to this campaign; they are never new candidates.
        skus: item.skus.map(sku => ({ ...sku, active: retainedSkus.has(sku.sku) })),
      }));
      return [...structuredClone(historical), ...available];
    },
    async categories(signal) {
      signal.throwIfAborted();
      const current = await readMockCatalogCategories(signal);
      return [...structuredClone(catalogCategories.filter(item => !current.some(row => row.id === item.id))), ...current]
        .filter(item => item.active);
    },
  };
}
