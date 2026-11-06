import { expect, test, type Page } from "@playwright/test";
const session = {
  accessToken: "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJzeW50aGV0aWMifQ.signature",
  refreshToken: "synthetic-browser-refresh",
  tokenType: "Bearer",
  expiresIn: 900,
  usuario: {
    id: "11111111-1111-4111-8111-111111111111",
    nombreCompleto: "Gestora de prueba",
    correo: "isolated@example.test",
    roles: ["GESTOR_COMERCIAL"],
  },
};
async function setup(page: Page, mfa = false, forbidden = false) {
  const html = await (
    await page.request.get("/tests/harness/promotions-session.html")
  ).text();
  const calls: string[] = [];
  await page.route("**/*", (route) => {
    const request = route.request();
    if (
      request.resourceType() === "document" &&
      new URL(request.url()).pathname === "/cupones"
    )
      return route.fulfill({ contentType: "text/html", body: html });
    return route.fallback();
  });
  await page.route("**/api/v1/**", (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    calls.push(path);
    if (path.startsWith("/g7/")) {
      if (path.endsWith("/logout")) return route.abort();
      if (mfa && path.endsWith("/login"))
        return route.fulfill({
          json: {
            mfaRequerido: true,
            challengeToken: "synthetic-challenge",
            expiraEn: 300,
          },
        });
      if (path.endsWith("/solicitar"))
        return route.fulfill({
          status: 202,
          json: { expiraEn: 300, desafioExpiraEn: 240 },
        });
      return route.fulfill({ json: session });
    }
    expect(request.headers().authorization).toBe(
      `Bearer ${session.accessToken}`,
    );
    if (forbidden)
      return route.fulfill({
        status: 403,
        json: { code: "SCOPE_INSUFICIENTE" },
      });
    return route.fulfill({
      json: {
        items: [],
        meta: { pagina: 1, tamanio: 10, total: 0, totalPaginas: 0 },
      },
    });
  });
  return calls;
}
async function login(page: Page) {
  await page
    .getByRole("textbox", { name: "Correo electrónico", exact: true })
    .fill("isolated@example.test");
  await page.getByLabel("Contraseña").fill("synthetic-password");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
}
test("MK005: sesión G7 habilita HTTP; recarga y logout sin red exigen login, sin persistir tokens", async ({
  page,
}) => {
  const calls = await setup(page);
  await page.goto("/cupones");
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  expect(calls).toHaveLength(0);
  await login(page);
  await expect(
    page.getByText("Sesión de Gestora de prueba", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => calls.some((p) => p === "/api/v1/cupones"))
    .toBe(true);
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
        cookie: document.cookie,
      }),
    ),
  ).not.toMatch(/synthetic|eyJ|refresh/i);
  await page.screenshot({
    path: test.info().outputPath("session-active-1440.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
  await login(page);
  await expect(
    page.getByRole("button", { name: "Cerrar sesión", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión", exact: true }),
  ).toBeVisible();
});
test("MK005: MFA no consulta cupones hasta verificar y conserva la ruta pedida", async ({
  page,
}) => {
  const calls = await setup(page, true);
  await page.goto("/cupones");
  await login(page);
  await expect(
    page.getByRole("textbox", { name: "Código de verificación", exact: true }),
  ).toBeVisible();
  expect(calls.some((p) => p === "/api/v1/cupones")).toBe(false);
  await page
    .getByRole("button", { name: "Enviar código al correo", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Enviamos el código");
  await page
    .getByRole("textbox", { name: "Código de verificación", exact: true })
    .fill("123456");
  await page
    .getByRole("button", { name: "Verificar código", exact: true })
    .click();
  await expect(
    page.getByText("Sesión de Gestora de prueba", { exact: true }),
  ).toBeVisible();
  expect(page.url()).toMatch(/\/cupones$/);
});
test("MK005: G7 autenticado con 403 de Gateway muestra el fallo sin datos mock", async ({
  page,
}) => {
  await setup(page, false, true);
  await page.goto("/cupones");
  await login(page);
  await expect(
    page.getByRole("status", { name: "Acceso no disponible", exact: true }),
  ).toContainText("No tienes permiso");
  await expect(page.getByText("VERANO10", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("session-forbidden-1440.png"),
    fullPage: true,
  });
});
