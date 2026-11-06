import { expect, test } from "@playwright/test";
import { MockCatalogRepository } from "../src/features/catalog/adapters/mockCatalogRepository";
import { mockTaxonomyRepository } from "../src/features/catalog/adapters/mockTaxonomyRepository";
import { createCatalogMockPromotionServices } from "../src/features/promotions/services/promotionServices";
import { createCatalogPromotionRepository } from "../src/features/promotions/adapters/catalogPromotionRepository";

const signal = () => new AbortController().signal;
function setup() {
  const catalog = new MockCatalogRepository();
  const provider = { catalog, taxonomy: mockTaxonomyRepository };
  return { catalog, services: createCatalogMockPromotionServices(provider) };
}

test("CUE-01/04: same provider edits, product activation/deactivation and SKU status feed both consumers", async () => {
  const { catalog, services } = setup();
  let products = await services.catalog.products(signal());
  expect(products.map(row => row.id)).toEqual(["PROD-RUN-001", "PROD-CAS-001"]);
  expect(products[0]!.skus.map(row => row.sku)).toEqual(["CAM-RUN-BLA-M", "CAM-RUN-AZU-L"]);
  expect(products[1]!.skus[0]!.sku).toBe("CAS-COR-001");
  const current = (await catalog.getById("PROD-CAS-001"))!;
  await catalog.update(current.id, { nombre: "Casaca actualizada", descripcion: current.description, categoriaId: current.categoryId, marcaId: current.brandId, catalogVersion: current.catalogVersion, atributos: current.attributes, imagenes: current.images, perfilFisico: current.physicalProfile });
  expect((await services.catalog.products(signal())).find(row => row.id === current.id)?.name).toBe("Casaca actualizada");
  await catalog.activate("PROD-MOCH-001");
  expect((await services.catalog.products(signal())).map(row => row.id)).toContain("PROD-MOCH-001");
  await catalog.deactivateVariant("PROD-RUN-001", "VAR-RUN-BLA-M");
  products = await services.catalog.products(signal());
  expect(products.find(row => row.id === "PROD-RUN-001")?.skus.map(row => row.sku)).toEqual(["CAM-RUN-AZU-L"]);
  await catalog.deactivate(current.id);
  expect((await services.catalog.products(signal())).map(row => row.id)).not.toContain(current.id);

  const campaign = (await services.campaigns.read("carrera", signal()))!;
  await expect(services.campaigns.save(campaign.id, campaign.configuration, signal())).rejects.toMatchObject({ fields: { scope: expect.any(String) } });
  const recommendation = (await services.recommendations.read("mejora-rendimiento", signal()))!;
  await expect(services.recommendations.save(recommendation.id, recommendation.configuration, signal())).rejects.toMatchObject({ fields: { "candidate-0": expect.any(String) } });
  expect(await services.recommendations.read(recommendation.id, signal())).toEqual(recommendation);
  // Configurations and coupon uses are historical records, never erased by Catalog.
  expect((await services.coupons.read("run10", signal()))?.consumedUses).toBeDefined();
});

test("CUE-03: integrated seed supports campaign edit, coupon creation and both recommendation kinds", async () => {
  const { services } = setup();
  const campaign = (await services.campaigns.read("bienvenida", signal()))!;
  const saved = await services.campaigns.save(campaign.id, { ...campaign.configuration, name: "Campaña integrada" }, signal());
  expect(saved.configuration.productIds).toEqual(["PROD-RUN-001"]);
  await services.coupons.create({ code: "INTEGRADO", promotionId: saved.id, status: "inactive", globalLimit: null, customerLimit: null, minimumAmount: null, cancellationPolicy: "restore" }, signal());
  expect((await services.campaigns.read(saved.id, signal()))?.canChangeMode).toBe(false);
  for (const id of ["completa-carrera", "mejora-rendimiento", "categoria-running"]) {
    const row = (await services.recommendations.read(id, signal()))!;
    expect((await services.recommendations.save(id, row.configuration, signal())).configuration).toEqual(row.configuration);
  }
  expect((await services.catalog.categories(signal())).map(row => row.id)).toContain("CAT-ROPA");
  expect((await setup().services.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal())).items.some(row => row.code === "INTEGRADO")).toBe(false);
});

test("integrated Catalog retains current inactive references for detail, excluding them from new selections", async () => {
  const { catalog, services } = setup();
  await catalog.deactivateVariant("PROD-RUN-001", "VAR-RUN-BLA-M");
  const retain = { productIds: [], skus: ["CAM-RUN-BLA-M"] };
  const retainedVariant = (await services.catalog.products(signal(), retain)).find(row => row.id === "PROD-RUN-001");
  expect(retainedVariant?.skus).toContainEqual(expect.objectContaining({ sku: "CAM-RUN-BLA-M", active: false }));
  expect((await services.catalog.products(signal())).flatMap(row => row.skus).some(row => row.sku === "CAM-RUN-BLA-M")).toBe(false);
  await catalog.deactivate("PROD-RUN-001");
  const retainedProduct = (await services.catalog.products(signal(), retain)).find(row => row.id === "PROD-RUN-001");
  expect(retainedProduct).toMatchObject({ name: "Camiseta Running Endurance", active: false });
  expect(retainedProduct?.skus.every(row => !row.active)).toBe(true);
  expect((await services.catalog.products(signal())).some(row => row.id === "PROD-RUN-001")).toBe(false);
  expect((await services.catalog.products(signal(), { productIds: ["PROD-RUN-001"], skus: [] })).some(row => row.id === "PROD-RUN-001")).toBe(true);
});

test("MK-005/MK-006: nombre y vigencia del cupón se consultan desde la promoción vigente", async () => {
  const { services } = setup();
  const before = (await services.coupons.read("bienvenida15", signal()))!;
  expect(before).not.toBeNull();
  const promotion = (await services.campaigns.read(before.promotionId, signal()))!;
  await services.campaigns.save(promotion.id, {
    ...promotion.configuration,
    name: "Bienvenida actualizada",
    validUntil: "2026-12-01T00:00",
  }, signal());
  const expected = { name: "Bienvenida actualizada", validUntil: "2026-12-01T00:00:00-05:00" };
  expect((await services.coupons.read(before.id, signal()))?.promotion).toMatchObject(expected);
  const list = await services.coupons.list({ status: "all", page: 1, pageSize: 100 }, signal());
  expect(list.items.find(row => row.id === before.id)?.promotion).toMatchObject(expected);
  expect((await services.coupons.read(before.id, signal()))?.consumedUses).toBe(before.consumedUses);
});

test("CUE-03: provider pagination is fully consumed without rewriting opaque IDs or SKU", async () => {
  const provider = new MockCatalogRepository();
  const originalList = provider.list.bind(provider);
  const originalVariants = provider.listVariants.bind(provider);
  const catalog = provider;
  catalog.list = (query, scenario, abort) => originalList({ ...query, pageSize: 1 }, scenario, abort);
  catalog.listVariants = (id, query, scenario, abort) => originalVariants(id, { ...query, pageSize: 1 }, scenario, abort);
  const adapter = createCatalogPromotionRepository({ catalog, taxonomy: mockTaxonomyRepository });
  const rows = await adapter.products(signal());
  expect(rows.map(row => row.id)).toEqual(["PROD-RUN-001", "PROD-CAS-001"]);
  expect(rows[0]!.skus.map(row => row.sku)).toEqual(["CAM-RUN-BLA-M", "CAM-RUN-AZU-L"]);
});

test("CUE-03: errors and aborted reads propagate without isolated fixture fallback", async () => {
  const catalog = new MockCatalogRepository();
  catalog.list = async () => { throw new Error("Catálogo no disponible"); };
  const adapter = createCatalogPromotionRepository({ catalog, taxonomy: mockTaxonomyRepository });
  await expect(adapter.products(signal())).rejects.toThrow("Catálogo no disponible");
  const controller = new AbortController();
  controller.abort();
  await expect(adapter.products(controller.signal)).rejects.toThrow();
  await expect(adapter.categories(controller.signal)).rejects.toThrow();
});

test("CUE-04: altas en borrador no son elegibles; un SKU nuevo aparece tras activación confirmada", async () => {
  const { catalog, services } = setup();
  const product = await catalog.create({
    nombre: "Nuevo producto", descripcion: "Alta de prueba", categoriaId: "CAT-ROPA",
    tipoProductoId: "TIP-CAMISETA", marcaId: "BRD-INKA", skuBase: "ALTA-CUEVA",
    tieneVariantes: false, precioBaseInicial: 20,
  });
  expect(product.status).toBe("BORRADOR");
  expect((await services.catalog.products(signal())).some(row => row.id === product.id)).toBe(false);
  const variant = await catalog.createVariant("PROD-RUN-001", {
    sku: "CUEVA-NUEVA-VARIANTE",
    identifyingAttributes: [{ caracteristicaId: "CAR-COLOR", nombre: "Color principal", tipo: "LISTA", valor: "Rojo Carmesí", valorId: "COL-ROJ" }],
    nonIdentifyingAttributes: [{ caracteristicaId: "CAR-MAT", nombre: "Material principal", tipo: "TEXTO", valor: "Algodón" }],
    imageUrl: "https://example.com/image.jpg", physicalProfile: { pesoKg: 1, largoCm: 2, anchoCm: 3, altoCm: 4 },
  });
  const skus = async () => (await services.catalog.products(signal())).flatMap(row => row.skus.map(sku => sku.sku));
  expect(await skus()).not.toContain(variant.sku);
  // Explicit confirmed asynchronous result supported by the provider's test API.
  // This is not a stock quantity, a service call or an event integration.
  catalog.receiveVariantInventoryResult(variant.productId, variant.variantId, "COMPLETED");
  await catalog.activateVariant(variant.productId, variant.variantId);
  expect(await skus()).toContain(variant.sku);
});
