import { expect, test, type Page } from "@playwright/test";

// Ronda R1: persistencia de la demostración en `localStorage`.
//
// Cada test de Playwright recibe un contexto de navegador nuevo, por lo que estas
// pruebas parten de almacenamiento vacío y no contaminan a otras suites. La
// persistencia solo se activa en modo mock dentro de un navegador real (ver
// `src/features/shared/mockState.ts`).

const PREFIX = "g6-productos-ofertas:mock:v1:";

const ALLOWED_DOMAINS = new Set([
  "catalog",
  "taxonomy",
  "taxonomy-brands",
  "taxonomy-categories",
  "taxonomy-characteristics",
  "taxonomy-product-types",
  "taxonomy-seo",
  "pricing",
  "price-audit",
  "inventory",
  "combos",
  "promotions",
  "promotions-campaigns",
  "promotions-coupons",
  "promotions-recommendations",
  "promotions-history",
  "bulk",
]);

async function mockStateKeys(page: Page): Promise<string[]> {
  return page.evaluate(
    (prefix) => Object.keys(localStorage).filter((key) => key.startsWith(prefix)),
    PREFIX,
  );
}

async function readEnvelope(page: Page, domain: string) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, `${PREFIX}${domain}`);
}

async function receiveTransfer(page: Page, code: string, quantity: number) {
  await page.goto("/inventario/traslados");
  const row = page.getByRole("row", { name: new RegExp(code) });
  await row.getByRole("button", { name: `Recepcionar traslado ${code}` }).click();
  const dialog = page.getByRole("dialog", { name: /Registrar recepción/ });
  await dialog
    .getByRole("textbox", { name: "Cantidad recibida físicamente" })
    .fill(String(quantity));
  await dialog.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(
    page.getByText(new RegExp(`Recepción registrada para traslado ${code}`)),
  ).toBeVisible();
}

test("@smoke R1: una marca creada se restaura tras recargar y guarda un sobre versionado", async ({
  page,
}) => {
  await page.goto("/marcas/nueva");
  await page.getByLabel("Nombre", { exact: false }).fill("Marca Persistencia R1");
  await page.getByRole("button", { name: "Crear marca", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Marca Persistencia R1", exact: true }),
  ).toBeVisible();

  const envelope = await readEnvelope(page, "taxonomy-brands");
  expect(envelope).not.toBeNull();
  expect(envelope.version).toBe(1);
  expect(typeof envelope.savedAt).toBe("string");
  expect(Array.isArray(envelope.data)).toBe(true);
  expect(
    envelope.data.some((row: { nombre?: string }) => row?.nombre === "Marca Persistencia R1"),
  ).toBe(true);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Marca Persistencia R1", exact: true }),
  ).toBeVisible();
  await page.goto("/marcas");
  await expect(
    page.getByRole("row").filter({ hasText: "Marca Persistencia R1" }).first(),
  ).toBeVisible();
  // La persistencia no altera las fixtures que no fueron modificadas.
  await expect(page.getByRole("row").filter({ hasText: "Nike" }).first()).toBeVisible();
});

test("R1: una edición de precio y su asiento de auditoría sobreviven a la recarga", async ({
  page,
}) => {
  await page.goto("/precios/editar?target=base");
  await page
    .getByRole("textbox", { name: "Nuevo precio regular", exact: true })
    .fill("311.10");
  await page
    .getByRole("textbox", { name: "Motivo del cambio", exact: true })
    .fill("Persistencia de precio R1");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmar cambio de precio", exact: true })
    .click();
  await expect(page.getByText("Precio actualizado", { exact: true })).toBeVisible();

  const pricing = await readEnvelope(page, "pricing");
  expect(pricing).not.toBeNull();
  expect(pricing.version).toBe(1);
  expect(
    pricing.data.records.some(
      (row: { regular?: string; id?: string }) => row?.regular === "311.10",
    ),
  ).toBe(true);

  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }),
  ).toHaveValue(/311[.,]10/);

  await page.goto("/precios/auditoria");
  await page.getByRole("textbox", { name: "SKU", exact: true }).fill("ZAP-TRL-EXP");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "ZAP-TRL-EXP" }).first(),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("textbox", { name: "SKU", exact: true }).fill("ZAP-TRL-EXP");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "ZAP-TRL-EXP" }).first(),
  ).toBeVisible();
});

test("R1: una recepción de inventario confirmada se conserva tras recargar", async ({
  page,
}) => {
  await receiveTransfer(page, "TR-2026-101", 5);
  const navigation = page.getByRole("navigation", {
    name: "Navegación de la aplicación",
  });
  await navigation.getByRole("link", { name: "Control de stock", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" }),
  ).toContainText("13");

  const inventory = await readEnvelope(page, "inventory");
  expect(inventory).not.toBeNull();
  expect(inventory.version).toBe(1);
  expect(Array.isArray(inventory.data.stockItems)).toBe(true);
  expect(Array.isArray(inventory.data.processedOperations)).toBe(true);

  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" }),
  ).toContainText("13");
});

test("R1: un estado con JSON inválido se descarta y se vuelve a las fixtures", async ({
  page,
}) => {
  await page.goto("/marcas");
  await expect(page.getByRole("row").filter({ hasText: "Nike" }).first()).toBeVisible();

  await page.evaluate(
    (key) => localStorage.setItem(key, "{esto no es un sobre válido"),
    `${PREFIX}taxonomy-brands`,
  );
  await page.reload();

  await expect(page.getByRole("row").filter({ hasText: "Nike" }).first()).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Adidas" }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), `${PREFIX}taxonomy-brands`),
  ).toBeNull();
});

test("R1: un estado de versión incompatible se descarta en lugar de aplicarse", async ({
  page,
}) => {
  await page.goto("/marcas");
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 999,
          savedAt: "2020-01-01T00:00:00Z",
          data: [{ marcaId: "fantasma", nombre: "Fantasma", estado: "Activo", version: 1 }],
        }),
      ),
    `${PREFIX}taxonomy-brands`,
  );
  await page.reload();

  await expect(page.getByRole("row").filter({ hasText: "Nike" }).first()).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Fantasma" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), `${PREFIX}taxonomy-brands`),
  ).toBeNull();
});

test("R1: solo se persisten dominios permitidos y sin estado transitorio de UI", async ({
  page,
}) => {
  await page.goto("/marcas/nueva");
  await page.getByLabel("Nombre", { exact: false }).fill("Marca Claves R1");
  await page.getByRole("button", { name: "Crear marca", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Marca Claves R1", exact: true }),
  ).toBeVisible();

  await page.goto("/marcas");
  // Un filtro de búsqueda es estado de UI: nunca debe almacenarse.
  await page.getByLabel("Buscar marca").fill("zzz-transitorio-zzz");

  const keys = await mockStateKeys(page);
  expect(keys.length).toBeGreaterThan(0);
  for (const key of keys) {
    const domain = key.slice(PREFIX.length);
    expect(ALLOWED_DOMAINS.has(domain)).toBe(true);
    const raw = await page.evaluate((k) => localStorage.getItem(k) ?? "", key);
    expect(raw).not.toContain("zzz-transitorio-zzz");
    expect(JSON.parse(raw).version).toBe(1);
  }
});
