import { evidencePath } from "./support/evidence";
import { test, expect } from "@playwright/test";
import { longTableRow } from "../src/features/foundation/mocks/tableCases";

test("FND-01: ordinary active state is neutral and focus remains signal", async ({
  page,
}) => {
  await page.goto("/foundation/listados");
  const badge = page
    .getByRole("table")
    .locator(".mantine-Badge-root")
    .filter({ hasText: /^Activo$/ })
    .first();
  await expect(badge).toHaveCSS("background-color", "rgb(237, 234, 226)");
  await expect(badge).toHaveCSS("color", "rgb(27, 24, 18)");
  await page
    .getByRole("button", { name: "Ver detalle de Kit entrenamiento diario" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .locator(".mantine-Badge-root")
      .filter({ hasText: /^Activo$/ }),
  ).toHaveCSS("background-color", "rgb(237, 234, 226)");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "Ver detalle de Kit entrenamiento diario",
    }),
  ).toBeFocused();
  await page.goto("/foundation/formularios");
  await expect(
    page.getByRole("checkbox", { name: "Mostrar este ejemplo en la revisión" }),
  ).toHaveCSS("background-color", "rgb(252, 227, 208)");
  await expect(
    page.getByRole("radio", { name: "Simple", exact: true }),
  ).toHaveCSS("background-color", "rgb(252, 227, 208)");
});

test("FND-05: long content scrolls inside the table and preserves identifiers and controls", async ({
  page,
}) => {
  await page.goto("/foundation/listados");
  await page
    .getByRole("button", { name: "Ver tabla extensa", exact: true })
    .click();
  const region = page.getByRole("region", {
    name: "Tabla: Prueba de composición con columnas extensas",
    exact: true,
  });
  await expect(
    region.getByText(longTableRow.sku, { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await region.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBe(true);
  await region.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const action = region.getByRole("button", {
    name: "Ver descripción completa",
    exact: true,
  });
  await action.focus();
  await expect(action).toBeInViewport();
  expect(
    await action.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(longTableRow.detail);
  await page.keyboard.press("Escape");
  await expect(action).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await region.evaluate((element) => {
    element.scrollLeft = 0;
  });
  await page.screenshot({
    path: evidencePath("fnd-05-table-1440.png"),
    fullPage: true,
  });
});

test("FND-06: Back and Forward restore applied filters and discard an unapplied draft", async ({
  page,
}) => {
  await page.goto("/precios");
  const target = page.getByRole("combobox", {
    name: "Producto o SKU",
    exact: true,
  });
  await target.click();
  await page
    .getByRole("option", {
      name: "Talla 40 · Negro — ZAP-TRL-40-BLK",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Talla 40 · Negro", exact: true }),
  ).toBeVisible();
  await target.click();
  await page
    .getByRole("option", {
      name: "Talla 42 · Negro — ZAP-TRL-42-BLK",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Selección pendiente:", { exact: false }),
  ).toBeVisible();
  await page.goBack();
  await expect(target).toHaveValue(
    "Zapatilla Trail Inka Explorer · Producto base",
  );
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Selección pendiente:", { exact: false }),
  ).not.toBeVisible();
  await page.goForward();
  await expect(target).toHaveValue("Talla 40 · Negro — ZAP-TRL-40-BLK");
  await expect(
    page.getByRole("region", { name: "Talla 40 · Negro", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Selección pendiente:", { exact: false }),
  ).not.toBeVisible();
  await page.reload();
  await expect(target).toHaveValue("Talla 40 · Negro — ZAP-TRL-40-BLK");
  await expect(
    page.getByRole("region", { name: "Talla 40 · Negro", exact: true }),
  ).toBeVisible();
});
