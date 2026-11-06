import { expect, test } from "@playwright/test";

test("CUE-01/CUE-04: editar en Catálogo actualiza el alcance de Promociones en la misma sesión", async ({ page }) => {
  await page.goto("/productos/PROD-RUN-001/editar");
  await page.getByLabel("Nombre del producto").fill("Running actualizado desde Catálogo");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Running actualizado desde Catálogo", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Ofertas y promociones", exact: true }).click();
  await page.getByRole("link", { name: "Crear promoción", exact: true }).click();
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Producto completo: Running actualizado desde Catálogo", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-BLA-M/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-NEG-S/ })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("catalog-edited-promotion-scope-1440.png"), fullPage: true });
});

test("CUE-04: SKU y producto desactivados desde Catálogo se excluyen de los selectores", async ({ page }) => {
  await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-BLA-M");
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar Variante", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Ofertas y promociones", exact: true }).click();
  await page.getByRole("link", { name: "Crear promoción", exact: true }).click();
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-AZU-L/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-BLA-M/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Gestión de productos", exact: true }).click();
  await page.getByRole("link", { name: "Ver detalle de Camiseta Running Endurance", exact: true }).click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar Producto", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Venta cruzada y upselling", exact: true }).click();
  await page.getByRole("link", { name: "Crear venta cruzada", exact: true }).click();
  await page.getByRole("link", { name: "Seleccionar productos recomendados", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Casaca Cortaviento Trail", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Camiseta Running Endurance", exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("catalog-deactivated-recommendation-selector-1440.png"), fullPage: true });
});

test("MK-005/MK-006: editar promoción actualiza su nombre y vigencia al consultar el cupón", async ({ page }) => {
  await page.goto("/promociones/bienvenida/editar");
  await page.getByLabel("Nombre de la promoción", { exact: true }).fill("Bienvenida actualizada en sesión");
  await page.getByLabel("Fecha y hora de fin", { exact: true }).fill("2026-12-01T00:00");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bienvenida actualizada en sesión", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Cupones de descuento", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: "BIENVENIDA15" });
  await expect(row).toContainText("Bienvenida actualizada en sesión");
  await row.getByRole("link", { name: "Ver detalle de BIENVENIDA15", exact: true }).click();
  await expect(page.getByRole("region", { name: "Configuración del cupón" })).toContainText("Bienvenida actualizada en sesión");
  await expect(page.getByRole("region", { name: "Configuración del cupón" })).toContainText(/1 dic\.? 2026/);
  await expect(page.getByRole("region", { name: "Uso global y límites" })).toContainText("28");
  await page.screenshot({ path: test.info().outputPath("coupon-current-campaign-1440.png"), fullPage: true });
});
