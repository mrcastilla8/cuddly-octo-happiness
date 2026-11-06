import { test, expect, type Page } from "@playwright/test";

// HTTP interceptado de forma explícita. No hay Gateway/DB real en esta suite.
const price = {
  product_id: "http-product",
  precio_regular: 12.3,
  precio_oferta: null,
  currency: "PEN",
  channel_id: null,
  valid_from: "2026-10-01T00:00:00Z",
  valid_until: null,
  price_version: 4,
};

async function mount(page: Page, path = "/precios?target=http-test") {
  await page.goto(
    "/src/features/pricing/testing/pricing-http.html?" +
      new URLSearchParams({ path }),
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function confirm(page: Page) {
  await page
    .getByRole("textbox", { name: "Nuevo precio regular", exact: true })
    .fill("14.00");
  await page
    .getByRole("textbox", { name: "Motivo del cambio", exact: true })
    .fill("Prueba del adaptador HTTP");
  await page
    .getByRole("radio", { name: "Retirar oferta", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cambio de precio", exact: true })
    .click();
}

test("API: lectura con mapper real, sin controles mock y lectura antigua ante 503", async ({
  page,
}) => {
  let unavailable = false;
  await page.route("**/api/v1/precios/**", (route) =>
    route.fulfill({
      status: unavailable ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        unavailable ? { code: "SERVICIO_NO_DISPONIBLE" } : price,
      ),
    }),
  );
  await mount(page);
  const summary = page.getByRole("region", {
    name: "Producto HTTP de prueba",
    exact: true,
  });
  await expect(summary).toContainText("S/ 12.30");
  await expect(
    page.getByText("Escenario de guardado", { exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("consulta-http-1440.png"),
    fullPage: true,
  });
  unavailable = true;
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(
    page.getByText("Última consulta disponible", { exact: true }),
  ).toBeVisible();
  await expect(summary).toContainText("S/ 12.30");
  await expect(
    page.getByRole("link", { name: "Editar precio", exact: true }),
  ).toHaveCount(0);
});

test("API: PATCH confirmado conserva versión y reconsulta al volver a precio vigente", async ({
  page,
}) => {
  let stored = { ...price };
  let patches = 0;
  let reads = 0;
  await page.route("**/api/v1/precios/**", async (route) => {
    if (route.request().method() === "PATCH") {
      patches++;
      expect(route.request().postDataJSON()).toEqual({
        precioRegular: 14,
        precioOferta: null,
        accionPrecioOferta: "ELIMINAR",
        moneda: "PEN",
        motivoCambio: "Prueba del adaptador HTTP",
        priceVersion: 4,
        channelId: null,
      });
      stored = { ...price, precio_regular: 14, price_version: 5 };
    } else reads++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stored),
    });
  });
  await mount(page, "/precios/editar?target=http-test");
  await confirm(page);
  await expect(
    page.getByText("Precio actualizado", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Consultar el precio vigente", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Producto HTTP de prueba", exact: true }),
  ).toContainText("S/ 14.00");
  expect(patches).toBe(1);
  await expect(
    page.getByRole("heading", { level: 1, name: "Gestión de precios" }),
  ).toBeVisible();
  await expect.poll(() => reads).toBeGreaterThanOrEqual(2);
  await page.screenshot({
    path: test.info().outputPath("precio-confirmado-http-1440.png"),
    fullPage: true,
  });
});

test("API: 409 conserva formulario, sin éxito ni segundo PATCH", async ({
  page,
}) => {
  let patches = 0;
  await page.route("**/api/v1/precios/**", async (route) => {
    const write = route.request().method() === "PATCH";
    if (write) patches++;
    await route.fulfill({
      status: write ? 409 : 200,
      contentType: "application/json",
      body: JSON.stringify(write ? { code: "VERSION_CONFLICT" } : price),
    });
  });
  await mount(page, "/precios/editar?target=http-test");
  await confirm(page);
  await expect(
    page.getByText("El precio cambió desde tu consulta", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Motivo del cambio", exact: true }),
  ).toHaveValue("Prueba del adaptador HTTP");
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toBeDisabled();
  expect(patches).toBe(1);
});

test("Pricing API no impide auditoría mock cuando se inyecta explícitamente su runtime", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria");
  await expect(page.getByText("Mostrando 1 a 20 de 25")).toBeVisible();
  await expect(page.getByText(/simulad|demostración/i).first()).toBeVisible();
});

test("API: timeout y relectura anterior conservan formulario y bloqueo sin segundo PATCH", async ({ page }) => {
  let patches = 0;
  let stored = { ...price };
  await page.route("**/api/v1/precios/**", async (route) => {
    if (route.request().method() === "PATCH") {
      patches++;
      await route.abort("timedout");
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored) });
  });
  await mount(page, "/precios/editar?target=http-test");
  await confirm(page);
  await expect(page.getByText("Resultado desconocido", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Releer precio", exact: true }).click();
  await expect(page.getByText(/La lectura no confirma una versión superior/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nuevo precio regular", exact: true })).toHaveValue("14.00");
  await expect(page.getByRole("textbox", { name: "Motivo del cambio", exact: true })).toHaveValue("Prueba del adaptador HTTP");
  await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeDisabled();
  await page.screenshot({ path: test.info().outputPath("resultado-incierto-http-1440.png"), fullPage: true });
  stored = { ...price, precio_regular: 14, price_version: 5 };
  await page.getByRole("button", { name: "Releer precio", exact: true }).click();
  await expect(page.getByText("Comparar lectura y propuesta", { exact: true })).toBeVisible();
  await expect(page.getByText("Precio actualizado", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Guardar cambios", exact: true })).toBeDisabled();
  expect(patches).toBe(1);
});

test("API: la galería no muestra controles ni datos de demostración de Pricing", async ({
  page,
}) => {
  await mount(page, "/foundation/pricing");
  await expect(
    page.getByText("Muestras no disponibles", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }),
  ).toHaveCount(0);
});
