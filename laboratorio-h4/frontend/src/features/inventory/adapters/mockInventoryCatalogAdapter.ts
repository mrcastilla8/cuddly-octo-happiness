import type { InventoryCatalogRepository } from "../services/inventoryCatalogRepository";

// Adaptador mock de catálogo para inventario (solo desarrollo/demo).
// Centraliza las opciones de filtro y evita que UI tome arrays dispersos.
// Las ubicaciones existen solo aquí hasta formalizar su contrato HTTP.

export class MockInventoryCatalogAdapter
  implements InventoryCatalogRepository
{
  async getCategories(): Promise<
    import("../services/inventoryCatalogRepository").InventoryCategoryOption[]
  > {
    return [
      { id: "CALZADO", name: "Calzado", active: true },
      { id: "ROPA_DEPORTIVA", name: "Ropa Deportiva", active: true },
      { id: "ACCESORIOS", name: "Accesorios", active: true },
    ];
  }

  async getBrands(): Promise<
    import("../services/inventoryCatalogRepository").InventoryBrandOption[]
  > {
    return [{ id: "INKA_ATHLETICS", name: "Inka Athletics", active: true }];
  }

  async getLocations(): Promise<
    import("../services/inventoryCatalogRepository").InventoryLocationOption[]
  > {
    return [
      { id: "ALM-CEN", name: "Almacén Central Lima", active: true },
      { id: "ALM-NOR", name: "Almacén Norte Trujillo", active: true },
      { id: "RET-SAN", name: "Tienda Retail San Isidro", active: true },
      { id: "RET-MFL", name: "Tienda Retail Miraflores", active: true },
    ];
  }
}
