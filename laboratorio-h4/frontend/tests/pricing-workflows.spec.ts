import { gotoPricingReview } from "./support/pricingReview";
import { test, expect, type Page } from "@playwright/test";
import { evidencePath } from "./support/evidence";
import {
  decimalLess,
  localInstant,
  validatePrice,
} from "../src/features/pricing/services/pricingValidation";
import { createMockPricingRepository } from "../src/features/pricing/adapters/mockPricingRepository";

async function select(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function editDraft(page: Page, regular = "279.90") {
  await page
    .getByRole("textbox", { name: "Nuevo precio regular", exact: true })
    .fill(regular);
  await page
    .getByRole("textbox", { name: "Motivo del cambio", exact: true })
    .fill("Ajuste de temporada");
}
async function confirmEdit(page: Page) {
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cambio de precio", exact: true })
    .click();
}
async function scheduleDraft(page: Page) {
  await page
    .getByRole("textbox", { name: "Importe programado", exact: true })
    .fill("289.90");
  await page
    .getByRole("textbox", { name: "Fecha y hora de inicio", exact: true })
    .fill("2027-02-01T00:00");
  await page
    .getByRole("textbox", {
      name: "Fecha y hora de fin (opcional)",
      exact: true,
    })
    .fill("2027-03-01T00:00");
  await page
    .getByRole("textbox", { name: "Motivo de la programación", exact: true })
    .fill("Temporada futura");
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
async function capture(page: Page, path: string) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: evidencePath(path.slice(path.lastIndexOf("/") + 1)), fullPage: true, animations: "disabled" });
}

test("MK-013-S01: fresh readings enable contextual actions; stale/empty readings do not", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios?target=variant40&channel=retail&modoRevision=1");
  await expect(
    page.getByRole("link", { name: "Editar precio", exact: true }),
  ).toHaveAttribute("href", /target=variant40&channel=retail/);
  await page.getByRole("link", { name: "Editar precio", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Alcance del precio" }),
  ).toHaveValue("Precio específico del SKU seleccionado");
  await page
    .getByRole("link", { name: "Volver a precios", exact: true })
    .click();
  await select(page, "Escenario de revisión del piloto", "Error de consulta");
  await expect(
    page.getByText("Última consulta disponible", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Editar precio", exact: true }),
  ).toHaveCount(0);
});

test("MK-013-S02: validation, focus, dialog cancellation, offer removal and inherited update", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios/editar?target=base");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByText("Indica el motivo del cambio.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Motivo del cambio", exact: true }),
  ).toBeFocused();
  await editDraft(page, "0");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByText("El precio regular debe ser mayor que cero.", {
      exact: true,
    }),
  ).toBeVisible();
  await editDraft(page, "200");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByRole("group", {
      name: "Revisar acción para la oferta",
      exact: true,
    }),
  ).toBeFocused();
  await editDraft(page);
  await page
    .getByRole("radio", { name: "Establecer oferta", exact: true })
    .check();
  await page
    .getByRole("textbox", { name: "Nuevo importe de oferta", exact: true })
    .fill("300");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("radio", { name: "Retirar oferta", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancelar", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Motivo del cambio", exact: true }),
  ).toHaveValue("Ajuste de temporada");
  await confirmEdit(page);
  await expect(
    page.getByText("Precio actualizado", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toContainText("S/ 279.90");
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toContainText("Versión 5");
  await capture(page, "docs/evidencias/mk-013-s02-confirmado-1440.png");
  await page
    .getByRole("link", { name: "Consultar el precio vigente", exact: true })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toContainText("S/ 279.90");
  await select(page, "Producto o SKU", "Talla 40 · Negro — ZAP-TRL-40-BLK");
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Talla 40 · Negro", exact: true }),
  ).toContainText("S/ 279.90");
  await expect(
    page.getByRole("region", { name: "Talla 40 · Negro", exact: true }),
  ).toContainText("Sin oferta");
});

test("MK-013-S02: version conflict preserves draft and requires reread and explicit review", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios/editar?target=base&modoRevision=1");
  await editDraft(page);
  await select(page, "Escenario de guardado", "Conflicto de versión");
  await confirmEdit(page);
  await expect(
    page.getByText("El precio cambió desde tu consulta", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Releer precio", exact: true })
    .click();
  await expect(page.getByText("Actual: v5", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }),
  ).toHaveValue("279.90");
  await capture(page, "docs/evidencias/mk-013-s02-conflicto-1440.png");
  await page
    .getByRole("button", {
      name: "Revisé el precio actual; conservar propuesta",
      exact: true,
    })
    .click();
  await confirmEdit(page);
  await expect(
    page.getByText("La respuesta confirmó la versión 6.", {
      exact: false,
    }),
  ).toBeVisible();
});

for (const scenario of [
  "Rechazo de servicio",
  "Sesión no válida",
  "Sin autorización",
  "Resultado desconocido",
  "Vigencia superpuesta",
]) {
  test(`MK-013-S02: ${scenario} preserves proposal and prevents false success`, async ({
    page,
  }) => {
    await gotoPricingReview(page, "/precios/editar?target=override42&modoRevision=1");
    await editDraft(page);
    await select(page, "Escenario de guardado", scenario);
    await confirmEdit(page);
    await expect(
      page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }),
    ).toHaveValue("279.90");
    await expect(
      page.getByText("Precio actualizado", { exact: true }),
    ).toHaveCount(0);
    if (scenario === "Resultado desconocido") {
      await expect(
        page.getByRole("button", { name: "Guardar cambios", exact: true }),
      ).toBeDisabled();
      await page
        .getByRole("button", { name: "Releer precio", exact: true })
        .click();
      await expect(
        page.getByText("Esta lectura no confirma la autoría", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Guardar cambios", exact: true }),
      ).toBeDisabled();
    } else await expect(page.getByRole("alert")).toBeVisible();
  });
}

test("MK-013-S02: scope, sidebar and browser Back protect unsaved proposal", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios?target=variant40&channel=retail");
  await page.getByRole("link", { name: "Editar precio", exact: true }).click();
  await editDraft(page);
  await select(page, "Alcance del precio", "Precio base del producto");
  await expect(
    page.getByRole("dialog", { name: "Cambios sin guardar" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("combobox", { name: "Alcance del precio" }),
  ).toHaveValue("Precio específico del SKU seleccionado");
  await page
    .getByRole("link", { name: "Consultar precios", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Cambios sin guardar" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Descartar y salir", exact: true })
    .click();
  await expect(page).toHaveURL(/\/precios\?target=variant40&channel=retail$/);
  await expect(
    page.getByRole("region", { name: "Talla 40 · Negro", exact: true }),
  ).toContainText("S/ 249.90");
});

test("MK-013-S03: date validation, pagination and future creation preserve current price", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios/programaciones?target=base");
  await expect(
    page.getByText("Mostrando 1 a 2 de 3", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Página siguiente", exact: true })
    .click();
  await expect(
    page.getByText("Mostrando 3 a 3 de 3", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Programar precio", exact: true })
    .click();
  await expect(
    page.getByText("El importe debe ser mayor que cero.", { exact: true }),
  ).toBeVisible();
  await scheduleDraft(page);
  await page
    .getByRole("textbox", { name: "Fecha y hora de inicio", exact: true })
    .fill("2026-09-01T00:00");
  await page
    .getByRole("button", { name: "Programar precio", exact: true })
    .click();
  await expect(
    page.getByText("El inicio debe ser futuro", { exact: false }),
  ).toBeVisible();
  await scheduleDraft(page);
  await page
    .getByRole("textbox", {
      name: "Fecha y hora de fin (opcional)",
      exact: true,
    })
    .fill("2027-01-01T00:00");
  await page
    .getByRole("button", { name: "Programar precio", exact: true })
    .click();
  await expect(
    page.getByText("El fin debe ser posterior al inicio.", { exact: true }),
  ).toBeVisible();
  await scheduleDraft(page);
  await page
    .getByRole("button", { name: "Programar precio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar programación", exact: true })
    .click();
  await expect(
    page.getByText("Precio programado", { exact: true }),
  ).toBeVisible();
  await capture(page, "docs/evidencias/mk-013-s03-programado-1440.png");
  await expect(
    page.getByText("Mostrando 1 a 2 de 4", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Volver a precios", exact: true })
    .click();
  await expect(
    page.getByRole("region", {
      name: "Zapatilla Trail Inka Explorer",
      exact: true,
    }),
  ).toContainText("S/ 249.90");
});

for (const scenario of [
  "Vigencia superpuesta",
  "Rechazo de servicio",
  "Resultado desconocido",
]) {
  test(`MK-013-S03: ${scenario} keeps date fields and does not create a vigency`, async ({
    page,
  }) => {
    await gotoPricingReview(page, "/precios/programaciones?target=base&modoRevision=1");
    await scheduleDraft(page);
    await select(page, "Escenario de programación", scenario);
    await page
      .getByRole("button", { name: "Programar precio", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Confirmar programación",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("textbox", {
        name: "Fecha y hora de inicio",
        exact: true,
      }),
    ).toHaveValue("2027-02-01T00:00");
    await expect(
      page.getByText("Precio programado", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Mostrando 1 a 2 de 3", { exact: true }),
    ).toBeVisible();
    if (scenario === "Resultado desconocido")
      await expect(
        page.getByRole("button", { name: "Programar precio", exact: true }),
      ).toBeDisabled();
  });
}

test("MK-013-S04: changing file or policy invalidates simulated preview; import remains blocked", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios/importar?modoRevision=1");
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({
    name: "archivo-sin-contrato.dat",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("bytes arbitrarios; no es un formato aprobado"),
  });
  await page
    .getByRole("radio", { name: "Permitir resultados parciales", exact: true })
    .check();
  await select(page, "Respuesta ficticia de prevalidación", "Error por fila");
  await page
    .getByRole("button", {
      name: "Prevalidar archivo",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("OFERTA_INVALIDA", { exact: true }),
  ).toBeVisible();
  await capture(page, "docs/evidencias/mk-013-s04-error-fila-1440.png");
  await expect(
    page.getByRole("button", { name: "Confirmar importación", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("radio", {
      name: "Rechazar el lote si hay errores",
      exact: true,
    })
    .check();
  await expect(
    page.getByRole("region", {
      name: "Revisión de prevalidación",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Prevalidar archivo",
      exact: true,
    })
    .click();
  await file.setInputFiles({
    name: "reemplazo.dat",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("otros bytes"),
  });
  await expect(
    page.getByRole("region", {
      name: "Revisión de prevalidación",
      exact: true,
    }),
  ).toHaveCount(0);
  await select(
    page,
    "Respuesta ficticia de prevalidación",
    "Archivo no analizable",
  );
  await page
    .getByRole("button", {
      name: "Prevalidar archivo",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("No se pudo analizar el archivo");
  await page
    .getByRole("link", { name: "Consultar lote de ejemplo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Descartar y salir", exact: true })
    .click();
  await expect(page).toHaveURL(/batch-013-01/);
});

test("MK-013-S05: queued, processing, partial, missing rows, failed refresh and report", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios/importaciones/batch-013-01?modoRevision=1");
  await select(page, "Escenario del lote", "En cola");
  await expect(
    page.getByText("Solicitud recibida — en cola", { exact: true }),
  ).toBeVisible();
  await capture(page, "docs/evidencias/mk-013-s05-cola-1440.png");
  await expect(
    page.getByRole("button", {
      name: "Descargar reporte",
      exact: true,
    }),
  ).toBeDisabled();
  await select(page, "Escenario del lote", "En proceso");
  await expect(
    page.getByRole("status", { name: "En proceso", exact: true }),
  ).toBeVisible();
  await select(
    page,
    "Escenario del lote",
    "Parcial: 2 confirmadas y 1 rechazada",
  );
  await expect(
    page.getByText("Completado parcialmente", { exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar reporte", exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "reporte_precios_batch-013-01.csv",
  );
  await select(page, "Escenario del lote", "Error de refresco");
  await expect(
    page.getByText("Última consulta del lote", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("OFERTA_INVALIDA", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Descargar reporte",
      exact: true,
    }),
  ).toBeDisabled();
  await select(page, "Escenario del lote", "Detalle de filas ausente");
  await expect(
    page.getByText("Detalle de filas no disponible", { exact: true }),
  ).toBeVisible();
  await capture(page, "docs/evidencias/mk-013-s05-sin-filas-1440.png");
  for (const option of ["Completado", "Fallido"]) {
    await select(page, "Escenario del lote", option);
    await expect(page.getByText(option, { exact: true }).first()).toBeVisible();
  }
  await page
    .getByRole("link", { name: "Corregir archivo", exact: true })
    .click();
  await expect(page).toHaveURL(/\/precios\/importar/);
  await expect(page.locator('input[type="file"]')).toHaveValue("");
});

test("MK-013-S06: as-of, fallback, error, absence and applied history retain context", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios?target=variant40&channel=retail");
  await page
    .getByRole("link", { name: "Consultar histórico", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Fecha y hora de consulta", exact: true })
    .fill("2026-09-10T07:00");
  await page
    .getByRole("button", { name: "Consultar precio", exact: true })
    .click();
  await expect(
    page.getByText("Precio regular en fecha", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("El canal Retail solicitado resolvió", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Fecha y hora de consulta", exact: true })
    .fill("2026-08-01T00:00");
  await page
    .getByRole("button", { name: "Consultar precio", exact: true })
    .click();
  await expect(
    page.getByText("Sin precio en ese instante", { exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("textbox", {
      name: "Fecha y hora de consulta",
      exact: true,
    }),
  ).toHaveValue("2026-09-10T07:00");
  await page
    .getByRole("link", { name: "Volver a precios", exact: true })
    .click();
  await expect(page).toHaveURL(
    /target=variant40&channel=retail&at=2026-09-10T07/,
  );
  await page
    .getByRole("link", { name: "Consultar histórico", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", {
      name: "Fecha y hora de consulta",
      exact: true,
    }),
  ).toHaveValue("2026-09-10T07:00");
  await gotoPricingReview(page,
    "/precios/historico?target=base&channel=retail&at=2026-09-10T07:00&modoRevision=1",
  );
  await expect(
    page.getByText("El canal Retail solicitado resolvió", { exact: false }),
  ).toBeVisible();
  await select(page, "Escenario histórico", "Error de lectura");
  await expect(page.getByRole("alert")).toContainText(
    "El instante y la selección se conservan",
  );
});

test("MK-013: six direct views, desktop geometry, screenshots and no runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const cases = [
    ["s01", "/precios?target=variant40&channel=retail", "Gestión de precios"],
    ["s02", "/precios/editar?target=variant40", "Editar precio"],
    ["s03", "/precios/programaciones?target=base", "Programaciones de precio"],
    ["s04", "/precios/importar", "Importar precios"],
    ["s05", "/precios/importaciones/batch-013-01", "Resultado de importación"],
    [
      "s06",
      "/precios/historico?target=variant40&channel=retail&at=2026-09-10T07:00",
      "Precio en una fecha",
    ],
  ];
  for (const [screen, url, title] of cases) {
    await gotoPricingReview(page, url!);
    await expect(
      page.getByRole("heading", { name: title!, exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    if (screen === "s02")
      await expect(
        page.getByRole("textbox", {
          name: "Nuevo precio regular",
          exact: true,
        }),
      ).toBeVisible();
    if (screen === "s03")
      await expect(
        page.getByText("Mostrando 1 a 2 de 3", { exact: true }),
      ).toBeVisible();
    if (screen === "s05")
      await expect(
        page.getByText("Completado parcialmente", { exact: true }),
      ).toBeVisible();
    if (screen === "s06")
      await expect(
        page.getByText("Precio regular en fecha", { exact: true }),
      ).toBeVisible();
    await noOverflow(page);
    await capture(page, `docs/evidencias/mk-013-${screen}-1440.png`);
  }
  expect(errors).toEqual([]);
});

test("MK-013: invalid objective and unknown batch never create defaults for mutation", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios/editar?target=desconocido");
  await expect(
    page.getByText("Selecciona un objetivo válido", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar cambios", exact: true }),
  ).toHaveCount(0);
  await gotoPricingReview(page, "/precios/importaciones/desconocido");
  await expect(
    page.getByText("Lote no encontrado", { exact: true }),
  ).toBeVisible();
});

test("MK-013: decimal precision, temporal boundaries and stale writes are checked exactly", async () => {
  expect(decimalLess("9007199254740993.001", "9007199254740993.002")).toBe(
    true,
  );
  expect(decimalLess("120.000", "120")).toBe(false);
  expect(
    validatePrice(
      {
        regular: "120.0001",
        offer: "120.00009",
        offerAction: "ESTABLECER",
        currency: "PEN",
        reason: "Revisión",
      },
      { offer: null, currency: "PEN" },
    ),
  ).toEqual({});
  expect(localInstant("2026-02-30T07:00")).toBeNull();
  expect(localInstant("2026-09-10T07:00")).toBe("2026-09-10T12:00:00.000Z");
  const repository = createMockPricingRepository({
    now: () => "2026-10-17T12:00:00Z",
  });
  const signal = new AbortController().signal;
  const target = { targetId: "override42", channel: "retail" as const };
  const initial = (await repository.readEditable(target, signal))!;
  const change = {
    target,
    version: initial.version,
    draft: {
      regular: "9007199254740993.002",
      offer: "9007199254740993.001",
      offerAction: "ESTABLECER" as const,
      currency: "PEN",
      reason: "Precisión de demostración",
    },
  };
  const saved = await repository.update(change, signal);
  expect(saved.regular).toBe("9007199254740993.002");
  expect(saved.channel).toBe("retail");
  await expect(repository.update(change, signal)).rejects.toMatchObject({
    kind: "conflict",
  });
  expect(
    (await repository.readEditable({ ...target, channel: "global" }, signal))
      ?.regular,
  ).toBe("259.90");
  expect(
    await repository.readHistorical(
      { targetId: "base", channel: "global" },
      "2026-09-01T00:00:00.000Z",
      signal,
    ),
  ).not.toBeNull();
  expect(
    await repository.readHistorical(
      { targetId: "base", channel: "global" },
      "2026-08-31T23:59:59.000Z",
      signal,
    ),
  ).toBeNull();
});

test("MK-013-S02: browser Back from confirmation shows one dialog and retains proposal", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios?target=base");
  await page.getByRole("link", { name: "Editar precio", exact: true }).click();
  await editDraft(page);
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.goBack();
  await expect(
    page.getByRole("dialog", { name: "Cambios sin guardar" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Confirmar cambio de precio" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }),
  ).toHaveValue("279.90");
});

test("MK-013-S03/S06: loading, absence and errors are distinct and cancel stale reads", async ({
  page,
}) => {
  await gotoPricingReview(page, "/precios/programaciones?target=base&modoRevision=1");
  await select(page, "Escenario del listado", "Cargando");
  await expect(
    page.getByRole("status", {
      name: "Cargando programaciones del objetivo seleccionado",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Importe programado", exact: true }),
  ).toBeVisible();
  await select(page, "Escenario del listado", "Sin dato");
  await expect(
    page.getByText("Sin programaciones", { exact: true }),
  ).toBeVisible();
  await select(page, "Escenario del listado", "Error de lectura");
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo cargar el listado",
  );
  await gotoPricingReview(page,
    "/precios/historico?target=variant40&at=2026-09-10T07:00&modoRevision=1",
  );
  await select(page, "Escenario histórico", "Cargando");
  await expect(
    page.getByText("Consultando precio histórico…", { exact: true }),
  ).toBeVisible();
  await select(page, "Escenario histórico", "Sin dato");
  await expect(
    page.getByText("Sin precio en ese instante", { exact: true }),
  ).toBeVisible();
  await select(page, "Escenario histórico", "Disponible");
  await expect(
    page.getByText("Precio regular en fecha", { exact: true }),
  ).toBeVisible();
});
