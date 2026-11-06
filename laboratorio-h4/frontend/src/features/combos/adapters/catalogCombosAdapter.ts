import type {
  CatalogPageResult,
  CatalogRepository,
  ProductView,
  VariantDetailView,
  VariantPageResult,
} from "../../catalog/services/catalogRepository";
import type {
  CombosCatalogPort,
  ProductDetail,
  ProductSummary,
  ResolvedSku,
} from "../types/combos";

// Published commercial product types that represent a combo. Combos are their
// own domain entity (not a Catalog product), so this set is empty by default;
// it exists so a Catalog that publishes a combo type is rejected as a nested
// component without ever matching on the product *name*.
export const DEFAULT_COMBO_PRODUCT_TYPE_IDS: ReadonlySet<string> = new Set<string>();

export interface CatalogCombosAdapterOptions {
  catalog: CatalogRepository;
  comboTypeIds?: ReadonlySet<string>;
  pageSize?: number;
}

function isActiveProduct(product: ProductView): boolean {
  return product.status === "ACTIVO";
}

export class CatalogCombosAdapter implements CombosCatalogPort {
  private readonly catalog: CatalogRepository;
  private readonly comboTypeIds: ReadonlySet<string>;
  private readonly pageSize: number;

  constructor(options: CatalogCombosAdapterOptions) {
    this.catalog = options.catalog;
    this.comboTypeIds = options.comboTypeIds ?? DEFAULT_COMBO_PRODUCT_TYPE_IDS;
    this.pageSize = options.pageSize && options.pageSize > 0 ? options.pageSize : 50;
  }

  async listProducts(query: string, signal?: AbortSignal): Promise<ProductSummary[]> {
    const normalized = query.trim().toLocaleLowerCase("es-PE");
    const products = await this.listAllProducts(signal);
    return products
      .filter((product) => isActiveProduct(product))
      .filter((product) => (normalized ? product.name.toLocaleLowerCase("es-PE").includes(normalized) : true))
      .map((product) => this.toSummary(product));
  }

  async getProduct(productId: string, signal?: AbortSignal): Promise<ProductDetail | null> {
    const detail = await this.catalog.getById(productId, undefined, signal);
    if (!detail) return null;
    const variants = detail.hasVariants ? await this.listAllVariants(detail.id, signal) : [];
    return {
      ...this.toSummary(detail),
      variants: variants.map((variant) => ({
        sku: variant.sku,
        label: variantLabel(variant),
        active: variant.status === "ACTIVA",
      })),
    };
  }

  async resolveSkus(skus: string[], signal?: AbortSignal): Promise<ResolvedSku[]> {
    const wanted = new Set(skus);
    if (wanted.size === 0) return [];
    const products = await this.listAllProducts(signal);
    const resolved: ResolvedSku[] = [];
    for (const product of products) {
      const isCombo = this.isComboProduct(product);
      const productActive = isActiveProduct(product);
      if (product.hasVariants) {
        if (product.skuBase && wanted.has(product.skuBase)) {
          // A variant-parent SKU is not directly sellable.
          resolved.push({
            sku: product.skuBase,
            productId: product.id,
            productName: product.name,
            isCombo,
            productActive,
            variantActive: false,
            sellable: false,
            isVariantParentSku: true,
          });
        }
        const variants = await this.listAllVariants(product.id, signal);
        for (const variant of variants) {
          if (!wanted.has(variant.sku)) continue;
          const variantActive = variant.status === "ACTIVA";
          resolved.push({
            sku: variant.sku,
            productId: product.id,
            productName: product.name,
            isCombo,
            productActive,
            variantActive,
            sellable: productActive && variantActive && !isCombo,
            isVariantParentSku: false,
          });
        }
      } else if (product.skuBase && wanted.has(product.skuBase)) {
        resolved.push({
          sku: product.skuBase,
          productId: product.id,
          productName: product.name,
          isCombo,
          productActive,
          variantActive: true,
          sellable: productActive && !isCombo,
          isVariantParentSku: false,
        });
      }
    }
    return resolved;
  }

  private toSummary(product: ProductView): ProductSummary {
    return {
      productId: product.id,
      name: product.name,
      hasVariants: product.hasVariants,
      active: isActiveProduct(product),
      baseSku: product.hasVariants ? null : product.skuBase ?? null,
      isCombo: this.isComboProduct(product),
    };
  }

  private isComboProduct(product: ProductView): boolean {
    // Identity published by Catalog: product type id. Never inferred from the name.
    return this.comboTypeIds.has(product.typeId);
  }

  private async listAllProducts(signal?: AbortSignal): Promise<ProductView[]> {
    const all: ProductView[] = [];
    let page = 1;
    for (;;) {
      const result: CatalogPageResult = await this.catalog.list(
        { page, pageSize: this.pageSize, status: "all" },
        undefined,
        signal,
      );
      all.push(...result.items);
      if (result.items.length === 0 || all.length >= result.total || page > 10_000) break;
      page += 1;
    }
    return all;
  }

  private async listAllVariants(productId: string, signal?: AbortSignal): Promise<VariantDetailView[]> {
    const all: VariantDetailView[] = [];
    let page = 1;
    for (;;) {
      const result: VariantPageResult = await this.catalog.listVariants(
        productId,
        { page, pageSize: this.pageSize, status: "all" },
        undefined,
        signal,
      );
      all.push(...result.items);
      if (result.items.length === 0 || all.length >= result.total || page > 10_000) break;
      page += 1;
    }
    return all;
  }
}

function variantLabel(variant: VariantDetailView): string {
  const attributes = variant.identifyingAttributes
    .map((attribute) => `${attribute.nombre}: ${String(attribute.valor)}`)
    .join(" · ");
  return attributes ? `${attributes} · ${variant.sku}` : variant.sku;
}
