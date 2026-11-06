import { expect, test } from "@playwright/test";

test.describe("P0 — Integración transversal completa de módulos con persistencia F5", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("P0-01: Catálogo crea SKU simple y con variante, proyecta a Inventario y permite recepción con persistencia F5", async ({
    page,
  }) => {
    // Nine cross-module stages and reloads share one test budget. Individual
    // assertions retain their configured deadlines and all business checks.
    test.setTimeout(90000);
    // 1. Crear producto simple en Catálogo
    const simpleSku = `CAS-TRAIL-${Date.now().toString().slice(-4)}`;
    await page.goto("/productos/nuevo");
    await page.getByLabel("Nombre del producto").fill("Casaca Trail Cortaviento");
    await page
      .getByLabel("Descripción comercial")
      .fill("Casaca impermeable ultraligera para running y trail.");
    await page.getByLabel("SKU Base").fill(simpleSku);
    await page.getByLabel("Precio base inicial (S/.)").fill("229.00");
    await page.getByLabel("Peso (kg)").fill("0.45");
    await page.getByLabel("Largo (cm)").fill("30");
    await page.getByLabel("Ancho (cm)").fill("20");
    await page.getByLabel("Alto (cm)").fill("5");
    await page.getByRole("button", { name: "Guardar borrador" }).click();

    await expect(page).toHaveURL(/\/productos\/PROD-.*\/preparacion/);
    await expect(page.getByText("Borrador guardado.", { exact: true })).toBeVisible();

    // 2. Verificar identidad en Pricing
    await page.goto("/precios");
    await page.getByRole("combobox", { name: "Producto o SKU" }).click();
    await expect(
      page.getByRole("option", { name: new RegExp(simpleSku), exact: false }),
    ).toBeVisible();

    // 3. Verificar inicialización en Inventario (stock inicial 0 / AGOTADO)
    await page.goto("/inventario");
    const stockRow = page.getByRole("row").filter({ hasText: simpleSku });
    await expect(stockRow).toBeVisible();
    await expect(stockRow).toContainText("Casaca Trail Cortaviento");
    await expect(stockRow).toContainText("0");
    await expect(stockRow).toContainText("AGOTADO");

    // 4. Operación válida: recepcionar traslado en tránsito para el SKU nuevo
    await page.goto("/inventario/traslados");
    const transferRow = page.getByRole("row").filter({ hasText: simpleSku });
    await expect(transferRow).toBeVisible();
    await expect(transferRow).toContainText("En tránsito");
    await transferRow.getByRole("button", { name: /Recepcionar/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/Cantidad recibida/i).fill("25");
    await dialog.getByRole("button", { name: "Confirmar recepción", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Operación completada")).toBeVisible();

    // 5. Verificar disponibilidad actualizada en Inventario
    await page.goto("/inventario");
    const receivedRow = page.getByRole("row").filter({ hasText: simpleSku });
    await expect(receivedRow).toContainText("25");
    await expect(receivedRow).toContainText("DISPONIBLE");

    // 6. Verificar persistencia tras recargar (F5)
    await page.reload();
    const persistedRow = page.getByRole("row").filter({ hasText: simpleSku });
    await expect(persistedRow).toContainText("25");
    await expect(persistedRow).toContainText("DISPONIBLE");

    // 7. Crear variante vendible en Catálogo para producto existente
    const variantSku = `CAM-RUN-AZU-XL-${Date.now().toString().slice(-4)}`;
    await page.goto("/productos/PROD-RUN-001/variantes/nueva");
    await page.getByPlaceholder("Ej. PROD-RUN-AZUL-M").fill(variantSku);

    // Atributos de variante
    await page.getByRole("combobox", { name: "Color principal", exact: true }).click();
    await page.getByRole("option", { name: "Azul Índigo", exact: true }).click();
    await page.getByRole("combobox", { name: "Talla", exact: true }).click();
    await page.getByRole("option", { name: "XL", exact: true }).click();
    await page.getByRole("textbox", { name: "Material principal", exact: true }).fill("Poliéster técnico");
    await page.getByRole("combobox", { name: "Tipo de corte", exact: true }).click();
    await page.getByRole("option", { name: "Regular Fit", exact: true }).click();

    await page
      .getByPlaceholder("https://ejemplo.com/imagenes/variante-azul.jpg")
      .fill("https://ejemplo.com/imagenes/camiseta-azul-xl.jpg");

    await page.getByRole("textbox", { name: "Peso (kg)" }).fill("0.28");
    await page.getByRole("textbox", { name: "Largo (cm)" }).fill("32");
    await page.getByRole("textbox", { name: "Ancho (cm)" }).fill("22");
    await page.getByRole("textbox", { name: "Alto (cm)" }).fill("4");

    await page.getByRole("button", { name: "Guardar Variante" }).first().click();
    await expect(page).toHaveURL(/\/productos\/PROD-RUN-001\/variantes\/VAR-.*\/preparacion/);

    // 8. Verificar que el SKU de la variante aparece en Inventario y el SKU padre CAM-RUN NO es un ítem de stock
    await page.goto("/inventario");
    await expect(page.getByRole("row").filter({ hasText: variantSku })).toBeVisible();
    // El SKU padre no se duplica como saldo vendible
    const parentSkuCell = page.getByRole("cell", { name: "CAM-RUN", exact: true });
    await expect(parentSkuCell).toHaveCount(0);

    // 9. Persistencia F5 de la variante en inventario
    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: variantSku })).toBeVisible();
  });

  test("P0-02: Carga masiva (Bulk) aplica a Catálogo, Pricing e Inventario con persistencia F5", async ({
    page,
  }) => {
    const bulkSku = `NK-AIR-MAX-${Date.now().toString().slice(-4)}`;
    const csvContent = [
      "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial",
      `${bulkSku},Zapatilla Air Max Runner,Zapatilla deportiva para entrenamiento,Calzado,Nike,Zapatilla,320.00,PEN,35`,
    ].join("\n");

    // 1. Probar rechazo de formato no soportado (.txt)
    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "archivo_invalido.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("sku,nombre\nTEST,Producto\n"),
    });
    await expect(page.getByText("Formato no admitido", { exact: false })).toBeVisible();

    // 2. Subir CSV válido y continuar a revisión
    await page.locator('input[type="file"]').setInputFiles({
      name: "catalogo_bulk_test.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");

    // 3. Confirmar importación
    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-/);

    // 4. Esperar finalización del lote
    await expect(page.locator("section").getByText("Completado", { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole("link", { name: "Ver resultado final" }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-.*\/resultado/);

    // Verificar tabla de filas completadas y dominios
    await expect(page.getByText(bulkSku)).toBeVisible();
    await expect(page.getByText("Zapatilla Air Max Runner")).toBeVisible();
    await expect(page.getByText("Importación completada satisfactoriamente")).toBeVisible();
    await expect(page.getByText("Aplicado").first()).toBeVisible();

    // 5. Verificar que el producto existe en Catálogo
    await page.goto("/productos");
    await expect(page.getByText("Zapatilla Air Max Runner")).toBeVisible();
    await expect(page.getByText(bulkSku)).toBeVisible();

    // 6. Verificar que el precio regular existe en Pricing después de importar y tras F5
    await page.goto("/precios");
    await page.getByRole("combobox", { name: "Producto o SKU" }).click();
    await page.getByRole("option", { name: new RegExp(bulkSku), exact: false }).click();
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByText(bulkSku).first()).toBeVisible();
    await expect(page.getByText("S/ 320.00").first()).toBeVisible();

    // Recargar F5 y comprobar que el precio persiste
    await page.reload();
    await page.getByRole("combobox", { name: "Producto o SKU" }).click();
    await page.getByRole("option", { name: new RegExp(bulkSku), exact: false }).click();
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByText(bulkSku).first()).toBeVisible();
    await expect(page.getByText("S/ 320.00").first()).toBeVisible();

    // 7. Verificar que el stock existe en Inventario
    await page.goto("/inventario");
    const bulkRow = page.getByRole("row").filter({ hasText: bulkSku });
    await expect(bulkRow).toBeVisible();
    await expect(bulkRow).toContainText("35");
    await expect(bulkRow).toContainText("DISPONIBLE");

    // 8. F5 en Inventario conserva la persistencia
    await page.reload();
    const persistedBulkRow = page.getByRole("row").filter({ hasText: bulkSku });
    await expect(persistedBulkRow).toContainText("35");
    await expect(persistedBulkRow).toContainText("DISPONIBLE");

    // 9. Abrir el producto en Catálogo, comprobar las asociaciones, editar el nombre y guardar
    await page.goto("/productos");
    await page.getByRole("link", { name: "Ver detalle de Zapatilla Air Max Runner" }).click();
    await expect(page.getByText("Calzado", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Nike", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Zapatilla", { exact: true }).first()).toBeVisible();

    await page.getByRole("link", { name: "Editar", exact: true }).click();
    const updatedName = `Zapatilla Air Max Runner Editada ${Date.now().toString().slice(-4)}`;
    await page.getByLabel("Nombre del producto").fill(updatedName);
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(page.getByRole("heading", { name: updatedName, exact: true })).toBeVisible();

    // 10. Recargar F5: confirmar que el nombre y las tres asociaciones se conservaron
    await page.reload();
    await expect(page.getByRole("heading", { name: updatedName, exact: true })).toBeVisible();
    await expect(page.getByText("Calzado", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Nike", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Zapatilla", { exact: true }).first()).toBeVisible();
  });

  test("P1-03: Sincronización reactiva entre pestañas sin recargar F5", async ({
    page,
    context,
  }) => {
    // Pestaña A: abierta en Inventario viendo los productos existentes
    await page.goto("/inventario");
    const stockRow = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
    await expect(stockRow).toBeVisible();

    // Pestaña B: edita el nombre en Catálogo
    const pageB = await context.newPage();
    await pageB.setViewportSize({ width: 1440, height: 900 });
    await pageB.goto("/productos");
    await pageB.getByRole("link", { name: "Ver detalle de Camiseta Running Endurance" }).click();
    await pageB.getByRole("link", { name: "Editar", exact: true }).click();
    const uniqueName = `Camiseta Reactiva ${Date.now().toString().slice(-4)}`;
    await pageB.getByLabel("Nombre del producto").fill(uniqueName);
    await pageB.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await expect(pageB.getByRole("heading", { name: uniqueName, exact: true })).toBeVisible();

    // Pestaña A: sin F5 y sin navegación, el nombre se actualiza reactivamente
    await expect(page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" })).toContainText(
      uniqueName,
      { timeout: 8000 },
    );

    await pageB.close();
  });

  test("P1-04: Ciclo completo Promociones → Cupones → Recomendaciones y reactividad a Catálogo con F5", async ({
    page,
  }) => {
    // 1. Crear promoción asociada a un SKU
    const promoName = `Promo Ciclo ${Date.now().toString().slice(-4)}`;
    const couponCode = `CUPON${Date.now().toString().slice(-4)}`;

    await page.goto("/promociones/nueva");
    await page.getByLabel("Nombre de la promoción", { exact: true }).fill(promoName);
    await page.getByRole("combobox", { name: "Modalidad comercial", exact: true }).click();
    await page.getByRole("option", { name: "Con cupón", exact: true }).click();
    await page.getByRole("combobox", { name: "Estado inicial", exact: true }).click();
    await page.getByRole("option", { name: "Activo", exact: true }).click();
    await page.getByLabel("Prioridad", { exact: true }).fill("1");
    await page.getByRole("combobox", { name: "Tipo de beneficio", exact: true }).click();
    await page.getByRole("option", { name: "Monto fijo", exact: true }).click();
    await page.getByLabel("Valor del beneficio", { exact: true }).fill("30");
    await page.getByLabel("Fecha y hora de inicio", { exact: true }).fill("2026-10-18T00:00");
    await page.getByLabel("Fecha y hora de fin", { exact: true }).fill("2026-12-31T23:59");
    await page.getByRole("checkbox", { name: "Marketplace", exact: true }).check();

    await page.getByRole("link", { name: "Seleccionar alcance", exact: true }).click();
    const skuCheckbox = page.getByRole("checkbox", { name: /SKU específico: CAM-RUN-BLA-M/ });
    await expect(skuCheckbox).toBeVisible();
    await skuCheckbox.check();
    await page.getByRole("button", { name: "Confirmar alcance", exact: true }).click();
    await page.getByRole("button", { name: "Crear promoción", exact: true }).click();

    await expect(page.getByRole("heading", { name: promoName, exact: true })).toBeVisible();

    // 2. Crear cupón vinculado a la promoción
    await page.goto("/cupones/nuevo");
    await page.getByRole("combobox", { name: "Promoción asociada", exact: true }).click();
    await page.getByRole("option", { name: new RegExp(promoName), exact: false }).click();
    await page.getByLabel("Código del cupón", { exact: true }).fill(couponCode);
    await page.getByRole("combobox", { name: "Estado inicial", exact: true }).click();
    await page.getByRole("option", { name: "Activo", exact: true }).click();
    await page.getByLabel("Límite global", { exact: true }).fill("100");
    await page.getByLabel("Límite por cliente", { exact: true }).fill("1");
    await page.getByLabel("Monto mínimo", { exact: true }).fill("80");
    await page.getByRole("radio", { name: "Restaurar uso al cancelar", exact: true }).check();
    await page.getByRole("button", { name: "Crear cupón", exact: true }).click();

    await expect(page.getByText("Cupón guardado")).toBeVisible();
    await expect(page.getByRole("heading", { name: new RegExp(couponCode), exact: false })).toBeVisible();

    // 3. F5 y verificación de persistencia de cupón y promoción
    await page.reload();
    await expect(page.getByRole("heading", { name: new RegExp(couponCode), exact: false })).toBeVisible();

    await page.goto("/cupones");
    await expect(page.getByRole("row").filter({ hasText: couponCode })).toBeVisible();

    // 4. Completar ciclo: Crear recomendación comercial real vinculada al producto
    const recName = `Regla Cruzada ${Date.now().toString().slice(-4)}`;
    await page.goto("/recomendaciones/nueva/venta-cruzada");
    await page.getByLabel("Nombre de la regla", { exact: true }).fill(recName);
    await page.getByRole("combobox", { name: "Tipo de origen", exact: true }).click();
    await page.getByRole("option", { name: "Producto", exact: true }).click();
    await page.getByRole("combobox", { name: "Producto de origen", exact: true }).click();
    await page.getByRole("option", { name: "Camiseta Running Endurance", exact: true }).click();
    await page.getByRole("combobox", { name: "Estado inicial", exact: true }).click();
    await page.getByRole("option", { name: "Activa", exact: true }).click();
    await page.getByLabel("Prioridad", { exact: true }).fill("1");
    await page.getByLabel("Fecha y hora de inicio", { exact: true }).fill("2026-10-01T00:00");
    await page.getByLabel("Fecha y hora de fin", { exact: true }).fill("2026-12-31T23:59");

    await page.getByRole("link", { name: "Seleccionar productos recomendados", exact: true }).click();
    await page.getByRole("checkbox", { name: "Casaca Cortaviento Trail", exact: true }).check();
    await page.getByRole("button", { name: "Confirmar selección", exact: true }).click();

    await page.getByRole("button", { name: "Crear regla de venta cruzada", exact: true }).click();
    await expect(page.getByRole("heading", { name: recName, exact: true })).toBeVisible();

    // 5. Verificar persistencia de recomendación tras recargar (F5)
    await page.reload();
    await expect(page.getByRole("heading", { name: recName, exact: true })).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Casaca Cortaviento Trail");

    await page.goto("/recomendaciones");
    await expect(page.getByRole("row").filter({ hasText: recName })).toBeVisible();
  });

  test("Carga masiva rechaza importación con maestro inexistente y no crea producto ni stock", async ({
    page,
  }) => {
    const invalidMasterSku = `INV-MST-${Date.now().toString().slice(-4)}`;
    const csvContent = [
      "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial",
      `${invalidMasterSku},Zapatilla Fallida,Prueba de maestro inexistente,CategoriaInexistente,Nike,Zapatilla,250.00,PEN,20`,
    ].join("\n");

    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "catalogo_maestro_desconocido.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });
    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");
    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-/);

    // Esperar finalización del lote con observaciones
    await expect(page.getByText(/Completado con observaciones|Fallos registrados/).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("link", { name: "Ver resultado final" }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-.*\/resultado/);

    // Comprobar que la fila fue rechazada con mensaje sobre la categoría
    await expect(page.getByText(invalidMasterSku)).toBeVisible();
    await expect(page.getByText("Rechazado").first()).toBeVisible();

    // Confirmar que el SKU no existe en Catálogo
    await page.goto("/productos");
    await expect(page.getByText(invalidMasterSku)).toHaveCount(0);

    // Confirmar que el SKU no existe en Inventario
    await page.goto("/inventario");
    await expect(page.getByText(invalidMasterSku)).toHaveCount(0);
  });

  test("Error de persistencia en Catalog durante Bulk detiene ejecución y no inicializa Inventario", async ({
    page,
  }) => {
    const catFailSku = `CAT-FAIL-${Date.now().toString().slice(-4)}`;
    const csvContent = [
      "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial",
      `${catFailSku},Producto Falla Catalog,Descripción prueba,Calzado,Nike,Zapatilla,180.00,PEN,15`,
    ].join("\n");

    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "catalogo_cat_error.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });
    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");

    // Interceptar Storage.prototype.setItem para fallar al persistir 'catalog'
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      (window as unknown as { __originalSetItem?: typeof originalSetItem }).__originalSetItem = originalSetItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.includes("catalog")) {
          throw new DOMException("Fallo simulado en catálogo", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-/);

    // Esperar finalización del lote con observaciones antes de restaurar storage
    await expect(page.getByText(/Completado con observaciones|Fallos registrados/).first()).toBeVisible({ timeout: 15000 });

    // Restaurar setItem
    await page.evaluate(() => {
      const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
      if (original) Storage.prototype.setItem = original;
    });

    await page.getByRole("link", { name: "Ver resultado final" }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-.*\/resultado/);

    await expect(page.getByText(catFailSku)).toBeVisible();
    // Inventario no debe haberse aplicado
    await page.goto("/inventario");
    await expect(page.getByText(catFailSku)).toHaveCount(0);
  });

  test("Error en Inventory durante Bulk permite reanudación de dominios pendientes sin duplicar Catálogo ni stock", async ({
    page,
  }) => {
    const invFailSku = `INV-FAIL-${Date.now().toString().slice(-4)}`;
    const csvContent = [
      "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial",
      `${invFailSku},Zapatilla Inventario Retry,Zapatilla con retry de inventario,Calzado,Nike,Zapatilla,210.00,PEN,30`,
    ].join("\n");

    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "catalogo_inv_error.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });
    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");

    // Interceptar Storage.prototype.setItem para fallar al persistir 'inventory'
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      (window as unknown as { __originalSetItem?: typeof originalSetItem }).__originalSetItem = originalSetItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.includes("inventory")) {
          throw new DOMException("Fallo simulado en inventario", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-/);
    const batchUrlMatch = page.url().match(/\/carga-masiva\/importaciones\/(lote-imp-[^/]+)/);
    const batchId = batchUrlMatch ? batchUrlMatch[1] : "";

    // Esperar finalización del lote con observaciones antes de restaurar storage
    await expect(page.getByText(/Completado con observaciones|Fallos registrados/).first()).toBeVisible({ timeout: 15000 });

    // Restaurar setItem
    await page.evaluate(() => {
      const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
      if (original) Storage.prototype.setItem = original;
    });

    await page.getByRole("link", { name: "Ver resultado final" }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-.*\/resultado/);

    // Catálogo fue aplicado pero Inventario falló
    await expect(page.getByText(invFailSku)).toBeVisible();

    // En Catálogo el producto ya existe
    await page.goto("/productos");
    await expect(page.getByText("Zapatilla Inventario Retry")).toBeVisible();

    // En Inventario el SKU no debe tener stock sumado
    await page.goto("/inventario");
    await expect(page.getByText(invFailSku)).toHaveCount(0);

    // Volver a la pantalla de resultado del lote y reanudar para completar la conciliación
    await page.goto(`/carga-masiva/importaciones/${batchId}/resultado`);
    const resumeButton = page.getByRole("button", { name: "Reanudar lote", exact: true });
    await expect(resumeButton).toBeVisible({ timeout: 10000 });
    await resumeButton.click();
    const confirmDialog = page.getByRole("dialog");
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole("button", { name: "Confirmar reanudación", exact: true }).click();

    // Esperar a que el lote complete exitosamente
    await expect(page.locator("section").getByText("Completado", { exact: true }).first()).toBeVisible({ timeout: 15000 });

    // Verificar en Inventario que el stock ahora sí existe con exactamente 30 unidades
    await page.goto("/inventario");
    const invRow = page.getByRole("row").filter({ hasText: invFailSku });
    await expect(invRow).toBeVisible();
    await expect(invRow).toContainText("30");

    // F5: exactamente 30 unidades sin duplicación
    await page.reload();
    const persistedRow = page.getByRole("row").filter({ hasText: invFailSku });
    await expect(persistedRow).toContainText("30");
  });

  test("Idempotencia estricta en Inventory: múltiples ejecuciones con misma clave no duplican stock", async ({
    page,
  }) => {
    const idemSku = `IDEM-TEST-${Date.now().toString().slice(-4)}`;

    await page.goto("/inventario");

    // Ejecutar tres veces la misma operación con 35 unidades
    await page.evaluate(async (sku) => {
      const specifier = "/src/features/inventory/adapters/mockInventoryAdapter.ts";
      const { sharedMockInventoryAdapter } = await import(/* @vite-ignore */ specifier);
      await sharedMockInventoryAdapter.applyBulkStock(
        [{ sku, productName: "Item Idem", stock: 35, rowId: "row-1" }],
        "batch-idem-1",
      );
      await sharedMockInventoryAdapter.applyBulkStock(
        [{ sku, productName: "Item Idem", stock: 35, rowId: "row-1" }],
        "batch-idem-1",
      );
      await sharedMockInventoryAdapter.applyBulkStock(
        [{ sku, productName: "Item Idem", stock: 35, rowId: "row-1" }],
        "batch-idem-1",
      );
    }, idemSku);

    // Verificar en la UI: stock esperado es 35 unidades, no 105
    await page.reload();
    const row35 = page.getByRole("row").filter({ hasText: idemSku });
    await expect(row35).toContainText("35");

    // Crear segunda operación válida con otra clave y 10 unidades
    await page.evaluate(async (sku) => {
      const specifier = "/src/features/inventory/adapters/mockInventoryAdapter.ts";
      const { sharedMockInventoryAdapter } = await import(/* @vite-ignore */ specifier);
      await sharedMockInventoryAdapter.applyBulkStock(
        [{ sku, productName: "Item Idem", stock: 10, rowId: "row-2" }],
        "batch-idem-2",
      );
    }, idemSku);

    // Verificar en la UI: stock esperado es 45 unidades
    await page.reload();
    const row45 = page.getByRole("row").filter({ hasText: idemSku });
    await expect(row45).toContainText("45");

    // Recargar F5 y repetir ambas operaciones originales
    await page.reload();
    await page.evaluate(async (sku) => {
      const specifier = "/src/features/inventory/adapters/mockInventoryAdapter.ts";
      const { sharedMockInventoryAdapter } = await import(/* @vite-ignore */ specifier);
      await sharedMockInventoryAdapter.applyBulkStock(
        [{ sku, productName: "Item Idem", stock: 35, rowId: "row-1" }],
        "batch-idem-1",
      );
      await sharedMockInventoryAdapter.applyBulkStock(
        [{ sku, productName: "Item Idem", stock: 10, rowId: "row-2" }],
        "batch-idem-2",
      );
    }, idemSku);

    // Resultado esperado: 45 unidades, sin incrementos adicionales
    await page.reload();
    const rowFinal = page.getByRole("row").filter({ hasText: idemSku });
    await expect(rowFinal).toContainText("45");
  });

  test("Conciliación de pendientes de Pricing: fallo al escribir pricing conserva cola y reintento con stableId evita duplicados tras F5", async ({
    page,
  }) => {
    await page.goto("/precios");
    await expect(page.getByRole("heading", { name: "Gestión de precios" })).toBeVisible();

    // 1. Provocar un registro en pendingAudit simulando que price-audit falló en la actualización inicial
    await page.evaluate(async () => {
      const originalSetItem = Storage.prototype.setItem;
      (window as unknown as { __originalSetItem?: typeof originalSetItem }).__originalSetItem = originalSetItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.endsWith("price-audit")) {
          throw new DOMException("Quota price audit", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      };

      const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
      const { createPricingRuntime } = await import(/* @vite-ignore */ pricingSpecifier);
      const runtime = await createPricingRuntime("mock");
      const signal = new AbortController().signal;
      const current = await runtime.service.read({ targetId: "base", channel: "global" }, signal);
      if (!current?.price) throw new Error("Precio base no disponible");

      await runtime.service.update(
        {
          target: { targetId: "base", channel: "global" },
          version: current.price.version,
          draft: {
            regular: "299.90",
            offer: "",
            offerAction: "CONSERVAR",
            currency: "PEN",
            reason: "Auditoría pending idempotency test",
          },
        },
        signal,
      );
    });

    // 2. Ahora simular fallo de escritura en pricing durante la conciliación mientras price-audit sí funciona
    await page.evaluate(async () => {
      const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
      if (original) {
        Storage.prototype.setItem = function (key: string, value: string) {
          if (key.endsWith("pricing")) {
            throw new DOMException("Quota pricing failure during pending cleanup", "QuotaExceededError");
          }
          return original.call(this, key, value);
        };
      }

      // Ejecutar conciliación desde Auditoría
      const auditSpecifier = "/src/features/price-audit/mocks/pricingChanges.ts";
      const { createMockPricingAudit } = await import(/* @vite-ignore */ auditSpecifier);
      createMockPricingAudit({ persist: true });
    });

    // 3. Restaurar almacenamiento y recargar (F5)
    await page.evaluate(() => {
      const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
      if (original) Storage.prototype.setItem = original;
    });

    await page.goto("/precios/auditoria");
    await expect(page.getByRole("heading", { name: "Historial de precios" })).toBeVisible();

    // F5 directo: exactamente 1 asiento y 0 operaciones pendientes
    await page.reload();
    const rows = page.getByRole("row").filter({ hasText: "299,90" });
    await expect(rows).toHaveCount(1);

    const pendingCount = await page.evaluate(() => {
      const raw = localStorage.getItem("g6-productos-ofertas:mock:v1:pricing");
      if (!raw) return -1;
      const parsed = JSON.parse(raw);
      const state = parsed.data ?? parsed;
      return state.pendingAudit ? state.pendingAudit.length : 0;
    });
    expect(pendingCount).toBe(0);
  });

  test("Exportación de Auditoría maneja fallos de almacenamiento y genera reporte PDF paginado al recuperar", async ({
    page,
  }) => {
    await page.goto("/precios/auditoria/exportar/pdf");
    await expect(page.getByRole("heading", { name: "Exportar historial en PDF" })).toBeVisible();

    // 1. Simular fallo de almacenamiento durante la solicitud de exportación
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      (window as unknown as { __originalSetItem?: typeof originalSetItem }).__originalSetItem = originalSetItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.includes("price-audit")) {
          throw new DOMException("Fallo al persistir job de exportación", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.getByRole("button", { name: "Solicitar PDF" }).click();
    await expect(page.getByText("No se pudo solicitar la exportación")).toBeVisible();

    // 2. Restaurar almacenamiento y reintentar la solicitud
    await page.evaluate(() => {
      const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
      if (original) Storage.prototype.setItem = original;
    });

    await page.getByRole("button", { name: "Solicitar PDF" }).click();

    // 3. Verificar que el trabajo se procesa y completa
    const downloadButton = page.getByRole("button", { name: "Descargar PDF" });
    await expect(downloadButton).toBeVisible({ timeout: 20000 });
    await expect(downloadButton).toBeEnabled();
    await expect(page.getByText("Archivo generado").first()).toBeVisible();
  });

  test("La plantilla CSV descargable procesa y conserva sus tres productos en Catalog, Pricing e Inventory", async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/");
    const imported = await page.evaluate(async () => {
      const specifier = "/src/features/bulk/adapters/mockBulkRepository.ts";
      const { mockBulkRepository } = await import(/* @vite-ignore */ specifier);
      const template = await mockBulkRepository.getTemplate("CSV");
      if (!template) throw new Error("No se encontró la plantilla CSV");
      const content = await template.blob.text();
      const batch = await mockBulkRepository.createImport(
        new File([content], template.fileName, { type: "text/csv" }),
      );
      return { batchId: batch.batch_id, totalRows: batch.total_rows, rowStatuses: batch.rows?.map((row: { status: string }) => row.status) };
    });
    expect(imported.totalRows).toBe(3);
    expect(imported.rowStatuses).toEqual(["PENDING", "PENDING", "PENDING"]);

    await page.waitForFunction((batchId) => {
      const raw = localStorage.getItem("g6-productos-ofertas:mock:v1:bulk");
      const data = raw ? JSON.parse(raw).data : null;
      const batch = data?.batches?.find(([id]: [string]) => id === batchId)?.[1];
      return batch?.status === "COMPLETED" && batch.rows?.length === 3 && batch.rows.every((row: { status: string }) => row.status === "COMPLETED");
    }, imported.batchId, { timeout: 30000 });

    const expected = [
      { sku: "NK-RN-001-42", price: "299.00", stock: "50" },
      { sku: "AD-TR-002-M", price: "89.00", stock: "30" },
      { sku: "INK-FT-004-L", price: "79.00", stock: "20" },
    ];
    const assertProducts = async () => {
      await page.goto("/productos");
      for (const item of expected) await expect(page.getByText(item.sku, { exact: true })).toHaveCount(1);
      await page.goto("/precios");
      for (const item of expected) {
        await page.getByRole("combobox", { name: "Producto o SKU" }).click();
        const option = page.getByRole("option", { name: new RegExp(item.sku), exact: false });
        await expect(option).toHaveCount(1);
        await option.click();
        await page.getByRole("button", { name: "Consultar", exact: true }).click();
        await expect(page.getByText(item.sku).first()).toBeVisible();
        await expect(page.getByText(`S/ ${Number(item.price).toFixed(2)}`).first()).toBeVisible();
      }
      await page.goto("/inventario");
      for (const item of expected) {
        const row = page.getByRole("row").filter({ hasText: item.sku });
        await expect(row).toHaveCount(1);
        await expect(row).toContainText(item.stock);
      }
    };
    await assertProducts();
    await page.reload();
    await assertProducts();
    const persistedBatch = await page.evaluate(async (batchId) => {
      const specifier = "/src/features/bulk/adapters/mockBulkRepository.ts";
      const { mockBulkRepository } = await import(/* @vite-ignore */ specifier);
      return mockBulkRepository.getImport(batchId);
    }, imported.batchId);
    expect(persistedBatch?.status).toBe("COMPLETED");
    expect(persistedBatch?.rows?.filter((row: { status: string }) => row.status === "COMPLETED")).toHaveLength(3);
  });

  test("Idempotencia de Catalog ante pérdida del estado Bulk y rechazo de duplicados en segundo lote", async ({
    page,
  }) => {
    test.setTimeout(60000);
    const uniqueSku = `CAT-IDEM-${Date.now().toString().slice(-4)}`;
    const csvContent = [
      "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial",
      `${uniqueSku},Producto Idem Catalog,Zapatilla deportiva prueba,Calzado,Nike,Zapatilla,220.00,PEN,25`,
    ].join("\n");

    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "lote_catalog_idem.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });
    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");

    // Interceptar Storage.prototype.setItem para permitir la creación del lote en Bulk
    // pero fallar en las llamadas posteriores para simular pérdida/fallo del avance de Bulk
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      (window as unknown as { __originalSetItem?: typeof originalSetItem }).__originalSetItem = originalSetItem;
      let bulkSaves = 0;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.includes("bulk")) {
          bulkSaves++;
          // La primera llamada guarda el lote creado en QUEUED; las siguientes simulan fallo al persistir avance
          if (bulkSaves > 1) {
            throw new DOMException("Fallo simulado al persistir avance de Bulk", "QuotaExceededError");
          }
        }
        return originalSetItem.call(this, key, value);
      };
    });

    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-/);
    const batchUrlMatch = page.url().match(/\/carga-masiva\/importaciones\/(lote-imp-[^/]+)/);
    const batchId = batchUrlMatch ? batchUrlMatch[1] : "";
    expect(batchId).toMatch(/^lote-imp-/);

    // Esperar a la confirmación de Catalog e Inventory mientras Bulk sigue guardado en QUEUED.
    await page.waitForFunction(({ batchId, sku }) => {
      const read = (domain: string) => {
        const raw = localStorage.getItem(`g6-productos-ofertas:mock:v1:${domain}`);
        return raw ? JSON.parse(raw).data : null;
      };
      const catalog = read("catalog");
      const inventory = read("inventory");
      const bulk = read("bulk");
      const catalogOperation = catalog?.bulkOperations?.find(([key]: [string]) => key === `${batchId}:1:CATALOGO`);
      const inventoryOperation = inventory?.bulkOperations?.find(([key]: [string]) => key === `${batchId}:1:INVENTARIO`);
      const stock = inventory?.stockItems?.filter((item: { sku: string }) => item.sku === sku)
        .reduce((sum: number, item: { onHand: number }) => sum + item.onHand, 0);
      return Boolean(
        catalogOperation?.[1]?.sku === sku && catalog?.products?.some((product: { skuBase: string }) => product.skuBase === sku) &&
        inventoryOperation && inventoryOperation[1]?.quantity === 25 && stock === 25 &&
        bulk?.batches?.some(([id, batch]: [string, { status: string }]) => id === batchId && batch.status === "QUEUED"),
      );
    }, { batchId, sku: uniqueSku }, { timeout: 15000 });

    // Restaurar almacenamiento
    await page.evaluate(() => {
      const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
      if (original) Storage.prototype.setItem = original;
    });

    // Recargar F5
    await page.reload();

    // La hidratación de Bulk debe reanudar automáticamente el lote al recargar.

    await expect(page.locator("section").getByText("Completado", { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await page.waitForFunction((batchId) => {
      const raw = localStorage.getItem("g6-productos-ofertas:mock:v1:bulk");
      const data = raw ? JSON.parse(raw).data : null;
      return data?.batches?.some(([id, batch]: [string, { status: string }]) => id === batchId && batch.status === "COMPLETED");
    }, batchId, { timeout: 15000 });

    const completedState = await page.evaluate(({ batchId, sku }) => {
      const read = (domain: string) => {
        const raw = localStorage.getItem(`g6-productos-ofertas:mock:v1:${domain}`);
        return raw ? JSON.parse(raw).data : null;
      };
      const catalog = read("catalog");
      const inventory = read("inventory");
      const bulk = read("bulk");
      return {
        catalogOperations: catalog?.bulkOperations?.filter(([key]: [string]) => key === `${batchId}:1:CATALOGO`).length ?? 0,
        products: catalog?.products?.filter((product: { skuBase: string }) => product.skuBase === sku).length ?? 0,
        inventoryOperations: inventory?.bulkOperations?.filter(([key]: [string]) => key === `${batchId}:1:INVENTARIO`).length ?? 0,
        stock: inventory?.stockItems?.filter((item: { sku: string }) => item.sku === sku).reduce((sum: number, item: { onHand: number }) => sum + item.onHand, 0) ?? 0,
        batchStatus: bulk?.batches?.find(([id]: [string]) => id === batchId)?.[1]?.status,
      };
    }, { batchId, sku: uniqueSku });
    expect(completedState).toEqual({ catalogOperations: 1, products: 1, inventoryOperations: 1, stock: 25, batchStatus: "COMPLETED" });

    // Confirmar en Catálogo: exactamente UN producto
    await page.goto("/productos");
    const catalogCards = page.getByText(uniqueSku);
    await expect(catalogCards).toHaveCount(1);

    // Confirmar en Pricing: exactamente UN precio registrado
    await page.goto("/precios");
    await page.getByRole("combobox", { name: "Producto o SKU" }).click();
    const pricingOption = page.getByRole("option", { name: new RegExp(uniqueSku), exact: false });
    await expect(pricingOption).toHaveCount(1);
    await pricingOption.click();
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByText(uniqueSku).first()).toBeVisible();
    await expect(page.getByText("S/ 220.00").first()).toBeVisible();

    // Confirmar en Inventario: exactamente UNA aplicación de stock (25 unidades)
    await page.goto("/inventario");
    const stockRow = page.getByRole("row").filter({ hasText: uniqueSku });
    await expect(stockRow).toHaveCount(1);
    await expect(stockRow).toContainText("25");

    // Comprobar que un segundo lote con el mismo SKU es rechazado como duplicado
    const secondCsvContent = [
      "sku,nombre,descripcion,categoria,marca,tipo_producto,precio_regular,moneda,stock_inicial",
      `${uniqueSku},Segundo Producto Mismo SKU,Otra descripción,Calzado,Nike,Zapatilla,220.00,PEN,10`,
    ].join("\n");

    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "lote_segundo_duplicado.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(secondCsvContent),
    });
    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");
    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-/);
    const duplicateBatchId = page.url().match(/\/carga-masiva\/importaciones\/(lote-imp-[^/]+)/)?.[1] ?? "";
    expect(duplicateBatchId).toMatch(/^lote-imp-/);

    // Esperar finalización del segundo lote con observaciones
    await expect(page.getByText(/Completado con observaciones|Fallos registrados/).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole("link", { name: "Ver resultado final" }).first().click();

    // Confirmar que la fila fue rechazada
    await expect(page.getByText("Rechazado").first()).toBeVisible();

    // En Inventario el stock sigue siendo exactamente 25 unidades (no se sumaron las 10 del segundo lote)
    await page.goto("/inventario");
    const stockRowAfter = page.getByRole("row").filter({ hasText: uniqueSku });
    await expect(stockRowAfter).toHaveCount(1);
    await expect(stockRowAfter).toContainText("25");

    await page.reload();
    await expect(page.getByRole("row").filter({ hasText: uniqueSku })).toHaveCount(1);
    await expect(page.getByRole("row").filter({ hasText: uniqueSku })).toContainText("25");
    await page.goto("/precios");
    await page.getByRole("combobox", { name: "Producto o SKU" }).click();
    await page.getByRole("option", { name: new RegExp(uniqueSku), exact: false }).click();
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await expect(page.getByText("S/ 220.00").first()).toBeVisible();
    const finalState = await page.evaluate(({ batchId, duplicateBatchId, sku }) => {
      const read = (domain: string) => {
        const raw = localStorage.getItem(`g6-productos-ofertas:mock:v1:${domain}`);
        return raw ? JSON.parse(raw).data : null;
      };
      const catalog = read("catalog");
      const inventory = read("inventory");
      const bulk = read("bulk");
      return {
        catalogOperations: catalog?.bulkOperations?.filter(([key]: [string]) => key === `${batchId}:1:CATALOGO`).length ?? 0,
        products: catalog?.products?.filter((product: { skuBase: string }) => product.skuBase === sku).length ?? 0,
        inventoryOperations: inventory?.bulkOperations?.filter(([key]: [string]) => key === `${batchId}:1:INVENTARIO`).length ?? 0,
        stock: inventory?.stockItems?.filter((item: { sku: string }) => item.sku === sku).reduce((sum: number, item: { onHand: number }) => sum + item.onHand, 0) ?? 0,
        batchStatus: bulk?.batches?.find(([id]: [string]) => id === batchId)?.[1]?.status,
        duplicateRows: bulk?.batches?.find(([id]: [string]) => id === duplicateBatchId)?.[1]?.rows?.map((row: { status: string; code: string | null }) => ({ status: row.status, code: row.code })),
      };
    }, { batchId, duplicateBatchId, sku: uniqueSku });
    expect(finalState).toEqual({
      catalogOperations: 1,
      products: 1,
      inventoryOperations: 1,
      stock: 25,
      batchStatus: "COMPLETED",
      duplicateRows: [{ status: "FAILED", code: "SKU_DUPLICADO" }],
    });
  });
});
