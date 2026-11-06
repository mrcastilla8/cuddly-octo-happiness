// Domain types and ports for Catalog feature (MK-003)
// Decoupled from HTTP DTOs and mock implementations.

export type ProductStatus = "BORRADOR" | "ACTIVO" | "INACTIVO";
export type VariantStatus = "BORRADOR" | "ACTIVA" | "INACTIVA";
export type PreparationStatus = "PENDING" | "COMPLETED" | "REJECTED";
export type SaleModel = "simple" | "variants";

export interface PhysicalProfile {
  pesoKg: number;
  largoCm: number;
  anchoCm: number;
  altoCm: number;
}

export interface ProductAttributeValue {
  caracteristicaId: string;
  nombre: string;
  tipo: "TEXTO" | "NUMERO" | "LISTA";
  valor: string | number;
  valorId?: string;
  unidad?: string;
}

export interface ProductImageRef {
  url: string;
  principal?: boolean;
}

export interface VariantPreparation {
  variantId: string;
  sku: string;
  inventario: {
    status: PreparationStatus;
    manualRetryAllowed: boolean;
    code?: string | null;
  };
  inventoryStatus?: PreparationStatus;
  manualRetryAllowed?: boolean;
  lastCheckedAt?: string;
}

export interface ProductPreparationView {
  productId: string;
  hasVariants: boolean;
  pricing: {
    status: PreparationStatus;
    manualRetryAllowed: boolean;
    code?: string | null;
  };
  inventario: {
    status: PreparationStatus;
    manualRetryAllowed: boolean;
    code?: string | null;
  } | null; // null for variant parent
  variantes: VariantPreparation[];
}

export interface VariantSummaryView {
  variantId: string;
  sku: string;
  attributesSummary: string;
  status: VariantStatus;
  preparationStatus: PreparationStatus;
  manualRetryAllowed: boolean;
}

export interface ProductView {
  id: string;
  name: string;
  skuBase: string | null;
  hasVariants: boolean;
  categoryId: string;
  categoryName: string;
  typeId: string;
  typeName: string;
  brandId: string;
  brandName: string;
  status: ProductStatus;
  preparationSummary: "COMPLETED" | "PENDING" | "REJECTED" | "PARTIAL";
  imageUrl?: string;
  catalogVersion: number;
  priceInitial?: number;
}

export interface ProductDetailView extends ProductView {
  description: string;
  images: ProductImageRef[];
  attributes: ProductAttributeValue[];
  physicalProfile: Partial<PhysicalProfile> | null;
  preparation: ProductPreparationView;
  variants: VariantSummaryView[];
  publishedCommercially?: boolean;
}

export interface CatalogQuery {
  q?: string;
  categoryId?: string;
  typeId?: string;
  saleModel?: "all" | "simple" | "variants";
  status?: "all" | ProductStatus;
  page: number;
  pageSize: number;
}

export interface CatalogPageResult {
  items: ProductView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductCreatePayload {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  tipoProductoId: string;
  marcaId: string;
  skuBase: string;
  tieneVariantes: boolean;
  precioBaseInicial: number;
  atributos?: ProductAttributeValue[];
  imagenes?: ProductImageRef[];
  perfilFisico?: Partial<PhysicalProfile> | null;
}

export interface ProductUpdatePayload {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  marcaId: string;
  tipoProductoId?: string; // only if eligible under Q-06
  atributos?: ProductAttributeValue[];
  imagenes?: ProductImageRef[];
  perfilFisico?: Partial<PhysicalProfile> | null;
  catalogVersion: number;
}

export interface StateMutationPayload {
  motivo?: string | null;
  catalogVersion?: number | null;
}

export interface RetryPreparationPayload {
  dependencia: "PRICING" | "INVENTARIO";
  motivo?: string;
}

export class CatalogError extends Error {
  constructor(
    public readonly kind:
      | "validation"
      | "conflict"
      | "duplicate_sku"
      | "duplicate_combination"
      | "product_not_variants"
      | "invalid_master"
      | "invalid_attribute"
      | "invalid_image"
      | "invalid_physical"
      | "version_conflict"
      | "not_found"
      | "active_rejected"
      | "activation_rejected"
      | "prep_not_retryable"
      | "unknown"
      | "server"
      | "forbidden"
      | "session"
      | "blocked_contract"
      | "write_unknown",
    message: string,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "CatalogError";
  }
}

export interface VariantDimensionView {
  largo?: number;
  ancho?: number;
  alto?: number;
}

export interface VariantPhysicalProfile {
  pesoKg?: number;
  largoCm?: number;
  anchoCm?: number;
  altoCm?: number;
  volumenCm3?: number;
  dimensionesCm?: VariantDimensionView | null;
}

export interface VariantDetailView {
  variantId: string;
  sku: string;
  productId: string;
  status: VariantStatus;
  identifyingAttributes: ProductAttributeValue[];
  nonIdentifyingAttributes: ProductAttributeValue[];
  images: string[];
  imageUrl: string;
  physicalProfile: VariantPhysicalProfile | null;
  catalogVersion: number;
  inventoryPreparationStatus: PreparationStatus;
  inventoryPreparationCode?: string | null;
  inventoryManualRetryAllowed: boolean;
  inventoryStatus: PreparationStatus;
}

export interface VariantQuery {
  status?: "all" | VariantStatus;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface VariantPageResult {
  items: VariantDetailView[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VariantCreatePayload {
  sku: string;
  identifyingAttributes?: ProductAttributeValue[];
  atributosIdentificadores?: ProductAttributeValue[];
  nonIdentifyingAttributes?: ProductAttributeValue[];
  atributosNoIdentificadores?: ProductAttributeValue[];
  imageUrl?: string;
  imagenUrl?: string;
  physicalProfile?: VariantPhysicalProfile | null;
  perfilFisico?: VariantPhysicalProfile | null;
}

export interface VariantUpdatePayload {
  nonIdentifyingAttributes?: ProductAttributeValue[];
  atributosNoIdentificadores?: ProductAttributeValue[];
  imageUrl?: string;
  imagenUrl?: string;
  physicalProfile?: VariantPhysicalProfile | null;
  perfilFisico?: VariantPhysicalProfile | null;
  catalogVersion?: number;
}

export interface VariantMutationResult {
  variant: VariantDetailView;
  parentStatusChanged?: boolean;
  parentNewStatus?: ProductStatus;
}

export interface CatalogRepository {
  list(
    query: CatalogQuery,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<CatalogPageResult>;
  getById(
    id: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView | null>;
  create(
    payload: ProductCreatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView>;
  update(
    id: string,
    payload: ProductUpdatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView>;
  activate(
    id: string,
    payload?: StateMutationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView>;
  deactivate(
    id: string,
    payload?: StateMutationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView>;
  reactivate(
    id: string,
    payload?: StateMutationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductDetailView>;
  getPreparation(
    id: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<ProductPreparationView>;
  retryPreparation(
    id: string,
    payload: RetryPreparationPayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<{ accepted: boolean; message: string }>;

  // MK-004 Variant operations
  listVariants(
    productId: string,
    query?: VariantQuery,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantPageResult>;
  getVariantById(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantDetailView | null>;
  createVariant(
    productId: string,
    payload: VariantCreatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantDetailView>;
  updateVariant(
    productId: string,
    variantId: string,
    payload: VariantUpdatePayload,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantDetailView>;
  activateVariant(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantMutationResult>;
  deactivateVariant(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantMutationResult>;
  reactivateVariant(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<VariantMutationResult>;
  retryVariantPreparation(
    productId: string,
    variantId: string,
    scenario?: string,
    signal?: AbortSignal,
  ): Promise<{ accepted: boolean; message: string; operationId?: string }>;
}
