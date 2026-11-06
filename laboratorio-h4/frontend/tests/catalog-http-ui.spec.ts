import { expect, test } from "@playwright/test";

test("UI API 1440: POST contractual, error 409 visible, datos conservados y sin reenvío automático", async ({ page }) => {
  let posts = 0;
  await page.route("https://gateway.test/api/v1/**", async route => {
    const request = route.request(); const url = new URL(request.url());
    let body: unknown;
    let status = 200;
    if (request.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, PATCH" } }); return; }
    if (request.method() === "POST") {
      posts++; status = 409; body = { code: "SKU_DUPLICADO" };
      expect(request.postDataJSON()).toMatchObject({ nombre: "Producto HTTP", skuBase: "000-SKU", categoriaId: "cat-api", tipoProductoId: "type-api", marcaId: "brand-api" });
      expect(request.headers()).not.toHaveProperty("authorization");
    } else if (url.pathname.endsWith("/categorias")) body = { categories: [{ categoria_id: "cat-api", name: "Categoría HTTP", status: "ACTIVA" }] };
    else if (url.pathname.endsWith("/marcas")) body = { brands: [{ marca_id: "brand-api", name: "Marca HTTP", status: "ACTIVA" }] };
    else if (url.pathname.endsWith("/tipos-producto")) body = { items: [{ tipoProductoId: "type-api", nombre: "Tipo HTTP", estado: "ACTIVO" }], meta: { pagina: 1, tamanio: 100, total: 1, totalPaginas: 1 } };
    else body = { tipoProducto: { tipoProductoId: "type-api" }, schemaVersion: 1, caracteristicas: [] };
    await route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) });
  });
  await page.goto("/tests/harness/catalog-http.html");
  await expect(page.getByRole("heading", { name: "Crear producto" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("combobox", { name: "Categoría", exact: true })).toHaveValue("Categoría HTTP");
  await page.getByLabel("Nombre del producto").fill("Producto HTTP");
  await page.getByLabel("Descripción comercial").fill("Se conserva tras error");
  await page.getByLabel("SKU Base").fill("000-SKU");
  await page.getByLabel("Precio base inicial (S/.)").fill("20");
  await page.getByRole("button", { name: "Guardar borrador", exact: true }).click();
  await expect(page.getByText(/409, SKU_DUPLICADO/)).toBeVisible();
  await expect(page.getByLabel("Nombre del producto")).toHaveValue("Producto HTTP");
  await expect(page.getByLabel("SKU Base")).toHaveValue("000-SKU");
  expect(posts).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath("catalogo-http-error-1440.png"), fullPage: true });
});

for (const status of [401, 403, 503]) {
  test(`UI API: ${status} no muestra fixtures ni lo transforma en lista vacía`, async ({ page }) => {
    await page.route("https://gateway.test/api/v1/**", route => route.fulfill({ status, contentType: "application/problem+json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ code: status === 401 ? "TOKEN_INVALIDO" : status === 403 ? "SCOPE_INSUFICIENTE" : "SERVICIO_NO_DISPONIBLE" }) }));
    await page.goto("/tests/harness/catalog-http.html?path=/productos");
    await expect(page.getByRole("heading", { name: "Gestión de productos" })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(new RegExp(`${status},`)).first()).toBeVisible();
    await expect(page.getByText("Camiseta Running Endurance", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("row").filter({ hasText: "CAM-RUN" })).toHaveCount(0);
  });
}

test("UI API: lectura administrativa bloqueada conserva preparación independiente y no afirma 404", async ({ page }) => {
  await page.route("https://gateway.test/api/v1/**", route => {
    const preparation = route.request().url().endsWith("/preparacion");
    return route.fulfill({ status: preparation ? 200 : 404, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(preparation ? {
      product_id: "product", tiene_variantes: false, pricing: { status: "PENDING", manual_retry_allowed: false },
      inventario: { status: "REJECTED", manual_retry_allowed: false, code: "UBICACION_NO_ENCONTRADA" }, variantes: [],
    } : { code: "PRODUCTO_NO_ENCONTRADO" }) });
  });
  await page.goto("/tests/harness/catalog-http.html?path=/productos/product/preparacion");
  await expect(page.getByRole("heading", { name: "Información del producto no disponible" })).toBeVisible();
  await expect(page.getByText("Pricing: En preparación", { exact: true })).toBeVisible();
  await expect(page.getByText("Inventario: Rechazado", { exact: true })).toBeVisible();
  await expect(page.getByText("404 - Producto inexistente", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Reintentar preparación/ })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("catalogo-preparacion-parcial-1440.png"), fullPage: true });
});
