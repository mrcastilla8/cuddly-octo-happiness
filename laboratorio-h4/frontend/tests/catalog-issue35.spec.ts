import { expect, test } from "@playwright/test";
import { MockCatalogRepository } from "../src/features/catalog/adapters/mockCatalogRepository";
import { mockCatalogRepository } from "../src/features/catalog/adapters/mockCatalogRepository";
import { createMockPricingRepository } from "../src/features/pricing/adapters/mockPricingRepository";
import { createMockPromotionCatalogRepository } from "../src/features/promotions/adapters/mockPromotionCatalogRepository";
import { getTaxonomyServices } from "../src/features/taxonomy/services/taxonomyServices";
import { createSharedMockTaxonomyRepository } from "../src/features/catalog/adapters/sharedMockTaxonomyRepository";
import { createCatalogServices } from "../src/features/catalog/services/catalogServices";
import { MockTaxonomyRepository } from "../src/features/catalog/adapters/mockTaxonomyRepository";
import type { AttributeSchema, TaxonomyRepository } from "../src/features/catalog/services/taxonomyRepository";

test("POM-04: explicit mock Taxonomy injection also governs Catalog writes", async () => {
  const taxonomy: TaxonomyRepository = {
    getCategories: async () => [{ id: "provider-category", nombre: "Categoría del provider", activo: true }],
    getBrands: async () => [{ id: "provider-brand", nombre: "Marca del provider", activo: true }],
    getProductTypes: async () => [{ id: "provider-type", nombre: "Tipo del provider", activo: true }],
    getAttributeSchema: async () => [],
  };
  const services = createCatalogServices("mock", { taxonomy });
  const created = await services.catalog.create({ nombre: "Inyectado", descripcion: "Puerto único", categoriaId: "provider-category", marcaId: "provider-brand", tipoProductoId: "provider-type", skuBase: "INJECTED-35", tieneVariantes: false, precioBaseInicial: 20 });
  expect(created).toMatchObject({ categoryName: "Categoría del provider", brandName: "Marca del provider", typeName: "Tipo del provider" });
  expect((await mockCatalogRepository.list({ page: 1, pageSize: 100 })).items.some(row => row.id === created.id)).toBe(false);
});

test("POM-02: asynchronous activation cannot overwrite a concurrent state change", async () => {
  let confirmSchema: (schema: AttributeSchema[]) => void = () => {};
  const pending = new Promise<AttributeSchema[]>(resolve => { confirmSchema = resolve; });
  const taxonomy = new MockTaxonomyRepository();
  taxonomy.getAttributeSchema = () => pending;
  const catalog = new MockCatalogRepository(taxonomy);
  const activation = catalog.activate("PROD-MOCH-001");
  await catalog.deactivate("PROD-MOCH-001");
  confirmSchema([]);
  await expect(activation).rejects.toMatchObject({ kind: "version_conflict" });
  expect((await catalog.getById("PROD-MOCH-001"))?.status).toBe("INACTIVO");
});

test("POM-01: create and rename masters preserve their IDs and refresh Catalog names", async () => {
  const official = getTaxonomyServices("mock");
  const taxonomy = createSharedMockTaxonomyRepository();
  const catalog = new MockCatalogRepository(taxonomy);
  const category = await official.category.crear({ nombre: "Categoría transversal", slug: "categoria-transversal" });
  const brand = await official.brand.crear({ nombre: "Marca transversal", descripcion: null, paisOrigenIso: null });
  const created = await catalog.create({ nombre: "Producto compartido", descripcion: "Identidades sin migración", categoriaId: category.id, marcaId: brand.marcaId, tipoProductoId: "TIP-CAMISETA", skuBase: "SHARED-001", tieneVariantes: true, precioBaseInicial: 20 });
  await official.category.actualizar({ id: category.id, nombre: "Categoría renombrada", slug: category.slug, orden: 1 });
  await official.brand.actualizar({ marcaId: brand.marcaId, nombre: "Marca renombrada", descripcion: null, paisOrigenIso: null });
  const detail = await catalog.getById(created.id);
  expect(detail).toMatchObject({ id: created.id, categoryId: category.id, categoryName: "Categoría renombrada", brandId: brand.marcaId, brandName: "Marca renombrada", status: "BORRADOR", skuBase: "SHARED-001" });
  expect((await catalog.list({ page: 1, pageSize: 100 })).items.find(row => row.id === created.id)).toMatchObject({ categoryName: "Categoría renombrada", brandName: "Marca renombrada" });
  expect((await catalog.getById("PROD-RUN-001"))?.variants).toEqual(expect.arrayContaining([expect.objectContaining({ variantId: "VAR-RUN-BLA-M", sku: "CAM-RUN-BLA-M", status: "ACTIVA" })]));
});

test("POM-01/POM-04: official roles stay unknown and unknown IDs do not become empty schemas", async () => {
  const taxonomy = createSharedMockTaxonomyRepository();
  expect((await taxonomy.getAttributeSchema("ropa")).every(attribute => attribute.esIdentificadora === undefined)).toBe(true);
  await expect(taxonomy.getAttributeSchema("unknown-type")).rejects.toThrow("mapeo confirmado");
});

test("POM-01/POM-04: real category creation flows into product selector and persisted names", async ({ page }) => {
  await page.goto("/categorias/nueva");
  await page.getByLabel("Nombre", { exact: false }).fill("Categoría integrada Poma");
  await page.getByRole("button", { name: "Crear categoría", exact: true }).click();
  await expect(page.getByRole("dialog").getByLabel("Slug (URL)")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Crear categoría", exact: true }).click();
  await expect(page.getByText("Categoría creada", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Gestión de productos", exact: true }).click();
  await page.getByRole("link", { name: "Crear producto", exact: true }).click();
  await page.getByRole("combobox", { name: "Categoría", exact: false }).click();
  await page.getByRole("option", { name: "Categoría integrada Poma", exact: true }).click();
  await page.getByLabel("Nombre del producto").fill("Producto con categoría integrada");
  await page.getByLabel("Descripción comercial").fill("Borrador con la categoría creada en la misma sesión");
  await page.getByLabel("SKU Base").fill("SHARED-UI-001");
  await page.getByLabel("Precio base inicial (S/.)").fill("25");
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(page).toHaveURL(/\/productos\/PROD-[^/]+\/preparacion$/);
  await page.getByRole("link", { name: "Ver detalle", exact: true }).click();
  await expect(page.getByText("Categoría integrada Poma", { exact: true })).toBeVisible();
  const productId = page.url().split("/productos/")[1];
  await page.getByRole("link", { name: "Consultar precios", exact: true }).click();
  await page.getByRole("combobox", { name: "Producto o SKU", exact: true }).fill("SHARED-UI-001");
  await expect(page.getByRole("option", { name: /Producto con categoría integrada.*SHARED-UI-001/ })).toBeVisible();
  await page.getByRole("option", { name: /Producto con categoría integrada.*SHARED-UI-001/ }).click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`target=${productId}`));
  await page.screenshot({ path: test.info().outputPath("shared-catalog-pricing-1440.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("POM-02: product SKU cannot reuse an existing variant SKU", async () => {
  const catalog = new MockCatalogRepository();
  await expect(catalog.create({ nombre: "Duplicado", descripcion: "Prueba de identidad", categoriaId: "CAT-ROPA", tipoProductoId: "TIP-CAMISETA", marcaId: "BRD-INKA", skuBase: "cam-run-bla-m", tieneVariantes: false, precioBaseInicial: 20 })).rejects.toMatchObject({ kind: "duplicate_sku" });
});

test("POM-02: variant SKU cannot reuse a simple product sellable SKU", async () => {
  const catalog = new MockCatalogRepository();
  await expect(catalog.createVariant("PROD-RUN-001", { sku: "moch-ent-001", identifyingAttributes: [{ caracteristicaId: "CAR-COLOR", nombre: "Color", tipo: "LISTA", valorId: "COL-ROJ", valor: "Rojo Carmesí" }] })).rejects.toMatchObject({ kind: "duplicate_sku" });
});

test("POM-01/POM-04: a brand created in the real app is selectable in Catalog", async ({ page }) => {
  await page.goto("/marcas/nueva");
  await page.getByLabel("Nombre", { exact: false }).fill("Marca transversal Poma");
  await page.getByRole("button", { name: "Crear marca", exact: true }).click();
  await expect(page).toHaveURL(/\/marcas\/marca-transversal-poma$/);
  await page.getByRole("link", { name: "Gestión de productos", exact: true }).click();
  await page.getByRole("link", { name: "Crear producto", exact: true }).click();
  await page.getByRole("combobox", { name: "Marca", exact: false }).click();
  await expect(page.getByRole("option", { name: "Marca transversal Poma", exact: true })).toBeVisible();
});

test("POM-03: Pricing reads the current Catalog identity and name without fabricating a price", async () => {
  mockCatalogRepository.reset();
  const signal = new AbortController().signal;
  const prices = createMockPricingRepository({ now: () => "2026-10-17T12:00:00Z" }, undefined, { catalogTargets: true });
  const product = (await mockCatalogRepository.getById("PROD-MOCH-001"))!;
  await mockCatalogRepository.update(product.id, { nombre: "Mochila transversal", descripcion: product.description, categoriaId: product.categoryId, marcaId: product.brandId, catalogVersion: product.catalogVersion });
  await mockCatalogRepository.deactivate(product.id);
  const target = (await prices.listTargets(signal)).find(row => row.productId === product.id);
  expect(target).toMatchObject({ id: product.id, referenceSku: product.skuBase });
  expect(target?.label).toContain("Mochila transversal");
  expect((await mockCatalogRepository.getById(product.id))?.status).toBe("INACTIVO");
  expect(await prices.read({ targetId: target!.id, channel: "global" }, signal)).toBeNull();
});

test("POM-03: Promotions preserves Catalog IDs/SKU and excludes inactive parent", async () => {
  mockCatalogRepository.reset();
  const signal = new AbortController().signal;
  const consumer = createMockPromotionCatalogRepository();
  const before = (await consumer.products(signal)).find(row => row.id === "PROD-RUN-001");
  expect(before?.skus).toEqual(expect.arrayContaining([expect.objectContaining({ sku: "CAM-RUN-BLA-M", active: true })]));
  await mockCatalogRepository.deactivate("PROD-RUN-001");
  expect((await consumer.products(signal)).some(row => row.id === "PROD-RUN-001")).toBe(false);
});

test("POM-03: real Promotions selector follows Catalog parent deactivation", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/promociones/nueva/alcance");
  await expect(page.getByRole("checkbox", { name: "Producto completo: Camiseta Running Endurance", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-BLA-M/ })).toBeVisible();
  await page.getByRole("link", { name: "Gestión de productos", exact: true }).click();
  await page.getByRole("row").filter({ hasText: "Camiseta Running Endurance" }).getByRole("link", { name: "Ver detalle de Camiseta Running Endurance", exact: true }).click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar Producto", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reactivar producto", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ofertas y promociones", exact: true }).click();
  await page.getByRole("link", { name: "Crear promoción", exact: true }).click();
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  await expect(page.getByText("Consultando catálogo…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Producto completo: Casaca Cortaviento Trail", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Camiseta Running Endurance|CAM-RUN-BLA-M/ })).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath("shared-catalog-promotions-1440.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
