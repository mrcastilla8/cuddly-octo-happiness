import { test, expect } from "@playwright/test";
import { resolveDataMode } from "../src/app/config/dataMode";

test("N03: production requires an explicit mode, development alone defaults to mock", () => {
  expect(resolveDataMode(undefined, true)).toBe("mock");
  expect(() => resolveDataMode(undefined, false)).toThrow("VITE_DATA_MODE");
  expect(() => resolveDataMode("", false)).toThrow("VITE_DATA_MODE");
  expect(() => resolveDataMode("unknown", true)).toThrow("VITE_DATA_MODE");
  expect(resolveDataMode("mock", false)).toBe("mock");
  expect(resolveDataMode("api", false)).toBe("api");
});

test("N05: catalog retry preserves the adapter and document without reloading the application", async ({
  page,
}) => {
  await page.goto("/tests/harness/pricing-adapter.html?fail-catalog=1");
  await expect(page.getByRole("alert")).toContainText(
    "Catálogo alternativo no disponible",
  );
  const documentStarted = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => {
    window.pricingAudit.failCatalog = false;
  });
  await page
    .getByRole("button", { name: "Volver a cargar productos y SKU" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Producto o SKU" }),
  ).toHaveValue("Cafetera Andina · Producto base");
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(
    documentStarted,
  );
  expect(
    await page.evaluate(
      () =>
        window.pricingAudit.calls.filter(
          (call) => call.operation === "listTargets",
        ).length,
    ),
  ).toBe(2);
  await expect(page.getByText("Zapatilla", { exact: false })).toHaveCount(0);
});

test("N03: API mode blocks mock-only modules and never loads their adapters", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  for (const path of [
    "/cupones/nuevo",
    "/promociones/nueva/alcance",
    "/recomendaciones/nueva/upselling/productos",
  ]) {
    await page.goto(
      "/tests/harness/pricing-adapter.html?" + new URLSearchParams({ path }),
    );
    await expect(page.getByRole("alert")).toContainText(
      "Función no disponible",
    );
    await expect(page.getByRole("textbox")).toHaveCount(0);
  }
  expect(
    requests.some((url) => /features\/promotions\/|\/mocks\//.test(url)),
  ).toBe(false);
});

const modules = [
  {
    name: "Pricing S01–S06",
    active: "Consultar precios",
    paths: [
      "/precios",
      "/precios/editar",
      "/precios/programaciones",
      "/precios/importar",
      "/precios/importaciones/batch-013-01",
      "/precios/historico",
    ],
  },
  {
    name: "Cupones S01–S06",
    active: "Cupones de descuento",
    paths: [
      "/cupones",
      "/cupones/nuevo",
      "/cupones/bienvenida15/editar",
      "/cupones/bienvenida15",
      "/cupones/bienvenida15/limites",
      "/cupones/bienvenida15/estado",
    ],
  },
  {
    name: "Promociones S01–S06",
    active: "Ofertas y promociones",
    paths: [
      "/promociones",
      "/promociones/nueva",
      "/promociones/carrera/editar",
      "/promociones/nueva/alcance",
      "/promociones/carrera",
      "/promociones/carrera/estado",
    ],
  },
  {
    name: "Recomendaciones S01–S07",
    active: "Venta cruzada y upselling",
    paths: [
      "/recomendaciones",
      "/recomendaciones/nueva/venta-cruzada",
      "/recomendaciones/completa-carrera/editar",
      "/recomendaciones/nueva/upselling",
      "/recomendaciones/nueva/upselling/productos",
      "/recomendaciones/completa-carrera",
      "/recomendaciones/completa-carrera/estado",
    ],
  },
];

for (const module of modules) {
  test(`Integrated router: direct ${module.name}, grouped sidebar and one active destination`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of module.paths) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByText("Página no encontrada", { exact: true }),
      ).toHaveCount(0);
      const navigation = page.getByRole("navigation", {
        name: "Navegación de la aplicación",
      });
      await expect(
        navigation.getByRole("link", { name: "Gestión de combos", exact: true }),
      ).toHaveAttribute("href", "/combos");
      await expect(
        navigation.getByRole("link", { name: "Control de stock", exact: true }),
      ).toHaveAttribute("href", "/inventario");
      await expect(
        navigation.getByText("PROMOCIONES", { exact: true }),
      ).toBeVisible();
      await expect(
        navigation.getByText("PRECIOS", { exact: true }),
      ).toBeVisible();
      await expect(
        navigation.getByText("INVENTARIO", { exact: true }),
      ).toBeVisible();
      const active = navigation.locator('a[aria-current="page"]');
      await expect(active).toHaveCount(1);
      await expect(active).toContainText(
        path.startsWith("/precios/import") ? "Importar precios" : module.active,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("Integrated sidebar: all modules remain reachable after form returns", async ({
  page,
}) => {
  await page.goto("/precios/editar");
  await page
    .getByRole("link", { name: "Volver a precios", exact: true })
    .click();
  const navigation = page.getByRole("navigation", {
    name: "Navegación de la aplicación",
  });
  for (const [label, path] of [
    ["Cupones de descuento", "/cupones"],
    ["Ofertas y promociones", "/promociones"],
    ["Venta cruzada y upselling", "/recomendaciones"],
    ["Importar precios", "/precios/importar"],
    ["Consultar precios", "/precios"],
  ]) {
    await navigation.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("N03: Catálogo y Taxonomía en modo API operan fail-closed y nunca recurren a mocks", async () => {
  const { getCatalogServices } = await import(
    "../src/features/catalog/services/catalogServices"
  );

  const apiServices = getCatalogServices("api");
  await expect(apiServices.catalog.list({ page: 1, pageSize: 10 })).rejects.toThrow(
    /La consulta del catálogo no está disponible/,
  );
  await expect(apiServices.taxonomy.getCategories()).rejects.toThrow(
    /La consulta de categorías, marcas y tipos de producto no está disponible/,
  );

  // In mock mode, shared services load successfully
  const mockServices = getCatalogServices("mock");
  const categories = await mockServices.taxonomy.getCategories();
  expect(categories.length).toBeGreaterThan(0);
});
