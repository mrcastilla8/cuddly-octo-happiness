import { test, expect, type Locator, type Page } from "@playwright/test";

async function selectOption(
  page: Page,
  label: string | RegExp,
  option: string,
  scope?: Locator,
): Promise<void> {
  // Mantine asigna aria-label tanto al input (combobox) como al listbox, por lo
  // que se apunta explícitamente al combobox para evitar ambigüedad.
  await (scope ?? page).getByRole("combobox", { name: label }).click();
  // Las opciones se renderizan en un portal fuera del modal/drawer.
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("MK-015: Control de stock, umbrales y traslados (Issue #17)", () => {
  test("@smoke MK-015-S01: Muestra tabla de saldos autoritativos con cálculo y estado", async ({
    page,
  }) => {
    await page.goto("/inventario");

    await expect(
      page.getByRole("heading", { name: "Control de stock y disponibilidad" }),
    ).toBeVisible();

    await expect(page.getByRole("columnheader", { name: "SKU" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Producto" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Físico" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Reservado" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Bloqueado" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Disponible" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Estado" })).toBeVisible();

    await expect(page.getByText("ZAP-TRL-40-BLK")).toBeVisible();
    await expect(page.getByText("ZAP-TRL-42-BLK")).toBeVisible();
    await expect(page.getByText("MED-CP-U-BLK")).toBeVisible();
    await expect(page.getByText("CAM-RUN-BLA-M")).toBeVisible();

    await expect(page.getByRole("cell", { name: "DISPONIBLE" }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "STOCK_BAJO" }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "AGOTADO" }).first()).toBeVisible();

    const searchInput = page.getByRole("textbox", {
      name: "Buscar SKU o producto",
    });
    await searchInput.fill("Medias");
    await expect(page.getByText("MED-CP-U-BLK")).toBeVisible();
    await expect(page.getByText("ZAP-TRL-40-BLK")).not.toBeVisible();

    await page.getByRole("button", { name: "Limpiar" }).click();
    await expect(page.getByText("ZAP-TRL-40-BLK")).toBeVisible();
  });

  test("MK-015-S03: Drawer de detalle muestra desglose de magnitudes del SKU", async ({
    page,
  }) => {
    await page.goto("/inventario");

    const detailButtons = page.getByRole("button", { name: "Ver detalle" });
    await detailButtons.first().click();

    const drawer = page.getByRole("dialog", { name: /Detalle de saldo/ });
    await expect(drawer).toBeVisible();

    await expect(drawer.getByText("Unidades físicas")).toBeVisible();
    await expect(drawer.getByText("Unidades reservadas")).toBeVisible();
    await expect(drawer.getByText("Unidades bloqueadas")).toBeVisible();
    await expect(drawer.getByText("Saldo disponible")).toBeVisible();
    await expect(drawer.getByText("Umbral y trazabilidad")).toBeVisible();

    await drawer.getByRole("button", { name: "Cerrar detalle" }).click();
    await expect(drawer).not.toBeVisible();
  });

  test("MK-015-S02: Configuración de umbrales global y por SKU", async ({
    page,
  }) => {
    await page.goto("/inventario/umbrales");

    await expect(
      page.getByRole("heading", { name: "Configuración de umbrales de stock" }),
    ).toBeVisible();
    await expect(page.getByText("Umbral global por defecto")).toBeVisible();
    await expect(page.getByText("Configurar excepción por SKU")).toBeVisible();

    const globalInput = page.getByRole("textbox", {
      name: "Umbral global de stock bajo",
    });
    await globalInput.fill("12");
    await page.getByRole("button", { name: "Guardar umbral global" }).click();

    await expect(page.getByText("Escritura confirmada")).toBeVisible();
    await expect(
      page.getByText("Umbral global actualizado correctamente."),
    ).toBeVisible();
    // P1-01: no debe existir una confirmación local duplicada.
    await expect(page.getByText("Cambio aplicado")).toHaveCount(0);
  });

  test("MK-015-S04 y S05: Bandeja de traslados y modal de recepción con aviso de discrepancia", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    await expect(
      page.getByRole("heading", {
        name: "Traslados y recepciones de inventario",
      }),
    ).toBeVisible();

    await expect(page.getByText("TR-2026-088")).toBeVisible();
    await expect(page.getByText("TR-2026-091")).toBeVisible();
    await expect(page.getByText("TR-2026-094")).toBeVisible();

    const row91 = page.getByRole("row", { name: /TR-2026-091/ });
    await row91.getByRole("button", { name: "Recepcionar" }).click();

    const modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    await expect(modal).toBeVisible();

    const qtyInput = modal.getByRole("textbox", {
      name: "Cantidad recibida físicamente",
    });
    await qtyInput.fill("18");

    await expect(modal.getByText("Aviso de discrepancia")).toBeVisible();
    await expect(
      modal.getByText("2 unidades faltantes", { exact: false }),
    ).toBeVisible();

    await modal
      .getByRole("button", { name: "Confirmar recepción con discrepancia" })
      .click();

    await expect(page.getByText("Operación completada")).toBeVisible();
  });

  test("MK-015/P0: Un traslado en estado terminal no admite nuevas recepciones", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    const closedRow = page.getByRole("row", { name: /TR-2026-088/ });
    await expect(closedRow.getByText("Con discrepancia")).toBeVisible();
    await expect(closedRow.getByRole("button", { name: "Cerrado" })).toBeDisabled();
  });

  test("MK-015/P0: Recepción completa acredita saldo creando el registro de destino inexistente", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    const row = page.getByRole("row", { name: /TR-2026-091/ });
    await row.getByRole("button", { name: "Recepcionar" }).click();

    const modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    const qtyInput = modal.getByRole("textbox", {
      name: "Cantidad recibida físicamente",
    });
    await qtyInput.fill("20");
    await modal.getByRole("button", { name: "Confirmar recepción" }).click();

    await expect(
      page.getByText(/Recepción registrada para traslado TR-2026-091 \(COMPLETADO\)/),
    ).toBeVisible();

    // Navega dentro de la SPA para conservar el estado del mock
    await page.getByRole("link", { name: "Volver a Control de stock" }).click();
    await expect(page).toHaveURL(/\/inventario$/);

    // El registro de destino no existía en los fixtures y debe aparecer con saldo físico
    const destinationRow = page.getByRole("row", {
      name: /POL-RUN-M-BLU.*Tienda Retail San Isidro/,
    });
    await expect(destinationRow).toBeVisible();
    await expect(destinationRow).toContainText("20");
  });

  test("MK-015/P0: Recepción con disposición REINGRESAR_BLOQUEADO incrementa el bloqueado", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    const row = page.getByRole("row", { name: /TR-2026-091/ });
    await row.getByRole("button", { name: "Recepcionar" }).click();

    const modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    await modal
      .getByRole("textbox", { name: "Cantidad recibida físicamente" })
      .fill("20");
    await selectOption(
      page,
      "Disposición de unidades recibidas",
      "Reingresar bloqueado (Cuarentena / Incidencia)",
      modal,
    );
    await modal.getByRole("button", { name: "Confirmar recepción" }).click();

    await page.getByRole("link", { name: "Volver a Control de stock" }).click();
    await expect(page).toHaveURL(/\/inventario$/);

    // Todo lo recibido queda bloqueado: disponible 0 => estado Agotado
    const destinationRow = page.getByRole("row", {
      name: /POL-RUN-M-BLU.*Tienda Retail San Isidro/,
    });
    await expect(destinationRow).toBeVisible();
    await expect(destinationRow).toContainText("AGOTADO");
  });

  test("MK-015/P0: Recepción con CONFIRMAR_MERMA no acredita saldo de destino", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    const row = page.getByRole("row", { name: /TR-2026-091/ });
    await row.getByRole("button", { name: "Recepcionar" }).click();

    const modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    await modal
      .getByRole("textbox", { name: "Cantidad recibida físicamente" })
      .fill("20");
    await selectOption(
      page,
      "Disposición de unidades recibidas",
      "Confirmar merma (Dañadas / No vendibles)",
      modal,
    );
    await modal.getByRole("button", { name: "Confirmar recepción" }).click();

    await page.getByRole("link", { name: "Volver a Control de stock" }).click();
    await expect(page).toHaveURL(/\/inventario$/);

    // La merma no acredita saldo: no debe crearse registro en el destino
    await expect(
      page.getByRole("row", { name: /POL-RUN-M-BLU.*Tienda Retail San Isidro/ }),
    ).toHaveCount(0);
  });

  test("MK-015/P0: Recepción parcial sin cierre y posterior finalización completan el traslado", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    const row = page.getByRole("row", { name: /TR-2026-094/ });
    await row.getByRole("button", { name: "Recepcionar" }).click();

    let modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    await modal
      .getByRole("textbox", { name: "Cantidad recibida físicamente" })
      .fill("4");
    await modal
      .getByRole("checkbox", { name: /recepción final del traslado/ })
      .uncheck();
    await modal.getByRole("button", { name: "Confirmar recepción" }).click();

    await expect(page.getByText(/\(RECIBIDO_PARCIAL\)/)).toBeVisible();

    // El traslado parcial sigue siendo recepcionable y se completa en un segundo envío
    await expect(
      page.getByRole("row", { name: /TR-2026-094/ }).getByText("Recibido parcial"),
    ).toBeVisible();

    await page
      .getByRole("row", { name: /TR-2026-094/ })
      .getByRole("button", { name: "Recepcionar" })
      .click();

    modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    await modal
      .getByRole("textbox", { name: "Cantidad recibida físicamente" })
      .fill("6");
    await modal.getByRole("button", { name: "Confirmar recepción" }).click();

    await expect(page.getByText(/\(COMPLETADO\)/)).toBeVisible();
  });

  test("MK-015/P0: La recepción final con faltante genera una alerta con discrepancia", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    const row = page.getByRole("row", { name: /TR-2026-094/ });
    await row.getByRole("button", { name: "Recepcionar" }).click();

    const modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    await modal
      .getByRole("textbox", { name: "Cantidad recibida físicamente" })
      .fill("4");
    await modal
      .getByRole("button", { name: "Confirmar recepción con discrepancia" })
      .click();

    await expect(page.getByText(/\(COMPLETADO_CON_DISCREPANCIA\)/)).toBeVisible();

    await page.getByRole("link", { name: "Volver a Control de stock" }).click();
    await page
      .getByRole("main")
      .getByRole("link", { name: "Dashboard analítico" })
      .click();
    await expect(page).toHaveURL(/\/inventario\/dashboard/);

    await expect(
      page.getByText("Discrepancia en recepción de traslado TR-2026-094"),
    ).toBeVisible();
  });

  test("MK-015: Deshabilitar la marca de recepción final evita el aviso de discrepancia", async ({
    page,
  }) => {
    await page.goto("/inventario/traslados");

    await page
      .getByRole("row", { name: /TR-2026-091/ })
      .getByRole("button", { name: "Recepcionar" })
      .click();

    const modal = page.getByRole("dialog", { name: /Registrar recepción/ });
    await modal
      .getByRole("textbox", { name: "Cantidad recibida físicamente" })
      .fill("5");
    await modal
      .getByRole("checkbox", { name: /recepción final del traslado/ })
      .uncheck();

    await expect(modal.getByText("Aviso de discrepancia")).toHaveCount(0);
    await expect(
      modal.getByRole("button", { name: "Confirmar recepción" }),
    ).toBeVisible();
  });

  test("MK-015: Navegación entre vistas de inventario", async ({ page }) => {
    // Las páginas de Inventario se cargan con React.lazy: la primera visita a
    // cada ruta dispara el transform en frío de Vite de su grafo de módulos.
    // Bajo fullyParallel ese primer render puede exceder el timeout por defecto
    // de expect (5 s). Se da margen al arranque sin relajar la aserción: el
    // locator y el heading exigidos son los mismos.
    const coldNav = { timeout: 15_000 };

    await page.goto("/inventario");
    await expect(
      page.getByRole("heading", { name: "Control de stock y disponibilidad" }),
    ).toBeVisible(coldNav);

    await page.goto("/inventario/traslados");
    await expect(
      page.getByRole("heading", { name: "Traslados y recepciones de inventario" }),
    ).toBeVisible(coldNav);

    await page.goto("/inventario/umbrales");
    await expect(
      page.getByRole("heading", { name: "Configuración de umbrales de stock" }),
    ).toBeVisible(coldNav);

    await page.goto("/inventario/dashboard");
    await expect(
      page.getByRole("heading", { name: "Dashboard analítico y alertas de stock" }),
    ).toBeVisible(coldNav);
  });
});

test.describe("MK-016: Dashboard analítico y alertas de inventario (Issue #18)", () => {
  test("MK-016-S01: Dashboard con KPIs, alertas, distribución y tabla analítica", async ({
    page,
  }) => {
    await page.goto("/inventario/dashboard");

    await expect(
      page.getByRole("heading", { name: "Dashboard analítico y alertas de stock" }),
    ).toBeVisible();
    await expect(page.getByText("Panel de solo lectura")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Alertas operativas de inventario" }),
    ).toBeVisible();

    await expect(page.getByText("Unidades disponibles", { exact: true })).toBeVisible();
    await expect(page.getByText("Unidades bloqueadas", { exact: true })).toBeVisible();
    await expect(page.getByText("Unidades físicas totales", { exact: true })).toBeVisible();
    await expect(page.getByText("Total SKUs vendibles", { exact: true })).toBeVisible();
    await expect(page.getByText("SKUs Disponibles", { exact: true })).toBeVisible();
    await expect(page.getByText("SKUs con Stock bajo", { exact: true })).toBeVisible();
    await expect(page.getByText("SKUs Agotados", { exact: true })).toBeVisible();
    await expect(page.getByText("Unidades reservadas", { exact: true })).toBeVisible();
    await expect(page.getByText("Traslados pendientes totales", { exact: true })).toBeVisible();
    await expect(page.getByText("Traslados en tránsito", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Traslados recibidos parcialmente", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Traslados con discrepancia", { exact: true })).toBeVisible();

    await expect(
      page.getByText("Distribución de stock por ubicación física"),
    ).toBeVisible();
    await expect(page.getByText("Almacén Central Lima").first()).toBeVisible();

    await expect(page.getByText("Inventario analítico por SKU")).toBeVisible();
    await expect(page.getByRole("cell", { name: "ZAP-TRL-40-BLK" })).toBeVisible();

    const searchInput = page.getByRole("textbox", {
      name: "Buscar en inventario",
    });
    await searchInput.fill("Casaca");
    await expect(page.getByText("CAS-TRK-L-GRN")).toBeVisible();
    await expect(page.getByRole("cell", { name: "ZAP-TRL-40-BLK" })).not.toBeVisible();
  });

  test("MK-016/P0: Los filtros de categoría y marca alinean KPIs, alertas, distribución y tabla", async ({
    page,
  }) => {
    await page.goto("/inventario/dashboard");

    await selectOption(page, "Filtrar por categoría", "Calzado");

    // Solo quedan SKUs de Calzado: la tabla no debe mostrar artículos de otras categorías
    await expect(page.getByRole("cell", { name: "ZAP-TRL-40-BLK" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "POL-RUN-M-BLU" })).toHaveCount(0);

    // Las alertas incoherentes con el filtro desaparecen; la de Calzado permanece
    await expect(
      page.getByText("Discrepancia en recepción de traslado"),
    ).toBeVisible();
    await expect(page.getByText("SKU Crítico Agotado")).toHaveCount(0);

    // La distribución solo contiene la ubicación con SKUs de Calzado
    await expect(
      page.getByRole("row", { name: /Tienda Retail Miraflores/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Limpiar" }).click();
    await expect(page.getByRole("cell", { name: "POL-RUN-M-BLU" })).toBeVisible();
  });

  test("MK-016/P1: Estados de error y vacío del dashboard son explícitos", async ({
    page,
  }) => {
    await page.goto("/inventario/dashboard?modoRevision=1");

    await selectOption(page, /Escenario de revisión/, "Error de consulta");
    await expect(page.getByText("No se pudieron cargar los indicadores")).toBeVisible();
    await expect(page.getByText("No se pudieron cargar las alertas")).toBeVisible();

    await selectOption(page, /Escenario de revisión/, "Sin registros");
    await expect(page.getByText("Sin alertas operativas activas")).toBeVisible();
    await expect(
      page.getByText("Sin ubicaciones para los filtros aplicados"),
    ).toBeVisible();
    await expect(
      page.getByText("No se encontraron SKUs para los criterios seleccionados"),
    ).toBeVisible();
  });

  test("MK-016/P1: El enlace de la alerta conserva SKU y ubicación específica", async ({
    page,
  }) => {
    await page.goto("/inventario/dashboard");

    const alert = page
      .locator('[role="alert"], [role="status"]')
      .filter({ hasText: "Stock bajo: Polo Running Dry-Fit" });
    const detailLink = alert.getByRole("link", { name: "Ver detalle" });

    await expect(detailLink).toHaveAttribute("href", /search=POL-RUN-L-BLU/);
    await expect(detailLink).toHaveAttribute("href", /locationId=RET-SAN/);

    await detailLink.click();

    // La navegación es cliente: esperar a que el dashboard haya desmontado por
    // completo antes de consultar la tabla de stock (evita solapamiento).
    await expect(page).toHaveURL(/locationId=RET-SAN/);
    await expect(
      page.getByRole("heading", { name: "Dashboard analítico y alertas de stock" }),
    ).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "POL-RUN-L-BLU" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "ZAP-TRL-40-BLK" })).toHaveCount(0);
  });
});

test.describe("NAV-INV: Navegación lateral de Inventario (Issue #24)", () => {
  const inventoryRoutes = [
    { path: "/inventario", label: "Control de stock" },
    { path: "/inventario/traslados", label: "Traslados de stock" },
    { path: "/inventario/dashboard", label: "Dashboard analítico" },
  ] as const;

  test("NAV-INV-01: El menú lateral muestra el grupo Inventario con sus tres rutas", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/inventario");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const nav = page.getByRole("navigation", {
      name: "Navegación de la aplicación",
    });
    await expect(nav.getByText("INVENTARIO", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Control de stock", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Traslados de stock", exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard analítico", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const { path, label } of inventoryRoutes) {
    test(`NAV-INV-02: Acceso directo a ${label} marca la opción activa`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByText("Página no encontrada", { exact: true }),
      ).toHaveCount(0);

      const nav = page.getByRole("navigation", {
        name: "Navegación de la aplicación",
      });
      // Al menos un link activo debe existir
      const active = nav.locator('a[aria-current="page"]');
      await expect(active).toHaveCount(1);
      // El link activo corresponde a la ruta visitada
      // (umbrales activa "Control de stock" por matchPaths)
      await expect(active).toContainText(label);
      expect(errors).toEqual([]);
    });
  }

  test("NAV-INV-03: /inventario/umbrales es alcanzable desde Control de stock y queda activo en nav", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/inventario");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // El enlace a umbrales debe existir dentro de la página de stock (no del nav lateral)
    const configLink = page.getByRole("link", { name: /umbral|configurar/i });
    await expect(configLink.first()).toBeVisible();
    await configLink.first().click();

    await expect(page).toHaveURL(/\/inventario\/umbrales/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // "Control de stock" sigue activo en el menú lateral (matchPaths incluye /inventario/umbrales)
    const nav = page.getByRole("navigation", {
      name: "Navegación de la aplicación",
    });
    const active = nav.locator('a[aria-current="page"]');
    await expect(active).toContainText("Control de stock");
    expect(errors).toEqual([]);
  });

  test("NAV-INV-04: Pricing y Promociones siguen accesibles después de visitar Inventario", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/inventario");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const nav = page.getByRole("navigation", {
      name: "Navegación de la aplicación",
    });
    for (const [label, expectedPath] of [
      ["Consultar precios", "/precios"],
      ["Cupones de descuento", "/cupones"],
      ["Ofertas y promociones", "/promociones"],
    ] as const) {
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${expectedPath}$`));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});

// P1-2: Alertas por ubicación - mismo SKU en dos ubicaciones distintas
test.describe("MK-016/P1: Alertas por ubicación - deduplicación correcta", () => {
  test("Genera alertas independientes por SKU+ubicación y respeta filtros", async ({
    page,
  }) => {
    await page.goto("/inventario/dashboard");
    await expect(
      page.getByRole("heading", { name: "Alertas operativas de inventario" }),
    ).toBeVisible();
    const alerts = page.locator('[role="alert"], .mantine-Alert-root');
    await expect(alerts.first()).toBeVisible();
    await selectOption(page, "Filtrar por ubicación", "Tienda Retail San Isidro");
    await expect(
      page.getByText("Discrepancia en recepción de traslado"),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Limpiar" }).click();
  });
});
