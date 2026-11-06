import { evidencePath } from "./support/evidence";
import { expect, test, type Page } from "@playwright/test";

const campaignMockNotice =
  "Entorno de prueba: la información presentada es de referencia y no confirma una aplicación comercial.";
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function fillCampaign(page: Page, name: string) {
  await page.getByLabel("Nombre de la promoción", { exact: true }).fill(name);
  await choose(page, "Modalidad comercial", "Con cupón");
  await choose(page, "Estado inicial", "Inactivo");
  await page.getByLabel("Prioridad", { exact: true }).fill("2");
  await choose(page, "Tipo de beneficio", "Porcentaje");
  await page.getByLabel("Valor del beneficio", { exact: true }).fill("15");
  await page
    .getByLabel("Fecha y hora de inicio", { exact: true })
    .fill("2026-10-01T00:00");
  await page
    .getByLabel("Fecha y hora de fin", { exact: true })
    .fill("2026-11-01T00:00");
  await page
    .getByRole("checkbox", { name: "Marketplace", exact: true })
    .check();
}
async function selectScope(page: Page) {
  await page
    .getByRole("link", { name: "Seleccionar alcance", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Producto completo: Camiseta Running Endurance",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", { name: /SKU específico: CAS-COR-001/ })
    .check();
  await page
    .getByRole("button", { name: "Confirmar alcance", exact: true })
    .click();
}
test("@smoke MK-006 S01/S05: typed filters and detail retain list context", async ({
  page,
}) => {
  await page.goto("/promociones?estado=active&modalidad=automatic&tamanio=1");
  await expect(page.getByText(campaignMockNotice, { exact: true })).toBeVisible();
  await page
    .getByRole("link", {
      name: "Ver detalle de Carrera de octubre",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Carrera de octubre", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Alcance de productos y SKU" }),
  ).toContainText("Camiseta Running Endurance");
  await expect(
    page.getByRole("region", { name: "Alcance de productos y SKU" }),
  ).toContainText("CAS-COR-001");
  await page
    .getByRole("link", { name: "Volver al listado", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Modalidad", exact: true }),
  ).toHaveValue("Automática");
  await choose(page, "Estado de promoción", "Inactivo");
  await expect(
    page.getByRole("link", { name: "Ver detalle de Inactiva nueva" }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("link", { name: "Ver detalle de Carrera de octubre" }),
  ).toBeVisible();
});

test("MK-006: mock notice is visible in every campaign view", async ({ page }) => {
  for (const route of [
    "/promociones",
    "/promociones/nueva",
    "/promociones/carrera/editar",
    "/promociones/nueva/alcance",
    "/promociones/carrera/editar/alcance",
    "/promociones/carrera",
    "/promociones/carrera/estado",
  ]) {
    await page.goto(route);
    await expect(page.getByText(campaignMockNotice, { exact: true })).toBeVisible();
  }
});
test("MK-006 S02/S04: validate discount/channels and preserve draft and typed scope across selector cancellation", async ({
  page,
}) => {
  await page.goto("/promociones/nueva");
  await fillCampaign(page, "Promoción de prueba");
  await page.getByLabel("Valor del beneficio", { exact: true }).fill("100.001");
  await page
    .getByRole("checkbox", { name: "Marketplace", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Crear promoción", exact: true })
    .click();
  await expect(
    page.getByText("El porcentaje debe ser mayor que cero y como máximo 100.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Selecciona al menos un canal habilitado.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Valor del beneficio", { exact: true }).fill("15");
  await page
    .getByRole("checkbox", { name: "Marketplace", exact: true })
    .check();
  await selectScope(page);
  await expect(
    page.getByLabel("Nombre de la promoción", { exact: true }),
  ).toHaveValue("Promoción de prueba");
  await page
    .getByRole("link", { name: "Seleccionar alcance", exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Producto completo: Camiseta Running Endurance",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("checkbox", {
      name: "Producto completo: Casaca Cortaviento Trail",
      exact: true,
    })
    .check();
  await page
    .getByRole("link", { name: "Cancelar selección", exact: true })
    .click();
  const scope = page.getByRole("region", { name: "Canales y alcance" });
  await expect(scope).toContainText("Producto completo: Camiseta Running Endurance");
  await expect(scope).not.toContainText("Producto completo: Casaca");
  await page
    .getByRole("button", { name: "Crear promoción", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Promoción de prueba", exact: true }),
  ).toBeVisible();
  const savedScope = page.getByRole("region", {
    name: "Alcance de productos y SKU",
  });
  await expect(savedScope).toContainText(
    "Producto completo: Camiseta Running Endurance",
  );
  await expect(savedScope).not.toContainText("CAM-RUN-BLA-M");
  await expect(savedScope).toContainText("SKU específico: CAS-COR-001");
});
test("MK-006 S03/S06: allowed modality is revalidated and activation history survives deactivation", async ({
  page,
}) => {
  await page.goto("/promociones/nueva-inactiva/editar");
  await expect(
    page.getByRole("combobox", { name: "Modalidad comercial" }),
  ).toBeEnabled();
  await choose(page, "Modalidad comercial", "Con cupón");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Activar promoción", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Activar promoción", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Activar promoción", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Activar promoción", exact: true })
    .click();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Desactivar promoción", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Desactivar promoción", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desactivar promoción", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Editar promoción", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Modalidad comercial" }),
  ).toBeDisabled();
  await page.goto("/promociones/capacidad-desconocida/editar");
  await expect(
    page.getByRole("combobox", { name: "Modalidad comercial" }),
  ).toBeDisabled();
  await expect(
    page.getByText("No se pudo comprobar la capacidad de cambio.", {
      exact: false,
    }),
  ).toBeVisible();
});
test("MK-005/MK-006: coupon selection reads created coupon-mode campaign and association locks modality", async ({
  page,
}) => {
  await page.goto("/promociones/nueva");
  await fillCampaign(page, "Campaña para cupón");
  await selectScope(page);
  await page
    .getByRole("button", { name: "Crear promoción", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Campaña para cupón", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Cupones de descuento" })
    .click();
  await page.getByRole("link", { name: "Crear cupón", exact: true }).click();
  await page
    .getByLabel("Código del cupón", { exact: true })
    .fill("CAMPANA-NUEVA");
  await choose(page, "Promoción asociada", "Campaña para cupón");
  await choose(page, "Estado inicial", "Inactivo");
  await page
    .getByRole("radio", { name: "No restaurar uso al cancelar", exact: true })
    .check();
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cupón — CAMPANA-NUEVA", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Ofertas y promociones" })
    .click();
  const campaignRow = page
    .getByRole("row")
    .filter({ hasText: "Campaña para cupón" });

  await campaignRow
    .getByRole("button", {
      name: "Más acciones de Campaña para cupón",
      exact: true,
    })
    .click();

  await page
    .getByRole("menuitem", {
      name: "Editar",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Modalidad comercial" }),
  ).toBeDisabled();
});
test("MK-006: read, selection, save, conflict and state failure conserve context", async ({
  page,
}) => {
  await page.goto(
    "/promociones?modoRevision=1&escenario=error&modalidad=coupon",
  );
  await expect(page.getByRole("alert")).toContainText("contexto");
  await page.getByRole("button", { name: "Volver a consultar" }).click();
  await expect(
    page.getByRole("combobox", { name: "Modalidad", exact: true }),
  ).toHaveValue("Con cupón");
  await page.goto(
    "/promociones/carrera/editar?modoRevision=1&escenario=conflict",
  );
  await page
    .getByLabel("Nombre de la promoción", { exact: true })
    .fill("Propuesta revisada");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("cambió");
  await page
    .getByRole("button", { name: "Consultar registro actual", exact: true })
    .click();
  await expect(
    page.getByLabel("Nombre de la promoción", { exact: true }),
  ).toHaveValue("Propuesta revisada");
  await page
    .getByRole("button", { name: "Guardar propuesta revisada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Propuesta revisada", exact: true }),
  ).toBeVisible();
  await page.goto(
    "/promociones/carrera/estado?modoRevision=1&escenario=rejected",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desactivar promoción", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "configuración anterior se conservan",
  );
  await page.keyboard.press("Escape");
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Desactivar promoción", exact: true }),
  ).toBeVisible();
  await page.goto(
    "/promociones/nueva/alcance?modoRevision=1&escenario=selection-empty",
  );
  await expect(page.getByText("Sin candidatos", { exact: true })).toBeVisible();
  await page.goto(
    "/promociones/nueva/alcance?modoRevision=1&escenario=selection-error",
  );
  await expect(page.getByRole("alert")).toContainText("selección anterior");
  await expect(
    page.getByRole("button", { name: "Confirmar alcance", exact: true }),
  ).toBeDisabled();
});
test("MK-006: desktop evidence for all six views", async ({ page }) => {
  for (const [route, file] of [
    ["/promociones", "s01"],
    ["/promociones/nueva", "s02"],
    ["/promociones/carrera/editar", "s03"],
    ["/promociones/nueva/alcance", "s04"],
    ["/promociones/carrera", "s05"],
    ["/promociones/carrera/estado", "s06"],
  ]) {
    await page.goto(route!);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (file === "s06") await expect(page.getByRole("dialog")).toBeVisible();
    else if (file === "s03")
      await expect(
        page.getByLabel("Nombre de la promoción", { exact: true }),
      ).toHaveValue("Carrera de octubre");
    else if (file === "s04")
      await expect(
        page.getByRole("checkbox", {
          name: "Producto completo: Camiseta Running Endurance",
        }),
      ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= 1440),
    ).toBe(true);
    await page.screenshot({
      path: evidencePath(`promociones-${file}-1440.png`),
      fullPage: file !== "s06",
    });
  }
});
