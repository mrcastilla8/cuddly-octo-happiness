export type ComboStatus = "ACTIVO" | "INACTIVO";
export type AvailabilityFreshness =
  | "ACTUALIZADA"
  | "DESACTUALIZADA"
  | "INCOMPLETA"
  | "NO_VERIFICABLE";

// Informative availability state. It is intentionally separate from the
// administrative ComboStatus: a combo can be administratively ACTIVO and still
// be sold out, stale, incomplete or unverifiable.
export type AvailabilityState =
  | "DISPONIBLE"
  | "AGOTADO"
  | "DESACTUALIZADA"
  | "INCOMPLETA"
  | "NO_VERIFICABLE"
  | "COMBO_INACTIVO"
  | "COMPONENTE_INACTIVO";

export interface ComboAvailability {
  state: AvailabilityState;
  verifiable: boolean;
  quantity: number | null;
  freshness: AvailabilityFreshness;
  calculatedAt: string | null;
  reason: string | null;
}

export interface ComboComponent {
  sku: string;
  productName: string;
  quantity: number;
  regularUnitMinor: number | null;
  publicUnitMinor: number | null;
}

export interface Combo {
  id: string;
  name: string;
  description: string | null;
  status: ComboStatus;
  priceMinor: number;
  version: number;
  components: ComboComponent[];
  availability: ComboAvailability;
}

export interface ComboPage {
  items: Combo[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ComboQuery {
  status: ComboStatus | "TODOS";
  page: number;
  pageSize: number;
  scenario?: string;
}

export interface ProductSummary {
  productId: string;
  name: string;
  hasVariants: boolean;
  active: boolean;
  baseSku: string | null;
  // True when the Catalog commercial product type is identified as a combo.
  // A combo is never eligible as a component of another combo.
  isCombo: boolean;
}

export interface ProductDetail extends ProductSummary {
  variants: { sku: string; label: string; active: boolean }[];
}

// Authoritative resolution of a SKU against the shared Catalog. Produced by the
// CombosCatalogPort so both the selector and the save-time validation consult
// the exact same identities.
export interface ResolvedSku {
  sku: string;
  productId: string;
  productName: string;
  isCombo: boolean;
  productActive: boolean;
  variantActive: boolean;
  sellable: boolean;
  isVariantParentSku: boolean;
}

export interface ComponentDraft {
  sku: string;
  productName: string;
  quantity: number;
}

export interface ComboDraft {
  name: string;
  description: string;
  components: ComponentDraft[];
  price: string;
}

export interface SkuPrice {
  sku: string;
  regularMinor: number | null;
  offerMinor: number | null;
  currency: string;
  channelId: string | null;
  priceVersion: number;
  validityId: string;
  validFrom: string;
  validUntil: string | null;
}

// Explicit reading of the informative stock snapshot. `stock === null` means the
// snapshot cannot verify the balance (unknown), never a confident zero.
export interface StockReading {
  sku: string;
  stock: number | null;
  stale: boolean;
  locationsCompatible: boolean;
}

export interface ComboPayload {
  name: string;
  description: string | null;
  components: { sku: string; quantity: number }[];
  priceMinor: number;
  version?: number;
}

export interface CombosRepository {
  list(query: ComboQuery, signal?: AbortSignal): Promise<ComboPage>;
  getById(id: string, signal?: AbortSignal): Promise<Combo | null>;
  create(payload: ComboPayload, scenario?: string): Promise<Combo>;
  update(id: string, payload: ComboPayload, scenario?: string): Promise<Combo>;
  deactivate(id: string): Promise<Combo>;
}

export interface CombosCatalogPort {
  listProducts(query: string, signal?: AbortSignal): Promise<ProductSummary[]>;
  getProduct(productId: string, signal?: AbortSignal): Promise<ProductDetail | null>;
  // Coherent, paginated, authoritative resolution of every requested SKU.
  resolveSkus(skus: string[], signal?: AbortSignal): Promise<ResolvedSku[]>;
}

export interface CombosPricingPort {
  readCurrent(skus: string[], signal?: AbortSignal): Promise<SkuPrice[]>;
}

export interface CombosAvailabilityPort {
  readStocks(skus: string[], signal?: AbortSignal): Promise<StockReading[]>;
}

export class ComboError extends Error {
  public readonly code: string;

  constructor(
    public readonly kind:
      | "unavailable"
      | "not_found"
      | "price_invalid"
      | "version_conflict"
      | "duplicate_sku"
      | "nested_combo"
      | "invalid_components"
      | "invalid_quantity"
      | "sku_invalid"
      | "sku_not_found"
      | "pricing_unavailable"
      | "unknown",
    message: string,
    public readonly currentVersion?: Combo,
  ) {
    super(message);
    this.name = "ComboError";
    this.code = {
      unavailable: "SERVICIO_NO_DISPONIBLE",
      not_found: "COMBO_NO_ENCONTRADO",
      price_invalid: "COMBO_PRECIO_INVALIDO",
      version_conflict: "VERSION_CONFLICT",
      duplicate_sku: "COMBO_COMPONENTE_DUPLICADO",
      nested_combo: "COMBO_ANIDADO_NO_PERMITIDO",
      invalid_components: "COMBO_COMPONENTES_INSUFICIENTES",
      invalid_quantity: "CANTIDAD_INVALIDA",
      sku_invalid: "SKU_INACTIVO",
      sku_not_found: "SKU_NO_ENCONTRADO",
      pricing_unavailable: "SERVICIO_NO_DISPONIBLE",
      unknown: "ERROR_INTERNO",
    }[kind];
  }
}
