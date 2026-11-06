import { expect, test } from "@playwright/test";

// Ronda R2: coherencia funcional entre módulos al persistir la demostración.
//
// Comprueba que una operación confirmada en un módulo se guarda y que, tras
// recargar, los demás módulos siguen leyendo la misma identidad (SKU, producto,
// categoría, precio) en lugar de volver a fixtures divergentes.

test("R2 Catálogo → Inventario: el nombre editado persiste y sigue proyectándose en stock", async ({
  page,
}) => {
  await page.goto("/productos");
  await page.getByRole("link", { name: "Ver detalle de Camiseta Running Endurance" }).click();
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nombre del producto").fill("Camiseta Cross Persistente");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Camiseta Cross Persistente", exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Camiseta Cross Persistente", exact: true }),
  ).toBeVisible();

  await page.goto("/inventario");
  const stockRow = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
  await expect(stockRow).toContainText("Camiseta Cross Persistente");
  // El saldo no proviene de Catálogo ni se altera por editar el nombre.
  await expect(stockRow).toContainText("8");
});

test("R2 Taxonomía → Catálogo: una categoría creada persiste y queda disponible al editar un producto", async ({
  page,
}) => {
  await page.goto("/categorias/nueva");
  await page.getByLabel("Nombre", { exact: false }).fill("Categoría Cross Persistente");
  await page.getByRole("button", { name: "Crear categoría", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Crear categoría", exact: true })
    .click();
  await expect(page.getByText("Categoría creada", { exact: true })).toBeVisible();

  await page.goto("/categorias");
  await expect(
    page.getByText("Categoría Cross Persistente", { exact: true }).first(),
  ).toBeVisible();

  await page.goto("/productos");
  await page.getByRole("link", { name: "Ver detalle de Camiseta Running Endurance" }).click();
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await page.getByRole("combobox", { name: "Categoría", exact: false }).click();
  await expect(
    page.getByRole("option", { name: "Categoría Cross Persistente", exact: true }),
  ).toBeVisible();
});

test("R2 Precios → Combos: un cambio de precio confirmado persiste y se relee en el combo", async ({
  page,
}) => {
  const navigation = page.getByRole("navigation", {
    name: "Navegación de la aplicación",
  });
  await page.goto("/precios");
  await navigation.getByRole("link", { name: "Consultar precios", exact: true }).click();
  await page.getByRole("combobox", { name: "Producto o SKU" }).click();
  await page
    .getByRole("option", { name: "Color principal: Blanco · Talla: M — CAM-RUN-BLA-M", exact: true })
    .click();
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(page.getByText("SKU: CAM-RUN-BLA-M")).toBeVisible();
  await expect(page.getByText("S/ 139.90").first()).toBeVisible();

  await page.getByRole("link", { name: "Editar precio", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nuevo precio regular", exact: true })
    .fill("159.90");
  await page
    .getByRole("textbox", { name: "Motivo del cambio", exact: true })
    .fill("Cross módulo persistente");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar cambio de precio", exact: true })
    .click();
  await expect(page.getByText("Precio actualizado", { exact: true })).toBeVisible();

  await page.reload();
  await navigation.getByRole("link", { name: "Gestión de combos", exact: true }).click();
  const comboRow = page.getByRole("row").filter({ hasText: "Conjunto Trail Esencial" });
  await comboRow.getByRole("link", { name: "Ver detalle" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" }),
  ).toContainText("S/ 159.90");
});

test("R2 Promociones: una promoción creada persiste con su alcance y se restaura tras recargar", async ({
  page,
}) => {
  const navigation = page.getByRole("navigation", {
    name: "Navegación de la aplicación",
  });
  await page.goto("/promociones");
  await page.getByRole("link", { name: "Crear promoción", exact: true }).click();
  await page.getByLabel("Nombre de la promoción", { exact: true }).fill("Promo Persistente Cross");
  await page.getByRole("combobox", { name: "Modalidad comercial", exact: true }).click();
  await page.getByRole("option", { name: "Con cupón", exact: true }).click();
  await page.getByRole("combobox", { name: "Estado inicial", exact: true }).click();
  await page.getByRole("option", { name: "Inactivo", exact: true }).click();
  await page.getByLabel("Prioridad", { exact: true }).fill("2");
  await page.getByRole("combobox", { name: "Tipo de beneficio", exact: true }).click();
  await page.getByRole("option", { name: "Porcentaje", exact: true }).click();
  await page.getByLabel("Valor del beneficio", { exact: true }).fill("15");
  await page.getByLabel("Fecha y hora de inicio", { exact: true }).fill("2026-10-18T00:00");
  await page.getByLabel("Fecha y hora de fin", { exact: true }).fill("2026-11-10T00:00");
  await page.getByRole("checkbox", { name: "Marketplace", exact: true }).check();
  await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
  const runningSku = page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-BLA-M/ });
  await expect(runningSku).toBeVisible();
  await runningSku.check();
  await page.getByRole("button", { name: "Confirmar alcance", exact: true }).click();
  await page.getByRole("button", { name: "Crear promoción", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Promo Persistente Cross", exact: true }),
  ).toBeVisible();

  await page.reload();
  const savedScope = page.getByRole("region", { name: "Alcance de productos y SKU" });
  await expect(savedScope).toContainText("Camiseta Running Endurance");
  await expect(savedScope).toContainText("CAM-RUN-BLA-M");

  await navigation.getByRole("link", { name: "Ofertas y promociones", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Ver detalle de Promo Persistente Cross", exact: true }),
  ).toBeVisible();
});

test("R2 Cross-tab: una escritura de otra pestaña rehidrata el dominio sin recargar", async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await other.goto("/marcas");
  await expect(other.getByRole("row").filter({ hasText: "Nike" }).first()).toBeVisible();
  const origin = await other.evaluate(() => performance.timeOrigin);

  const storageSeen = other.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        window.addEventListener("storage", () => resolve(true), { once: true });
        setTimeout(() => resolve(false), 8000);
      }),
  );

  await page.goto("/marcas/nueva");
  await page.getByLabel("Nombre", { exact: false }).fill("Marca Cross Tab");
  await page.getByRole("button", { name: "Crear marca", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Marca Cross Tab", exact: true }),
  ).toBeVisible();

  // La otra pestaña recibe el evento `storage` de la escritura confirmada.
  expect(await storageSeen).toBe(true);

  // Navegación SPA real (sin recargar) para remontar el listado y confirmar que el
  // adapter ya se rehidrató con el evento `storage`.
  await other
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Gestión de productos", exact: true })
    .click();
  await other.getByRole("heading", { name: "Gestión de productos" }).waitFor();
  await other
    .getByRole("navigation", { name: "Navegación de la aplicación" })
    .getByRole("link", { name: "Marcas", exact: true })
    .click();
  await other.getByRole("heading", { name: "Marcas", exact: true }).waitFor();
  await expect(
    other.getByRole("row").filter({ hasText: "Marca Cross Tab" }).first(),
  ).toBeVisible();
  // La rehidratación cruzada no recargó el documento de la otra pestaña.
  expect(await other.evaluate(() => performance.timeOrigin)).toBe(origin);
});
