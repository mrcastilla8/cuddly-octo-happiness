import { test, expect, type Page } from "@playwright/test";

async function setAuditFlag(
  page: Page,
  flag: "failRead" | "failReceive" | "empty",
  value: boolean,
): Promise<void> {
  await page.evaluate(
    ({ flag, value }) => {
      const audit = (
        window as unknown as { inventoryAudit: Record<string, boolean> }
      ).inventoryAudit;
      audit[flag] = value;
    },
    { flag, value },
  );
}

test.describe("P2: Independencia de mocks con AlternateInventoryRepository", () => {
  test("Lectura de stock autoritativo desde repositorio alternativo (sin mocks)", async ({
    page,
  }) => {
    await page.goto("/tests/harness/inventory-adapter.html?path=/inventario");

    await expect(
      page.getByRole("heading", { name: "Control de stock y disponibilidad" }),
    ).toBeVisible();

    // Comprobar que se cargan los items del repositorio alternativo
    await expect(page.getByText("ALT-RUN-41-BLU")).toBeVisible();
    await expect(page.getByText("ALT-POL-M-RED")).toBeVisible();
    await expect(page.getByText("ALT-GOR-U-BLK", { exact: true })).toBeVisible();

    // Comprobar que NO contiene los datos de MockInventoryAdapter/fixtures
    await expect(page.getByText("ZAP-TRL-40-BLK")).toHaveCount(0);
  });

  test("Filtros de busqueda y estado funcionan sobre el repositorio alternativo", async ({
    page,
  }) => {
    await page.goto("/tests/harness/inventory-adapter.html?path=/inventario");

    const searchInput = page.getByRole("textbox", {
      name: "Buscar SKU o producto",
    });
    await searchInput.fill("Runner");

    await expect(page.getByText("ALT-RUN-41-BLU")).toBeVisible();
    await expect(page.getByText("ALT-POL-M-RED")).not.toBeVisible();
    await expect(page.getByText("ALT-GOR-U-BLK", { exact: true })).not.toBeVisible();

    await page.getByRole("button", { name: "Limpiar" }).click();
    await expect(page.getByText("ALT-POL-M-RED")).toBeVisible();
  });

  test("Resultados vacios renderizan estado amigable", async ({ page }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario&empty=1",
    );

    await expect(
      page.getByText("No se encontraron saldos de stock"),
    ).toBeVisible();
  });

  test("Manejo de errores del repositorio alternativo muestra reintento", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario&fail-read=1",
    );

    await expect(
      page.getByRole("button", { name: "Reintentar consulta" }),
    ).toBeVisible();
  });

  test("Recepcion de traslados acredita stock y refresca vistas", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario/traslados",
    );

    await expect(
      page.getByRole("heading", { name: "Traslados y recepciones de inventario" }),
    ).toBeVisible();

    await expect(page.getByText("TR-ALT-901")).toBeVisible();

    await page.getByRole("button", { name: "Recepcionar" }).first().click();

    const dialog = page.getByRole("dialog", { name: /Registrar recep/i });
    await expect(dialog).toBeVisible();

    const qtyInput = dialog.getByRole("textbox", {
      name: /Cantidad recibida/i,
    });
    await qtyInput.fill("20");

    await dialog
      .getByRole("button", { name: /Confirmar recep/i })
      .click();

    await expect(
      page.getByText("Operación completada"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cerrado" }),
    ).toBeVisible();
  });

  test("Dashboard analitico procesa metricas y alertas con repositorio alternativo", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario/dashboard",
    );

    await expect(
      page.getByRole("heading", { name: "Dashboard analítico y alertas de stock" }),
    ).toBeVisible();

    // Verificar tabla analitica con datos alternativos
    await expect(page.getByRole("cell", { name: "ALT-RUN-41-BLU" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ALT-GOR-U-BLK" })).toBeVisible();

    // Verificar alertas generadas dinamicamente
    await expect(
      page.getByRole("heading", { name: "Alertas operativas de inventario" }),
    ).toBeVisible();
    await expect(page.getByText("Quiebre de stock: ALT-GOR-U-BLK")).toBeVisible();
  });
});

test.describe("P1: Reintentos reales, idempotencia y estado del modal", () => {
  test("El reintento de stock vuelve a consultar sin cambiar los filtros", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario&fail-read=1",
    );

    await expect(
      page.getByRole("button", { name: "Reintentar consulta" }),
    ).toBeVisible();
    await expect(page.getByText("ALT-RUN-41-BLU")).toHaveCount(0);

    // El repositorio vuelve a responder y el usuario reintenta SIN tocar filtros.
    await setAuditFlag(page, "failRead", false);
    await page.getByRole("button", { name: "Reintentar consulta" }).click();

    await expect(page.getByText("ALT-RUN-41-BLU")).toBeVisible();
  });

  test("El reintento de traslados vuelve a consultar sin cambiar los filtros", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario/traslados&fail-read=1",
    );

    await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();

    await setAuditFlag(page, "failRead", false);
    await page.getByRole("button", { name: "Reintentar" }).click();

    await expect(page.getByText("TR-ALT-901")).toBeVisible();
  });

  test("El reintento del dashboard recarga KPIs, alertas y distribucion", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario/dashboard&fail-read=1",
    );

    await expect(
      page.getByText("No se pudieron cargar los indicadores"),
    ).toBeVisible();

    await setAuditFlag(page, "failRead", false);
    await page.getByRole("button", { name: "Reintentar" }).first().click();

    await expect(page.getByText("Quiebre de stock: ALT-GOR-U-BLK")).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "ALT-RUN-41-BLU" }),
    ).toBeVisible();
  });

  test("La identidad de recepcion cambia solo cuando cambia la intencion", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario/traslados&fail-receive=1",
    );

    await page.getByRole("button", { name: "Recepcionar" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Registrar recep/i });
    const qty = dialog.getByRole("textbox", { name: /Cantidad recibida/i });
    const confirm = dialog.getByRole("button", { name: /Confirmar recep/i });

    // 1er intento (cantidad 5)
    await qty.fill("5");
    await confirm.click();
    await expect(
      dialog.getByText("No se pudo registrar la recepción"),
    ).toBeVisible();

    // Reintento identico: debe conservar operationId y receivedAt inmutables
    await page.waitForTimeout(20);
    await confirm.click();

    // Nueva intencion (cantidad 8): debe generar una identidad distinta
    await qty.fill("8");
    await confirm.click();

    const payloads = await page.evaluate(() => {
      const audit = (
        window as unknown as {
          inventoryAudit: {
            calls: {
              operation: string;
              args?: {
                operationId?: string;
                receivedAt?: string;
                quantityReceived?: number;
              };
            }[];
          };
        }
      ).inventoryAudit;
      return audit.calls
        .filter((call) => call.operation === "receiveTransfer")
        .map((call) => call.args);
    });

    expect(payloads).toHaveLength(3);
    expect(payloads[0]?.operationId).toBe(payloads[1]?.operationId); // mismo intent -> misma identidad
    expect(payloads[0]?.receivedAt).toBe(payloads[1]?.receivedAt); // TAC-P0-01: mismo timestamp en reintento
    expect(payloads[2]?.operationId).not.toBe(payloads[1]?.operationId); // intent distinto -> nueva identidad
  });

  test("El error de una recepcion previa se limpia al cerrar y reabrir el modal", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario/traslados&fail-receive=1",
    );

    await page.getByRole("button", { name: "Recepcionar" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Registrar recep/i });
    await dialog.getByRole("textbox", { name: /Cantidad recibida/i }).fill("5");
    await dialog.getByRole("button", { name: /Confirmar recep/i }).click();

    await expect(
      dialog.getByText("No se pudo registrar la recepción"),
    ).toBeVisible();

    // Cerrar con Escape (comportamiento estandar del modal) y reabrir
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Recepcionar" }).first().click();
    const reopened = page.getByRole("dialog", { name: /Registrar recep/i });
    await expect(reopened).toBeVisible();
    await expect(
      reopened.getByText("No se pudo registrar la recepción"),
    ).toHaveCount(0);
  });

  test("Las alertas por ubicacion conservan el locationId en el enlace al saldo", async ({
    page,
  }) => {
    await page.goto(
      "/tests/harness/inventory-adapter.html?path=/inventario/dashboard",
    );

    await expect(
      page.getByRole("heading", { name: "Alertas operativas de inventario" }),
    ).toBeVisible();

    const alert = page
      .locator('[role="alert"], [role="status"]')
      .filter({ hasText: "Quiebre de stock: ALT-GOR-U-BLK" });
    const detailLink = alert.getByRole("link", { name: "Ver detalle" });

    await expect(detailLink).toHaveAttribute("href", /search=ALT-GOR-U-BLK/);
    await expect(detailLink).toHaveAttribute("href", /locationId=ALT-LOC-02/);

    await detailLink.click();

    // La navegación es cliente: esperar a que el dashboard haya desmontado por
    // completo antes de consultar la tabla de stock (evita solapamiento).
    await expect(page).toHaveURL(/search=ALT-GOR-U-BLK/);
    await expect(page).toHaveURL(/locationId=ALT-LOC-02/);
    await expect(
      page.getByRole("heading", { name: "Dashboard analítico y alertas de stock" }),
    ).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "ALT-GOR-U-BLK" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ALT-RUN-41-BLU" })).toHaveCount(0);
  });
});
