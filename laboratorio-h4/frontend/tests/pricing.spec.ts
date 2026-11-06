import { gotoPricingReview } from "./support/pricingReview";
import { evidencePath } from "./support/evidence";
import { test, expect } from "@playwright/test";

test("@smoke S01 applies selection explicitly, distinguishes inheritance/override and retains context on return", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios");
  await expect(
    page.getByRole("heading", { name: "Gestión de precios" }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Producto o SKU" }).click();
  await page
    .getByRole("option", {
      name: "Talla 40 · Negro — ZAP-TRL-40-BLK",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Selección pendiente:", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  const inherited = page.getByRole("region", {
    name: "Talla 40 · Negro",
    exact: true,
  });
  await expect(inherited).toContainText("Hereda precio del producto");
  await page
    .getByRole("combobox", { name: "Canal de consulta", exact: true })
    .click();
  await page.getByRole("option", { name: "Retail", exact: true }).click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(
    page.getByText(
      "Para el canal Retail seleccionado, el precio disponible corresponde al alcance global.",
      { exact: false },
    ),
  ).toBeVisible();
  await expect(inherited).toContainText("Global efectivo");
  await expect(
    page.getByRole("button", { name: "Revisar edición de precio" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revisar programación futura" }),
  ).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Componentes de carga masiva" }),
  ).not.toBeVisible();
  await gotoPricingReview(page, "/precios?target=variant40&channel=retail");
  await expect(
    page.getByRole("combobox", { name: "Producto o SKU" }),
  ).toHaveValue("Talla 40 · Negro — ZAP-TRL-40-BLK");
  await expect(
    page.getByRole("combobox", { name: "Canal de consulta" }),
  ).toHaveValue("Retail");
  await page.getByRole("combobox", { name: "Producto o SKU" }).click();
  await page
    .getByRole("option", {
      name: "Talla 42 · Negro — ZAP-TRL-42-BLK",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  const override = page.getByRole("region", {
    name: "Talla 42 · Negro",
    exact: true,
  });
  await expect(override).toContainText("Precio específico del SKU");
  await expect(override).toContainText("Sin oferta");
  await expect(override).toContainText("S/ 259.90");
});

test("S01 distinguishes absence from error and marks previous readings without enabling mutation", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios");
  await expect(
    page.getByRole("combobox", { name: "Escenario de revisión del piloto" }),
  ).not.toBeVisible();

  await gotoPricingReview(page, "/precios?modoRevision=1");
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Escenario de revisión del piloto" })
    .click();
  await page
    .getByRole("option", { name: "Error de consulta", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "La selección se conserva",
  );
  await expect(
    page.getByText("Última consulta disponible", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver a consultar", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Escenario de revisión del piloto" })
    .click();
  await page.getByRole("option", { name: "Sin precio", exact: true }).click();
  await expect(
    page.getByText("Sin precio aplicable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).not.toBeVisible();
  await page
    .getByRole("combobox", { name: "Escenario de revisión del piloto" })
    .click();
  await page.getByRole("option", { name: "Cargando", exact: true }).click();
  await expect(
    page.getByText("Cargando precio…", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Escenario de revisión del piloto" })
    .click();
  await page
    .getByRole("option", { name: "Precio disponible", exact: true })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toBeVisible();
});

test("Pricing component examples preserve form inputs and do not infer CSV validity or admit imports", async ({
  page,
}) => {
  await gotoPricingReview(page, "/foundation/pricing?panel=edit");
  await page
    .getByRole("radio", { name: "Establecer oferta", exact: true })
    .check();
  await page.getByLabel("Nuevo importe de oferta (PEN)").fill("211.50");
  await page
    .getByRole("radio", { name: "Retirar oferta", exact: true })
    .check();
  await expect(
    page.getByText(
      "El retiro representa ausencia de oferta; no un importe de cero.",
    ),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Establecer oferta", exact: true })
    .check();
  await expect(page.getByLabel("Nuevo importe de oferta (PEN)")).toHaveValue(
    "211.5",
  );
  await page
    .getByLabel("Motivo del cambio", { exact: true })
    .fill("Motivo de ejemplo");
  await page
    .getByRole("button", { name: "Revisar presentación", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByLabel("Motivo del cambio", { exact: true }),
  ).toHaveValue("Motivo de ejemplo");
  await page.getByRole("tab", { name: "Carga masiva", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "ejemplo.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Datos de prueba sin formato contractual"),
  });
  await expect(
    page.getByText("Archivo seleccionado: ejemplo.txt", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Revisar selección de archivo" })
    .click();
  await page
    .getByRole("radio", { name: "Permitir resultados parciales", exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "Confirmar importación", exact: true }),
  ).toBeDisabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: "otro.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Otro archivo"),
  });
  await expect(
    page.getByRole("radio", {
      name: "Permitir resultados parciales",
      exact: true,
    }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Revisar selección de archivo" })
    .click();
  await expect(
    page.getByRole("radio", {
      name: "Permitir resultados parciales",
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("tab", { name: "Resultado de carga", exact: true })
    .click();
  await expect(
    page.getByText("Completado parcialmente — ejemplo", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("table")).toContainText("CAM-RO-L");
});

test("Pricing desktop captures and tab keyboard navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, file] of [
    ["/precios", "pricing-s01-1440.png"],
    ["/foundation/pricing?panel=edit", "pricing-edit-components-1440.png"],
    [
      "/foundation/pricing?panel=schedule",
      "pricing-schedule-components-1440.png",
    ],
    ["/foundation/pricing?panel=import", "pricing-import-components-1440.png"],
    ["/foundation/pricing?panel=result", "pricing-result-components-1440.png"],
  ]) {
    await gotoPricingReview(page, route!);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (route === "/precios")
      await expect(
        page.getByRole("region", {
          name: "Zapatilla Trail Inka Explorer",
          exact: true,
        }),
      ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    if (route === "/precios")
      await expect(
        page.getByRole("combobox", { name: "Canal de consulta", exact: true }),
      ).toHaveCSS("opacity", "1");
    if (route?.includes("panel=import"))
      await expect(
        page.getByText("Seleccionar archivo", { exact: true }),
      ).toHaveCSS("color", "rgb(73, 80, 87)");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= 1440),
    ).toBe(true);
    await page.screenshot({ path: evidencePath(`${file}`), fullPage: true });
  }
  await page.getByRole("tab", { name: "Editar precio", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Programaciones futuras", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
});
