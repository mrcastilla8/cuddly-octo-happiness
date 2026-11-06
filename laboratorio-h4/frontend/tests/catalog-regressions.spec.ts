import { expect, test } from "@playwright/test";
import { MockCatalogRepository } from "../src/features/catalog/adapters/mockCatalogRepository";
import { createTaxonomyServicesAdapter } from "../src/features/catalog/adapters/taxonomyServicesAdapter";
import { createTaxonomyServices } from "../src/features/taxonomy/services/taxonomyServices";
import { createCatalogServices } from "../src/features/catalog/services/catalogServices";

test("failed physical validation leaves every product field and version unchanged", async () => {
  const repository = new MockCatalogRepository();
  const before = await repository.create({ nombre: "Original", descripcion: "Original", categoriaId: "CAT-ROPA", tipoProductoId: "TIP-CAMISETA", marcaId: "BRD-INKA", skuBase: "ATOMIC", tieneVariantes: false, precioBaseInicial: 20, atributos: [] });
  await expect(repository.update(before.id, { nombre: "Changed", descripcion: "Changed", categoriaId: "different", marcaId: "different", tipoProductoId: "different", atributos: [], imagenes: [{ url: "https://example.com/changed.png", principal: true }], perfilFisico: { pesoKg: -1 }, catalogVersion: before.catalogVersion })).rejects.toThrow();
  expect(await repository.getById(before.id)).toEqual(before);
  const after = await repository.update(before.id, { nombre: "Saved", descripcion: "Saved", categoriaId: before.categoryId, marcaId: before.brandId, catalogVersion: before.catalogVersion, perfilFisico: { pesoKg: 1 } });
  expect(after.name).toBe("Saved");
  expect(after.catalogVersion).toBe(before.catalogVersion + 1);
});

test("consecutive product and variant creates remain unique with a frozen clock", async () => {
  const repository = new MockCatalogRepository();
  const original = Date.now;
  Date.now = () => 123450000;
  try {
    const products = await Promise.all(Array.from({ length: 100 }, (_, index) => repository.create({ nombre: `Product ${index}`, descripcion: "Test", categoriaId: "CAT-ROPA", tipoProductoId: "TIP-CAMISETA", marcaId: "BRD-INKA", skuBase: `UNIQUE-${index}`, tieneVariantes: true, precioBaseInicial: 20, atributos: [] })));
    expect(new Set(products.map(product => product.id)).size).toBe(100);
    const variants = await Promise.all(products.map((product, index) => repository.createVariant(product.id, { sku: `SKU-${index}`, identifyingAttributes: [{ caracteristicaId: "CAR-COLOR", nombre: "Color", tipo: "LISTA", valor: "Azul", valorId: "COL-AZU" }] })));
    expect(new Set(variants.map(variant => variant.variantId)).size).toBe(100);
    for (const variant of variants) expect((await repository.getVariantById(variant.productId, variant.variantId))?.sku).toBe(variant.sku);
  } finally { Date.now = original; }
});

test("official Taxonomy adapter preserves provider IDs, limits and missing roles", async () => {
  const official = createTaxonomyServices("mock");
  const adapter = createTaxonomyServicesAdapter(official);
  expect(createCatalogServices("mock", { taxonomy: adapter }).taxonomy).toBe(adapter);
  const types = await adapter.getProductTypes();
  expect(types.map(type => type.id)).toEqual((await official.productType.list()).items.map(type => type.tipoProductoId));
  const schema = await adapter.getAttributeSchema("ropa");
  expect(schema.length).toBeGreaterThan(0);
  expect(schema.every(attribute => attribute.esIdentificadora === undefined)).toBe(true);
  const text = (await adapter.getAttributeSchema("calzado")).find(attribute => attribute.tipo === "TEXTO");
  expect(text?.maxLength).toBe((await official.characteristic.list()).config.maxTexto);
  const list = schema.find(attribute => attribute.tipo === "LISTA");
  expect(list?.opciones).toEqual((await official.characteristic.listarValores(list!.caracteristicaId))?.filter(value => value.estado === "Activo").map(value => ({ id: value.valorId, valor: value.nombre })));
  await expect(adapter.getAttributeSchema("TIP-CAMISETA")).rejects.toThrow("mapeo confirmado");
});

test("product edit blocks loading and schema errors, including programmatic submits", async ({ page }) => {
  for (const scenario of ["schema-error", "schema-delayed"]) {
    await page.goto(`/tests/harness/catalog-adapter.html?product-edit=1&${scenario}=1&path=/productos/external-product/editar`);
    const save = page.getByRole("button", { name: "Guardar cambios", exact: true });
    await expect(save).toBeDisabled();
    await expect(page.getByText("Este tipo de producto no tiene características asociadas en Taxonomía.")).toHaveCount(0);
    await page.locator("form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(await page.evaluate(() => window.productPayload)).toBeUndefined();
    if (scenario === "schema-delayed") {
      await page.evaluate(() => { window.schemaReady = true; });
      await expect(save).toBeEnabled();
    } else await expect(page.getByRole("button", { name: "Reintentar esquema" })).toBeVisible();
  }
});

test("confirmed empty schema permits edit and preserves historical attributes", async ({ page }) => {
  await page.goto("/tests/harness/catalog-adapter.html?product-edit=1&schema-empty=1&path=/productos/external-product/editar");
  const save = page.getByRole("button", { name: "Guardar cambios", exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect.poll(() => page.evaluate(() => window.productPayload)).toBeTruthy();
  expect((await page.evaluate(() => window.productPayload))?.atributos).toEqual([{ caracteristicaId: "historic", nombre: "Dato histórico", tipo: "TEXTO", valor: "Conservar" }]);
});

test("client navigation resets variant fields, hides previous parent during load and handles errors", async ({ page }) => {
  await page.goto("/tests/harness/catalog-adapter.html?navigation=1");
  await expect(page.getByRole("textbox", { name: "SKU de la Variante" })).toBeVisible();
  await page.getByRole("textbox", { name: "SKU de la Variante" }).fill("PREVIOUS-SKU");
  await page.getByRole("textbox", { name: "Descripción técnica", exact: true }).fill("Previous attributes");
  await page.getByRole("link", { name: "Cambiar producto", exact: true }).click();
  await expect(page.getByText("Cargando producto padre...")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "SKU de la Variante" })).toHaveCount(0);
  await expect(page.getByText("Producto del adapter alternativo")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "SKU de la Variante" })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Descripción técnica", exact: true })).toHaveValue("");
  await page.getByRole("link", { name: "Producto con error", exact: true }).click();
  await expect(page.getByText("Segundo producto no disponible")).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar Variante" })).toHaveCount(0);
});
