import { expect, test } from "@playwright/test";
import { mockCatalogRepository as catalog } from "../src/features/catalog/adapters/mockCatalogRepository";
import { MockInventoryAdapter } from "../src/features/inventory/adapters/mockInventoryAdapter";
import { createMockPricingRepository } from "../src/features/pricing/adapters/mockPricingRepository";
import { createMockPromotionCatalogRepository } from "../src/features/promotions/adapters/mockPromotionCatalogRepository";
import { getTaxonomyServices } from "../src/features/taxonomy/services/taxonomyServices";

test.beforeEach(() => catalog.reset());
test.afterEach(() => catalog.reset());

test("Catalog actualiza los metadatos de Inventory y Pricing sin alterar saldos ni precios", async () => {
  const signal = new AbortController().signal;
  const inventory = new MockInventoryAdapter();
  const pricing = createMockPricingRepository({ now: () => "2026-10-17T12:00:00Z" });
  const before = await inventory.getStockDetail("CAM-RUN-BLA-M", "ALM-CEN");
  const beforePrice = await pricing.read({ targetId: "combo-run-base", channel: "global" }, signal);
  const taxonomy = getTaxonomyServices("mock");
  const category = await taxonomy.category.crear({ nombre: "Running integrado", slug: "running-integrado" });
  const brand = await taxonomy.brand.crear({ nombre: "Marca integrada", descripcion: null, paisOrigenIso: null });
  const product = (await catalog.getById("PROD-RUN-001"))!;
  await catalog.update(product.id, {
    nombre: "Camiseta editada", descripcion: product.description,
    categoriaId: category.id, marcaId: brand.marcaId, catalogVersion: product.catalogVersion,
  });

  const metadata = { productName: "Camiseta editada", categoryName: "Running integrado", brandName: "Marca integrada" };
  const current = await inventory.getStockDetail("CAM-RUN-BLA-M", "ALM-CEN");
  expect(current).toEqual({ ...before, ...metadata });
  expect(await inventory.getStockItems({ search: "Camiseta editada" })).toHaveLength(2);
  expect(await inventory.getStockItems({ category: "RUNNING_INTEGRADO", brand: "MARCA_INTEGRADA" })).toHaveLength(2);
  expect(await inventory.getCategories()).toContainEqual(expect.objectContaining({ name: "Running integrado" }));
  expect(await inventory.getBrands()).toContainEqual(expect.objectContaining({ name: "Marca integrada" }));
  expect((await inventory.getTransfers()).find(row => row.sku === "CAM-RUN-BLA-M")?.productName).toBe("Camiseta editada");
  expect((await inventory.getDashboardKpis({ search: "Camiseta editada" })).availableUnits).toBe(8);
  expect(await inventory.getDashboardAlerts({ search: "Camiseta editada" })).toEqual(expect.arrayContaining([
    expect.objectContaining({ sku: "CAM-RUN-BLA-M", title: "Stock bajo: Camiseta editada" }),
  ]));
  expect((await inventory.getLocationDistribution({ search: "Camiseta editada" }))[0]?.availableTotal).toBe(8);
  expect((await inventory.getStockItems()).some(row => row.sku === "CAM-RUN")).toBe(false);

  expect(await pricing.listTargets(signal)).toContainEqual(expect.objectContaining({ id: "combo-run-base", label: "Camiseta editada · CAM-RUN" }));
  const afterPrice = await pricing.read({ targetId: "combo-run-base", channel: "global" }, signal);
  expect(afterPrice?.price).toEqual({ ...beforePrice!.price, name: "Camiseta editada" });

  // Taxonomy renames propagate on read, preserving SKU and stock identity.
  await taxonomy.category.actualizar({ id: category.id, nombre: "Running vigente", slug: "running-integrado", orden: 1 });
  await taxonomy.brand.actualizar({ marcaId: brand.marcaId, nombre: "Marca vigente", descripcion: null, paisOrigenIso: null });
  expect(await inventory.getStockDetail("CAM-RUN-BLA-M", "ALM-CEN")).toEqual({
    ...before, ...metadata, categoryName: "Running vigente", brandName: "Marca vigente",
  });
});

test("Promotions conserva referencias actuales inactivas y las excluye de nuevas selecciones", async () => {
  const signal = new AbortController().signal;
  const promotions = createMockPromotionCatalogRepository();
  const product = (await catalog.getById("PROD-RUN-001"))!;
  await catalog.deactivate(product.id, { catalogVersion: product.catalogVersion });
  expect((await promotions.products(signal)).some(row => row.id === product.id)).toBe(false);
  const historical = await promotions.products(signal, { productIds: [], skus: ["CAM-RUN-BLA-M"] });
  const reference = historical.find(row => row.id === product.id)!;
  expect(reference).toMatchObject({ name: product.name, active: false });
  expect(reference.skus).toContainEqual(expect.objectContaining({ sku: "CAM-RUN-BLA-M", active: false }));
  expect((await promotions.products(signal, { productIds: [product.id], skus: [] })).some(row => row.id === product.id)).toBe(true);
});
