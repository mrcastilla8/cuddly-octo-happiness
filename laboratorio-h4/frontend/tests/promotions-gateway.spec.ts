import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";

// Dedicated runner provides native Gateway/Promotions, real PG/TLS and synthetic
// signed session tokens. Ordinary frontend tests do not pretend to run this flow.
test.skip(
  !process.env.PROMOTIONS_E2E_BASE_URL,
  "Requiere gateway.isolated.smoke.mjs y PostgreSQL/TLS real.",
);
async function select(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
test("MK005/006/007: React → Gateway → Promotions → PostgreSQL, persistence and visible failures", async ({
  page,
}) => {
  const token = process.env.PROMOTIONS_E2E_TOKEN!;
  const evidence = process.env.PROMOTIONS_E2E_EVIDENCE!;
  const responses: { path: string; method: string; status: number }[] = [];
  page.on("response", (r) => {
    const path = new URL(r.url()).pathname;
    if (path.startsWith("/api/v1/"))
      responses.push({
        path,
        method: r.request().method(),
        status: r.status(),
      });
  });
  await page.addInitScript((value) => {
    window.__promotionsHttpTest = { token: value };
  }, token);
  await page.goto("/cupones");
  await expect(
    page.getByRole("heading", { name: "Cupones de descuento", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Datos de demostración", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Crear cupón", exact: true }).click();
  await page
    .getByLabel("Código del cupón", { exact: true })
    .fill(" ui_gateway ");
  await select(page, "Promoción asociada", "GATEWAY-CUPON-FIXTURE");
  await select(page, "Estado inicial", "Inactivo");
  await page.getByLabel("Límite global", { exact: true }).fill("3");
  await page
    .getByRole("radio", { name: "Restaurar uso al cancelar", exact: true })
    .check();
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cupón — UI_GATEWAY", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Editar cupón", exact: true }).click();
  await page.getByLabel("Límite global", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cupón — UI_GATEWAY", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Activar cupón", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Activar cupón", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("status", { name: "Estado actualizado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Volver al listado", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Ver detalle de UI_GATEWAY", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: join(evidence, "gateway-coupons-1440.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Crear cupón", exact: true }).click();
  await page.getByLabel("Código del cupón", { exact: true }).fill("UI_GATEWAY");
  await select(page, "Promoción asociada", "GATEWAY-CUPON-FIXTURE");
  await select(page, "Estado inicial", "Inactivo");
  await page
    .getByRole("radio", { name: "Restaurar uso al cancelar", exact: true })
    .check();
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "registro ya existe o cambió",
  );
  await expect(
    page.getByLabel("Código del cupón", { exact: true }),
  ).toHaveValue("UI_GATEWAY");
  await page.goto("/promociones");
  await expect(
    page.getByRole("link", {
      name: "Ver detalle de GATEWAY-CUPON-FIXTURE",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/recomendaciones");
  await expect(
    page.getByRole("link", {
      name: "Ver detalle de GATEWAY-REGLA-FIXTURE",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/cupones/00000000-0000-4000-8000-000000000000");
  await expect(
    page.getByText("Cupón no encontrado", { exact: true }),
  ).toBeVisible();
  await page.goto("/cupones");
  await page.evaluate(() => {
    window.__promotionsHttpTest!.token = "";
  });
  await page.goto("/cupones?pagina=2"); // init script restores the signed fixture session.
  await page.evaluate(() => {
    window.__promotionsHttpTest!.token = "";
  });
  await page
    .getByRole("combobox", { name: "Estado del cupón", exact: true })
    .click();
  await page.getByRole("option", { name: "Activo", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Verifica tu sesión", exact: true }),
  ).toContainText("sesión");
  await expect(
    page.getByRole("link", { name: "Crear cupón", exact: true }),
  ).toHaveAttribute("data-disabled", "true");
  await page.screenshot({
    path: join(evidence, "gateway-session-error-1440.png"),
    fullPage: true,
  });
  await page.evaluate((value) => {
    window.__promotionsHttpTest!.token = value;
  }, process.env.PROMOTIONS_E2E_FORBIDDEN_TOKEN!);
  await select(page, "Estado del cupón", "Todos");
  await expect(
    page.getByRole("status", { name: "Acceso no disponible", exact: true }),
  ).toContainText("permiso");
  expect(
    responses.some(
      (r) =>
        r.method === "POST" && r.path === "/api/v1/cupones" && r.status === 201,
    ),
  ).toBe(true);
  expect(responses.some((r) => r.method === "PATCH" && r.status === 200)).toBe(
    true,
  );
  expect(
    responses.some((r) => r.path.endsWith("/activar") && r.status === 200),
  ).toBe(true);
  expect(responses.some((r) => r.status === 409)).toBe(true);
  expect(responses.some((r) => r.status === 403)).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
