import type { TaxonomyServices } from "../../taxonomy/services/taxonomyServices";
import type { CategoryNode } from "../../taxonomy/types";
import type { AttributeSchema, TaxonomyCategory, TaxonomyRepository } from "../services/taxonomyRepository";

// Explicit provider metadata. Roles and numeric bounds cannot be inferred from names.
export interface CatalogTaxonomyMetadata {
  getAttributeMetadata(typeId: string, characteristicId: string, signal?: AbortSignal): Promise<Pick<AttributeSchema, "esIdentificadora" | "minimum" | "maximum">>;
}

export function createTaxonomyServicesAdapter(
  services: TaxonomyServices,
  metadata?: CatalogTaxonomyMetadata,
): TaxonomyRepository {
  const flatten = (nodes: CategoryNode[]): TaxonomyCategory[] => nodes.flatMap(node => [
    { id: node.id, nombre: node.nombre, activo: node.estado === "Activo" },
    ...flatten(node.hijas ?? []),
  ]);
  return {
    getCategories: async signal => flatten((await services.category.list(signal)).nodos),
    getBrands: async signal => (await services.brand.list(signal)).items.map(item => ({
      id: item.marcaId, nombre: item.nombre, activo: item.estado === "Activo",
    })),
    getProductTypes: async signal => (await services.productType.list(signal)).items.map(item => ({
      id: item.tipoProductoId, nombre: item.nombre, activo: item.estado === "Activo",
    })),
    getAttributeSchema: async (typeId, signal) => {
      const [type, catalog] = await Promise.all([
        services.productType.obtener(typeId, signal), services.characteristic.list(signal),
      ]);
      if (!type) throw new Error(`Taxonomía no reconoce el tipo ${typeId}; se requiere un mapeo confirmado.`);
      return Promise.all(type.asociadas.filter(item => item.estado === "Activo").map(async association => {
        const characteristic = await services.characteristic.obtener(association.caracteristicaId, signal);
        if (!characteristic || characteristic.estado !== "Activo") {
          throw new Error(`Característica ${association.caracteristicaId} no disponible en Taxonomía.`);
        }
        const values = characteristic.tipo === "LISTA"
          ? await services.characteristic.listarValores(characteristic.id, signal) : undefined;
        if (characteristic.tipo === "LISTA" && values === null) throw new Error("Valores de Taxonomía no disponibles.");
        const providerMetadata = await metadata?.getAttributeMetadata(typeId, characteristic.id, signal);
        return {
          caracteristicaId: characteristic.id, nombre: characteristic.nombre,
          tipo: characteristic.tipo, obligatorio: association.obligatoria, unidad: characteristic.unidad,
          opciones: values?.filter(value => value.estado === "Activo").map(value => ({ id: value.valorId, valor: value.nombre })),
          maxLength: characteristic.tipo === "TEXTO" ? catalog.config.maxTexto : undefined,
          ...providerMetadata,
        };
      }));
    },
  };
}
