import { test, expect } from "@playwright/test";
import { createMockPricingAudit } from "../src/features/price-audit/mocks/pricingChanges";
import { createMockPricingRepository } from "../src/features/pricing/adapters/mockPricingRepository";
import { createMockAuditRepository } from "../src/features/price-audit/adapters/mockAuditRepository";
import { demoNow, priceTargets } from "../src/features/pricing/mocks/prices";
import { MockCombosPricingAdapter } from "../src/features/combos/mocks/mockCombosPricingAdapter";
import { createAuditRuntime } from "../src/features/price-audit/services/auditService";
import { createPricingRuntime } from "../src/features/pricing/services/pricingService";
import { evidencePath } from "./support/evidence";

const emptyFilters = { sku: "", desde: "", hasta: "", usuarioId: "", canal: "", batchId: "" };

test("VER-01/04: confirmed mock edit survives module navigation and appears in audit", async ({ page }) => {
  await page.goto("/precios/editar?target=base");
  await page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }).fill("279.90");
  await page.getByRole("textbox", { name: "Motivo del cambio", exact: true }).fill("Trazabilidad simulada VER-01");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar cambio de precio", exact: true }).click();
  await expect(page.getByText("Precio actualizado", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Historial de precios", exact: true }).click();
  await page.getByRole("row").filter({ hasText: "ZAP-TRL-EXP" }).getByRole("link", { name: /Ver detalle/ }).first().click();
  await expect(page.getByRole("dialog")).not.toContainText("demo-pricing");
  await expect(page.getByRole("dialog")).toContainText("ZAP-TRL-EXP");
  await page.screenshot({ path: evidencePath("ver-01-detalle-1440.png") });
  await page.getByRole("button", { name: "Volver al historial", exact: true }).click();
  await expect(page.getByText(/no hay auditoría real/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: evidencePath("ver-01-listado-1440.png"), fullPage: true });
  await page.reload();
  await expect(page.getByRole("table")).toBeVisible();
  // La edición confirmada se persiste en este navegador: tras recargar el asiento sigue disponible.
  await expect(page.getByRole("row").filter({ hasText: "ZAP-TRL-EXP" }).first()).toBeVisible();
});

test("VER-01/03: provider-consumer contract preserves decimals, nulls, filters, rejected writes and isolation", async () => {
  const log = createMockPricingAudit();
  const pricing = createMockPricingRepository({ now: () => demoNow }, log.record);
  const audit = createMockAuditRepository(log.read);
  const signal = new AbortController().signal;
  const target = { targetId: "base", channel: "global" as const };
  const original = (await pricing.readEditable(target, signal))!;
  const draft = { regular: "279.90000000000000000001", offer: "", offerAction: "ELIMINAR" as const, currency: "PEN", reason: "Retiro simulado" };
  await expect(pricing.update({ target, version: -1, draft }, signal)).rejects.toMatchObject({ kind: "conflict" });
  await expect(pricing.update({ target, version: original.version, draft: { ...draft, regular: "0" } }, signal)).rejects.toMatchObject({ kind: "error" });
  expect(log.read()).toEqual([]);
  const aborted = new AbortController();
  aborted.abort();
  await expect(pricing.update({ target, version: original.version, draft }, aborted.signal)).rejects.toThrow();
  expect(log.read()).toEqual([]);
  const saved = await pricing.update({ target, version: original.version, draft }, signal);
  expect(saved.version).toBe(original.version + 1);
  const result = await audit.list({ ...emptyFilters, sku: "ZAP-TRL-EXP", usuarioId: "demo-pricing", canal: "BACKOFFICE", page: 1, size: 20 }, signal);
  expect(result.total).toBe(2);
  const regular = result.items.find((row) => row.priceType === "REGULAR")!;
  expect(regular).toMatchObject({ productId: "fixture-product-013", before: "249.90", after: draft.regular, variation: "12.0048", at: demoNow });
  expect(result.items.find((row) => row.priceType === "OFERTA")).toMatchObject({ before: "219.90", after: null, variation: null, operation: "RETIRO_OFERTA" });
  expect(await audit.detail(regular.id, signal)).toEqual(regular);
  expect((await audit.list({ ...emptyFilters, sku: "ZAP-TRL-EXP", canal: "API", page: 1, size: 20 }, signal)).total).toBe(0);
  expect(createMockPricingAudit().read()).toEqual([]);
  const copy = log.read();
  copy[0]!.reason = "alterado";
  expect(log.read()[0]!.reason).toBe(draft.reason);
  await pricing.update({ target, version: saved.version, draft: { ...draft, regular: "200.00", offerAction: "ESTABLECER", offer: "150.00" } }, signal);
  expect(log.read()).toHaveLength(4);
  expect(log.read().find((row) => row.operation === "CREACION")).toMatchObject({ before: null, after: "150.00", variation: null });
  expect(log.read().find((row) => row.after === "200.00")!.variation).toBe("-28.5459");
  await pricing.update({ target, version: saved.version + 1, draft: { ...draft, regular: "200.000", offerAction: "CONSERVAR" } }, signal);
  expect(log.read()).toHaveLength(4);
});

test("VER-02: isolated Pricing targets do not fabricate prices for Catalog/Combos SKUs", async () => {
  const pricing = createMockPricingRepository({ now: () => demoNow });
  const signal = new AbortController().signal;
  expect(await pricing.listTargets(signal)).toEqual(priceTargets);
  expect(await pricing.read({ targetId: "CAS-COR-001", channel: "global" }, signal)).toBeNull();
  const combos = new MockCombosPricingAdapter({ now: () => Date.parse(demoNow) });
  const before = await combos.readCurrent(["CAS-COR-001"], signal);
  expect(before[0]).toMatchObject({ sku: "CAS-COR-001", regularMinor: 17900 });
  expect(await combos.readCurrent(["ZAP-TRL-EXP"], signal)).toEqual([]);
  await pricing.update({ target: { targetId: "base", channel: "global" }, version: 4, draft: { regular: "279.90", offerAction: "CONSERVAR", offer: "", currency: "PEN", reason: "Solo piloto" } }, signal);
  expect(await combos.readCurrent(["CAS-COR-001"], signal)).toEqual(before);
});

test("VER-02-B: Pricing rereads confirmed edits preserving decimal strings; real Combos integration pending", async () => {
  const pricing = createMockPricingRepository({ now: () => demoNow });
  const signal = new AbortController().signal;
  const target = { targetId: "base", channel: "global" as const };
  const initial = (await pricing.read(target, signal))!;
  expect(initial.price).toMatchObject({ regular: "249.90", offer: "219.90" });
  const saved = await pricing.update(
    {
      target,
      version: initial.price.version,
      draft: { regular: "289.90000000000000000001", offerAction: "ELIMINAR", offer: "", currency: "PEN", reason: "Relectura de Pricing" },
    },
    signal,
  );

  const updated = await pricing.read(target, signal);
  expect(updated?.price).toEqual(saved);
  expect(updated?.price).toMatchObject({ regular: "289.90000000000000000001", offer: null, version: initial.price.version + 1 });
  expect(await pricing.read({ targetId: "objetivo-inexistente", channel: "global" }, signal)).toBeNull();
});

test("VER-03: missing API providers fail closed for both features", async () => {
  const signal = new AbortController().signal;
  const audit = await createAuditRuntime("api");
  const pricing = await createPricingRuntime("api");
  await expect(audit.repository.list({ ...emptyFilters, page: 1, size: 20 }, signal)).rejects.toMatchObject({ kind: "configuration" });
  await expect(pricing.service.listTargets(signal)).rejects.toMatchObject({ kind: "configuration" });
});

test("VER-05: onUpdated callback failure after price save does not prevent update from succeeding", async () => {
  const signal = new AbortController().signal;
  let callbackInvoked = false;
  const failingCallback = () => {
    callbackInvoked = true;
    throw new Error("Fallo forzado en callback de notificación onUpdated");
  };

  const pricing = createMockPricingRepository({ now: () => demoNow }, failingCallback);
  const target = { targetId: "base", channel: "global" as const };
  const current = (await pricing.readEditable(target, signal))!;

  const draft = {
    regular: "319.90",
    offer: "299.90",
    offerAction: "ESTABLECER" as const,
    currency: "PEN",
    reason: "Prueba de robustez ante fallo de callback",
  };

  const saved = await pricing.update({ target, version: current.version, draft }, signal);
  expect(callbackInvoked).toBe(true);
  expect(saved.version).toBe(current.version + 1);
  expect(saved.regular).toBe("319.90");
  expect(saved.offer).toBe("299.90");

  const readAfter = await pricing.read(target, signal);
  expect(readAfter?.price.regular).toBe("319.90");
  expect(readAfter?.price.offer).toBe("299.90");
  expect(readAfter?.price.version).toBe(saved.version);
});
