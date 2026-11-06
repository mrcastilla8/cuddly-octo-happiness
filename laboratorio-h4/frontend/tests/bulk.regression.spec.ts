import { expect, test } from "@playwright/test";

/**
 * MK-001 (Bulk) — regresión de UI recuperada de `origin/master`.
 *
 * El merge de sincronización (issue #34, hallazgo CAS-05) conservó la suite
 * `tests/bulk.spec.ts` reducida de `castilla` y movió la cobertura de
 * repositorio/parser a `tests/bulk.unit.test.ts`. Este archivo reincorpora los
 * escenarios que solo existían como E2E y que no deben perderse en el merge,
 * adaptados a la runtime vigente (copy de estados, `detectedRows` y navegación
 * de ayuda), sin depender del orden de ejecución.
 */

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
}

test.describe("MK-001 — regresión de UI de Carga masiva", () => {
  // La primera navegación puede coincidir con la compilación en frío de Vite
  // (el servidor de desarrollo compila el grafo de módulos bajo demanda).
  test.describe.configure({ timeout: 90000 });

  test("C16: limpiar el archivo invalida la selección y deshabilita continuar", async ({ page }) => {
    await page.goto("/carga-masiva");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "prueba.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("sku,nombre\nSKU-1,Prod 1\n"),
    });

    await expect(page.getByRole("button", { name: "Limpiar selección", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Limpiar selección", exact: true }).click();
    await expect(page.getByRole("button", { name: "Continuar a revisión", exact: true })).toBeDisabled();
  });

  test("C17: CSV con campos entrecomillados y saltos de línea se acepta", async ({ page }) => {
    await page.goto("/carga-masiva");
    const complexCsv = 'sku,nombre,descripcion\nSKU-1,"Zapatilla, Pro","Descripcion\nmultilinea"\n';
    await page.locator('input[type="file"]').setInputFiles({
      name: "complejo.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(complexCsv),
    });
    await expect(page.getByRole("button", { name: "Continuar a revisión", exact: true })).toBeEnabled();
  });

  test("C18: CSV malformado con comillas sin cerrar muestra error estructural", async ({ page }) => {
    await page.goto("/carga-masiva");
    const malformedCsv = 'sku,nombre\n"SKU-UNCLOSED,Prod\n';
    await page.locator('input[type="file"]').setInputFiles({
      name: "malformado.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(malformedCsv),
    });
    await expect(page.getByText("comillas sin cerrar", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar a revisión", exact: true })).toBeDisabled();
  });

  test("C19: acceso directo a la revisión sin archivo ofrece retorno seguro", async ({ page }) => {
    await page.goto("/carga-masiva/revisar");
    await expect(page.getByText("Ningún archivo seleccionado", { exact: true })).toBeVisible();
    const returnLink = page.getByRole("link", { name: "Ir a selección de archivo", exact: true });
    await returnLink.click();
    await expect(page).toHaveURL("/carga-masiva");
  });

  test("C22: la pantalla existente /precios permanece intacta", async ({ page }) => {
    await page.goto("/precios");
    await expect(page.getByRole("heading", { name: "Gestión de precios", exact: true })).toBeVisible();
  });

  test("C23: descargas ofrece retorno a la carga de archivo", async ({ page }) => {
    await page.goto("/carga-masiva/descargas");
    await expect(page.getByRole("heading", { name: "Descargas y exportación masiva" })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("link", { name: "Volver a carga de archivo", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva");
    await expect(page.getByRole("heading", { name: "Carga masiva de productos" })).toBeVisible();
  });

  test("R20: una nueva carga masiva reinicia el contexto de selección", async ({ page }) => {
    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "previo.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("sku,nombre\nSKU-1,Prod 1\n"),
    });
    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");

    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
    await expect(page).toHaveURL(/\/carga-masiva\/importaciones\//);

    await page.getByRole("link", { name: "Nueva carga masiva", exact: true }).first().click();
    await expect(page).toHaveURL("/carga-masiva");
    await expect(page.getByRole("button", { name: "Continuar a revisión", exact: true })).toBeDisabled();
  });

  test("H13: XLSX se rechaza porque la importación no está disponible en este entorno", async ({ page }) => {
    const { getGenuineMinimalXlsxBuffer } = await import("./fixtures/genuineXlsxFixture");
    const buffer = getGenuineMinimalXlsxBuffer();

    await page.goto("/carga-masiva");
    await page.locator('input[type="file"]').setInputFiles({
      name: "catalogo_h13.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(buffer),
    });
    await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/revisar");
    await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();

    await expect(page).toHaveURL("/carga-masiva/revisar");
    await expect(page.getByText("Importación no disponible", { exact: true })).toBeVisible();
    await expect(page.getByText("La importación Excel no está disponible en este entorno.", { exact: true })).toBeVisible();
  });

  test("H11/H12: S03 presenta los estados en cola y en procesamiento", async ({ page }) => {
    await page.goto("/carga-masiva/importaciones/batch-queued");
    await expect(page.getByText("En cola de procesamiento", { exact: true })).toBeVisible();
    await expect(page.getByText("Solicitud en cola", { exact: true })).toBeVisible();

    await page.goto("/carga-masiva/importaciones/batch-processing");
    await expect(page.getByText("Desglose por dominio", { exact: true })).toBeVisible();
    await expect(page.getByText(/Filas consultadas/)).toBeVisible();
    const section = page.locator("section");
    await expect(section.getByText("Catálogo", { exact: true })).toBeVisible();
    await expect(section.getByText("Precios (Pricing)", { exact: true })).toBeVisible();
    await expect(section.getByText("Inventario", { exact: true })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("H11/H12: S04 protege un lote no terminal y no renderiza tabla", async ({ page }) => {
    await page.goto("/carga-masiva/importaciones/batch-processing/resultado");
    await expect(page.getByText("Lote en procesamiento", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Los resultados finales consolidados se presentarán únicamente cuando el procesamiento concluya",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Ir al seguimiento del lote" })).toBeVisible();
    await expect(page.locator("table")).toHaveCount(0);
  });

  test("C24: una exportación fallida muestra error y deshabilita la descarga", async ({ page }) => {
    await page.goto("/carga-masiva/descargas?export_id=export-failed");
    await expect(page.getByRole("heading", { name: "Descargas y exportación masiva" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Fallo de exportación", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Error interno al consolidar snapshot de inventario para exportación"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Descargar archivo CSV consolidado", exact: true }),
    ).toBeDisabled();
  });

  test("H01: el menú lateral resalta la navegación activa en S01-S05", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación de la aplicación" });
    const bulkLink = nav.getByRole("link", { name: "Carga masiva" });
    const downloadsLink = nav.getByRole("link", { name: "Descargas y exportación" });

    await page.goto("/carga-masiva");
    await expect(bulkLink).toHaveAttribute("aria-current", "page");

    await page.goto("/carga-masiva/importaciones/batch-processing");
    await expect(bulkLink).toHaveAttribute("aria-current", "page");

    await page.goto("/carga-masiva/importaciones/batch-partial/resultado");
    await expect(bulkLink).toHaveAttribute("aria-current", "page");

    await page.goto("/carga-masiva/descargas");
    await expect(downloadsLink).toHaveAttribute("aria-current", "page");
    await expectNoHorizontalOverflow(page);
  });

  test("C25: un lote parcial habilita la reanudación y confirma la reconciliación", async ({ page }) => {
    await page.goto("/carga-masiva/importaciones/batch-partial/resultado");
    await expect(page.getByText("Completado con observaciones", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const resume = page.getByRole("button", { name: "Reanudar operaciones pendientes", exact: true });
    await expect(resume).toBeEnabled();
    await expect(page.getByRole("button", { name: "Reanudar lote", exact: true })).toBeVisible();

    await resume.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Identificador del lote");
    await dialog.getByRole("button", { name: "Confirmar reanudación", exact: true }).click();
    await expect(page).toHaveURL("/carga-masiva/importaciones/batch-partial");
    await expect(page.getByText("En cola de procesamiento", { exact: true })).toBeVisible();
  });

  test("C26: un lote terminal sin reconciliación no ofrece reanudación", async ({ page }) => {
    await page.goto("/carga-masiva/importaciones/batch-catalog-failed/resultado");
    await expect(page.getByText("Completado con observaciones", { exact: true })).toBeVisible();
    await expect(page.getByText("Fallos registrados; no hay reconciliación pendiente", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reanudar operaciones pendientes", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reanudar lote", exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("C27: la exportación CSV completada permite descargar y el XLSX no", async ({ page }) => {
    await page.goto("/carga-masiva/descargas?export_id=export-completed");
    await expect(page.getByText("Exportación terminada", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Descargar archivo CSV consolidado", exact: true }),
    ).toBeEnabled();

    await page.goto("/carga-masiva/descargas?export_id=export-completed-xlsx");
    await expect(page.getByText("XLSX completado sin archivo descargable", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Descargar archivo XLSX consolidado", exact: true }),
    ).toBeDisabled();
  });

  test("C28: las exportaciones no terminales mantienen la descarga deshabilitada", async ({ page }) => {
    await page.goto("/carga-masiva/descargas?export_id=export-queued");
    await expect(page.getByText("En cola", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Actualizar estado", exact: true })).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Descargar archivo CSV consolidado", exact: true }),
    ).toBeDisabled();

    await page.goto("/carga-masiva/descargas?export_id=export-processing");
    await expect(page.getByText("Generando archivo…", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Descargar archivo XLSX consolidado", exact: true }),
    ).toBeDisabled();
  });
});
