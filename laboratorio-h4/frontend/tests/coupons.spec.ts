import { evidencePath } from "./support/evidence";
import { expect, test, type Page } from "@playwright/test";

async function noPageOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test("MK-005 S01/S04/S05: pagination, detail and limits retain the selected coupon and list context", async ({
  page,
}) => {
  await page.goto("/cupones?estado=active&tamanio=1");
  await expect(page.getByText("Mostrando 1 a 1 de 3")).toBeVisible();
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await expect(page.getByText("Mostrando 2 a 2 de 3")).toBeVisible();
  const detail = page.getByRole("link", {
    name: "Ver detalle de RUN10",
    exact: true,
  });
  await page.keyboard.press("Tab");
  await detail.focus();
  await expect(detail).toHaveCSS("outline-color", "rgb(67, 97, 238)");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Cupón — RUN10", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No restaurar uso al cancelar", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Ver límites y uso", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Límites y uso — RUN10", exact: true }),
  ).toBeVisible();
  const usage = page.getByRole("region", {
    name: "Uso global y límites",
    exact: true,
  });
  await expect(usage.getByText("Sin límite", { exact: true })).toHaveCount(3);
  await expect(usage.getByText("0", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Volver al detalle", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Volver al listado", exact: true })
    .click();
  await expect(page).toHaveURL(/estado=active.*tamanio=1.*pagina=2/);
  await expect(
    page.getByRole("combobox", { name: "Estado del cupón" }),
  ).toHaveValue("Activo");
  await expect(detail).toBeVisible();
  await page.reload();
  await expect(detail).toBeVisible();
  await noPageOverflow(page);
});

test("MK-005 S01: filters reset the page, browser history restores it and ordinary states stay neutral", async ({
  page,
}) => {
  await page.goto("/cupones?tamanio=1&pagina=2");
  await expect(
    page.getByRole("link", { name: "Ver detalle de RUN10" }),
  ).toBeVisible();
  const filter = page.getByRole("combobox", { name: "Estado del cupón" });
  await filter.click();
  await page.getByRole("option", { name: "Inactivo", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Ver detalle de FLASH25" }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("pagina")).toBe(false);
  await page.goBack();
  await expect(filter).toHaveValue("Todos");
  await expect(
    page.getByRole("link", { name: "Ver detalle de RUN10" }),
  ).toBeVisible();
  await page.goForward();
  await expect(filter).toHaveValue("Inactivo");
  const badge = page
    .getByRole("cell", { name: "Inactivo", exact: true })
    .locator(".mantine-Badge-root");
  await expect(badge).toHaveCSS("background-color", "rgb(237, 234, 226)");
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Ver detalle de BIENVENIDA15" }),
  ).toBeVisible();
});

test("MK-005: unavailable usage is not zero or unlimited; known exhausted capacity remains zero", async ({
  page,
}) => {
  await page.goto(
    "/cupones/bienvenida15/limites?modoRevision=1&escenario=usage-unavailable",
  );
  const usage = page.getByRole("region", {
    name: "Uso global y límites",
    exact: true,
  });
  await expect(usage.getByText("No disponible", { exact: true })).toHaveCount(
    2,
  );
  await expect(usage.getByText("0", { exact: true })).toHaveCount(0);
  await expect(usage.getByText("Sin límite", { exact: true })).toHaveCount(0);
  await page.goto("/cupones/cyberinka20/limites");
  await expect(usage.getByText("0", { exact: true })).toBeVisible();
  await expect(usage.getByText("500", { exact: true })).toHaveCount(2);
  await page.goto("/cupones/inexistente");
  await expect(
    page.getByText("Cupón no encontrado", { exact: true }),
  ).toBeVisible();
  await expect(usage).toHaveCount(0);
  await page
    .getByRole("link", { name: "Volver al listado", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Ver detalle de BIENVENIDA15" }),
  ).toBeVisible();
});

test("MK-005: invalid code is rejected and expired promotion is visible without consumption", async ({
  page,
}) => {
  await page.goto("/cupones/nuevo");
  const code = page.getByLabel("Código del cupón", { exact: true });
  await expect(code).toBeVisible();
  await expect(code).toBeEnabled();
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await code.fill("codigo invalido");
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByText("Ingresa un código con letras A–Z, números, guion o guion bajo.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/cupones\/nuevo$/);

  await page.goto("/cupones/cyberinka20?modoRevision=1&escenario=expired");
  await expect(page.getByText("Vigencia finalizada", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Validar un cupón en una compra no consume un uso.", {
      exact: false,
    }),
  ).toBeVisible();
});

test("MK-005: empty, filtered empty, read error, pending and access failure are distinct", async ({
  page,
}) => {
  await page.goto("/cupones?modoRevision=1&escenario=empty");
  await expect(
    page.getByText("Todavía no hay cupones", { exact: true }),
  ).toBeVisible();
  await page.goto("/cupones?modoRevision=1&escenario=empty&estado=inactive");
  await expect(
    page.getByText("Sin coincidencias", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restablecer filtros" }),
  ).toBeVisible();
  await page.goto("/cupones?modoRevision=1&escenario=error&estado=inactive");
  await expect(page.getByRole("alert")).toContainText(
    "El contexto se conserva",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Volver a consultar" }).click();
  await expect(
    page.getByRole("link", { name: "Ver detalle de FLASH25" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Estado del cupón" }),
  ).toHaveValue("Inactivo");
  await page.goto("/cupones?modoRevision=1&escenario=loading");
  await expect(
    page.getByRole("status", { name: "Cargando cupones de descuento" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Cupones de descuento" })
    .click();
  await expect(
    page.getByRole("link", { name: "Ver detalle de BIENVENIDA15" }),
  ).toBeVisible();
  for (const scenario of ["session", "forbidden"]) {
    await page.goto(`/cupones?modoRevision=1&escenario=${scenario}`);
    await expect(
      page.getByRole("status", {
        name:
          scenario === "session"
            ? "Verifica tu sesión"
            : "Acceso no disponible",
      }),
    ).toContainText(scenario === "session" ? "Tu sesión" : "No tienes permiso");
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Volver a consultar" }),
    ).toHaveCount(0);
  }
});

test("MK-005: deep-link error recovery retains identity and production-like URLs do not enable review fixtures", async ({
  page,
}) => {
  await page.goto(
    "/cupones/run10?estado=active&pagina=2&modoRevision=1&escenario=error",
  );
  await expect(page.getByRole("alert")).toContainText("No se pudo consultar");
  await page.getByRole("button", { name: "Volver a consultar" }).click();
  await expect(
    page.getByRole("heading", { name: "Cupón — RUN10", exact: true }),
  ).toBeVisible();
  await page.goto("/cupones/bienvenida15?escenario=missing");
  await expect(
    page.getByRole("heading", { name: "Cupón — BIENVENIDA15", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("combobox", { name: /Escenario/ })).toHaveCount(
    0,
  );
  await page.goto("/cupones?pagina=-1&tamanio=0");
  await expect(page.getByText("Mostrando 1 a 4 de 4")).toBeVisible();
  await page.goto("/cupones?pagina=999&tamanio=1");
  await expect(page.getByText("Mostrando 4 a 4 de 4")).toBeVisible();
});

test("MK-005: desktop evidence for all three read views", async ({ page }) => {
  await page.goto("/cupones");
  await expect(
    page.getByRole("link", { name: "Ver detalle de BIENVENIDA15" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Navegación de la aplicación" })
      .getByRole("link", { name: "Cupones de descuento" }),
  ).toHaveAttribute("aria-current", "page");
  await noPageOverflow(page);
  await page.screenshot({
    path: evidencePath("cupones-s01-1440.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Ver detalle de BIENVENIDA15" }).click();
  await expect(
    page.getByRole("heading", { name: "Cupón — BIENVENIDA15", exact: true }),
  ).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({
    path: evidencePath("cupones-s04-1440.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Ver límites y uso", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Límites y uso — BIENVENIDA15",
      exact: true,
    }),
  ).toBeVisible();
  await noPageOverflow(page);
  await page.screenshot({
    path: evidencePath("cupones-s05-1440.png"),
    fullPage: true,
  });
});
