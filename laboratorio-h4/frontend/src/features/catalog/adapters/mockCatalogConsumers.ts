import type { CatalogProductChoice } from "../../promotions/services/catalogRepository";
import type { PriceTarget } from "../../pricing/services/pricingRepository";
import { mockCatalogRepository } from "./mockCatalogRepository";
import { sharedMockTaxonomyRepository } from "./sharedMockTaxonomyRepository";

// Read projections of the same session store. No writes, price initialization,
// channel eligibility, barcode mapping or inventory quantities are inferred here.
export async function readMockCatalogProducts(signal: AbortSignal): Promise<CatalogProductChoice[]> {
  const products: CatalogProductChoice[] = [];
  for (let page = 1; ; page++) {
    const result = await mockCatalogRepository.list({ page, pageSize: 100 }, undefined, signal);
    for (const product of result.items) {
      const skus: CatalogProductChoice["skus"] = [];
      if (product.hasVariants) {
        for (let variantPage = 1; ; variantPage++) {
          const variants = await mockCatalogRepository.listVariants(product.id, { page: variantPage, pageSize: 100 }, undefined, signal);
          skus.push(...variants.items.map(variant => ({ sku: variant.sku,
            label: variant.identifyingAttributes.map(attribute => `${attribute.nombre}: ${attribute.valor}`).join(" · "),
            active: product.status === "ACTIVO" && variant.status === "ACTIVA",
          })));
          if (variantPage * variants.pageSize >= variants.total || !variants.items.length) break;
        }
      } else if (product.skuBase !== null) {
        skus.push({ sku: product.skuBase, label: product.name, active: product.status === "ACTIVO" });
      }
      products.push({ id: product.id, name: product.name, categoryId: product.categoryId,
        active: product.status === "ACTIVO", skus });
    }
    if (page * result.pageSize >= result.total || !result.items.length) break;
  }
  signal.throwIfAborted();
  return products;
}

export async function readMockPricingTargets(signal: AbortSignal): Promise<PriceTarget[]> {
  const targets: PriceTarget[] = [];
  for (let page = 1; ; page++) {
    const result = await mockCatalogRepository.list({ page, pageSize: 100 }, undefined, signal);
    for (const product of result.items) {
      targets.push({
        id: product.id,
        productId: product.id,
        kind: "product",
        referenceSku: product.skuBase ?? undefined,
        label: `${product.name} · ${product.skuBase ?? "Sin SKU base"}`,
        initialRegular:
          product.priceInitial !== null && product.priceInitial !== undefined
            ? Number(product.priceInitial).toFixed(2)
            : undefined,
      });
      if (product.hasVariants) for (let variantPage = 1; ; variantPage++) {
        const variants = await mockCatalogRepository.listVariants(product.id, { page: variantPage, pageSize: 100 }, undefined, signal);
        targets.push(...variants.items.map(variant => ({ id: variant.variantId, productId: product.id,
          productTargetId: product.id, kind: "variant" as const, sku: variant.sku,
          label: `${variant.identifyingAttributes.map(attribute => `${attribute.nombre}: ${attribute.valor}`).join(" · ")} — ${variant.sku}` })));
        if (variantPage * variants.pageSize >= variants.total || !variants.items.length) break;
      }
    }
    if (page * result.pageSize >= result.total || !result.items.length) break;
  }
  signal.throwIfAborted();
  return targets;
}

export async function readMockCatalogCategories(signal: AbortSignal) {
  return (await sharedMockTaxonomyRepository.getCategories(signal)).map(category => ({
    id: category.id, name: category.nombre, active: category.activo,
  }));
}

// Join current descriptive data by sellable SKU; stock remains owned by Inventory.
export async function readMockInventoryCatalog() {
  const metadata = new Map<
    string,
    {
      productName: string;
      categoryName: string;
      brandName: string;
      vendible: boolean;
    }
  >();
  for (let page = 1; ; page++) {
    const products = await mockCatalogRepository.list({ page, pageSize: 100 });
    for (const product of products.items) {
      const description = {
        productName: product.name,
        categoryName: product.categoryName,
        brandName: product.brandName,
      };
      if (!product.hasVariants && product.skuBase !== null) {
        metadata.set(product.skuBase, {
          ...description,
          vendible: product.status !== "INACTIVO",
        });
      } else if (product.hasVariants) {
        for (let variantPage = 1; ; variantPage++) {
          const variants = await mockCatalogRepository.listVariants(product.id, { page: variantPage, pageSize: 100 });
          for (const variant of variants.items) {
            metadata.set(variant.sku, {
              ...description,
              vendible: variant.status !== "INACTIVA",
            });
          }
          if (variantPage * variants.pageSize >= variants.total || !variants.items.length) break;
        }
      }
    }
    if (page * products.pageSize >= products.total || !products.items.length) break;
  }
  return metadata;
}
