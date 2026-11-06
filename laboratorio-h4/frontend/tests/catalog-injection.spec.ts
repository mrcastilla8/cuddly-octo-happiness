import { expect, test } from "@playwright/test";

test("same pages consume alternate adapters in API mode, preserve IDs and accept negative numbers", async ({ page }) => {
  await page.goto("/tests/harness/catalog-adapter.html");
  await expect(page.getByText("Producto del adapter alternativo").last()).toBeVisible();
  await page.getByRole("textbox", { name: "SKU de la Variante" }).fill("000-external-SKU");
  await page.getByRole("combobox", { name: "Opción externa", exact: true }).click();
  await page.getByRole("option", { name: "Etiqueta vigente" }).click();
  await page.getByRole("textbox", { name: "Temperatura", exact: true }).fill("-5");
  await page.getByRole("textbox", { name: "Descripción técnica", exact: true }).fill("Texto válido");
  await page.getByRole("textbox", { name: "URL de Imagen de la Variante" }).fill("https://example.com/image.jpg");
  await expect(page.getByText(/Precio inicial registrado del padre: No disponible/)).toBeVisible();
  await page.getByRole("button", { name: "Guardar Variante" }).first().click();
  await expect(page.getByText("Respuesta del adapter alternativo")).toBeVisible();
  const payload = await page.evaluate(() => window.catalogPayload);
  expect(payload?.identifyingAttributes?.[0]).toMatchObject({ caracteristicaId: "external-list", valorId: "external-value", valor: "Etiqueta vigente" });
  expect(payload?.nonIdentifyingAttributes?.[0]?.valor).toBe(-5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("alternate-1440.png"), fullPage: true });
});

test("schema errors block saving and API filters come from the alternate repository", async ({ page }) => {
  await page.goto("/tests/harness/catalog-adapter.html?schema-error=1");
  await expect(page.getByText(/Esquema no disponible/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar Variante" }).first()).toBeDisabled();
  expect(await page.evaluate(() => window.catalogPayload)).toBeUndefined();
  await page.goto("/tests/harness/catalog-adapter.html?path=/productos");
  await page.getByRole("combobox", { name: "Categoría", exact: true }).click();
  await expect(page.getByRole("option", { name: "Categoría externa" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Ropa", exact: true })).toHaveCount(0);
});
