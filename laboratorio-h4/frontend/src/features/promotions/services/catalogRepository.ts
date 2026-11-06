export interface CatalogProductChoice {
  id: string;
  name: string;
  active: boolean;
  categoryId: string;
  skus: { sku: string; label: string; active: boolean }[];
}
export interface CatalogCategoryChoice {
  id: string;
  name: string;
  active: boolean;
}
export interface PromotionCatalogRepository {
  products(signal: AbortSignal, retain?: { productIds: string[]; skus: string[] }): Promise<CatalogProductChoice[]>;
  categories(signal: AbortSignal): Promise<CatalogCategoryChoice[]>;
}
