// Published HTTP DTO fixtures; these do not certify shared Catalog or G7.
import { expect, test, type Page } from "@playwright/test";

const simple = { product_id: "simple", slug: "simple", name: "Producto anterior", categoria_id: "cat", tipo_producto_id: "type", marca_id: "brand", tiene_variantes: false, sku_base: "SKU-SIMPLE" };
const variable = { ...simple, product_id: "variable", name: "Producto con variantes", tiene_variantes: true, sku_base: null };
const old = { ...simple, product_id: "old", name: "Recomendado anterior", sku_base: "SKU-OLD" };
const parent = {
  promotionId: "parent", nombre: "Promoción histórica", modalidad: "CUPON", estado: "INACTIVO",
  tipoDescuento: "PORCENTAJE", valor: 10, prioridad: 1,
  validFrom: "2026-10-01T05:00:00Z", validUntil: "2026-12-01T05:00:00Z",
  alcance: { productIds: [simple.product_id], skus: ["SKU-L"] }, canalesHabilitados: ["MARKETPLACE"],
  politicaCombinacion: { ofertaPricing: false, promocionAutomatica: false, cupon: false }, puedeCambiarModalidad: true,
};
const rule = {
  reglaId: "rule", nombre: "Regla histórica", tipo: "CROSS_SELL", origen: { tipo: "PRODUCTO", id: "simple" },
  estado: "INACTIVO", prioridad: 1, validFrom: parent.validFrom, validUntil: parent.validUntil,
  recomendados: [{ productId: "old", orden: 1 }],
};
const pageDto = (items: unknown[], nested = false) => {
  const meta = { pagina: 1, tamanio: 100, total: items.length, totalPaginas: items.length ? 1 : 0 };
  return nested ? { items, meta } : { items, ...meta };
};
async function setup(page: Page) {
  const html = await (await page.request.get("/tests/harness/promotions-http.html")).text();
  const state = { inactive: false, nullBase: false, fail: false, writes: [] as { method: string; body: Record<string, unknown> }[] };
  let campaign = structuredClone(parent);
  let recommendation = structuredClone(rule);
  await page.addInitScript(() => { window.__promotionsHttpTest = { token: "synthetic-history-user" }; });
  await page.route("**/*", route => route.request().resourceType() === "document" && /^\/(promociones|recomendaciones)\//.test(new URL(route.request().url()).pathname)
    ? route.fulfill({ contentType: "text/html", body: html }) : route.fallback());
  await page.route("**/api/v1/**", route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    if (request.method() !== "GET") {
      const body = request.postDataJSON() as Record<string, unknown>;
      state.writes.push({ method: request.method(), body });
      const isRecommendation = path.includes("/recomendaciones/");
      if (isRecommendation) recommendation = { ...recommendation, ...body };
      else campaign = { ...campaign, ...body };
      return route.fulfill({ status: request.method() === "POST" ? 201 : 200, json: isRecommendation ? recommendation : campaign });
    }
    if (path === "/api/v1/productos") {
      if (state.fail) return route.fulfill({ status: 503, json: {} });
      return route.fulfill({ json: pageDto(url.searchParams.get("estado") === "INACTIVO" ? state.inactive ? [
        { ...simple, product_id: "unrelated", name: "Inactivo no relacionado", sku_base: null },
        { ...simple, sku_base: state.nullBase ? null : simple.sku_base }, old,
      ] : [] : state.inactive ? [variable] : [simple, variable, old]) });
    }
    if (path.endsWith("/variantes")) return route.fulfill({ json: pageDto(url.searchParams.get("estado") === "INACTIVA"
      ? state.inactive ? [{ variant_id: "v-l", sku: "SKU-L", status: "INACTIVA" }] : []
      : [{ variant_id: "v-m", sku: "SKU-M", status: "ACTIVA" }, ...state.inactive ? [] : [{ variant_id: "v-l", sku: "SKU-L", status: "ACTIVA" }]], true) });
    if (path === "/api/v1/categorias/administracion") return route.fulfill({ json: pageDto([{ categoriaId: "cat", nombre: "Categoría", estado: "ACTIVO", version: 1 }], true) });
    return route.fulfill({ json: path.includes("/recomendaciones/") ? recommendation : campaign });
  });
  return state;
}

test("HTTP campaign: creation then inactive SKU editing ignores an unrelated inactive product with null base SKU", async ({ page }, info) => {
  const state = await setup(page);
  await page.goto("/promociones/nueva");
  await page.getByLabel("Nombre de la promoción", { exact: true }).fill(parent.nombre);
  for (const [label, option] of [["Modalidad comercial", "Con cupón"], ["Estado inicial", "Inactivo"], ["Tipo de beneficio", "Porcentaje"]]) {
    await page.getByRole("combobox", { name: label, exact: true }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }
  await page.getByLabel("Prioridad", { exact: true }).fill("1");
  await page.getByLabel("Valor del beneficio", { exact: true }).fill("10");
  await page.getByLabel("Fecha y hora de inicio", { exact: true }).fill("2026-10-01T00:00");
  await page.getByLabel("Fecha y hora de fin", { exact: true }).fill("2026-12-01T00:00");
  await page.getByRole("checkbox", { name: "Marketplace", exact: true }).check();
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  await page.getByRole("checkbox", { name: "Producto completo: Producto anterior", exact: true }).check();
  await page.getByRole("checkbox", { name: "SKU específico: SKU-L · SKU-L", exact: true }).check();
  await page.getByRole("button", { name: "Confirmar alcance", exact: true }).click();
  await page.getByRole("button", { name: "Crear promoción", exact: true }).click();
  await expect(page.getByRole("heading", { name: parent.nombre, exact: true })).toBeVisible();
  expect(state.writes[0]?.body.alcance).toEqual(parent.alcance);
  state.inactive = true;
  await page.getByRole("link", { name: "Editar promoción", exact: true }).click();
  await expect(page.getByRole("region", { name: "Canales y alcance" })).toContainText(simple.name);
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Conservar producto: Producto anterior", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Conservar SKU: SKU-L", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /Inactivo no relacionado/ })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Producto completo: Producto anterior", exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "SKU específico: SKU-L · SKU-L", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Confirmar alcance", exact: true }).click();
  await page.getByLabel("Nombre de la promoción", { exact: true }).fill("Solo nombre actualizado");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Solo nombre actualizado", exact: true })).toBeVisible();
  expect(state.writes.at(-1)?.body).toEqual({ nombre: "Solo nombre actualizado" });
  await page.screenshot({ path: info.outputPath("historical-campaign-1440.png") });
});

test("HTTP campaign: historical product ID with null base SKU stays visible without a fabricated SKU", async ({ page }) => {
  const state = await setup(page);
  state.inactive = true; state.nullBase = true;
  await page.goto("/promociones/parent/editar/alcance");
  await expect(page.getByRole("checkbox", { name: "Conservar producto: Producto anterior", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Conservar SKU: SKU-L", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /SKU-SIMPLE/ })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /Inactivo no relacionado/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Confirmar alcance", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Confirmar alcance", exact: true }).click();
  await expect(page.getByRole("region", { name: "Canales y alcance" })).toContainText(simple.name);
  await expect(page.getByRole("region", { name: "Canales y alcance" })).toContainText("SKU-L");
  expect(state.writes).toEqual([]);
});

test("HTTP campaign: historical product/SKU associations are removed only by explicit selection", async ({ page }) => {
  const state = await setup(page);
  state.inactive = true;
  await page.goto("/promociones/parent/editar/alcance");
  await page.getByRole("checkbox", { name: "Conservar producto: Producto anterior", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Conservar producto: Producto anterior", exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Conservar SKU: SKU-L", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Conservar SKU: SKU-L", exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Producto completo: Producto con variantes", exact: true }).check();
  await page.getByRole("button", { name: "Confirmar alcance", exact: true }).click();
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes.at(-1)?.body.alcance).toEqual({ productIds: ["variable"], skus: [] });
});

test("HTTP recommendation: inactive origin/candidate remain visible and can be replaced or removed explicitly", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/recomendaciones/rule/editar");
  await expect(page.getByRole("combobox", { name: "Producto de origen", exact: true })).toHaveValue(simple.name);
  state.inactive = true;
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Producto de origen", exact: true })).toHaveValue(simple.name);
  await expect(page.getByRole("table")).toContainText(old.name);
  await expect(page.getByRole("table")).toContainText("Inactivo · asociación conservada");
  await page.getByRole("combobox", { name: "Producto de origen", exact: true }).click();
  await expect(page.getByRole("option", { name: simple.name, exact: true })).toHaveAttribute("data-combobox-disabled", "true");
  await expect(page.getByRole("option", { name: old.name, exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: `Quitar ${old.name}`, exact: true }).click();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("link", { name: /Seleccionar productos/ }).click();
  await expect(page.getByRole("checkbox", { name: old.name, exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: variable.name, exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
});

test("HTTP historical lookup failure preserves original associations and proposed fields", async ({ page }) => {
  const state = await setup(page);
  state.inactive = true; state.fail = true;
  await page.goto("/promociones/parent/editar/alcance");
  await expect(page.getByText("Catálogo no disponible", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Conservar producto: simple", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Conservar SKU: SKU-L", exact: true })).toBeChecked();
  await expect(page.getByRole("button", { name: "Confirmar alcance", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Cancelar selección", exact: true }).click();
  await expect(page.getByRole("region", { name: "Canales y alcance" })).toContainText("SKU-L");
  await page.getByLabel("Nombre de la promoción", { exact: true }).fill("Borrador conservado");
  await expect(page.getByLabel("Nombre de la promoción", { exact: true })).toHaveValue("Borrador conservado");
  expect(state.writes).toEqual([]);
});
