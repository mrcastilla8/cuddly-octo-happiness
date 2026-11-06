import { gotoPricingReview } from "./support/pricingReview";
import { test, expect, type Page } from "@playwright/test";
import { evidencePath } from "./support/evidence";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createMockPricingRepository } from "../src/features/pricing/adapters/mockPricingRepository";
import { createPricingRuntime } from "../src/features/pricing/services/pricingService";
import {
  validatePrice,
  validateSchedule,
} from "../src/features/pricing/services/pricingValidation";
import { alternateIds } from "./adapters/alternatePricingRepository";

const clock = { now: () => "2026-10-17T12:00:00Z" };
async function mount(page: Page, path = "/precios", missing = false) {
  await gotoPricingReview(page,
    "/tests/harness/pricing-adapter.html?" +
      new URLSearchParams({ path, missing: missing ? "1" : "0" }),
  );
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
async function select(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function snapshot(page: Page, file: string) {
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: evidencePath(file),
    fullPage: true,
    animations: "disabled",
  });
}

test("MOCK_REPLACEABLE: another catalog, currency and Retail quote use unchanged S01/S02 pages", async ({
  page,
}) => {
  const loaded: string[] = [];
  page.on("request", (request) => loaded.push(request.url()));
  await mount(page);
  await expect(
    page.getByRole("combobox", { name: "Producto o SKU" }),
  ).toHaveValue("Cafetera Andina · Producto base");
  await select(page, "Producto o SKU", "Acero · 1 litro — COF-STEEL-XL");
  await select(page, "Canal de consulta", "Retail");
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  const summary = page.getByRole("region", {
    name: "Acero · 1 litro",
    exact: true,
  });
  await expect(summary).toContainText("CHF 450.500");
  await expect(summary).toContainText("Retail efectivo");
  const row = page.getByRole("row").filter({ hasText: "COF-STEEL-XL" });
  await expect(row).toContainText("CHF 450.500");
  await expect(row).toContainText("CHF 400.25");
  await expect(page.getByText("Zapatilla", { exact: false })).toHaveCount(0);
  await snapshot(page, "mk-013-h09-h16-segundo-adapter-retail-1440.png");
  await page.getByRole("link", { name: "Editar precio", exact: true }).click();
  await select(page, "Alcance del precio", "Precio base del producto");
  await expect(
    page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }),
  ).toHaveValue("310.125");
  await expect(
    page.getByRole("textbox", { name: "Moneda", exact: true }),
  ).toHaveAttribute("readonly", "");
  await page
    .getByRole("textbox", { name: "Nuevo precio regular", exact: true })
    .fill("333.125");
  await page
    .getByRole("textbox", { name: "Motivo del cambio", exact: true })
    .fill("Propuesta de otro origen");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar cambio de precio", exact: true })
    .click();
  await expect(
    page.getByText("Precio actualizado", { exact: true }),
  ).toBeVisible();
  const writes = await page.evaluate(() =>
    window.pricingAudit.calls.filter((row) => row.operation === "update"),
  );
  expect(writes).toEqual([
    { operation: "update", targetId: alternateIds.product, channel: "global" },
  ]);
  expect(
    loaded.some((url) => /\/mocks\/|mockPricingRepository/.test(url)),
  ).toBe(false);
  await expect(
    page.getByRole("combobox", { name: "Escenario de guardado" }),
  ).toHaveCount(0);
});

test("MOCK_REPLACEABLE: S03 uses the regular price at the future instant and keeps target identity", async ({
  page,
}) => {
  await mount(page, "/precios/programaciones");
  await expect(
    page.getByText("Mostrando 1 a 2 de 2", { exact: true }),
  ).toBeVisible();
  await select(page, "Tipo de precio", "Oferta");
  await page
    .getByRole("textbox", { name: "Importe programado", exact: true })
    .fill("400.00");
  await page
    .getByRole("textbox", { name: "Fecha y hora de inicio", exact: true })
    .fill("2027-05-01T00:00");
  await page
    .getByRole("textbox", {
      name: "Fecha y hora de fin (opcional)",
      exact: true,
    })
    .fill("2027-06-01T00:00");
  await page
    .getByRole("textbox", { name: "Motivo de la programación", exact: true })
    .fill("Oferta futura");
  await expect(
    page.getByText("Regular de referencia: CHF 500.005", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Programar precio", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar programación", exact: true })
    .click();
  await expect(
    page.getByText("Precio programado", { exact: true }),
  ).toBeVisible();
  const calls = await page.evaluate(() => window.pricingAudit.calls);
  expect(calls.filter((row) => row.operation === "schedule")).toEqual([
    {
      operation: "schedule",
      targetId: alternateIds.product,
      channel: "global",
      kind: "OFERTA",
    },
  ]);
  expect(
    calls.some(
      (row) =>
        row.operation === "readHistorical" &&
        row.at === "2027-05-01T05:00:00.000Z",
    ),
  ).toBe(true);
  await snapshot(page, "mk-013-h02-segundo-adapter-programacion-1440.png");
});

test("MOCK_REPLACEABLE: S04 forwards the actual file and explicit policy; new input invalidates review", async ({
  page,
}) => {
  await mount(page, "/precios/importar");
  const file = page.locator('input[type="file"]');
  await file.setInputFiles({
    name: "another-source.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("opaque-payload-v1"),
  });
  await page
    .getByRole("radio", { name: "Permitir resultados parciales", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Prevalidar archivo", exact: true })
    .click();
  await expect(
    page.getByText("Total publicado: 8 filas.", { exact: false }),
  ).toBeVisible();
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
  await file.setInputFiles({
    name: "replaced-source.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.from("opaque-payload-v2"),
  });
  await page
    .getByRole("button", { name: "Prevalidar archivo", exact: true })
    .click();
  const calls = await page.evaluate(() =>
    window.pricingAudit.calls.filter((row) => row.operation === "prevalidate"),
  );
  expect(calls).toEqual([
    {
      operation: "prevalidate",
      fileName: "another-source.bin",
      fileText: "opaque-payload-v1",
      isFile: true,
      allowPartial: true,
    },
    {
      operation: "prevalidate",
      fileName: "replaced-source.bin",
      fileText: "opaque-payload-v2",
      isFile: true,
      allowPartial: false,
    },
  ]);
  await snapshot(page, "mk-013-h11-segundo-adapter-archivo-1440.png");
});

test("MOCK_REPLACEABLE: S05 downloads adapter bytes/name and retains confirmed rows on report failure", async ({
  page,
}) => {
  await mount(page, `/precios/importaciones/${alternateIds.batch}`);
  await expect(page.getByText("Completado", { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar reporte", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("resultado-cafeteras.csv");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString()).toBe(
    "sku,status\nCOF-STEEL-XL,COMPLETED\n",
  );
  await page.evaluate(() => {
    window.pricingAudit.failReport = true;
  });
  await page
    .getByRole("button", { name: "Descargar reporte", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Reporte alternativo no disponible",
  );
  await expect(
    page.getByRole("row").filter({ hasText: "COF-STEEL-XL" }),
  ).toContainText("Confirmada");
});

test("MOCK_REPLACEABLE: S06 preserves a different SKU/context and renders normalized historical data", async ({
  page,
}) => {
  await mount(
    page,
    `/precios/historico?target=${alternateIds.sku}&channel=retail&at=2026-09-10T07:00&modoRevision=1`,
  );
  await expect(
    page.getByRole("combobox", { name: "SKU de referencia" }),
  ).toHaveValue("COF-STEEL-XL");
  await expect(
    page.getByRole("region", { name: "Acero · 1 litro", exact: true }),
  ).toContainText("CHF 120.00");
  await expect(
    page.getByText("Referencia de vigencia: alt-validity-008.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Escenario histórico" }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Volver a precios", exact: true })
    .click();
  await expect(page).toHaveURL(
    /target=catalog-steel-771&channel=retail&at=2026-09-10/,
  );
  await expect(
    page.getByRole("region", { name: "Acero · 1 litro", exact: true }),
  ).toContainText("CHF 450.500");
});

test("H12: missing API and failed alternate reads never fall back to the mock", async ({
  page,
}) => {
  await mount(page, "/precios", true);
  await expect(page.getByRole("alert")).toContainText(
    "Esta función no está disponible en el modo actual",
  );
  await expect(
    page.getByRole("combobox", { name: "Producto o SKU" }),
  ).toHaveCount(0);
  await expect(page.getByText("Zapatilla", { exact: false })).toHaveCount(0);
  await mount(page);
  await expect(
    page.getByRole("region", { name: "Cafetera Andina", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    window.pricingAudit.failRead = true;
  });
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Origen alternativo no disponible",
  );
  await expect(
    page.getByText("Última consulta disponible", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Editar precio", exact: true }),
  ).toHaveCount(0);
  await snapshot(page, "mk-013-h12-api-sin-fallback-1440.png");
});

test("H01: Retail summary and its breakdown row agree after a channel-specific update", async () => {
  const repo = createMockPricingRepository(clock);
  const signal = new AbortController().signal;
  const target = { targetId: "override42", channel: "retail" as const };
  const current = (await repo.readEditable(target, signal))!;
  await repo.update(
    {
      target,
      version: current.version,
      draft: {
        regular: "279.90",
        offer: "260.90",
        offerAction: "ESTABLECER",
        currency: current.currency,
        reason: "Tarifa Retail",
      },
    },
    signal,
  );
  const result = (await repo.read(target, signal))!;
  expect(result.breakdown.find((row) => row.id === target.targetId)).toEqual(
    result.price,
  );
  expect(result.price).toMatchObject({
    regular: "279.90",
    offer: "260.90",
    channel: "retail",
  });
  expect(
    (await repo.read({ ...target, channel: "global" }, signal))!.price.regular,
  ).toBe("259.90");
});

test("H02/H13: offer validation uses its regular reference and the injected clock", async () => {
  const repo = createMockPricingRepository(clock);
  const signal = new AbortController().signal;
  const draft = {
    kind: "OFERTA" as const,
    amount: "249.90",
    currency: "PEN",
    channel: "global" as const,
    start: "2027-04-01T00:00",
    end: "2027-04-02T00:00",
    reason: "Oferta",
  };
  await expect(repo.schedule("base", draft, signal)).rejects.toThrow(
    "La oferta debe ser menor",
  );
  const reference = (await repo.readEditable(
    { targetId: "base", channel: "global" },
    signal,
  ))!;
  const near = {
    ...draft,
    kind: "REGULAR" as const,
    amount: "300.00",
    start: "2026-10-18T00:00",
    end: "2026-10-18T12:00",
  };
  expect(
    validateSchedule(near, "2026-10-17T12:00:00Z", reference).start,
  ).toBeUndefined();
  expect(
    validateSchedule(near, "2026-10-19T12:00:00Z", reference).start,
  ).toBeDefined();
});

test("H03/H06: arbitrary currencies and inherited offers cannot be silently converted", async () => {
  const current = { offer: "90.00", currency: "PEN" };
  const draft = {
    regular: "100.00",
    offer: "",
    offerAction: "CONSERVAR" as const,
    currency: "USD",
    reason: "Cambio",
  };
  expect(validatePrice(draft, current)).toHaveProperty("currency");
  expect(validatePrice(draft, current)).toHaveProperty("offer");
  expect(validatePrice({ ...draft, currency: "123" }, current)).toHaveProperty(
    "currency",
  );
  expect(validatePrice({ ...draft, currency: "XXX" }, current)).toHaveProperty(
    "currency",
  );
  expect(validatePrice({ ...draft, currency: "PEN" }, current)).toEqual({});
});

test("H04/H05: schedules remain scoped and regular/offer overlaps are rejected across kinds", async () => {
  const repo = createMockPricingRepository(clock);
  const signal = new AbortController().signal;
  expect((await repo.listSchedules("variant40", 1, signal)).items).toEqual([]);
  const draft = {
    kind: "REGULAR" as const,
    amount: "150.00",
    currency: "PEN",
    channel: "global" as const,
    start: "2027-05-01T00:00",
    end: "2027-06-01T00:00",
    reason: "Temporada",
  };
  await repo.schedule("base", draft, signal);
  const offer = {
    ...draft,
    kind: "OFERTA" as const,
    amount: "100.00",
    start: "2027-05-02T00:00",
    end: "2027-05-03T00:00",
  };
  await expect(repo.schedule("base", offer, signal)).rejects.toMatchObject({
    kind: "overlap",
  });
  await repo.schedule("variant40", offer, signal);
  const rows = await repo.listSchedules("variant40", 1, signal);
  expect(rows.items).toHaveLength(1);
  expect(rows.items[0]!.targetId).toBe("variant40");
  const at = (await repo.readHistorical(
    { targetId: "variant40", channel: "global" },
    "2027-05-02T06:00:00Z",
    signal,
  ))!;
  expect(at.price).toMatchObject({
    regular: "150.00",
    offer: "100.00",
    origin: "sku",
    inherited: false,
  });
});

test("H08/H16: October 17 data is temporally applicable and contains no display labels", async () => {
  const repo = createMockPricingRepository(clock);
  const signal = new AbortController().signal;
  const result = (await repo.read(
    { targetId: "base", channel: "global" },
    signal,
  ))!;
  expect(result.price.currency).toBe("PEN");
  expect(result.price.regular).toBe("249.90");
  expect(Date.parse(result.price.validFrom)).toBeLessThanOrEqual(
    Date.parse(clock.now()),
  );
  expect(Date.parse(result.price.validUntil!)).toBeGreaterThan(
    Date.parse(clock.now()),
  );
  expect(
    (await repo.readHistorical(
      { targetId: "base", channel: "global" },
      "2026-11-01T00:00:00Z",
      signal,
    ))!.price.offer,
  ).toBeNull();
});

test("H11: default mock prevalidation stays blocked instead of pretending to parse the file", async () => {
  const repo = createMockPricingRepository(clock);
  await expect(
    repo.prevalidate(
      { file: new File(["unapproved bytes"], "data.bin"), allowPartial: true },
      new AbortController().signal,
    ),
  ).rejects.toMatchObject({ kind: "blocked_contract" });
});

test("H12: API factory failures propagate and production defaults to a system clock", async () => {
  const signal = new AbortController().signal;
  const runtime = await createPricingRuntime("api");
  await expect(runtime.service.listTargets(signal)).rejects.toMatchObject({
    kind: "configuration",
  });
  expect(Math.abs(Date.parse(runtime.clock.now()) - Date.now())).toBeLessThan(
    1000,
  );
  await expect(
    createPricingRuntime("api", {
      api: async () => {
        throw new Error("Provider unavailable");
      },
    }),
  ).rejects.toThrow("Provider unavailable");
  await expect(createPricingRuntime("unrecognized")).rejects.toThrow(
    "VITE_DATA_MODE",
  );
});

test("H09/H10/H15: product source and ports are free of fixture IDs and artificial scenarios", () => {
  const root = resolve("src/features/pricing");
  const pageFiles = readdirSync(resolve(root, "pages")).filter(
    (name) => name.endsWith(".tsx") && name !== "PricingPatternsPage.tsx",
  );
  const componentFiles = readdirSync(resolve(root, "components")).filter(
    (name) => name.endsWith(".tsx") && !name.endsWith("Example.tsx"),
  );
  const hookFiles = readdirSync(resolve(root, "hooks")).filter((name) =>
    name.endsWith(".ts"),
  );
  for (const [folder, files] of [
    ["pages", pageFiles],
    ["components", componentFiles],
    ["hooks", hookFiles],
  ] as const) {
    for (const file of files) {
      const source = readFileSync(resolve(root, folder, file), "utf8");
      expect(source, file).not.toMatch(/from\s+["'][^"']*\/mocks\//);
      expect(source, file).not.toMatch(
        /priceTargets|ReviewScenario|BatchScenario|mockClock|scenario|previewFixture|data:text/,
      );
      expect(source, file).not.toMatch(/targetId\s*(?:===|:)\s*["']base["']/);
    }
  }
  const port = readFileSync(
    resolve(root, "services/pricingRepository.ts"),
    "utf8",
  );
  expect(port).not.toMatch(/scenario|DemoScenario|PriceScenario/);
  expect(port).toMatch(/prevalidate\(\s*input: ImportInput/);
});
