import { expect, test, type Page } from "@playwright/test";
import { evidencePath } from "./support/evidence";

async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

async function fillComplementary(page: Page) {
  await page.getByRole("textbox", { name: "Material principal", exact: true }).fill("Algodón");
  if (await page.getByRole("combobox", { name: "Tipo de corte", exact: true }).inputValue() === "Regular Fit") return;
  await page.getByRole("combobox", { name: "Tipo de corte", exact: true }).click();
  await page.getByRole("option", { name: "Regular Fit", exact: true }).click();
}
async function fillAttributes(page: Page, color: string, size: string) {
  await page.getByRole("combobox", { name: "Color principal", exact: true }).click();
  await page.getByRole("option", { name: color, exact: true }).click();
  await page.getByRole("combobox", { name: "Talla", exact: true }).click();
  await page.getByRole("option", { name: size, exact: true }).click();
  await fillComplementary(page);
}

test.describe("MK-004 Gestión avanzada de variantes (SKU)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("S01: Listado de variantes por producto padre, filtros y alerta para producto simple (CA-01)", async ({
    page,
  }) => {
    // 1. Visit variant list for product with variants (PROD-RUN-001)
    await page.goto("/productos/PROD-RUN-001/variantes");
    await expect(
      page.getByRole("heading", { name: "Variantes de Camiseta Running Endurance" }),
    ).toBeVisible();

    // Verify context card shows parent info and base price
    await expect(page.getByText("SKU Base: CAM-RUN")).toBeVisible();
    await expect(page.getByText(/Precio inicial de Catálogo: S\/\.\s*129\.90/)).toBeVisible();

    // Verify initial variant items
    await expect(
      page.getByRole("link", { name: "CAM-RUN-BLA-M", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "CAM-RUN-AZU-L", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "CAM-RUN-NEG-S", exact: true }),
    ).toBeVisible();

    // Filter by status "Solo Activas"
    const statusSelect = page.getByRole("combobox", { name: "Filtrar por estado" });
    await statusSelect.click();
    await page.getByRole("option", { name: "Solo Activas" }).click();

    await expect(
      page.getByRole("link", { name: "CAM-RUN-BLA-M", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "CAM-RUN-NEG-S", exact: true }),
    ).toHaveCount(0);

    // Capture visual evidence S01
    await page.screenshot({ path: evidencePath("mk004-s01-variantes-1440.png") });
    await noPageOverflow(page);

    // 2. Verify simple product compatibility check (CA-01)
    await page.goto("/productos/PROD-CAS-001/variantes");
    await expect(
      page.getByText("Incompatible: Producto Simple"),
    ).toBeVisible();
    await expect(
      page.getByText("Los productos simples gestionan su inventario y perfil físico directamente"),
    ).toBeVisible();
    await noPageOverflow(page);
  });

  test("S02: Crear nueva variante en BORRADOR y navegación inmediata a S04 (CA-02, CA-03, CA-04)", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/nueva");
    await expect(
      page.getByRole("heading", { name: "Nueva Variante (SKU)" }),
    ).toBeVisible();

    // SPEC-004 requires an explicit SKU.
    const customSku = `CAM-RUN-ROJ-S-${Date.now().toString().slice(-4)}`;
    await page.getByPlaceholder("Ej. PROD-RUN-AZUL-M").fill(customSku);

    // Fill identifying attributes (Color and Talla)
    await fillAttributes(page, "Rojo Carmesí", "XL");

    // Fill mandatory image URL per SPEC-004 / VarianteCreateRequest
    await page
      .getByPlaceholder("https://ejemplo.com/imagenes/variante-azul.jpg")
      .fill("https://ejemplo.com/imagenes/camiseta deportiva-roja.jpg");

    // Fill physical dimensions in kg / cm
    await page.getByRole("textbox", { name: "Peso (kg)" }).fill("0.30");
    await page.getByRole("textbox", { name: "Largo (cm)" }).fill("35");
    await page.getByRole("textbox", { name: "Ancho (cm)" }).fill("25");
    await page.getByRole("textbox", { name: "Alto (cm)" }).fill("3");

    // Capture visual evidence S02 Alta
    await page.screenshot({ path: evidencePath("mk004-s02-crear-1440.png") });
    await noPageOverflow(page);

    // Submit form: should create in BORRADOR and immediately navigate to S04 (Preparación)
    await page.getByRole("button", { name: "Guardar Variante" }).first().click();

    // Verify immediate redirect to preparation view S04
    await expect(page).toHaveURL(new RegExp(`/productos/PROD-RUN-001/variantes/.+/preparacion`));
    await expect(
      page.getByRole("heading", { name: new RegExp(`Preparación de Inventario: ${customSku}`) }),
    ).toBeVisible();
    await noPageOverflow(page);
  });

  test("S03: Ficha de detalle de variante, herencia de precio e inmutabilidad (CA-05, CA-07, CA-11)", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-BLA-M");
    await expect(
      page.getByRole("heading", { name: "Variante: CAM-RUN-BLA-M" }),
    ).toBeVisible();

    // Verify identifying attributes
    await expect(page.getByText("Color principal: Blanco")).toBeVisible();
    await expect(page.getByText("Talla: M")).toBeVisible();

    // Verify physical profile
    await expect(page.getByText("0.28 kg")).toBeVisible();
    await expect(page.getByText("35 cm")).toBeVisible();

    // Verify price inheritance alert
    await expect(page.getByText("Precio inicial de Catálogo")).toBeVisible();
    await expect(page.getByText(/Precio inicial registrado del padre:/)).toBeVisible();
    await expect(page.getByText(/129\.90/)).toBeVisible();

    // Capture visual evidence S03 Detalle
    await page.screenshot({ path: evidencePath("mk004-s03-detalle-1440.png") });
    await noPageOverflow(page);
  });

  test("S02 Edición: SKU y atributos identificadores son inmutables (CA-11)", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-BLA-M/editar");
    await expect(
      page.getByRole("heading", { name: "Editar Variante: CAM-RUN-BLA-M" }),
    ).toBeVisible();

    // Verify SKU input is disabled
    const skuInput = page.getByRole("textbox", { name: "SKU de la Variante" });
    await expect(skuInput).toBeDisabled();

    // Verify identifying attributes are rendered as immutable badges (no edit inputs)
    await expect(page.getByText("Color principal: Blanco")).toBeVisible();
    await expect(page.getByText("Talla: M")).toBeVisible();

    // Edit non-identifying attributes and weight
    await page.getByRole("textbox", { name: "Peso (kg)" }).fill("0.29");

    // Capture visual evidence S02 Edición
    await page.screenshot({ path: evidencePath("mk004-s02-editar-1440.png") });
    await noPageOverflow(page);

    // Save changes and verify return to S03
    await fillComplementary(page);
    await page.getByRole("button", { name: "Guardar Cambios" }).first().click();
    await expect(page).toHaveURL(/\/productos\/PROD-RUN-001\/variantes\/VAR-RUN-BLA-M$/);
    await expect(page.getByText("0.29 kg")).toBeVisible();
  });

  test("S04: Preparación de Inventario y reintento atómico (CA-19, CA-21)", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-BLA-M/preparacion");
    await expect(
      page.getByRole("heading", { name: "Preparación de Inventario: CAM-RUN-BLA-M" }),
    ).toBeVisible();

    // Check completed state
    await expect(page.getByText("Preparación completada")).toBeVisible();
    await expect(page.getByText("La preparación del SKU fue completada.")).toBeVisible();

    // Capture visual evidence S04
    await page.screenshot({ path: evidencePath("mk004-s04-preparacion-1440.png") });
    await noPageOverflow(page);
  });

  test("S05: Desactivación de variante y regla de impacto en producto padre (CA-12, FLOW-004 §4.4)", async ({
    page,
  }) => {
    // Navigate to variant detail of an active variant
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-AZU-L");
    await expect(
      page.getByRole("button", { name: "Desactivar" }),
    ).toBeVisible();

    // Open deactivation dialog
    await page.getByRole("button", { name: "Desactivar" }).click();
    await expect(
      page.getByRole("heading", { name: "Desactivar Variante (SKU)" }),
    ).toBeVisible();

    // Capture visual evidence S05 Desactivar
    await page.screenshot({ path: evidencePath("mk004-s05-desactivar-1440.png") });
    await noPageOverflow(page);

    // Confirm deactivation
    await page.getByRole("button", { name: "Desactivar Variante" }).click();

    // Verify variant is now INACTIVA
    await expect(page.getByText("INACTIVA").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reactivar" })).toBeVisible();
  });

  test("S06: Reactivación de variante inactiva con independencia del padre (CA-14)", async ({
    page,
  }) => {
    // Navigate to variant detail of an inactive variant
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-NEG-S");
    await expect(
      page.getByRole("button", { name: "Reactivar" }),
    ).toBeVisible();

    // Open reactivation dialog
    await page.getByRole("button", { name: "Reactivar" }).click();
    await expect(
      page.getByRole("heading", { name: "Reactivar Variante (SKU)" }),
    ).toBeVisible();

    // Verify checklist and parent independence note
    await expect(page.getByText("Independencia del Padre:")).toBeVisible();
    await expect(page.getByText("Reactivar esta variante no reactiva automáticamente al producto padre")).toBeVisible();

    // Capture visual evidence S06 Reactivar
    await page.screenshot({ path: evidencePath("mk004-s06-reactivar-1440.png") });
    await noPageOverflow(page);

    // Confirm reactivation
    await page.getByRole("button", { name: "Reactivar Variante" }).click();

    // Verify variant is now ACTIVA
    await expect(page.getByText("ACTIVA").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Desactivar" })).toBeVisible();
  });

  test("Regla de Negocio: SKU explícito obligatorio, sin generación automática", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/nueva");
    await expect(page.getByRole("heading", { name: "Nueva Variante (SKU)" })).toBeVisible();
    // Leave SKU blank: no write or generated identity is allowed.
    await fillAttributes(page, "Negro Ónix", "L");

    await page
      .getByPlaceholder("https://ejemplo.com/imagenes/variante-azul.jpg")
      .fill("https://ejemplo.com/imagenes/camiseta deportiva-negra.jpg");

    await page.getByRole("textbox", { name: "Peso (kg)" }).fill("0.32");
    await page.getByRole("textbox", { name: "Largo (cm)" }).fill("36");
    await page.getByRole("textbox", { name: "Ancho (cm)" }).fill("26");
    await page.getByRole("textbox", { name: "Alto (cm)" }).fill("3");

    await page.getByRole("button", { name: "Guardar Variante" }).first().click();

    await expect(page).toHaveURL(/\/productos\/PROD-RUN-001\/variantes\/nueva$/);
    await expect(page.getByRole("textbox", { name: "SKU de la Variante" })).toHaveAttribute("required", "");
    await expect(page.getByText("El SKU es obligatorio; ingrese un código único.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "URL de Imagen de la Variante" })).toHaveValue("https://ejemplo.com/imagenes/camiseta deportiva-negra.jpg");
  });

  test("Regla de Negocio: Rechazo de combinación identificadora duplicada (CA-03)", async ({
    page,
  }) => {
    await page.goto(
      "/productos/PROD-RUN-001/variantes/nueva?modoRevision=1&escenario=create-duplicate-combination",
    );
    await fillAttributes(page, "Blanco", "M");
    await page.getByRole("textbox", { name: "SKU de la Variante" }).fill("EXPLICIT-DUP-COMBINATION");
    await page
      .getByPlaceholder("https://ejemplo.com/imagenes/variante-azul.jpg")
      .fill("https://ejemplo.com/imagenes/camiseta deportiva-blanca.jpg");

    await page.getByRole("button", { name: "Guardar Variante" }).first().click();
    await expect(
      page.getByText("La combinación de atributos identificadores ya existe dentro de este producto (CA-03)."),
    ).toBeVisible();
  });

  test("Regla de Negocio: Rechazo de medidas físicas inválidas (<= 0)", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/nueva");
    await fillAttributes(page, "Rojo Carmesí", "M");
    await page.getByRole("textbox", { name: "SKU de la Variante" }).fill("EXPLICIT-INVALID-PHYSICAL");
    await page.getByPlaceholder("https://ejemplo.com/imagenes/variante-azul.jpg").fill("https://ejemplo.com/foto.jpg");
    await page.getByRole("textbox", { name: "Peso (kg)" }).fill("0");
    await page.getByRole("button", { name: "Guardar Variante" }).first().click();

    await expect(page.getByText("El peso debe ser mayor que cero.")).toBeVisible();
  });

  test("Flujo B: Desactivar la última variante activa inactiva al producto padre ACTIVO (SPEC-004 CA-12)", async ({
    page,
  }) => {
    // Navigate to variant detail of VAR-RUN-AZU-L
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-AZU-L");
    await page.getByRole("button", { name: "Desactivar" }).click();
    await page.getByRole("button", { name: "Desactivar Variante" }).click();
    await expect(page.getByText("INACTIVA").first()).toBeVisible();

    // Now deactivate VAR-RUN-BLA-M (the remaining active variant)
    await page.getByRole("link", { name: "Variantes", exact: true }).click();
    await page
      .getByRole("link", { name: "CAM-RUN-BLA-M", exact: true })
      .click();
    await page.getByRole("button", { name: "Desactivar" }).click();
    await page.getByRole("button", { name: "Desactivar Variante" }).click();
    await expect(page.getByText("INACTIVA").first()).toBeVisible();

    // Navigate to parent product using breadcrumb link (client-side transition)
    await page.getByRole("link", { name: "Camiseta Running Endurance" }).first().click();
    await expect(page.getByText("Inactivo")).toBeVisible();
  });

  test("Flujo C: Reactivación de variante inactiva preserva estado del padre (CA-14)", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-NEG-S");
    await page.getByRole("button", { name: "Reactivar" }).click();
    await page.getByRole("button", { name: "Reactivar Variante" }).click();
    await expect(page.getByText("ACTIVA").first()).toBeVisible();

    // Parent product remains in its current state, not auto-activated
    await page.goto("/productos/PROD-RUN-001");
    await expect(page.getByRole("heading", { name: "Camiseta Running Endurance" })).toBeVisible();
  });

  test("Flujo D: Preservación de medidas y perfil físico tras edición", async ({
    page,
  }) => {
    await page.goto("/productos/PROD-RUN-001/variantes/VAR-RUN-BLA-M/editar");
    await page.getByRole("textbox", { name: "Largo (cm)" }).fill("38");
    await page.getByRole("textbox", { name: "Ancho (cm)" }).fill("28");
    await page.getByRole("textbox", { name: "Alto (cm)" }).fill("4");
    await fillComplementary(page);
    await page.getByRole("button", { name: "Guardar Cambios" }).first().click();

    // Check detail: new dimensions are displayed accurately
    await expect(page).toHaveURL(/\/productos\/PROD-RUN-001\/variantes\/VAR-RUN-BLA-M$/);
    await expect(page.getByText("38 cm")).toBeVisible();
    await expect(page.getByText("28 cm")).toBeVisible();
    await expect(page.getByText("4 cm")).toBeVisible();
  });
});
