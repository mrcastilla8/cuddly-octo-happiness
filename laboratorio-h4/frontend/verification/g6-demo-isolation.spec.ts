import { expect, test } from "@playwright/test";

test("Demo activada: ruta propia, regreso con filtros y módulos administrativos accesibles a 1440 px (HTTP simulado)", async ({ page }) => {
  const requests: string[] = [];
  await page.route("https://gateway.test/api/v1/**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(path);
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET" } });
    const product = { product_id: "p", name: "Producto HTTP simulado", sku_base: null, categoria_id: "c", images: [] };
    const body = path.endsWith("/categorias") ? { categories: [{ categoria_id: "c", name: "Categoría HTTP" }] }
      : path.includes("/precios/") ? { product_id: "p", currency: "PEN", precio_regular: 20, precio_oferta: null }
      : path.endsWith("/productos/p") ? product : { items: [product], pagina: 1, tamanio: 20, total: 1 };
    return route.fulfill({ contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(body) });
  });
  await page.goto("/demo/g6/productos?estado=ACTIVO&q=HTTP");
  await expect(page.getByRole("heading", { name: "G6 · Productos y Ofertas" })).toBeVisible();
  await expect(page.getByTestId("real-price")).toHaveText(/20/);
  await expect(page.getByRole("cell", { name: "Sin SKU base", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("demo-aislada-1440.png"), fullPage: true });
  await page.getByRole("link", { name: "Producto HTTP simulado", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Detalle del producto" })).toBeVisible();
  await page.getByRole("link", { name: "Volver a productos" }).click();
  await expect(page).toHaveURL(/\/demo\/g6\/productos\?estado=ACTIVO&q=HTTP$/);
  await page.goto("/productos");
  await expect(page.getByRole("heading", { name: "Gestión de productos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "G6 · Productos y Ofertas" })).toHaveCount(0);
  await page.goto("/precios");
  await expect(page.getByRole("navigation").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "G6 · Productos y Ofertas" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/precios$/);
  expect(requests.some(path => path.includes("/precios/productos/"))).toBe(true);
});
