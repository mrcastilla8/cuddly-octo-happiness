import { expect, test } from "@playwright/test";

test("LISTA edit survives provider renaming and sends stable ID with current label", async ({ page }) => {
  await page.goto("/tests/harness/catalog-adapter.html?lista-edit=1&path=/productos/external-product/editar");
  const selection = page.getByRole("combobox", { name: "Opción externa *", exact: true });
  await expect(selection).toHaveValue("Etiqueta vigente");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.productPayload?.atributos?.[0])).toMatchObject({
    valorId: "external-value", valor: "Etiqueta vigente",
  });
  // Reopen the same stored product after Taxonomy changes only the display label.
  await page.addInitScript(() => { window.renamedListOption = true; });
  await page.goto("/tests/harness/catalog-adapter.html?lista-edit=1&path=/productos/external-product/editar");
  await expect(selection).toHaveValue("Etiqueta renombrada");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath("lista-renombrada-1440.png"), fullPage: true });
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.productPayload?.atributos?.[0])).toMatchObject({
    valorId: "external-value", valor: "Etiqueta renombrada",
  });
});

test("LISTA create sends option ID separately from its display label", async ({ page }) => {
  await page.goto("/tests/harness/catalog-adapter.html?path=/productos/nuevo");
  await page.getByLabel("Nombre del producto").fill("Producto LISTA");
  await page.getByLabel("Descripción comercial").fill("Regresión de opción estable");
  await page.getByLabel("SKU Base").fill("LISTA-CREATE");
  await page.getByLabel("Precio base inicial (S/.)").fill("20");
  await page.getByRole("combobox", { name: "Opción externa *", exact: true }).click();
  await page.getByRole("option", { name: "Etiqueta vigente", exact: true }).click();
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.createdProductPayload?.atributos?.[0])).toMatchObject({
    caracteristicaId: "external-list", valorId: "external-value", valor: "Etiqueta vigente",
  });
});

test("LISTA with only a historical label requires explicit ID confirmation", async ({ page }) => {
  await page.goto("/tests/harness/catalog-adapter.html?lista-edit=1&lista-missing-id=1&path=/productos/external-product/editar");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByText("Selecciona una opción vigente de Taxonomía para confirmar su identificador.")).toBeVisible();
  expect(await page.evaluate(() => window.productPayload)).toBeUndefined();
  await page.getByRole("combobox", { name: "Opción externa *", exact: true }).click();
  await page.getByRole("option", { name: "Etiqueta vigente", exact: true }).click();
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.productPayload?.atributos?.[0]?.valorId)).toBe("external-value");
});

for (const publication of ["true", "false", "unknown"]) {
  test(`type correction requires known publication preconditions and resolved Q-06: ${publication}`, async ({ page }) => {
    await page.goto(`/tests/harness/catalog-adapter.html?product-edit=1&schema-empty=1&publication=${publication}&path=/productos/external-product/editar`);
    await expect(page.getByRole("combobox", { name: "Tipo de producto", exact: true })).toBeDisabled();
    if (publication === "false") {
      await expect(page.getByText("El tipo de producto no se puede cambiar en este momento.")).toBeVisible();
    } else {
      await expect(page.getByText("Completa los requisitos del producto antes de cambiar el tipo.")).toBeVisible();
    }
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.productPayload)).toBeTruthy();
    expect(await page.evaluate(() => window.productPayload)).not.toHaveProperty("tipoProductoId");
  });
}
