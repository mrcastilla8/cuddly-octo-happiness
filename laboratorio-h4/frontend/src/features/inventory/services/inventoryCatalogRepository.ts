// Puerto de catálogo reutilizable para opciones de filtros de inventario.
//
// Define los contratos mínimos necesarios para poblar filtros (categorías,
// marcas y ubicaciones) sin acoplar UI a adaptadores concretos ni a fixtures.
// Las ubicaciones se marcan como BLOCKED_CONTRACT (no existe endpoint HTTP
// publicado en el contrato actual).

export interface InventoryCategoryOption {
  id: string;
  name: string;
  active: boolean;
}

export interface InventoryBrandOption {
  id: string;
  name: string;
  active: boolean;
}

export interface InventoryLocationOption {
  id: string;
  name: string;
  active: boolean;
}

export interface InventoryCatalogRepository {
  getCategories(signal?: AbortSignal): Promise<InventoryCategoryOption[]>;
  getBrands(signal?: AbortSignal): Promise<InventoryBrandOption[]>;
  getLocations(signal?: AbortSignal): Promise<InventoryLocationOption[]>;
}

// Para reutilizar el patrón "nombre + nombre" cuando solo se necesita resolver
// opciones a nivel de presentación. NO reemplaza a las fuentes autorizadas.
export type InventoryCatalogQueryOptions = {
  categories: InventoryCategoryOption[];
  brands: InventoryBrandOption[];
  locations: InventoryLocationOption[];
};
