import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";

// Explicit G7 contract fixture; native Gateway/Promotions and real PG/TLS.
// Exercises src/main.tsx. No page.route(), token injection or auth overrides.
test.skip(
  !process.env.PROMOTIONS_SESSION_E2E_BASE_URL,
  "Requiere el runner Gateway/PG/TLS y el proveedor G7 descartable de contrato.",
);
const evidence = process.env.PROMOTIONS_E2E_EVIDENCE;
const failures = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  failures.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(failures.get(page)).toEqual([]);
});

async function login(
  page: Page,
  account = "manager",
  password = "isolated-g7-password",
) {
  await page
    .getByRole("textbox", { name: "Correo electrónico", exact: true })
    .fill(account + "@example.test");
  await page.getByLabel("Contraseña").fill(password);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
}
async function select(page: Page, label: string, value: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
async function noPersistentSession(page: Page) {
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
        cookie: document.cookie,
      }),
    ),
  ).not.toMatch(
    /accessToken|refreshToken|challengeToken|eyJ|isolated-g7-password/,
  );
  await expect(
    page.getByText("Datos de demostración", { exact: true }),
  ).toHaveCount(0);
}

test("#78: login real del cliente, CRUD por Gateway/PG, 409, recarga y logout", async ({
  page,
}) => {
  await page.goto("/cupones");
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  await login(page, "manager", "wrong-password");
  await expect(
    page.getByText("El correo o la contraseña no son correctos.", {
      exact: true,
    }),
  ).toBeVisible();
  await login(page);
  await expect(
    page.getByText("Sesión de Gestora E2E", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Crear cupón", exact: true }).click();
  await page
    .getByLabel("Código del cupón", { exact: true })
    .fill(" ui_session ");
  await select(page, "Promoción asociada", "GATEWAY-CUPON-FIXTURE");
  await select(page, "Estado inicial", "Inactivo");
  await page.getByLabel("Límite global", { exact: true }).fill("4");
  await page
    .getByRole("radio", { name: "Restaurar uso al cancelar", exact: true })
    .check();
  await page.getByRole("button", { name: "Crear cupón", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cupón — UI_SESSION", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Editar cupón", exact: true }).click();
  await page.getByLabel("Límite global", { exact: true }).fill("7");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cupón — UI_SESSION", exact: true }),
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
  const detail = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Cupón — UI_SESSION", exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(detail);
  await noPersistentSession(page);
  await page.screenshot({
    path: join(evidence!, "session-gateway-coupon-1440.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Volver al listado", exact: true })
    .click();
  await page.getByRole("link", { name: "Crear cupón", exact: true }).click();
  await page.getByLabel("Código del cupón", { exact: true }).fill("UI_SESSION");
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
  ).toHaveValue("UI_SESSION");
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
});

test("#78: MFA no accede al Gateway antes de verificar el código", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/v1/"))
      requests.push(request.url());
  });
  await page.goto("/cupones");
  await login(page, "mfa");
  const code = page.getByRole("textbox", {
    name: "Código de verificación",
    exact: true,
  });
  await expect(code).toBeVisible();
  expect(requests).toEqual([]);
  await page
    .getByRole("button", { name: "Enviar código al correo", exact: true })
    .click();
  await expect(
    page.getByText(
      "Enviamos el código a tu correo. Revisa tu bandeja de entrada.",
      { exact: true },
    ),
  ).toBeVisible();
  await code.fill("000000");
  await page
    .getByRole("button", { name: "Verificar código", exact: true })
    .click();
  await expect(
    page.getByText("El código no es correcto. Revísalo e intenta de nuevo.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  await code.fill("123456");
  await page
    .getByRole("button", { name: "Verificar código", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Ver detalle de UI_SESSION", exact: true }),
  ).toBeVisible();
  await noPersistentSession(page);
  await page.screenshot({
    path: join(evidence!, "session-gateway-mfa-1440.png"),
    fullPage: true,
  });
});

test("#78: JWT expirado rechazado por Gateway renueva una vez y consulta PG", async ({
  page,
}) => {
  const statuses: number[] = [];
  let refreshes = 0;
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (path === "/api/v1/cupones") statuses.push(response.status());
    if (path === "/g7/api/v1/auth/refresh") refreshes++;
  });
  await page.goto("/cupones");
  await login(page, "renew");
  await expect(
    page.getByRole("link", { name: "Ver detalle de UI_SESSION", exact: true }),
  ).toBeVisible();
  expect(statuses).toEqual([401, 200]);
  expect(refreshes).toBe(1);
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  await noPersistentSession(page);
});

test("#78: refresh revocado devuelve al login sin bucle de reintentos", async ({
  page,
}) => {
  let refreshes = 0;
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/g7/api/v1/auth/refresh")
      refreshes++;
  });
  await page.goto("/cupones");
  await login(page, "revoked");
  await expect(
    page.getByText("Tu sesión terminó. Inicia sesión de nuevo.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  expect(refreshes).toBe(1);
  await expect(
    page.getByRole("link", { name: "Ver detalle de UI_SESSION", exact: true }),
  ).toHaveCount(0);
});

test("#78: usuario CLIENTE recibe 403 real y no puede administrar cupones", async ({
  page,
}) => {
  await page.goto("/cupones");
  await login(page, "reader");
  await expect(
    page.getByRole("status", { name: "Acceso no disponible", exact: true }),
  ).toContainText("permiso");
  await expect(
    page.getByRole("link", { name: "Crear cupón", exact: true }),
  ).toHaveAttribute("data-disabled", "true");
  await noPersistentSession(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: join(evidence!, "session-gateway-forbidden-1440.png"),
    fullPage: true,
  });
});
