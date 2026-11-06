// Taxonomy domain models and port interface for categories, brands, product types, and attribute schemas

export interface TaxonomyCategory {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface TaxonomyBrand {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface TaxonomyProductType {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface AttributeSchemaOption {
  id: string;
  valor: string;
}

export interface AttributeSchema {
  caracteristicaId: string;
  nombre: string;
  tipo: "TEXTO" | "NUMERO" | "LISTA";
  obligatorio: boolean;
  unidad?: string;
  opciones?: AttributeSchemaOption[];
  esIdentificadora?: boolean;
  // Presentation metadata supplied by the provider, not invented HTTP fields.
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

export interface TaxonomyRepository {
  getCategories(signal?: AbortSignal): Promise<TaxonomyCategory[]>;
  getBrands(signal?: AbortSignal): Promise<TaxonomyBrand[]>;
  getProductTypes(signal?: AbortSignal): Promise<TaxonomyProductType[]>;
  getAttributeSchema(
    typeId: string,
    signal?: AbortSignal,
  ): Promise<AttributeSchema[]>;
}
