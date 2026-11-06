import { expect, test } from "@playwright/test";
import { createCatalogServices, getCatalogServices } from "../src/features/catalog/services/catalogServices";
import { MockCatalogRepository } from "../src/features/catalog/adapters/mockCatalogRepository";
import { MockTaxonomyRepository } from "../src/features/catalog/adapters/mockTaxonomyRepository";
import { validateVariantAttributes } from "../src/features/catalog/services/variantAttributeValidation";
import type { AttributeSchema } from "../src/features/catalog/services/taxonomyRepository";
import type { ProductAttributeValue } from "../src/features/catalog/services/catalogRepository";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { useCatalogServices } from "../src/features/catalog/hooks/useCatalogServices";

test("missing DataModeContext fails explicitly", () => {
  function Probe() { useCatalogServices(); return null; }
  expect(() => renderToString(createElement(Probe))).toThrow("DataModeContext");
});

test("uninitialized async factories are rejected instead of casting promises", () => {
  expect(() => createCatalogServices("api", {
    // @ts-expect-error async factories must be awaited at the composition root
    apiCatalog: async () => new MockCatalogRepository(),
  })).toThrow("await");
});

test("API injection replaces cached unavailable providers without mock fallback", async () => {
  await expect(getCatalogServices("api").catalog.getById("missing")).rejects.toThrow();
  const catalog = new MockCatalogRepository();
  const taxonomy = new MockTaxonomyRepository();
  const first = getCatalogServices("api", { apiCatalog: () => catalog, apiTaxonomy: () => taxonomy });
  expect(first.catalog).toBe(catalog);
  expect(first.taxonomy).toBe(taxonomy);
  const alternate = new MockCatalogRepository();
  expect(getCatalogServices("api", { apiCatalog: () => alternate }).catalog).toBe(alternate);
  await expect(createCatalogServices("api", { apiCatalog: () => alternate }).taxonomy.getProductTypes()).rejects.toThrow();
  const failing = { getCategories: async () => { throw new Error("provider down"); },
    getBrands: () => taxonomy.getBrands(), getProductTypes: () => taxonomy.getProductTypes(),
    getAttributeSchema: (id: string) => taxonomy.getAttributeSchema(id) };
  await expect(createCatalogServices("api", { apiTaxonomy: () => failing }).taxonomy.getCategories()).rejects.toThrow("provider down");
});

test("LISTA preserves stable IDs, NUMERO accepts negatives when permitted, TEXTO respects metadata", () => {
  const schemas: AttributeSchema[] = [
    { caracteristicaId: "list", nombre: "List", tipo: "LISTA", obligatorio: true, esIdentificadora: true, opciones: [{ id: "stable", valor: "Renamed" }] },
    { caracteristicaId: "number", nombre: "Number", tipo: "NUMERO", obligatorio: true, esIdentificadora: false, minimum: -10, maximum: 10 },
    { caracteristicaId: "text", nombre: "Text", tipo: "TEXTO", obligatorio: true, esIdentificadora: false, maxLength: 5 },
  ];
  const identity: [ProductAttributeValue] = [{ caracteristicaId: "list", nombre: "List", tipo: "LISTA", valor: "Old name", valorId: "stable" }];
  const complementary: [ProductAttributeValue, ProductAttributeValue] = [
    { caracteristicaId: "number", nombre: "Number", tipo: "NUMERO", valor: -5 },
    { caracteristicaId: "text", nombre: "Text", tipo: "TEXTO", valor: "hello" },
  ];
  expect(validateVariantAttributes(identity, complementary, schemas)).toEqual({});
  expect(validateVariantAttributes([{ ...identity[0], valorId: "fake" }], complementary, schemas)).toHaveProperty("id_attr_0_valor");
  expect(validateVariantAttributes(identity, [{ ...complementary[0], valor: "bad" }, complementary[1]], schemas)).toHaveProperty("non_attr_0_valor");
  expect(validateVariantAttributes(identity, [{ ...complementary[0], valor: -11 }, { ...complementary[1], valor: "too long" }], schemas)).toHaveProperty("non_attr_1_valor");
  expect(validateVariantAttributes(identity, [], schemas)).toHaveProperty("attributes");
  expect(validateVariantAttributes(identity, complementary, [])).toHaveProperty("id_attr_0_valor");
});

test("complete variant starts BORRADOR/PENDING, waits for confirmation and only retries when authorized", async () => {
  const catalog = new MockCatalogRepository();
  const attributes = [{ caracteristicaId: "CAR-COLOR", nombre: "Color principal", tipo: "LISTA" as const, valor: "Rojo Carmesí", valorId: "COL-ROJ" }];
  const variant = await catalog.createVariant("PROD-RUN-001", {
    sku: "TEST-COMPLETE", identifyingAttributes: attributes,
    nonIdentifyingAttributes: [{ caracteristicaId: "CAR-MAT", nombre: "Material principal", tipo: "TEXTO", valor: "Algodón" }],
    imageUrl: "https://example.com/image.jpg", physicalProfile: { pesoKg: 1, largoCm: 2, anchoCm: 3, altoCm: 4 },
  });
  expect(variant.status).toBe("BORRADOR");
  expect(variant.inventoryPreparationStatus).toBe("PENDING");
  expect(variant.inventoryManualRetryAllowed).toBe(false);
  await expect(catalog.activateVariant(variant.productId, variant.variantId)).rejects.toThrow("COMPLETED");
  await expect(catalog.retryVariantPreparation(variant.productId, variant.variantId)).rejects.toThrow("409");
  catalog.receiveVariantInventoryResult(variant.productId, variant.variantId, "REJECTED", true);
  expect((await catalog.retryVariantPreparation(variant.productId, variant.variantId)).accepted).toBe(true);
  expect((await catalog.getVariantById(variant.productId, variant.variantId))?.inventoryStatus).toBe("PENDING");
  await expect(catalog.retryVariantPreparation(variant.productId, variant.variantId)).rejects.toThrow("409");
  catalog.receiveVariantInventoryResult(variant.productId, variant.variantId, "COMPLETED");
  expect((await catalog.activateVariant(variant.productId, variant.variantId)).variant.status).toBe("ACTIVA");
  await expect(catalog.retryVariantPreparation(variant.productId, variant.variantId)).rejects.toThrow("409");
});

test("simple product retry requires permission independently in Pricing and Inventory", async () => {
  const catalog = new MockCatalogRepository();
  const created = await catalog.create({
    nombre: "Test", descripcion: "Test", categoriaId: "CAT-ROPA", tipoProductoId: "TIP-CAMISETA", marcaId: "BRD-INKA",
    skuBase: "TEST-SIMPLE", tieneVariantes: false, precioBaseInicial: 20, atributos: [],
  });
  for (const dependencia of ["PRICING", "INVENTARIO"] as const) {
    await expect(catalog.retryPreparation(created.id, { dependencia })).rejects.toThrow("409");
  }
  expect((await catalog.retryPreparation("PROD-PAN-003", { dependencia: "INVENTARIO" })).accepted).toBe(true);
  const preparation = await catalog.getPreparation("PROD-PAN-003");
  expect(preparation?.inventario?.status).toBe("PENDING");
  expect(preparation?.inventario?.manualRetryAllowed).toBe(false);
  await expect(catalog.retryPreparation("PROD-PAN-003", { dependencia: "INVENTARIO" })).rejects.toThrow("409");
});
