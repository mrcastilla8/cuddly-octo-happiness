import { test, expect, type Page } from "@playwright/test";

type ProductTypeVerificationScenario =
  | "default"
  | "clear"
  | "en-uso"
  | "no-concluyente"
  | "pendiente-prolongado"
  | "error-consulta";

async function setProductTypeVerification(
  page: Page,
  verificacion: ProductTypeVerificationScenario,
): Promise<void> {
  await page.evaluate(async (value) => {
    const adapterPath =
      "/src/features/taxonomy/adapters/mockProductTypeAdapter.ts";
    const adapter = await import(adapterPath);
    adapter.__setProductTypeMockScenarios({ verificacion: value });
  }, verificacion);
}

test.use({ viewport: { width: 1440, height: 900 } });

const taxonomySections = [
  {
    name: "MK-008 categorías",
    active: "Categorías",
    paths: [
      "/categorias",
      "/categorias/nueva",
      "/categorias/calzado",
      "/categorias/calzado/editar",
      "/categorias/calzado/desactivar",
    ],
  },
  {
    name: "MK-009 características y valores",
    active: "Características",
    paths: [
      "/caracteristicas",
      "/caracteristicas/nueva",
      "/caracteristicas/talla",
      "/caracteristicas/talla/editar",
      "/caracteristicas/talla/estado",
      "/caracteristicas/talla/valores",
    ],
  },
  {
    name: "MK-010 tipos de producto",
    active: "Tipos de producto",
    paths: [
      "/tipos-producto",
      "/tipos-producto/nuevo",
      "/tipos-producto/ropa",
      "/tipos-producto/accesorios/asociar",
    ],
  },
  {
    name: "MK-011 marcas",
    active: "Marcas",
    paths: ["/marcas", "/marcas/nueva", "/marcas/nike", "/marcas/nike/editar"],
  },
  {
    name: "MK-012 SEO y metadatos",
    active: "SEO",
    paths: ["/seo", "/seo/cat-ropa"],
  },
];

for (const module of taxonomySections) {
  test(`Direct ${module.name}: section renders, grouped sidebar with one active destination and no console errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    for (const path of module.paths) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByText("Página no encontrada", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("Datos de demostración", { exact: true }),
      ).toHaveCount(0);
      const navigation = page.getByRole("navigation", {
        name: "Navegación de la aplicación",
      });
      // Comprueba destinos del shell de productos, Combos, Inventario y Taxonomía por sus enlaces estables.
      await expect(navigation.getByRole("link", { name: "Gestión de combos", exact: true })).toHaveAttribute("href", "/combos");
      await expect(navigation.getByRole("link", { name: "Control de stock", exact: true })).toHaveAttribute("href", "/inventario");
      await expect(navigation.getByRole("link", { name: "Traslados de stock", exact: true })).toHaveAttribute("href", "/inventario/traslados");
      await expect(navigation.getByRole("link", { name: "Dashboard analítico", exact: true })).toHaveAttribute("href", "/inventario/dashboard");
      await expect(navigation.getByRole("link", { name: "Gestión de productos", exact: true })).toHaveAttribute("href", "/productos");
      await expect(navigation.getByRole("link", { name: "Importar precios", exact: true })).toHaveAttribute("href", "/precios/importar");
      await expect(navigation.getByRole("link", { name: "Historial de precios", exact: true })).toHaveAttribute("href", "/precios/auditoria");
      await expect(
        navigation.getByText("TAXONOMÍA", { exact: true }),
      ).toBeVisible();
      const active = navigation.locator('a[aria-current="page"]');
      await expect(active).toHaveCount(1);
      await expect(active).toContainText(module.active);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test("@smoke MK-008: category creation and edit forms expose the expected fields", async ({
  page,
}) => {
  await page.goto("/categorias/nueva");
  await expect(
    page.getByRole("heading", { level: 1, name: "Crear categoría" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Categoría padre (opcional)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear categoría", exact: true }),
  ).toBeVisible();

  await page.goto("/categorias/calzado/editar");
  await expect(
    page.getByRole("heading", { level: 1, name: "Editar categoría" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("Calzado");
  await expect(
    page.getByRole("button", { name: "Guardar cambios" }),
  ).toBeVisible();
});

test("MK-008: deactivation is rejected when active subcategories exist", async ({
  page,
}) => {
  await page.goto("/categorias/calzado/desactivar");
  await expect(
    page.getByRole("heading", { level: 1, name: "Desactivar categoría" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Solicitar desactivación" }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirmar solicitud de baja" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Solicitar baja" }).click();
  await expect(page.getByRole("alert")).toContainText("Baja rechazada");
  await expect(page.getByRole("alert")).toContainText(
    "subcategorías activas",
  );
  await expect(
    page.getByText("Subcategorías activas que dependen de esta categoría."),
  ).toBeVisible();
});

test("MK-008: deactivation moves from pending verification to confirmed", async ({
  page,
}) => {
  await page.goto("/categorias/casual/desactivar");
  await page.getByRole("button", { name: "Solicitar desactivación" }).click();
  await page.getByRole("button", { name: "Solicitar baja" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Verificando baja" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Baja confirmada" }),
  ).toBeVisible();
  await expect(
    page.getByText("quedó Inactiva sin eliminar el registro", {
      exact: false,
    }),
  ).toBeVisible();
});

test("MK-009: characteristic creation form exposes the expected fields", async ({
  page,
}) => {
  await page.goto("/caracteristicas/nueva");
  await expect(
    page.getByRole("heading", { level: 1, name: "Crear característica" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Tipo" })).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Estado inicial" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear característica", exact: true }),
  ).toBeVisible();
});

test("MK-009: a value referenced by an active schema is rejected after asynchronous verification (SPEC-010)", async ({
  page,
}) => {
  await page.goto("/caracteristicas/talla/valores");
  await expect(
    page.getByRole("heading", { level: 1, name: "Valores de: Talla" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Solicitar baja de M" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Solicitud de baja admitida (202 Accepted)",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo dar de baja el valor",
  );
  await expect(page.getByRole("alert")).toContainText(
    "referenciado por el esquema",
  );
  await expect(page.locator("tbody tr", { hasText: "M" })).toContainText(
    "Activo",
  );
});

test("MK-009: a free value accepts 202 and confirms its deactivation on poll", async ({
  page,
}) => {
  await page.goto("/caracteristicas/color/valores");
  await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Solicitud de baja admitida (202 Accepted)",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Baja de valor confirmada" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText(
    "Inactivo",
  );
});

test("MK-010: product type creation and association forms load", async ({
  page,
}) => {
  await page.goto("/tipos-producto/nuevo");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nuevo tipo de producto" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear tipo de producto" }),
  ).toBeVisible();

  await page.goto("/tipos-producto/accesorios/asociar");
  await expect(
    page.getByRole("heading", { level: 1, name: "Asociar característica" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Característica activa" }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Obligatoria" }),
  ).toBeChecked();
  await expect(page.getByRole("button", { name: "Asociar", exact: true })).toBeVisible();
});

test("MK-010: required disassociation verifies use and confirms only with CLEAR", async ({
  page,
}) => {
  await page.goto("/tipos-producto/calzado");
  const tallaRow = page.locator("tbody tr", { hasText: "Talla" }).first();

  // Escenario por defecto: los fixtures representan tipos con productos activos.
  await tallaRow.getByRole("button", { name: "Desasociar" }).click();
  await expect(
    page.getByRole("dialog", { name: "Desasociar característica" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Desasociación admitida" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado" }).click();
  const rechazo = page
    .getByRole("alert")
    .filter({ hasText: "Desasociación rechazada" });
  await expect(rechazo).toBeVisible();
  await expect(rechazo).toContainText("productos o variantes activos");
  await expect(
    page.locator("tbody tr", { hasText: "Talla" }).first(),
  ).toBeVisible();
  await expect(page.getByText("v4", { exact: true })).toBeVisible();
  await rechazo.getByRole("button", { name: "Entendido" }).click();

  // Solo un resultado CLEAR vigente permite retirar la asociación.
  await setProductTypeVerification(page, "clear");
  await tallaRow.getByRole("button", { name: "Desasociar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Desasociación admitida" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Desasociación confirmada" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr", { hasText: "Talla" })).toHaveCount(0);
  await expect(page.getByText("v5", { exact: true })).toBeVisible();
});

test("MK-010: deactivation is rejected for types still referenced by active products", async ({
  page,
}) => {
  await page.goto("/tipos-producto/calzado");
  await page.getByRole("button", { name: "Desactivar tipo" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Solicitud de desactivación admitida",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado" }).click();
  const rechazo = page
    .getByRole("alert")
    .filter({ hasText: "Desactivación rechazada" });
  await expect(rechazo).toBeVisible();
  await expect(rechazo).toContainText("productos o variantes activos");
  await expect(
    page.getByRole("button", { name: "Desactivar tipo" }),
  ).toBeVisible();
  await expect(page.getByText("v4", { exact: true })).toBeVisible();
});

test("MK-010: deactivation accepts 202 and completes on poll", async ({
  page,
}) => {
  await page.goto("/tipos-producto/ropa");
  await setProductTypeVerification(page, "clear");
  await page.getByRole("button", { name: "Desactivar tipo" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("status").filter({
      hasText: "Solicitud de desactivación admitida",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Consultar estado" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Tipo de producto desactivado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Desactivar tipo" }),
  ).toHaveCount(0);
});

test("MK-011: brand edit form loads and saves into the detail page", async ({
  page,
}) => {
  await page.goto("/marcas/nike/editar");
  await expect(
    page.getByRole("heading", { level: 1, name: "Editar marca" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("Nike");
  await page
    .getByLabel("Descripción (opcional)")
    .fill("Marca deportiva internacional editada en QA");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(/\/marcas\/nike$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Nike" }),
  ).toBeVisible();
  await expect(
    page.getByText("Marca deportiva internacional editada en QA"),
  ).toBeVisible();
});

test("MK-012: saving a duplicate slug reports 409 SLUG_DUPLICADO and keeps the form", async ({
  page,
}) => {
  await page.goto("/seo/cat-zapatillas");
  await expect(
    page.getByRole("heading", { level: 1, name: "Configurar SEO y metadatos" }),
  ).toBeVisible();
  const slugInput = page.getByLabel("Slug (editable)");
  await slugInput.fill("tecnologia");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Conflicto de slug (409 SLUG_DUPLICADO)",
  );
  await expect(slugInput).toHaveValue("tecnologia");
});

test("Flow screens stay inside the 1440 px viewport with no console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const path of [
    "/categorias/calzado/desactivar",
    "/tipos-producto/calzado",
    "/tipos-producto/ropa",
    "/caracteristicas/talla/valores",
    "/marcas/nike/editar",
    "/seo/cat-zapatillas",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
