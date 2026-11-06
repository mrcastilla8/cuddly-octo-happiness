import type {
  InventoryBrandOption,
  InventoryCatalogRepository,
  InventoryCategoryOption,
  InventoryLocationOption,
} from "../services/inventoryCatalogRepository";

// Esqueleto HTTP para catálogo de inventario.
// BLOCKED_CONTRACT:
// - Ubicaciones: no existe endpoint publicado en `Contrato_Api.md §4` ni en
//   `openapi.yaml` 0.5.0 (owner Inventory, fuente física `inventory.locations`).
// - Categorías/marcas: disponibles vía `/categorias` y `/marcas`, pero su
//   integración HTTP para poblar filtros queda pendiente de definición (paginación).

export class ApiInventoryCatalogAdapter implements InventoryCatalogRepository {
  async getCategories(): Promise<InventoryCategoryOption[]> {
    return Promise.reject(this.unimplemented("getCategories"));
  }

  async getBrands(): Promise<InventoryBrandOption[]> {
    return Promise.reject(this.unimplemented("getBrands"));
  }

  async getLocations(): Promise<InventoryLocationOption[]> {
    return Promise.reject(
      this.blocked("getLocations", "Ubicaciones: sin endpoint HTTP publicado"),
    );
  }

  private unimplemented(operation: string): Error {
    return new Error(
      `ApiInventoryCatalogAdapter.${operation} no implementado: BLOCKED_CONTRACT (contrato HTTP pendiente de integración).`,
    );
  }

  private blocked(operation: string, detail: string): Error {
    return new Error(
      `ApiInventoryCatalogAdapter.${operation} bloqueado: BLOCKED_CONTRACT — ${detail}.`,
    );
  }
}
