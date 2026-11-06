import { expect, test, type Page } from "@playwright/test";
import { getCatalogServices } from "../src/features/catalog/services/catalogServices";
import { createSharedMockTaxonomyRepository } from "../src/features/catalog/adapters/sharedMockTaxonomyRepository";
import { getTaxonomyServices } from "../src/features/taxonomy/services/taxonomyServices";

async function receive(page: Page, transferCode: string, quantity: number) {
  const navigation = page.getByRole("navigation", { name: "Navegación de la aplicación" });
  await navigation.getByRole("link", { name: "Traslados de stock", exact: true }).click();
  const row = page.getByRole("row", { name: new RegExp(transferCode) });
  await row.getByRole("button", { name: `Recepcionar traslado ${transferCode}` }).click();

  const dialog = page.getByRole("dialog", { name: /Registrar recepción/ });
  await dialog.getByRole("textbox", { name: "Cantidad recibida físicamente" }).fill(String(quantity));
  await dialog.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(page.getByText(new RegExp(`Recepción registrada para traslado ${transferCode}`))).toBeVisible();
  await navigation.getByRole("link", { name: "Control de stock", exact: true }).click();
}

test("Catalog → Pricing → Inventory → Combos comparte identidad, precio y stock en la sesión", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/categorias/nueva");
  const documentStarted = await page.evaluate(() => performance.timeOrigin);
  const navigation = page.getByRole("navigation", { name: "Navegación de la aplicación" });
  await page.getByLabel("Nombre", { exact: false }).fill("Categoría integrada Demo");
  await page.getByRole("button", { name: "Crear categoría", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Crear categoría", exact: true }).click();
  await expect(page.getByText("Categoría creada", { exact: true })).toBeVisible();

  await navigation.getByRole("link", { name: "Marcas", exact: true }).click();
  await page.getByRole("button", { name: "Nueva marca", exact: true }).click();
  await page.getByLabel("Nombre", { exact: false }).fill("Marca integrada Demo");
  await page.getByRole("button", { name: "Crear marca", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Marca integrada Demo", exact: true })).toBeVisible();

  await navigation.getByRole("link", { name: "Gestión de productos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestión de productos" })).toBeVisible();
  await page.getByRole("link", { name: "Ver detalle de Camiseta Running Endurance" }).click();
  await expect(page.getByRole("heading", { name: "Camiseta Running Endurance" })).toBeVisible();
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nombre del producto").fill("Camiseta Running Integrada");
  await page.getByRole("combobox", { name: "Categoría", exact: false }).click();
  await page.getByRole("option", { name: "Categoría integrada Demo", exact: true }).click();
  await page.getByRole("combobox", { name: "Marca", exact: false }).click();
  await page.getByRole("option", { name: "Marca integrada Demo", exact: true }).click();
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Camiseta Running Integrada", exact: true })).toBeVisible();
  await expect(page.getByText("Categoría integrada Demo", { exact: true })).toBeVisible();
  await expect(page.getByText("Marca integrada Demo", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Gestionar variantes" }).click();
  await expect(page.getByRole("link", { name: "CAM-RUN-BLA-M", exact: true })).toBeVisible();

  await navigation.getByRole("link", { name: "Control de stock", exact: true }).click();
  const initialStock = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
  await expect(initialStock).toContainText("Camiseta Running Integrada");
  await expect(initialStock).toContainText("Categoría integrada Demo");
  await expect(initialStock).toContainText("Marca integrada Demo");
  await expect(initialStock).toContainText("8");
  await navigation.getByRole("link", { name: "Gestión de combos", exact: true }).click();
  await page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" }).getByRole("link", { name: "Ver detalle" }).click();
  await expect(page.getByText("4 combos estimados")).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" })).toContainText("Camiseta Running Integrada");
  await expect(page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" })).toContainText("S/ 139.90");

  await navigation.getByRole("link", { name: "Consultar precios", exact: true }).click();
  await page.getByRole("combobox", { name: "Producto o SKU" }).click();
  await expect(page.getByRole("option", { name: /Camiseta Running Integrada/ })).toBeVisible();
  await page.getByRole("option", { name: "Color principal: Blanco · Talla: M — CAM-RUN-BLA-M", exact: true }).click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(page.getByText("SKU: CAM-RUN-BLA-M")).toBeVisible();
  await expect(page.getByText("S/ 139.90").first()).toBeVisible();

  // Confirm a real price edit in Pricing; Combos must read this same repository.
  await page.getByRole("link", { name: "Editar precio", exact: true }).click();
  await page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }).fill("149.90");
  await page.getByRole("textbox", { name: "Motivo del cambio", exact: true }).fill("Ajuste demo transversal");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar cambio de precio", exact: true }).click();
  await expect(page.getByText("Precio actualizado", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Consultar el precio vigente", exact: true }).click();
  await expect(page.getByText("S/ 149.90").first()).toBeVisible();
  await navigation.getByRole("link", { name: "Historial de precios", exact: true }).click();
  await page.getByRole("textbox", { name: "SKU", exact: true }).fill("CAM-RUN-BLA-M");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" })).toContainText("149,90");
  await navigation.getByRole("link", { name: "Control de stock", exact: true }).click();
  let stockRow = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
  await expect(stockRow).toContainText("Camiseta Running Integrada");
  await expect(stockRow).toContainText("Categoría integrada Demo");
  await expect(stockRow).toContainText("Marca integrada Demo");
  await expect(stockRow).toContainText("8");

  await navigation.getByRole("link", { name: "Gestión de combos", exact: true }).click();
  let comboRow = page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" });
  await expect(comboRow).toContainText("4 combos estimados");
  await comboRow.getByRole("link", { name: "Ver detalle" }).click();
  await expect(page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" })).toContainText("S/ 149.90");
  await expect(page.getByText("4 combos estimados")).toBeVisible();

  // CAM stock changes through Inventory's existing receipt operation.
  await navigation.getByRole("link", { name: "Control de stock", exact: true }).click();
  await receive(page, "TR-2026-101", 5);
  stockRow = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
  await expect(stockRow).toContainText("13");

  // Raise the other component above CAM so the combo estimate proves the
  // current Inventory repository is reread after an in-session stock change.
  await receive(page, "TR-2026-100", 5);
  const casacaRow = page.getByRole("row").filter({ hasText: "CAS-COR-001" });
  await expect(casacaRow).toContainText("9");
  await navigation.getByRole("link", { name: "Gestión de combos", exact: true }).click();
  comboRow = page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" });
  await expect(comboRow).toContainText("9 combos estimados");
  await comboRow.getByRole("link", { name: "Ver detalle" }).click();
  await expect(page.getByText("9 combos estimados")).toBeVisible();

  await navigation.getByRole("link", { name: "Ofertas y promociones", exact: true }).click();
  await page.getByRole("link", { name: "Crear promoción", exact: true }).click();
  await page.getByLabel("Nombre de la promoción", { exact: true }).fill("Promo SKU Running demo");
  await page.getByRole("combobox", { name: "Modalidad comercial", exact: true }).click();
  await page.getByRole("option", { name: "Con cupón", exact: true }).click();
  await page.getByRole("combobox", { name: "Estado inicial", exact: true }).click();
  await page.getByRole("option", { name: "Inactivo", exact: true }).click();
  await page.getByLabel("Prioridad", { exact: true }).fill("2");
  await page.getByRole("combobox", { name: "Tipo de beneficio", exact: true }).click();
  await page.getByRole("option", { name: "Porcentaje", exact: true }).click();
  await page.getByLabel("Valor del beneficio", { exact: true }).fill("15");
  await page.getByLabel("Fecha y hora de inicio", { exact: true }).fill("2026-10-18T00:00");
  await page.getByLabel("Fecha y hora de fin", { exact: true }).fill("2026-11-10T00:00");
  await page.getByRole("checkbox", { name: "Marketplace", exact: true }).check();
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  const runningSku = page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-BLA-M/ });
  await expect(runningSku).toBeVisible();
  await runningSku.check();
  await page.getByRole("button", { name: "Confirmar alcance", exact: true }).click();
  await page.getByRole("button", { name: "Crear promoción", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Promo SKU Running demo", exact: true })).toBeVisible();
  const savedScope = page.getByRole("region", { name: "Alcance de productos y SKU" });
  await expect(savedScope).toContainText("Camiseta Running Integrada");
  await expect(savedScope).toContainText("CAM-RUN-BLA-M");

  await navigation.getByRole("link", { name: "Gestión de productos", exact: true }).click();
  await page.getByRole("link", { name: "Ver detalle de Camiseta Running Integrada", exact: true }).click();
  await page.getByRole("button", { name: "Desactivar", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar Producto", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reactivar producto", exact: true })).toBeVisible();
  await navigation.getByRole("link", { name: "Ofertas y promociones", exact: true }).click();
  await page.getByRole("link", { name: "Ver detalle de Promo SKU Running demo", exact: true }).click();
  await expect(page.getByRole("region", { name: "Alcance de productos y SKU" })).toContainText("Camiseta Running Integrada");
  await expect(page.getByRole("region", { name: "Alcance de productos y SKU" })).toContainText("CAM-RUN-BLA-M");
  await navigation.getByRole("link", { name: "Ofertas y promociones", exact: true }).click();
  await page.getByRole("link", { name: "Crear promoción", exact: true }).click();
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /CAM-RUN-BLA-M/ })).toHaveCount(0);
  await navigation.getByRole("link", { name: "Gestión de combos", exact: true }).click();
  comboRow = page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" });
  await comboRow.getByRole("link", { name: "Ver detalle" }).click();
  await expect(page.getByText("Componente inactivo", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStarted);
});

test("Taxonomy comparte los IDs históricos y valida nuevos IDs al guardar Catalog", async () => {
  const official = getTaxonomyServices("mock");
  const taxonomy = createSharedMockTaxonomyRepository();
  const catalog = getCatalogServices("mock").catalog;
  const category = await official.category.crear({ nombre: "Categoría ID Demo", slug: "categoria-id-demo" });
  const brand = await official.brand.crear({ nombre: "Marca ID Demo", descripcion: null, paisOrigenIso: null });
  const created = await catalog.create({
    nombre: "Producto con maestros actuales", descripcion: "IDs de Taxonomy sin remapeo",
    categoriaId: category.id, marcaId: brand.marcaId, tipoProductoId: "TIP-CAMISETA",
    skuBase: "TAXONOMY-ID-DEMO", tieneVariantes: false, precioBaseInicial: 20,
  });
  await official.category.actualizar({ id: category.id, nombre: "Categoría ID renombrada", slug: "categoria-id-demo", orden: 1 });
  await official.brand.actualizar({ marcaId: brand.marcaId, nombre: "Marca ID renombrada", descripcion: null, paisOrigenIso: null });
  const detail = await catalog.getById(created.id);
  expect(detail).toMatchObject({ categoryId: category.id, categoryName: "Categoría ID renombrada", brandId: brand.marcaId, brandName: "Marca ID renombrada" });
  expect((await taxonomy.getCategories()).some(row => row.id === "CAT-ROPA")).toBe(true);
});
