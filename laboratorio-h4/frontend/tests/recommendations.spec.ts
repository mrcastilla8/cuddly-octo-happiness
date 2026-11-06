import { evidencePath } from "./support/evidence";
import { expect, test, type Page } from "@playwright/test";

const recommendationMockNotice =
  "Entorno de prueba: la información presentada es de referencia y no confirma una aplicación comercial.";
async function choose(page: Page, label: string, option: string, id?: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  const choice = page.getByRole("option", { name: option, exact: true });
  // Historical and editable Taxonomy records may share a label; their IDs
  // remain distinct. Select the fixture's actual reference without merging it.
  await (id ? choice.and(page.locator(`[value="${id}"]`)) : choice).click();
}
async function fillRule(page: Page, name: string) {
  await page.getByLabel("Nombre de la regla", { exact: true }).fill(name);
  await choose(page, "Tipo de origen", "Producto");
  await choose(page, "Producto de origen", "Camiseta Running Endurance");
  await choose(page, "Estado inicial", "Inactiva");
  await page.getByLabel("Prioridad", { exact: true }).fill("2");
  await page
    .getByLabel("Fecha y hora de inicio", { exact: true })
    .fill("2026-10-01T00:00");
  await page
    .getByLabel("Fecha y hora de fin", { exact: true })
    .fill("2026-11-01T00:00");
}
async function add(page: Page, names: string[]) {
  await page
    .getByRole("link", {
      name: "Seleccionar productos recomendados",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Camiseta Running Endurance", exact: true }),
  ).toHaveCount(0);
  for (const name of names)
    await page.getByRole("checkbox", { name, exact: true }).check();
  await page
    .getByRole("button", { name: "Confirmar selección", exact: true })
    .click();
}
test("MK-007 S01/S06: filters, origins, pagination and read-only enrichments retain context", async ({
  page,
}) => {
  await page.goto("/recomendaciones?estado=inactive&tipo=upsell&tamanio=1");
  await expect(
    page.getByText(recommendationMockNotice, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: "Ver detalle de Mejora tu rendimiento",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mejora tu rendimiento", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Mayor rendimiento");
  await expect(page.getByRole("table")).toContainText("No disponible");
  await expect(page.getByRole("table")).not.toContainText("MAYOR_RENDIMIENTO");
  await page
    .getByRole("link", { name: "Volver al listado", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Tipo de regla", exact: true }),
  ).toHaveValue("Upselling");
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await page.goBack();
  await expect(
    page.getByRole("combobox", { name: "Estado de la regla", exact: true }),
  ).toHaveValue("Inactiva");
  await page.goto("/recomendaciones/categoria-running");
  await expect(
    page.getByRole("region", { name: "Configuración de la regla" }),
  ).toContainText("Origen por categoría: Ropa");
});

test("MK-007: mock notice is visible in every recommendation view", async ({
  page,
}) => {
  for (const route of [
    "/recomendaciones",
    "/recomendaciones/nueva/venta-cruzada",
    "/recomendaciones/completa-carrera/editar",
    "/recomendaciones/nueva/upselling",
    "/recomendaciones/nueva/venta-cruzada/productos",
    "/recomendaciones/completa-carrera",
    "/recomendaciones/completa-carrera/estado",
  ]) {
    await page.goto(route);
    await expect(
      page.getByText(recommendationMockNotice, { exact: true }),
    ).toBeVisible();
  }
});
test("MK-007 S02/S05: selector excludes origin/duplicates, cancellation preserves draft, order persists", async ({
  page,
}) => {
  // Exercise real Catalog activation to provide additional active candidates.
  await page.goto("/productos/PROD-MOCH-001");
  await page.getByRole("button", { name: "Activar producto", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Activar producto", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Venta cruzada y upselling", exact: true }).click();
  await page.getByRole("link", { name: "Crear venta cruzada", exact: true }).click();
  await fillRule(page, "Complementos de prueba");
  await add(page, ["Casaca Cortaviento Trail", "Mochila Deportiva Endurance"]);
  await page.getByLabel("Orden de Casaca Cortaviento Trail", { exact: true }).fill("2");
  await page
    .getByLabel("Orden de Mochila Deportiva Endurance", { exact: true })
    .fill("1");
  await choose(page, "Tipo de origen", "Categoría");
  await page.getByRole("dialog").getByRole("button", { name: "Cambiar origen", exact: true }).click();
  await choose(page, "Categoría de origen", "Ropa", "CAT-ROPA");
  await page
    .getByRole("link", {
      name: "Seleccionar productos recomendados",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Casaca Cortaviento Trail", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Camiseta Running Endurance", exact: true })
    .check();
  await page
    .getByRole("link", { name: "Cancelar selección", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre de la regla", { exact: true }),
  ).toHaveValue("Complementos de prueba");
  await expect(page.getByRole("table")).not.toContainText("Camiseta Running Endurance");
  await page
    .getByRole("button", { name: "Crear regla de venta cruzada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Complementos de prueba", exact: true }),
  ).toBeVisible();
  const rows = page.getByRole("table").getByRole("row");
  await expect(rows.nth(1)).toContainText("Mochila Deportiva Endurance");
  await expect(rows.nth(2)).toContainText("Casaca Cortaviento Trail");
});
test("MK-007 S03/S04: upselling requires explicit criterion, valid order/period and bounded justification", async ({
  page,
}) => {
  await page.goto("/recomendaciones/nueva/upselling");
  await fillRule(page, "Alternativa de prueba");
  await add(page, ["Casaca Cortaviento Trail"]);
  await expect(
    page.getByRole("combobox", {
      name: "Criterio para Casaca Cortaviento Trail",
      exact: true,
    }),
  ).toHaveValue("");
  await page.getByLabel("Orden de Casaca Cortaviento Trail", { exact: true }).fill("0");
  await page
    .getByLabel("Fecha y hora de fin", { exact: true })
    .fill("2026-09-01T00:00");
  await page
    .getByRole("button", { name: "Crear regla de upselling", exact: true })
    .click();
  await expect(
    page.getByText("El orden debe ser un entero positivo.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Selecciona el criterio de superioridad para este producto.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByLabel("Fecha y hora de fin", { exact: true })
    .fill("2026-11-01T00:00");
  await page.getByLabel("Orden de Casaca Cortaviento Trail", { exact: true }).fill("1");
  await choose(page, "Criterio para Casaca Cortaviento Trail", "Mejor material");
  await page
    .getByLabel("Justificación para Casaca Cortaviento Trail", { exact: true })
    .fill("a".repeat(501));
  await page
    .getByRole("button", { name: "Crear regla de upselling", exact: true })
    .click();
  await expect(
    page.getByText("La justificación admite hasta 500 caracteres.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Justificación para Casaca Cortaviento Trail", { exact: true }),
  ).toBeFocused();
  await page
    .getByLabel("Justificación para Casaca Cortaviento Trail", { exact: true })
    .fill("Criterio comercial explícito.");
  await page
    .getByRole("button", { name: "Crear regla de upselling", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Alternativa de prueba", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Editar regla", exact: true }).click();
  await expect(
    page.getByRole("combobox", {
      name: "Criterio para Casaca Cortaviento Trail",
      exact: true,
    }),
  ).toHaveValue("Mejor material");
  await expect(
    page.getByRole("region", { name: "Identificación y origen" }),
  ).toContainText("Upselling");
  await expect(
    page.getByRole("combobox", { name: "Tipo de regla", exact: true }),
  ).toHaveCount(0);
});
test("MK-007: changing origin and discarding require confirmation without erasing candidates", async ({
  page,
}) => {
  await page.goto("/recomendaciones/completa-carrera/editar");
  await choose(page, "Tipo de origen", "Categoría");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Producto de origen", exact: true }),
  ).toHaveValue("Camiseta Running Endurance");
  await choose(page, "Tipo de origen", "Categoría");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cambiar origen", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Categoría de origen", exact: true }),
  ).toHaveValue("");
  await expect(page.getByRole("table")).toContainText("Casaca Cortaviento Trail");
  await choose(page, "Categoría de origen", "Ropa", "CAT-ROPA");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Seguir editando", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Categoría de origen", exact: true }),
  ).toHaveValue("Ropa");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Configuración de la regla" }),
  ).toContainText("Origen por categoría: Ropa");
});
test("MK-007 S07: canceled/rejected state preserves candidates; uncertain state reconciles without resend", async ({
  page,
}) => {
  await page.goto(
    "/recomendaciones/mejora-rendimiento/estado?modoRevision=1&escenario=rejected",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Activar regla", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "configuración anterior se conservan",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Activar regla", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("table")).toContainText("Casaca Cortaviento Trail");
  await page.goto(
    "/recomendaciones/mejora-rendimiento/estado?modoRevision=1&escenario=unknown-result",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Activar regla", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Consultar estado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Consultar estado", exact: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Desactivar regla", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Casaca Cortaviento Trail");
});
test("MK-007: failure preserves proposed configuration; unknown edit reconciles and selector errors stay distinct", async ({
  page,
}) => {
  await page.goto(
    "/recomendaciones/completa-carrera/editar?modoRevision=1&escenario=save-error",
  );
  await page
    .getByLabel("Nombre de la regla", { exact: true })
    .fill("Propuesta rechazada");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("borrador");
  await expect(
    page.getByLabel("Nombre de la regla", { exact: true }),
  ).toHaveValue("Propuesta rechazada");
  await page.goto(
    "/recomendaciones/completa-carrera/editar?modoRevision=1&escenario=unknown-result",
  );
  await page
    .getByLabel("Nombre de la regla", { exact: true })
    .fill("  Propuesta confirmada  ");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre de la regla", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Consultar resultado", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Propuesta confirmada", exact: true }),
  ).toBeVisible();
  await page.goto(
    "/recomendaciones/nueva/venta-cruzada/productos?modoRevision=1&escenario=selection-empty",
  );
  await expect(
    page.getByText("Sin candidatos elegibles", { exact: true }),
  ).toBeVisible();
  await page.goto(
    "/recomendaciones/nueva/venta-cruzada/productos?modoRevision=1&escenario=selection-error",
  );
  await expect(page.getByRole("alert")).toContainText(
    "candidatos anteriores se conservan",
  );
  await expect(
    page.getByRole("button", { name: "Confirmar selección", exact: true }),
  ).toBeDisabled();
});
test("MK-007: seven desktop views and pending submission protection", async ({
  page,
}) => {
  for (const [route, file] of [
    ["/recomendaciones", "s01"],
    ["/recomendaciones/nueva/venta-cruzada", "s02"],
    ["/recomendaciones/nueva/upselling", "s04"],
    ["/recomendaciones/mejora-rendimiento/editar", "s03"],
    ["/recomendaciones/nueva/venta-cruzada/productos", "s05"],
    ["/recomendaciones/mejora-rendimiento", "s06"],
    ["/recomendaciones/mejora-rendimiento/estado", "s07"],
  ]) {
    await page.goto(route!);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (file === "s07") await expect(page.getByRole("dialog")).toBeVisible();
    else if (file === "s03")
      await expect(
        page.getByLabel("Nombre de la regla", { exact: true }),
      ).toHaveValue("Mejora tu rendimiento");
    else if (file === "s05")
      await expect(
        page.getByRole("checkbox", { name: "Camiseta Running Endurance", exact: true }),
      ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= 1440),
    ).toBe(true);
    await page.screenshot({
      path: evidencePath(`recomendaciones-${file}-1440.png`),
      fullPage: file !== "s07",
    });
  }
  await page.goto(
    "/recomendaciones/nueva/venta-cruzada?modoRevision=1&escenario=saving",
  );
  await fillRule(page, "Guardando sin duplicar");
  await add(page, ["Casaca Cortaviento Trail"]);
  await page
    .getByRole("button", { name: "Crear regla de venta cruzada", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre de la regla", { exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", {
      name: "Crear regla de venta cruzada",
      exact: true,
    }),
  ).toBeDisabled();
  await page
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Cupones de descuento" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Descartar cambios", exact: true }),
  ).toBeDisabled();
});
