import { createCatalogFetchTransport, type CatalogHttpTransport } from "../adapters/catalogHttp";
import { createHttpCatalogRepository } from "../adapters/httpCatalogRepository";
import { createHttpTaxonomyRepository } from "../adapters/httpTaxonomyRepository";
import { createUnavailableApiCatalogRepository } from "../adapters/unavailableApiCatalogRepository";
import { createCatalogServices, type CatalogServices } from "./catalogServices";

export function createCatalogHttpServices(transport: CatalogHttpTransport): CatalogServices {
  const taxonomy = createHttpTaxonomyRepository(transport);
  return createCatalogServices("api", { apiTaxonomy: () => taxonomy,
    apiCatalog: () => createHttpCatalogRepository(transport) });
}

// Explicit Gateway configuration only; no environment-selected authentication bypass.
export function createOptionalCatalogHttpServices(origin?: string): CatalogServices | null {
  if (!origin) return null;
  try { return createCatalogHttpServices(createCatalogFetchTransport(origin)); }
  catch {
    const message = "La configuración de Gateway de Catálogo no es válida. Se requiere un origen HTTPS o loopback HTTP sin credenciales ni ruta.";
    const unavailable = async (): Promise<never> => { throw new Error(message); };
    return { catalog: createUnavailableApiCatalogRepository(message),
      taxonomy: { getCategories: unavailable, getBrands: unavailable, getProductTypes: unavailable, getAttributeSchema: unavailable } };
  }
}
