import { expect, test } from "@playwright/test";

// MK-002 Combos — end-to-end coverage against the shared mock Catalog/Pricing
// runtime. Every test starts from a fresh navigation, so the mock store resets.

test("@smoke listado, navegación y detalle con disponibilidad informativa", async ({ page }) => {
  await page.goto("/combos");
  await expect(page.getByRole("heading", { name: "Gestión de combos" })).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "Navegación de la aplicación" });
  await expect(navigation.getByRole("link", { name: "Gestión de combos", exact: true }))
    .toHaveAttribute("href", "/combos");

  const trailRow = page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" });
  await expect(trailRow).toBeVisible();
  await expect(trailRow).toContainText("4 combos estimados");
  await expect(page.getByRole("row").filter({ hasText: "Dúo Running" })).toContainText("Agotado");
  await expect(page.getByRole("row").filter({ hasText: "Pack Urbano histórico" })).toContainText("INACTIVO");

  await trailRow.getByRole("link", { name: "Ver detalle" }).click();
  await expect(page).toHaveURL(/\/combos\/combo-001$/);
  await expect(page.getByRole("heading", { name: "Conjunto Trail Esencial" })).toBeVisible();
  await expect(page.getByText("CAS-COR-001")).toBeVisible();
  await expect(page.getByText("CAM-RUN-BLA-M")).toBeVisible();
  await expect(page.getByText("4 combos estimados")).toBeVisible();
  await expect(page.getByText("Suma regular vigente")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("creación de un combo directo y desactivación conservando el histórico", async ({ page }) => {
  await page.goto("/combos/nuevo");
  await expect(page.getByRole("heading", { name: "Crear combo" })).toBeVisible();

  await page.getByRole("textbox", { name: "Nombre" }).fill("Combo smoke de prueba");

  await page.getByRole("combobox", { name: "Producto" }).click();
  await page.getByRole("option", { name: "Casaca Cortaviento Trail" }).click();
  await page.getByRole("button", { name: "Agregar componente" }).click();

  await page.getByRole("combobox", { name: "Producto" }).click();
  await page.getByRole("option", { name: "Camiseta Running Endurance" }).click();
  await page.getByRole("combobox", { name: "Variante / SKU" }).click();
  await page.getByRole("option", { name: /Blanco/ }).click();
  await page.getByRole("button", { name: "Agregar componente" }).click();

  await expect(page.getByRole("region", { name: "Comparación económica" })).toContainText("Suma pública vigente");
  await page.getByRole("textbox", { name: "Precio del combo (PEN)" }).fill("279.90");
  await expect(page.getByText("El precio es menor que las sumas regular y pública vigente para los componentes seleccionados.")).toBeVisible();

  await page.getByRole("button", { name: "Crear combo" }).click();
  await expect(page.getByRole("heading", { name: "Combo smoke de prueba" })).toBeVisible();
  await expect(page.getByText("4 combos estimados")).toBeVisible();

  await page.getByRole("button", { name: "Desactivar combo" }).click();
  await expect(page.getByRole("dialog")).toContainText("dejará de ofrecerse para nuevas ventas");
  await page.getByRole("dialog").getByRole("button", { name: "Desactivar combo" }).click();
  await expect(page.getByText("INACTIVO", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Ver situación de disponibilidad" }).click();
  await expect(page).toHaveURL(/\/combos\/combo-4\/no-disponible$/);
  await expect(page.getByRole("heading", { name: "Combo no disponible" })).toBeVisible();
  await expect(page.getByText("La definición administrativa se conserva y no se ofrece para nuevas ventas.")).toBeVisible();
});

test("error de listado con reintento sin mostrar un estado vacío", async ({ page }) => {
  // Finish the shared runtime's initial reads before delivering its one-shot
  // error. Startup invalidation can otherwise consume the fixture's retry.
  await page.goto("/combos");
  await expect(page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" })).toBeVisible();
  await page.evaluate(() => {
    history.pushState({}, "", "/combos?scenario=list-error");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("alert")).toContainText("No se pudieron consultar los combos");
  await expect(page.getByText("No hay combos para mostrar")).toHaveCount(0);

  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" })).toBeVisible();
});

test("COM-04: protege los cambios sin guardar y no bloquea la navegación tras guardar", async ({ page }) => {
  await page.goto("/combos/combo-001/editar");
  const name = page.getByRole("textbox", { name: "Nombre" });
  await expect(name).toHaveValue("Conjunto Trail Esencial");
  await name.fill("Borrador sin guardar");

  // In-app menu navigation must be intercepted while dirty.
  await page.getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Gestión de combos", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Tienes cambios sin guardar");

  // Cancel keeps the user on the editor with the draft intact.
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await expect(page).toHaveURL(/\/combos\/combo-001\/editar$/);
  await expect(name).toHaveValue("Borrador sin guardar");

  // Discarding explicitly leaves the editor.
  await page.getByRole("link", { name: "Cancelar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Descartar y salir" }).click();
  await expect(page).toHaveURL(/\/combos\/combo-001$/);
  await expect(page.getByRole("heading", { name: "Conjunto Trail Esencial" })).toBeVisible();

  // After a successful save, navigation to the detail must not be blocked.
  await page.goto("/combos/combo-001/editar");
  await page.getByRole("textbox", { name: "Nombre" }).fill("Conjunto Trail Esencial v2");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: "Conjunto Trail Esencial v2" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("COM-05: conflicto de versión, diff, conservación del borrador y segundo guardado", async ({ page }) => {
  await page.goto("/combos/combo-001/editar?scenario=version-conflict");
  const name = page.getByRole("textbox", { name: "Nombre" });
  await expect(name).toHaveValue("Conjunto Trail Esencial");
  await name.fill("Propuesta local conservada");

  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("alert")).toContainText("Hay cambios en el servidor");
  await expect(name).toHaveValue("Propuesta local conservada");

  const conflict = page.getByRole("region", { name: "Conflicto de versión" });
  await expect(conflict).toContainText("Conjunto Trail Esencial (actualizado en servidor)");
  await expect(conflict).toContainText("Propuesta local conservada");

  // Keep the local draft, adopt the server version and reconcile explicitly.
  await conflict.getByRole("button", { name: "Conservar borrador y reconciliar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Conservar borrador", exact: true }).click();
  await expect(page.getByRole("region", { name: "Conflicto de versión" })).toHaveCount(0);
  await expect(name).toHaveValue("Propuesta local conservada");

  // Second save succeeds and navigates to the detail.
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { name: "Propuesta local conservada" })).toBeVisible();
  await expect(page).toHaveURL(/\/combos\/combo-001$/);
});

test("COM-02: las referencias vigentes del detalle provienen de Pricing (override y herencia)", async ({ page }) => {
  // Dúo Running: CAM-RUN-BLA-M (hereda base 139.90/129.90) + CAM-RUN-AZU-L (override 149.90/sin oferta).
  // La suma pública vigente solo existe si Pricing resolvió ambas referencias; el histórico no la tenía.
  await page.goto("/combos/combo-002");
  await expect(page.getByRole("heading", { name: "Dúo Running" })).toBeVisible();
  await expect(page.getByText("Referencias vigentes confirmadas")).toBeVisible();
  await expect(page.getByText("2 / 2", { exact: true })).toBeVisible();
  await expect(page.getByText(/289[.,]80/).first()).toBeVisible();
  await expect(page.getByText(/279[.,]80/).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("COM-03: la disponibilidad informativa no se presenta como verificación inventada", async ({ page }) => {
  await page.goto("/combos/combo-001?scenario=detail-incomplete");
  await expect(page.getByRole("heading", { name: "Conjunto Trail Esencial" })).toBeVisible();
  await expect(page.getByText("Disponibilidad incompleta").first()).toBeVisible();

  await page.goto("/combos/combo-001?scenario=detail-unverifiable");
  await expect(page.getByText("Disponibilidad no verificable").first()).toBeVisible();

  await page.goto("/combos/combo-001?scenario=detail-component-inactive");
  await expect(page.getByText("Componente inactivo").first()).toBeVisible();

  await page.goto("/combos/combo-001?scenario=detail-stale");
  await expect(page.getByText("Desactualizada (4 combos estimados)").first()).toBeVisible();

  await page.goto("/combos/combo-001?scenario=detail-active-zero");
  await expect(page.getByText("Agotado (0 confirmado)").first()).toBeVisible();
});
