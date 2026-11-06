import { test, expect, type Page } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createAuditRuntime } from "../src/features/price-audit/services/auditService";
import {
  fromLocal,
  isValidAuditInstant,
  originLabel,
} from "../src/features/price-audit/services/auditPresentation";
import { alternateAuditId } from "./adapters/alternateAuditRepository";
import { evidencePath } from "./support/evidence";

async function mount(
  page: Page,
  path = "/precios/auditoria",
  total = 1,
  missing = false,
) {
  await page.goto(
    "/tests/harness/audit-adapter.html?" +
      new URLSearchParams({
        path,
        total: String(total),
        missing: missing ? "1" : "0",
      }),
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
async function close(page: Page) {
  await page
    .getByRole("button", { name: "Volver al historial", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function snapshot(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator('[role="dialog"] .mantine-ScrollArea-viewport')
    .evaluateAll((elements) =>
      elements.forEach((element) => {
        element.scrollTop = 0;
      }),
    );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: evidencePath(name),
    fullPage: (await page.getByRole("dialog").count()) === 0,
    animations: "disabled",
  });
}

test("MK-014 S01/S02: ordered pages, readonly semantics, all fields, modal width and focus return", async ({
  page,
}) => {
  await page.goto("/precios/auditoria?pagina=2");
  await expect(page.getByText("Mostrando 21 a 25 de 25")).toBeVisible();
  const opener = page.getByRole("link", {
    name: "Ver detalle de aud-014-alta-01",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Sin precio anterior");
  await expect(dialog).toContainText("No aplicable");
  await expect(dialog).toContainText("Moneda no informada");
  await expect(dialog.getByText(/S\/|PEN|USD/)).toHaveCount(0);
  const box = await dialog.boundingBox();
  expect(Math.round(box!.width)).toBe(640);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/auditoria\?pagina=2/);
  await expect(opener).toBeFocused();
  await page.goto("/precios/auditoria/asientos/aud-014-mod-01");
  await expect(dialog).toContainText("192.0.2.14");
  await expect(dialog).toContainText("gestor@example.test");
  await close(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
});

test("MK-014 S03: direct 404 preserves filters/page and never fabricates record data", async ({
  page,
}) => {
  await page.goto("/precios/auditoria/asientos/no-existe?pagina=2&sku=DEMO-01");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(
    "No encontramos este registro de auditoría",
  );
  await expect(dialog).not.toContainText("AUDITORIA_PRECIO_NO_ENCONTRADA");
  await expect(dialog).not.toContainText("192.0.2.14");
  await close(page);
  await expect(page).toHaveURL(/pagina=2&sku=DEMO-01/);
  await expect(
    page.getByRole("textbox", { name: "SKU", exact: true }),
  ).toHaveValue("DEMO-01");
  await mount(page);
  await page.evaluate(() => {
    window.auditControl.detailMissing = true;
  });
  await page
    .getByRole("link", { name: `Ver detalle de ${alternateAuditId}` })
    .click();
  await expect(dialog).toContainText(
    "No encontramos este registro de auditoría",
  );
  await close(page);
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
});

test("MK-014: null, zero, absent actor and unknown origins remain distinct without inferred currency", async ({
  page,
}) => {
  for (const [id, text] of [
    ["aud-014-retiro-01", "Sin oferta"],
    ["aud-014-cero-01", "0,00"],
    ["aud-014-lote-01", "No informado"],
  ]) {
    await page.goto(`/precios/auditoria/asientos/${id}`);
    await expect(page.getByRole("dialog")).toContainText(text!);
    if (id === "aud-014-lote-01")
      await expect(
        page.getByRole("dialog").getByText("No informado", { exact: false }),
      ).toHaveCount(3);
  }
  await mount(page, `/precios/auditoria/asientos/${alternateAuditId}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Origen: UNRECOGNIZED");
  await expect(dialog).toContainText("99.999.999.999.999.999,12345");
  for (const origin of [
    "WEB_PARTNER_2027",
    "constructor",
    "__proto__",
    "toString",
  ])
    expect(originLabel(origin)).toBe(origin);
  await expect(dialog).toContainText("Moneda no informada");
});

test("MK-014: filters apply explicitly, dates keep timezone, reset page and browser history restores context", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria?pagina=2", 25);
  const sku = page.getByRole("textbox", { name: "SKU", exact: true });
  await sku.fill("COF-STEEL-XL");
  await page
    .getByRole("textbox", { name: "Desde", exact: true })
    .fill("2026-10-17T07:00");
  await page
    .getByRole("textbox", { name: "Hasta", exact: true })
    .fill("2026-10-17T08:00");
  await page
    .getByRole("textbox", { name: "Usuario (identificador)", exact: true })
    .fill("persona-opaca");
  await page
    .getByRole("textbox", { name: "Canal", exact: true })
    .fill("origen-conocido");
  await page
    .getByRole("textbox", { name: "Lote", exact: true })
    .fill("lote-cafeteras-55");
  expect(
    (await page.evaluate(() => window.auditControl.queries)).at(-1)!.sku,
  ).toBe("");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/pagina=1/);
  await expect
    .poll(() => page.evaluate(() => window.auditControl.queries.at(-1)))
    .toMatchObject({
      sku: "COF-STEEL-XL",
      desde: "2026-10-17T12:00:00.000Z",
      hasta: "2026-10-17T13:00:00.000Z",
      usuarioId: "persona-opaca",
      canal: "origen-conocido",
      batchId: "lote-cafeteras-55",
      page: 1,
      size: 20,
    });
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(sku).toHaveValue("");
  await page.goBack();
  await expect(sku).toHaveValue("COF-STEEL-XL");
  await page.goForward();
  await expect(sku).toHaveValue("");
});

test("MK-014: invalid range blocks a request; empty, loading and service failures differ", async ({
  page,
}) => {
  await mount(page);
  await page
    .getByRole("textbox", { name: "Desde", exact: true })
    .fill("2026-10-18T00:00");
  await page
    .getByRole("textbox", { name: "Hasta", exact: true })
    .fill("2026-10-17T00:00");
  const calls = await page.evaluate(() => window.auditControl.queries.length);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(
    page.getByText(
      "La fecha desde debe ser anterior o igual a la fecha hasta.",
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => window.auditControl.queries.length)).toBe(
    calls,
  );
  await page.goto("/precios/auditoria?modoRevision=1&caso=vacio");
  await expect(
    page.getByText("No hay registros de auditoría disponibles", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(
    "/precios/auditoria?modoRevision=1&caso=vacio&sku=INEXISTENTE",
  );
  await expect(
    page.getByText("No encontramos cambios con estos filtros", { exact: true }),
  ).toBeVisible();
  await page.goto("/precios/auditoria?modoRevision=1&caso=cargando");
  await expect(
    page.getByText("Cargando historial de auditoría…", { exact: true }),
  ).toBeVisible();
  await page.goto("/precios/auditoria?modoRevision=1&caso=error-listado");
  await expect(page.getByRole("alert")).toContainText(
    "Conservamos los filtros",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("MK-014: access denial removes both detail and background protected data; errors are not 404", async ({
  page,
}) => {
  await mount(page);
  await page.evaluate(() => {
    window.auditControl.detailFailure = "forbidden";
  });
  await page
    .getByRole("link", { name: `Ver detalle de ${alternateAuditId}` })
    .click();
  await expect(page.getByRole("dialog")).toContainText("No tienes permiso");
  await expect(page.getByRole("table", { includeHidden: true })).toHaveCount(0);
  await expect(
    page.getByText("No encontramos este registro de auditoría", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText("88999999-cccc-4444-aaaa-777777777777", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/precios/auditoria?modoRevision=1&caso=sin-sesion");
  await expect(page.getByRole("alert")).toContainText("Verifica tu sesión");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("MK-014 MOCK_REPLACEABLE: alternate catalog, applied filters only and pending-to-ready CSV report", async ({
  page,
}) => {
  const loaded: string[] = [];
  page.on("request", (request) => loaded.push(request.url()));
  await mount(page);
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
  await page
    .getByRole("textbox", { name: "SKU", exact: true })
    .fill("unapplied-sku");
  await page.getByRole("link", { name: "Exportar CSV", exact: true }).click();
  await page
    .getByRole("button", { name: "Solicitar CSV", exact: true })
    .dblclick();
  await expect(
    page.getByText("Generando archivo", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Descargar CSV" }),
  ).toBeDisabled();
  const input = await page.evaluate(() => window.auditControl.requests);
  expect(input).toHaveLength(1);
  expect(input[0]).toEqual({
    format: "CSV",
    filters: {
      sku: "",
      desde: "",
      hasta: "",
      usuarioId: "",
      canal: "",
      batchId: "",
    },
  });
  await page.evaluate(() => {
    window.auditControl.phase = "COMPLETED";
  });
  await page
    .getByRole("button", { name: "Consultar estado", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Descargar CSV" }),
  ).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("auditoria-cafeteras.csv");
  const stream = (await download.createReadStream())!;
  const bytes: Buffer[] = [];
  for await (const chunk of stream) bytes.push(Buffer.from(chunk));
  expect(Buffer.concat(bytes).toString()).toContain("COF-STEEL-XL,revision");
  expect(
    loaded.some((url) => /price-audit\/(mocks|adapters\/mock)/.test(url)),
  ).toBe(false);
});

for (const [format, limit] of [
  ["CSV", 100000],
  ["PDF", 500],
] as const) {
  test(`MK-014 ${format}: inclusive limit, server revalidation rejection and compatible CSV option`, async ({
    page,
  }) => {
    await mount(
      page,
      `/precios/auditoria/exportar/${format.toLowerCase()}?sku=COF-STEEL-XL&pagina=2&tamanio=20`,
      limit,
    );
    await expect(
      page.getByRole("button", { name: `Solicitar ${format}`, exact: true }),
    ).toBeEnabled();
    await page.evaluate((total) => {
      window.auditControl.serverTotal = total;
    }, limit + 1);
    await page
      .getByRole("button", { name: `Solicitar ${format}`, exact: true })
      .click();
    await expect(
      page.getByText(`Límite de ${format} excedido`, { exact: true }),
    ).toBeVisible();
    expect(new URL(page.url()).searchParams.has("exportId")).toBe(false);
    expect(await page.evaluate(() => window.auditControl.reads)).toEqual([]);
    expect(
      (await page.evaluate(() => window.auditControl.requests))[0]!.filters.sku,
    ).toBe("COF-STEEL-XL");
    if (format === "PDF") {
      await page
        .getByRole("link", { name: "Exportar CSV", exact: true })
        .click();
      await expect(page).toHaveURL(/sku=COF-STEEL-XL&pagina=2&tamanio=20/);
    }
    await mount(
      page,
      `/precios/auditoria/exportar/${format.toLowerCase()}`,
      limit,
    );
    await page
      .getByRole("button", { name: `Solicitar ${format}`, exact: true })
      .click();
    await expect(page).toHaveURL(/exportId=export-coffee/);
    await expect(
      page.getByText("Generando archivo", { exact: true }).first(),
    ).toBeVisible();
    expect(await page.evaluate(() => window.auditControl.requests.length)).toBe(
      1,
    );
  });
}

test("MK-014: CSV above 100000 and PDF above 500 refuse creation before submission", async ({
  page,
}) => {
  for (const [format, total] of [
    ["csv", 100001],
    ["pdf", 501],
    ["pdf", 100001],
  ] as const) {
    await mount(page, `/precios/auditoria/exportar/${format}`, total);
    await expect(
      page.getByRole("button", {
        name: `Solicitar ${format.toUpperCase()}`,
        exact: true,
      }),
    ).toBeDisabled();
    expect(await page.evaluate(() => window.auditControl.requests.length)).toBe(
      0,
    );
    if (total === 100001)
      await expect(
        page.getByRole("link", { name: "Exportar CSV", exact: true }),
      ).toHaveCount(0);
  }
});

test("MK-014: unknown POST cannot be resubmitted; known job GET retries without a second POST", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria/exportar/csv");
  await page.evaluate(() => {
    window.auditControl.requestFailure = "unknown";
  });
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(
    page.getByText("No pudimos confirmar la solicitud", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Solicitar CSV" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.auditControl.requests.length)).toBe(
    1,
  );
  await mount(page, "/precios/auditoria/exportar/csv");
  await page.evaluate(() => {
    window.auditControl.readFailure = "unavailable";
  });
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Origen alternativo no disponible",
  );
  await page.evaluate(() => {
    window.auditControl.readFailure = undefined;
  });
  await page
    .getByRole("button", { name: "Consultar estado", exact: true })
    .click();
  await expect(
    page.getByText("Generando archivo", { exact: true }).first(),
  ).toBeVisible();
  expect(await page.evaluate(() => window.auditControl.requests.length)).toBe(
    1,
  );
});

test("MK-014: generation failure, missing file and download failure are distinct; permission blocks export", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria/exportar/csv");
  await page.evaluate(() => {
    window.auditControl.phase = "COMPLETED";
    window.auditControl.fileAvailable = false;
  });
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(
    page.getByText("El servicio todavía no informa un archivo disponible."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Descargar CSV" }),
  ).toBeDisabled();
  await mount(page, "/precios/auditoria/exportar/csv");
  await page.evaluate(() => {
    window.auditControl.phase = "COMPLETED";
    window.auditControl.downloadFailure = "unavailable";
  });
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await page.getByRole("button", { name: "Descargar CSV" }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo descargar");
  await expect(
    page.getByText("Archivo generado", { exact: true }).first(),
  ).toBeVisible();
  await page.goto(
    "/precios/auditoria/exportar/pdf?modoRevision=1&caso=fallo-generacion",
  );
  await page.getByRole("button", { name: "Solicitar PDF" }).click();
  await expect(
    page.getByText("No se pudo generar el archivo", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Descargar PDF" }),
  ).toBeDisabled();
  await page.goto(
    "/precios/auditoria/exportar/csv?modoRevision=1&caso=exportacion-sin-permiso",
  );
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "No tienes permiso para exportar",
  );
  await expect(page.getByRole("button", { name: "Solicitar CSV" })).toHaveCount(
    0,
  );
});

test("MK-014 S01–S05: 1440px screenshots, keyboard modal and prepared CSV/PDF sample downloads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/precios/auditoria");
  await expect(page.getByRole("table")).toBeVisible();
  await snapshot(page, "mk-014-s01-1440.png");
  for (const [id, screen] of [
    ["aud-014-mod-01", "s02"],
    ["no-existe", "s03"],
  ]) {
    await page.goto(`/precios/auditoria/asientos/${id}`);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document
          .querySelector('[role="dialog"]')
          ?.contains(document.activeElement),
      ),
    ).toBe(true);
    await snapshot(page, `mk-014-${screen}-1440.png`);
  }
  for (const [format, screen] of [
    ["CSV", "s04"],
    ["PDF", "s05"],
  ]) {
    await page.goto(`/precios/auditoria/exportar/${format!.toLowerCase()}`);
    await page.getByRole("button", { name: `Solicitar ${format}` }).click();
    await expect(
      page.getByRole("button", { name: `Descargar ${format}` }),
    ).toBeEnabled();
    await snapshot(page, `mk-014-${screen}-1440.png`);
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: `Descargar ${format}` }).click();
    const file = await downloading;
    expect(file.suggestedFilename()).toMatch(
      new RegExp(`^reporte_auditoria_.*\\.${format!.toLowerCase()}$`),
    );
    const stream = (await file.createReadStream())!;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const content = Buffer.concat(chunks);
    expect(content.subarray(0, format === "PDF" ? 5 : 12).toString()).toBe(
      format === "PDF" ? "%PDF-" : "id_auditoria",
    );
  }
  expect(errors).toEqual([]);
});

test("MK-014: missing API and failed factories never fall back; ports and consumers are fixture-free", async ({
  page,
}) => {
  const loaded: string[] = [];
  page.on("request", (request) => loaded.push(request.url()));
  await mount(page, "/precios/auditoria", 1, true);
  await expect(page.getByRole("alert")).toContainText(
    "La consulta del historial de precios no está disponible",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  expect(
    loaded.some((url) => /price-audit\/(mocks|adapters\/mock)/.test(url)),
  ).toBe(false);
  await expect(
    createAuditRuntime("api", {
      api: async () => {
        throw new Error("Provider ausente");
      },
    }),
  ).rejects.toThrow("Provider ausente");
  const root = resolve("src/features/price-audit");
  for (const folder of ["pages", "components", "hooks"])
    for (const file of readdirSync(resolve(root, folder)).filter((name) =>
      /\.tsx?$/.test(name),
    )) {
      expect(
        readFileSync(resolve(root, folder, file), "utf8"),
        file,
      ).not.toMatch(/from\s+["'][^"']*\/mocks\//);
    }
  expect(
    readFileSync(resolve(root, "services/auditRepository.ts"), "utf8"),
  ).not.toMatch(/scenario|caso|fixture/);
});

test("MK-014: stale filter results are ignored and refresh failure retains only safe marked data", async ({
  page,
}) => {
  await mount(page);
  await page.evaluate(() => {
    window.auditControl.slowSku = "SLOW";
  });
  const sku = page.getByRole("textbox", { name: "SKU", exact: true });
  await sku.fill("SLOW");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await sku.fill("COF-STEEL-XL");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
  await expect
    .poll(() => page.evaluate(() => window.auditControl.slowFinished))
    .toBe(true);
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
  await expect(
    page.getByText("No encontramos cambios con estos filtros", { exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    window.auditControl.listFailure = "unavailable";
  });
  // Reapply the same query: a new read, not a new search identity.
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Origen alternativo no disponible",
  );
  await page.evaluate(() => {
    window.auditControl.listFailure = undefined;
  });
  await page
    .getByRole("button", { name: "Volver a consultar", exact: true })
    .click();
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
  await page.evaluate(() => {
    window.auditControl.listFailure = "unavailable";
  });
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await page
    .getByRole("button", { name: "Volver a consultar", exact: true })
    .click();
  await expect(
    page.getByText(
      "Última consulta disponible. No se ha confirmado una actualización.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
  await page.evaluate(() => {
    window.auditControl.listFailure = "forbidden";
  });
  await page
    .getByRole("button", { name: "Volver a consultar", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No tienes permiso");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("MK-014: a direct unknown export reference only queries and never creates a job", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria/exportar/csv?exportId=unknown-id");
  await expect(
    page.getByText("Exportación no disponible", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.auditControl.requests)).toEqual([]);
  await expect(page.getByRole("button", { name: "Solicitar CSV" })).toHaveCount(
    0,
  );
});

test("MK-014: malformed dates in direct export URLs show validation without requests or render errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mount(page, "/precios/auditoria/exportar/pdf?desde=invalid-date");
  await expect(
    page.getByText("Revisa las fechas", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Solicitar PDF" }),
  ).toBeDisabled();
  expect(await page.evaluate(() => window.auditControl.queries)).toEqual([]);
  expect(await page.evaluate(() => window.auditControl.requests)).toEqual([]);
  expect(errors).toEqual([]);
  expect(fromLocal("2026-10-17T07:00:30")).toBe("2026-10-17T12:00:30.000Z");
});

test("MK-014: an admitted job remains admitted when a later list count grows beyond the format limit", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria/exportar/csv");
  await page.evaluate(() => {
    window.auditControl.afterAcceptedTotal = 100001;
    window.auditControl.phase = "COMPLETED";
  });
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(
    page.getByRole("button", { name: "Descargar CSV" }),
  ).toBeEnabled();
  await expect(
    page.getByText("Límite de CSV excedido", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("No se ha creado una exportación.", { exact: false }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => window.auditControl.requests.length)).toBe(
    1,
  );
});

test("MK-014 regression: detail denial stays hidden until fresh access succeeds and recovers without reload", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria?sku=COF-STEEL-XL&pagina=2", 25);
  const opener = () =>
    page.getByRole("link", { name: `Ver detalle de ${alternateAuditId}` });
  await page.evaluate(() => {
    window.auditControl.detailFailure = "forbidden";
  });
  await opener().click();
  await expect(page.getByRole("dialog")).toContainText("No tienes permiso");
  await expect(page.getByRole("table", { includeHidden: true })).toHaveCount(0);
  await page.evaluate(() => {
    window.auditControl.listFailure = "forbidden";
  });
  await close(page);
  await expect(page.getByRole("alert").last()).toContainText(
    "No tienes permiso",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.evaluate(() => {
    window.auditControl.listFailure = undefined;
    window.auditControl.detailFailure = undefined;
    window.auditControl.slowSku = "COF-STEEL-XL";
  });
  await page
    .getByRole("button", { name: "Volver a consultar", exact: true })
    .click();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
  await expect(
    page.getByText("Acceso no disponible", { exact: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/sku=COF-STEEL-XL&pagina=2/);
  await opener().click();
  await expect(page.getByRole("dialog")).toContainText(
    "Asiento: audit-coffee-908",
  );
  await close(page);
  await expect(page.getByRole("table")).toContainText("COF-STEEL-XL");
});

test("MK-014 regression: exportId changes, back/forward, stale reads and downloads cannot expose a prior job", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria/exportar/csv");
  await page.evaluate(() => {
    window.auditControl.phase = "COMPLETED";
  });
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(
    page.getByRole("button", { name: "Descargar CSV" }),
  ).toBeEnabled();
  const first = new URL(page.url()).searchParams.get("exportId")!;
  const setId = async (id: string | null) => {
    await page.evaluate((value) => {
      const url = new URL(location.href);
      if (value) url.searchParams.set("exportId", value);
      else url.searchParams.delete("exportId");
      history.pushState(null, "", url);
      dispatchEvent(new PopStateEvent("popstate"));
    }, id);
  };
  await setId(null);
  await expect(
    page.getByRole("button", { name: "Solicitar CSV" }),
  ).toBeEnabled();
  await expect(page.getByRole("button", { name: "Descargar CSV" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(
    page.getByRole("button", { name: "Descargar CSV" }),
  ).toBeEnabled();
  const second = new URL(page.url()).searchParams.get("exportId")!;
  expect(second).not.toBe(first);
  await page.evaluate((id) => {
    window.auditControl.slowExportId = id;
  }, first);
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`exportId=${first}`));
  await expect(
    page.getByText("Consultando estado…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar CSV" })).toHaveCount(
    0,
  );
  await page.goForward();
  await expect(page).toHaveURL(new RegExp(`exportId=${second}`));
  await expect(
    page.getByRole("button", { name: "Descargar CSV" }),
  ).toBeEnabled();
  await expect
    .poll(() => page.evaluate(() => window.auditControl.slowExportFinished))
    .toBe(true);
  await page.getByRole("button", { name: "Descargar CSV" }).click();
  await expect
    .poll(() => page.evaluate(() => window.auditControl.downloads))
    .toEqual([second]);
  await page.evaluate((id) => {
    window.auditControl.slowDownloadId = id;
  }, second);
  const files: string[] = [];
  page.on("download", (file) => files.push(file.suggestedFilename()));
  await page.getByRole("button", { name: "Descargar CSV" }).click();
  await setId("missing-reference");
  await expect(
    page.getByText("Exportación no disponible", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar CSV" })).toHaveCount(
    0,
  );
  await expect
    .poll(() => page.evaluate(() => window.auditControl.slowDownloadFinished))
    .toBe(true);
  expect(files).toEqual([]);
  expect(await page.evaluate(() => window.auditControl.requests.length)).toBe(
    2,
  );
});

test("MK-014 regression: mismatched export response cannot be displayed or downloaded", async ({
  page,
}) => {
  await mount(page, "/precios/auditoria/exportar/csv");
  await page.evaluate(() => {
    window.auditControl.phase = "COMPLETED";
    window.auditControl.returnedJobId = "different-job";
  });
  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(page.getByRole("alert")).toContainText("trabajo distinto");
  await expect(page.getByRole("button", { name: "Descargar CSV" })).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => window.auditControl.downloads)).toEqual([]);
});

test("MK-014 strict dates: impossible calendar dates and invalid time/zone never query from direct URLs", async ({
  page,
}) => {
  const invalid = [
    "2026-02-29T12:00:00Z",
    "2026-02-30T12:00:00Z",
    "2026-04-31T12:00:00-05:00",
    "1900-02-29T12:00:00Z",
    "2026-00-10T12:00:00Z",
    "2026-13-01T12:00:00Z",
    "2026-10-00T12:00:00Z",
    "2026-10-32T12:00:00Z",
    "2026-10-17T24:00:00Z",
    "2026-10-17T12:60:00Z",
    "2026-10-17T12:00:60Z",
    "2026-10-17T12:00:00+24:00",
    "2026-10-17T12:00:00-05:60",
    "2026-10-17T12:00:00",
    "2026-2-1T12:00:00Z",
  ];
  for (const date of invalid)
    expect(isValidAuditInstant(date), date).toBe(false);
  for (const date of [
    "2000-02-29T12:00:00Z",
    "2024-02-29T00:00:00-05:00",
    "2026-10-17T12:00:30.123Z",
  ])
    expect(isValidAuditInstant(date), date).toBe(true);
  expect(fromLocal("2026-02-30T07:00")).toBe("");
  for (const [route, field, date] of [
    ["/precios/auditoria", "desde", invalid[1]!],
    ["/precios/auditoria/exportar/csv", "hasta", invalid[0]!],
    ["/precios/auditoria/exportar/pdf", "desde", invalid[2]!],
  ]) {
    await mount(page, route + "?" + new URLSearchParams({ [field!]: date! }));
    await expect(
      page.getByText("Revisa las fechas", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toHaveCount(0);
    expect(await page.evaluate(() => window.auditControl.queries)).toEqual([]);
    expect(await page.evaluate(() => window.auditControl.requests)).toEqual([]);
    if (route!.includes("exportar"))
      await expect(
        page.getByRole("button", { name: /Solicitar (CSV|PDF)/ }),
      ).toBeDisabled();
  }
});
