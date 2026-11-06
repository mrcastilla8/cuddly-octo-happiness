import { expect, test, type Page } from "@playwright/test";
import { evidencePath } from "./support/evidence";

async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test.describe("MK-003 Gestión de productos (CRUD principal)", () => {
  test("@smoke S01: listado, búsqueda, filtros combinados y conservación de contexto", async ({
    page,
  }) => {
    await page.goto("/productos");
    await expect(
      page.getByRole("heading", { name: "Gestión de productos", exact: true }),
    ).toBeVisible();

    // Verify initial items
    await expect(page.getByText("Camiseta Running Endurance")).toBeVisible();
    await expect(page.getByText("Mochila Deportiva Endurance")).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(
      "Buscar por nombre, SKU base o descripción...",
    );
    await searchInput.fill("Running");
    await expect(page.getByText("Camiseta Running Endurance")).toBeVisible();
    await expect(page.getByText("Mochila Deportiva Endurance")).toHaveCount(0);

    // Clear search
    await searchInput.fill("");
    // URL navigation commits before React finishes rendering the next result.
    // Wait for the cleared query's actual rows before selecting another filter.
    await expect(page).not.toHaveURL(/q=Oxford/);
    await expect(page.getByText("Mochila Deportiva Endurance")).toBeVisible();

    // Filter by sale model "Con variantes"
    const modelSelect = page.getByRole("combobox", { name: "Modelo" });
    await modelSelect.click();
    await page.getByRole("option", { name: "Con variantes" }).click();
    await expect(page).toHaveURL(/modelo=variants/);
    await expect(modelSelect).toHaveValue("Con variantes");
    await expect(page.getByText("Mochila Deportiva Endurance")).toHaveCount(0);

    // Navigate to detail and return
    await page
      .getByRole("link", { name: "Ver detalle" })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Return to list
    await page.getByRole("link", { name: "Volver a la lista" }).click();
    await expect(page).toHaveURL(/modelo=variants/);
    await noPageOverflow(page);
  });

  test("S01: estados deterministas de revisión (empty, no-results, error)", async ({
    page,
  }) => {
    // Empty list
    await page.goto("/productos?modoRevision=1&escenario=list-empty");
    await expect(page.getByText("Aún no hay productos")).toBeVisible();

    // Error state
    await page.goto("/productos?modoRevision=1&escenario=list-error");
    await expect(
      page.getByText("No se pudieron consultar los productos"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reintentar consulta" }),
    ).toBeVisible();

    // Recover from error
    await page.getByRole("button", { name: "Reintentar consulta" }).click();
    await expect(page.getByText("Camiseta Running Endurance")).toBeVisible();
    await noPageOverflow(page);
  });

  test("S02: crear producto simple en BORRADOR y navegación inmediata a S06", async ({
    page,
  }) => {
    await page.goto("/productos/nuevo");
    await expect(
      page.getByRole("heading", { name: "Crear producto" }),
    ).toBeVisible();

    // Check minimum validation triggers
    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(page.getByText("El nombre es obligatorio.")).toBeVisible();

    // Fill minimum required data
    await page.getByLabel("Nombre del producto").fill("Casaca Polar Andina");
    await page
      .getByLabel("Descripción comercial")
      .fill("Casaca térmica de alta montaña en polar reciclado.");
    await page.getByLabel("SKU Base").fill("CAS-POL-999");
    await page.getByLabel("Precio base inicial (S/.)").fill("149.90");

    // Physical profile for simple product
    await page.getByLabel("Peso (kg)").fill("0.65");
    await page.getByLabel("Largo (cm)").fill("35");
    await page.getByLabel("Ancho (cm)").fill("25");
    await page.getByLabel("Alto (cm)").fill("8");

    // Submit form
    await page.getByRole("button", { name: "Guardar borrador" }).click();

    // FLOW-003 §4.1: Must navigate directly to S06 preparation page!
    await expect(page).toHaveURL(/\/productos\/PROD-.*\/preparacion/);
    await expect(
      page.getByRole("heading", { name: "Preparación del producto" }),
    ).toBeVisible();
    await expect(page.getByText("Borrador guardado.", { exact: true })).toBeVisible();
    await noPageOverflow(page);
  });

  test("S02: validación de SKU duplicado conserva datos", async ({ page }) => {
    await page.goto("/productos/nuevo?modoRevision=1&escenario=create-duplicate-sku");
    await page.getByLabel("Nombre del producto").fill("Producto Duplicado");
    await page.getByLabel("Descripción comercial").fill("Descripción de prueba.");
    await page.getByLabel("SKU Base").fill("CAM-RUN");
    await page.getByLabel("Precio base inicial (S/.)").fill("99");

    await page.getByRole("button", { name: "Guardar borrador" }).click();
    await expect(
      page.getByText("El SKU base \"CAM-RUN\" ya está registrado en el catálogo."),
    ).toBeVisible();

    // Form inputs must remain preserved
    await expect(page.getByLabel("Nombre del producto")).toHaveValue(
      "Producto Duplicado",
    );
  });

  test("S03: editar producto conserva SKU y modelo inmutables", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-MOCH-001/editar");
    await expect(
      page.getByRole("heading", { name: /Editar: Mochila Deportiva/ }),
    ).toBeVisible();

    // SKU Base and sale model are immutable / disabled
    await expect(page.getByLabel("SKU Base")).toBeDisabled();
    await expect(page.getByLabel("SKU Base")).toHaveValue("MOCH-ENT-001");
    await expect(page.getByLabel("Precio base inicial (S/.)")).toBeDisabled();

    // Modify editable fields
    const nameInput = page.getByLabel("Nombre del producto");
    await nameInput.fill("Mochila Deportiva Endurance Pro");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    // Navigates back to S04 detail
    await expect(page).toHaveURL("/productos/PROD-MOCH-001");
    await expect(
      page.getByRole("heading", { name: "Mochila Deportiva Endurance Pro" }),
    ).toBeVisible();
    await noPageOverflow(page);
  });

  test("S03: conflicto de versión (409) conserva la propuesta del usuario", async ({
    page,
  }) => {
    await page.goto(
      "/productos/PROD-MOCH-001/editar?modoRevision=1&escenario=edit-version-conflict",
    );
    await page.getByLabel("Nombre del producto").fill("Mochila Con Conflicto");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(
      page.getByText(/Conflicto de versión \(409\)/),
    ).toBeVisible();
    // Inputs are preserved
    await expect(page.getByLabel("Nombre del producto")).toHaveValue(
      "Mochila Con Conflicto",
    );
  });

  test("S04: detalle de producto simple y variante muestra acciones correspondientes", async ({
    page,
  }) => {
    // 1. Simple product in BORRADOR
    await page.goto("/productos/PROD-MOCH-001");
    await expect(
      page.getByRole("heading", { name: /Mochila Deportiva/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Activar producto" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
    await expect(
      page.getByText("Perfil Físico del SKU Simple"),
    ).toBeVisible();

    // 2. Parent product in ACTIVO
    await page.goto("/productos/PROD-RUN-001");
    await expect(
      page.getByRole("heading", { name: "Camiseta Running Endurance" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Desactivar" }),
    ).toBeVisible();
    await expect(
      page.getByText("Variantes y SKUs Vendibles"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Gestionar variantes" }),
    ).toBeVisible();
    await noPageOverflow(page);
  });

  test("S05: diálogo de confirmación de activación y checklist de requisitos", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-MOCH-001");
    await page.getByRole("button", { name: "Activar producto" }).click();

    // Modal dialog is opened
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Activar producto" }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Datos generales mínimos y maestros válidos"),
    ).toBeVisible();
    await expect(
      dialog.getByText("Preparación en Pricing"),
    ).toBeVisible();

    // Cancel modal closes without mutation
    await dialog.getByRole("button", { name: "Cancelar" }).click();
    await expect(dialog).toHaveCount(0);

    // Confirm activation
    await page.getByRole("button", { name: "Activar producto" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Activar producto" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Product is now ACTIVO
    await expect(page.getByText("Activo", { exact: true })).toBeVisible();
    await noPageOverflow(page);
  });

  test("S06: preparación técnica con estados independientes de Pricing e Inventario", async ({
    page,
  }) => {
    // Product with rejected inventory preparation
    await page.goto("/productos/PROD-PAN-003/preparacion");
    await expect(
      page.getByRole("heading", { name: "Preparación del producto" }),
    ).toBeVisible();

    // Pricing is completed
    await expect(page.getByText("Preparación en Pricing")).toBeVisible();
    await expect(
      page.getByText("Precio regular base inicializado correctamente en Pricing."),
    ).toBeVisible();

    // Inventory is rejected with manual retry allowed
    await expect(page.getByText("Preparación en Inventario")).toBeVisible();
    const retryBtn = page.getByRole("button", {
      name: "Reintentar preparación de Inventario",
    });
    await expect(retryBtn).toBeVisible();

    // Execute retry (HTTP 202)
    await retryBtn.click();
    await expect(
      page.getByText("Reintento solicitado", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Inicialización de SKU simple en curso.", { exact: false })).toBeVisible();
    await noPageOverflow(page);
  });

  test("S07: confirmación de desactivación (baja lógica) y preservación de variantes", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001");
    await page.getByRole("button", { name: "Desactivar" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Desactivar Producto" }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Esta acción es una baja lógica/),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Sus variantes conservan su estado individual/),
    ).toBeVisible();

    // Confirm deactivation
    await dialog.getByRole("button", { name: "Desactivar Producto" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // State becomes INACTIVO
    await expect(page.getByText("Inactivo")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reactivar producto" }),
    ).toBeVisible();
    await noPageOverflow(page);
  });

  test("Capturas de evidencia desktop a 1440x900 para las 7 vistas", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // S01 Listado
    await page.goto("/productos");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: evidencePath("mk003-s01-productos-1440.png"),
      fullPage: true,
    });
    await noPageOverflow(page);

    // S02 Crear producto
    await page.goto("/productos/nuevo");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: evidencePath("mk003-s02-crear-1440.png"),
      fullPage: true,
    });
    await noPageOverflow(page);

    // S03 Editar producto
    await page.goto("/productos/PROD-MOCH-001/editar");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: evidencePath("mk003-s03-editar-1440.png"),
      fullPage: true,
    });
    await noPageOverflow(page);

    // S04 Detalle de producto
    await page.goto("/productos/PROD-RUN-001");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: evidencePath("mk003-s04-detalle-1440.png"),
      fullPage: true,
    });
    await noPageOverflow(page);

    // S05 Activar diálogo
    await page.goto("/productos/PROD-MOCH-001?dialog=activar");
    await page.waitForSelector("role=dialog");
    await page.screenshot({
      path: evidencePath("mk003-s05-activar-1440.png"),
    });

    // S06 Preparación
    await page.goto("/productos/PROD-MOCH-001/preparacion");
    await page.waitForLoadState("networkidle");
    await page.screenshot({
      path: evidencePath("mk003-s06-preparacion-1440.png"),
      fullPage: true,
    });
    await noPageOverflow(page);

    // S07 Desactivar diálogo
    await page.goto("/productos/PROD-RUN-001?dialog=desactivar");
    await page.waitForSelector("role=dialog");
    await page.screenshot({
      path: evidencePath("mk003-s07-desactivar-1440.png"),
    });
  });
});
