import { evidencePath } from "./support/evidence";
import { expect, test, type Page } from "@playwright/test";

async function select(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function fillNew(page: Page, code: string) {
  await page.getByLabel("Código del cupón", { exact: true }).fill(code);
  await select(page, "Promoción asociada", "Campaña Bienvenida 2026");
  await select(page, "Estado inicial", "Activo");
  await page
    .getByRole("radio", { name: "Restaurar uso al cancelar", exact: true })
    .check();
}

test("MK-005 S02: crear cupón no consulta repository.read sin identificador", async ({
  page,
}) => {
  await page.route(
    "**/src/features/promotions/services/promotionServices.ts*",
    async (route) => {
      const response = await route.fetch();
      // Spy on the composed port before React mounts, without changing its result.
      await route.fulfill({
        response,
        body: `${await response.text()}
window.couponReadIds = [];
const couponRepository = getPromotionRuntime("mock").resolve(new URLSearchParams()).services.coupons;
const originalCouponRead = couponRepository.read.bind(couponRepository);
couponRepository.read = (id, signal) => {
  window.couponReadIds.push(id);
  return originalCouponRead(id, signal);
};`,
      });
    },
  );
  const readIds = () =>
    page.evaluate(
      () => (window as Window & { couponReadIds?: string[] }).couponReadIds,
    );

  await page.goto("/cupones/nuevo");
  const code = page.getByRole("textbox", {
    name: "Código del cupón",
    exact: true,
  });
  await code.fill("BORRADOR");
  await expect(code).toHaveValue("BORRADOR");
  expect(await readIds()).toEqual([]);

  // Positive control: the same spy observes reading an existing coupon.
  await page.goto("/cupones/run10/editar");
  await expect(code).toHaveValue("RUN10");
  expect(await readIds()).toContain("run10");
  expect(await readIds()).not.toContain("");
});

test("MK-005 S02: create normalized coupon only after valid data and preserve list context", async ({
  page,
}) => {
  await page.goto("/cupones?estado=active");
  await page.getByRole("link", { name: "Crear cupón", exact: true }).click();
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toBeFocused();
  await fillNew(page, "  nuevo-2026 ");
  await page.getByLabel("Límite global", { exact: true }).fill("0");
  await page.getByLabel("Monto mínimo", { exact: true }).fill("0.00");
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByText("Ingresa un entero positivo", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toHaveValue("  nuevo-2026 ");
  await page.getByLabel("Límite global", { exact: true }).fill("");
  await page.getByLabel("Monto mínimo", { exact: true }).fill("");
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cupón — NUEVO-2026", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Cupón guardado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Volver al listado", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Estado del cupón" }),
  ).toHaveValue("Activo");
  await expect(
    page.getByRole("link", { name: "Ver detalle de NUEVO-2026" }),
  ).toBeVisible();
});

test("MK-005 S02/S03: normalized duplicate fails; own code edit succeeds and recorded usage remains intact", async ({
  page,
}) => {
  await page.goto("/cupones/nuevo");
  await fillNew(page, " bienvenida15 ");
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByText("Ya existe otro cupón con este código.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Descartar cambios", exact: true })
    .click();
  await page.getByRole("link", { name: "Ver detalle de BIENVENIDA15" }).click();
  await page.getByRole("link", { name: "Editar cupón", exact: true }).click();
  await page.getByLabel("Límite global", { exact: true }).fill("120");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  const usage = page.getByRole("region", {
    name: "Uso global y límites",
    exact: true,
  });
  await expect(usage.getByText("28", { exact: true })).toBeVisible();
  await expect(usage.getByText("120", { exact: true })).toBeVisible();
  await expect(usage.getByText("No disponible", { exact: true })).toBeVisible();
});

test("MK-005: dirty draft survives menu and Back navigation until explicit discard", async ({
  page,
}) => {
  await page.goto("/cupones");
  await page.getByRole("link", { name: "Crear cupón", exact: true }).click();
  await page.getByLabel("Código del cupón", { exact: true }).fill("BORRADOR");
  await page
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Consultar precios" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cambios sin guardar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Seguir editando", exact: true })
    .click();
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toHaveValue("BORRADOR");
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Cambios sin guardar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Descartar cambios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cupones de descuento", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver detalle de BORRADOR" }),
  ).toHaveCount(0);
});

test("MK-005 S06: cancellation and rejection retain state/usage; confirmation changes only state", async ({
  page,
}) => {
  await page.goto("/cupones/bienvenida15");
  const trigger = page
    .getByRole("main")
    .getByRole("button", { name: "Desactivar cupón", exact: true });
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desactivar cupón", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Activar cupón", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Uso global y límites", exact: true })
      .getByText("28", { exact: true }),
  ).toBeVisible();
  // La baja confirmada de arriba ahora persiste en el navegador (ya no se reinicia al
  // navegar). El escenario de rechazo se prueba sobre otro cupón que sigue activo.
  await page.goto("/cupones/run10?modoRevision=1&escenario=rejected");
  await page
    .getByRole("button", { name: "Desactivar cupón", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Desactivar cupón", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "información anterior se conservan",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: "Desactivar cupón", exact: true }),
  ).toBeVisible();
});

test("MK-005: failed save conserves entries; unknown result is reconciled without a second save", async ({
  page,
}) => {
  await page.goto("/cupones/nuevo?modoRevision=1&escenario=save-error");
  await fillNew(page, "ERROR-CONSERVADO");
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Tus entradas");
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toHaveValue("ERROR-CONSERVADO");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Descartar cambios", exact: true })
    .click();
  await page.goto("/cupones/nuevo?modoRevision=1&escenario=unknown-result");
  await fillNew(page, "CONFIRMAR-RESULTADO");
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Crear cupón", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("status", { name: "Resultado sin confirmar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Consultar resultado", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Cupón — CONFIRMAR-RESULTADO",
      exact: true,
    }),
  ).toBeVisible();
});

test("MK-005 S02/S03/S06: desktop evidence and pending submission protection", async ({
  page,
}) => {
  await page.goto("/cupones/nuevo");
  await fillNew(page, "CUPON-EJEMPLO");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: evidencePath("cupones-s02-1440.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Descartar cambios", exact: true })
    .click();
  await page.getByRole("link", { name: "Ver detalle de RUN10" }).click();
  await page.getByRole("link", { name: "Editar cupón", exact: true }).click();
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toHaveValue("RUN10");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: evidencePath("cupones-s03-1440.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Desactivar cupón", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: evidencePath("cupones-s06-1440.png"),
    animations: "disabled",
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await page.goto("/cupones/nuevo?modoRevision=1&escenario=saving");
  await fillNew(page, "PENDIENTE");
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Crear cupón", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toBeDisabled();
});
