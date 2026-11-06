import type { AttributeSchema, TaxonomyRepository } from "../services/taxonomyRepository";
import { array, blockedCatalog, boolean, choice, createCatalogHttp, encoded, integer, object, string, type CatalogHttpTransport } from "./catalogHttp";

/** Read-only Catalog port, not an implementation of Taxonomy administration. */
export function createHttpTaxonomyRepository(transport: CatalogHttpTransport): TaxonomyRepository {
  const request = createCatalogHttp(transport);
  return {
    async getCategories(signal) {
      const dto = object(await request("/categorias", "GET", undefined, signal));
      return array(dto.categories).map(value => { const row = object(value); return {
        id: string(row.categoria_id), nombre: string(row.name), activo: choice(row.status, ["ACTIVA", "INACTIVA"] as const) === "ACTIVA" };
      });
    },
    async getBrands(signal) {
      const dto = object(await request("/marcas", "GET", undefined, signal));
      return array(dto.brands).map(value => { const row = object(value); return {
        id: string(row.marca_id), nombre: string(row.name), activo: choice(row.status, ["ACTIVA", "INACTIVA"] as const) === "ACTIVA" };
      });
    },
    async getProductTypes(signal) {
      const result = []; let page = 1;
      while (true) {
        const dto = object(await request(`/tipos-producto?pagina=${page}&tamanio=100`, "GET", undefined, signal));
        const meta = object(dto.meta); const current = integer(meta.pagina, 1); const size = integer(meta.tamanio, 1);
        const total = integer(meta.total); const pages = integer(meta.totalPaginas);
        const items = array(dto.items);
        if (current !== page || size > 100 || pages !== Math.ceil(total / size) ||
          items.length !== Math.min(size, Math.max(0, total - (page - 1) * size))) return blockedCatalog("La lista de tipos de producto está incompleta.");
        result.push(...items.map(value => { const row = object(value); return {
          id: string(row.tipoProductoId), nombre: string(row.nombre), activo: choice(row.estado, ["ACTIVO", "INACTIVO"] as const) === "ACTIVO" };
        }));
        if (page >= pages) return result;
        page++;
      }
    },
    async getAttributeSchema(typeId, signal): Promise<AttributeSchema[]> {
      const dto = object(await request(`/tipos-producto/${encoded(typeId)}/caracteristicas`, "GET", undefined, signal));
      integer(dto.schemaVersion);
      if (object(dto.tipoProducto).tipoProductoId !== typeId) return blockedCatalog("El esquema recibido pertenece a otro tipo de producto.");
      return array(dto.caracteristicas).filter(value => choice(object(value).estado, ["ACTIVO", "INACTIVO"] as const) === "ACTIVO").map(value => {
        const association = object(value); const c = object(association.caracteristica);
        if (c.caracteristicaId !== association.caracteristicaId || c.estado !== "ACTIVO") return blockedCatalog("La característica asociada no está disponible.");
        const tipo = choice(c.tipo, ["TEXTO", "NUMERO", "LISTA"] as const);
        // The published schema has no role metadata or configurable text limit.
        // Do not turn obligatoria into esIdentificadora, or use the initial SPEC limit.
        if (tipo === "TEXTO") return blockedCatalog("Taxonomía no publica el límite de texto configurado para esta característica.");
        return { caracteristicaId: string(c.caracteristicaId), nombre: string(c.nombre), tipo,
          obligatorio: boolean(association.obligatoria), unidad: c.unidadMedida == null ? undefined : string(c.unidadMedida),
          opciones: tipo === "LISTA" ? array(c.valores).filter(v => object(v).estado === "ACTIVO").map(v => {
            const option = object(v); return { id: string(option.valorId), valor: string(option.nombre) };
          }) : undefined };
      });
    },
  };
}
