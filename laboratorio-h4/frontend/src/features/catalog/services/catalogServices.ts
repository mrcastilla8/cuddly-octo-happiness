import type { DataMode } from "../../../app/config/dataMode";
import type { CatalogRepository } from "./catalogRepository";
import type { TaxonomyRepository } from "./taxonomyRepository";
import { createUnavailableApiCatalogRepository } from "../adapters/unavailableApiCatalogRepository";
import { createUnavailableApiTaxonomyRepository } from "../adapters/unavailableApiTaxonomyRepository";

export interface CatalogServices {
  catalog: CatalogRepository;
  taxonomy: TaxonomyRepository;
}

export interface CatalogRuntimeDependencies {
  // Allows the official Taxonomy service bridge in either mode without changing pages.
  taxonomy?: TaxonomyRepository;
  // Initialize asynchronous HTTP factories before injecting their repositories.
  apiCatalog?: () => CatalogRepository;
  apiTaxonomy?: () => TaxonomyRepository;
}

let sharedMockServices: CatalogServices | null = null;

// The composition boundary for Catalog & Taxonomy.
// In 'mock' mode: uses the shared in-memory mock repository for MK-003 and MK-004.
// In 'api' mode: uses configured HTTP adapters, or deliberately fails closed without fallbacks to mock.
export function createCatalogServices(
  mode: DataMode,
  dependencies: CatalogRuntimeDependencies = {},
): CatalogServices {
  if (mode !== "mock" && mode !== "api") {
    throw new Error("VITE_DATA_MODE debe ser mock o api.");
  }

  if (mode === "mock") {
    const createLazyCatalogProxy = (taxonomy?: TaxonomyRepository): CatalogRepository => {
      let instance: Promise<CatalogRepository> | undefined;
      // Cache initialization itself so concurrent first calls share one store.
      const getInstance = () => instance ??= import("../adapters/mockCatalogRepository")
        .then(module => taxonomy ? new module.MockCatalogRepository(taxonomy) : module.mockCatalogRepository);

      return {
        list: async (q, sc, sig) => (await getInstance()).list(q, sc, sig),
        getById: async (id, sc, sig) => (await getInstance()).getById(id, sc, sig),
        create: async (p, sc, sig) => (await getInstance()).create(p, sc, sig),
        update: async (id, p, sc, sig) => (await getInstance()).update(id, p, sc, sig),
        activate: async (id, p, sc, sig) => (await getInstance()).activate(id, p, sc, sig),
        deactivate: async (id, p, sc, sig) => (await getInstance()).deactivate(id, p, sc, sig),
        reactivate: async (id, p, sc, sig) => (await getInstance()).reactivate(id, p, sc, sig),
        getPreparation: async (id, sc, sig) => (await getInstance()).getPreparation(id, sc, sig),
        retryPreparation: async (id, p, sc, sig) =>
          (await getInstance()).retryPreparation(id, p, sc, sig),
        listVariants: async (id, q, sc, sig) =>
          (await getInstance()).listVariants(id, q, sc, sig),
        getVariantById: async (pid, vid, sc, sig) =>
          (await getInstance()).getVariantById(pid, vid, sc, sig),
        createVariant: async (pid, p, sc, sig) =>
          (await getInstance()).createVariant(pid, p, sc, sig),
        updateVariant: async (pid, vid, p, sc, sig) =>
          (await getInstance()).updateVariant(pid, vid, p, sc, sig),
        activateVariant: async (pid, vid, sc, sig) =>
          (await getInstance()).activateVariant(pid, vid, sc, sig),
        deactivateVariant: async (pid, vid, sc, sig) =>
          (await getInstance()).deactivateVariant(pid, vid, sc, sig),
        reactivateVariant: async (pid, vid, sc, sig) =>
          (await getInstance()).reactivateVariant(pid, vid, sc, sig),
        retryVariantPreparation: async (pid, vid, sc, sig) =>
          (await getInstance()).retryVariantPreparation(pid, vid, sc, sig),
      };
    };

    // Explicit injection governs reads AND writes, isolated from the default demo.
    if (dependencies.taxonomy) {
      return { catalog: createLazyCatalogProxy(dependencies.taxonomy), taxonomy: dependencies.taxonomy };
    }
    if (!sharedMockServices) {
      const createLazyTaxonomyProxy = (): TaxonomyRepository => {
        let instance: TaxonomyRepository | null = null;
        const getInstance = async () => {
          if (!instance) {
            const { sharedMockTaxonomyRepository } = await import(
              "../adapters/sharedMockTaxonomyRepository"
            );
            instance = sharedMockTaxonomyRepository;
          }
          return instance;
        };

        return {
          getCategories: async (sig) => (await getInstance()).getCategories(sig),
          getBrands: async (sig) => (await getInstance()).getBrands(sig),
          getProductTypes: async (sig) => (await getInstance()).getProductTypes(sig),
          getAttributeSchema: async (t, sig) => (await getInstance()).getAttributeSchema(t, sig),
        };
      };

      sharedMockServices = {
        catalog: createLazyCatalogProxy(),
        taxonomy: createLazyTaxonomyProxy(),
      };
    }
    return sharedMockServices;
  }

  // mode === "api"
  const services = {
    catalog: dependencies.apiCatalog
      ? dependencies.apiCatalog()
      : createUnavailableApiCatalogRepository(),
    taxonomy: dependencies.taxonomy ?? (dependencies.apiTaxonomy
      ? dependencies.apiTaxonomy()
      : createUnavailableApiTaxonomyRepository()),
  };
  if ("then" in services.catalog || "then" in services.taxonomy) {
    throw new Error("Inicializa los adaptadores asíncronos con await antes de inyectarlos en Catálogo.");
  }
  return services;
}

const serviceInstances = new Map<DataMode, CatalogServices>();

export function getCatalogServices(
  mode: DataMode,
  dependencies: CatalogRuntimeDependencies = {},
): CatalogServices {
  // Explicit injection always takes precedence over the default runtime cache.
  if (dependencies.taxonomy || dependencies.apiCatalog || dependencies.apiTaxonomy) {
    return createCatalogServices(mode, dependencies);
  }
  let services = serviceInstances.get(mode);
  if (!services) {
    services = createCatalogServices(mode, dependencies);
    serviceInstances.set(mode, services);
  }
  return services;
}
