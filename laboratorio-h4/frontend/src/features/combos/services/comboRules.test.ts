import { describe, expect, it } from "vitest";

import { MockCatalogRepository } from "../../catalog/adapters/mockCatalogRepository";
import { CatalogCombosAdapter } from "../adapters/catalogCombosAdapter";
import { MockCombosRepository, type MockCombosDependencies } from "../adapters/mockCombosRepository";
import { comboFixtures, priceFixtures, stockFixtures } from "../mocks/comboFixtures";
import { MockCombosAvailabilityAdapter } from "../mocks/mockCombosAvailabilityAdapter";
import { MockCombosPricingAdapter } from "../mocks/mockCombosPricingAdapter";
import {
  availabilityMessage,
  availabilityMessageText,
  calculateInformativeAvailability,
  isUnavailableForNewSales,
  isVerifiedPositiveAvailability,
} from "./availability";
import {
  compareComboPrice,
  effectivePublicMinor,
  formatMoney,
  isCurrentGlobalPrice,
  parseMoneyMinor,
  resolveProductSkus,
  toComparisonComponents,
  validateComposition,
} from "./comboRules";
import { diffComboDraft, draftFromCombo, isDraftDirty, keepDraftAfterVersionConflict } from "./drafts";
import { parseComboPage } from "./parseComboPage";
import { RequestIdentity } from "./requestIdentity";
import {
  ComboError,
  type Combo,
  type ComboPayload,
  type CombosCatalogPort,
  type StockReading,
} from "../types/combos";

// A fresh adapter over the shared Catalog ensures every test starts from the
// real product/variant fixture state instead of the process-wide singleton.
function makeCatalog(options: { pageSize?: number; comboTypeIds?: ReadonlySet<string> } = {}) {
  return new CatalogCombosAdapter({ catalog: new MockCatalogRepository(), ...options });
}

function makeAvailability(snapshot: Record<string, StockReading> = stockFixtures as Record<string, StockReading>) {
  return new MockCombosAvailabilityAdapter({ snapshot });
}

const DEMO_NOW_MS = Date.parse("2026-10-17T12:00:00.000Z");

function makeRepository(overrides: Partial<MockCombosDependencies> = {}) {
  return new MockCombosRepository({
    catalog: makeCatalog(),
    pricing: new MockCombosPricingAdapter(),
    availability: makeAvailability(),
    now: () => DEMO_NOW_MS,
    ...overrides,
  });
}

const validPayload: ComboPayload = {
  name: "Combo de prueba",
  description: null,
  components: [
    { sku: "CAS-COR-001", quantity: 1 },
    { sku: "CAM-RUN-BLA-M", quantity: 1 },
  ],
  priceMinor: 27990,
};

function draft(sku: string, productName: string, quantity = 1) {
  return { sku, productName, quantity };
}

function readingMap(entries: Record<string, StockReading>): ReadonlyMap<string, StockReading> {
  return new Map(Object.entries(entries));
}

function active(sku: string, quantity = 1) {
  return { sku, quantity, active: true };
}

describe("COM-01 · resolución autoritativa de SKU contra el Catálogo compartido", () => {
  it("marca como vendible un SKU simple de producto activo y una variante activa", async () => {
    const resolved = await makeCatalog().resolveSkus(["CAS-COR-001", "CAM-RUN-BLA-M"]);
    expect(resolved).toHaveLength(2);
    expect(resolved.find((entry) => entry.sku === "CAS-COR-001"))
      .toMatchObject({ productId: "PROD-CAS-001", productActive: true, variantActive: true, sellable: true, isVariantParentSku: false, isCombo: false });
    expect(resolved.find((entry) => entry.sku === "CAM-RUN-BLA-M"))
      .toMatchObject({ productId: "PROD-RUN-001", productActive: true, variantActive: true, sellable: true, isVariantParentSku: false });
  });

  it("no considera vendible un producto inactivo ni una variante inactiva", async () => {
    const [inactiveProduct] = await makeCatalog().resolveSkus(["ZAP-RUN-41"]);
    expect(inactiveProduct).toMatchObject({ productId: "PROD-ZAP-001", productActive: false, sellable: false });

    const [inactiveVariant] = await makeCatalog().resolveSkus(["CAM-RUN-NEG-S"]);
    expect(inactiveVariant).toMatchObject({ productId: "PROD-RUN-001", productActive: true, variantActive: false, sellable: false });
  });

  it("no vende el SKU padre de un producto con variantes", async () => {
    const [parent] = await makeCatalog().resolveSkus(["CAM-RUN"]);
    expect(parent).toMatchObject({ sku: "CAM-RUN", productId: "PROD-RUN-001", isVariantParentSku: true, sellable: false });
  });

  it("omite SKU inexistentes en lugar de inventarlos", async () => {
    await expect(makeCatalog().resolveSkus(["SKU-UNKNOWN"])).resolves.toEqual([]);
  });

  it("detecta un combo por el tipo publicado de Catálogo y nunca por su nombre", async () => {
    const byDefault = await makeCatalog().resolveSkus(["CAS-COR-001"]);
    expect(byDefault[0]).toMatchObject({ isCombo: false, sellable: true });

    const withComboType = await makeCatalog({ comboTypeIds: new Set(["TIP-CASACA"]) }).resolveSkus(["CAS-COR-001"]);
    expect(withComboType[0]).toMatchObject({ isCombo: true, sellable: false });

    const listed = await makeCatalog({ comboTypeIds: new Set(["TIP-CASACA"]) }).listProducts("");
    expect(listed.map((product) => product.name).every((name) => !name.toLocaleLowerCase("es-PE").includes("combo"))).toBe(true);
  });

  it("resuelve SKU ubicados en páginas posteriores a la primera", async () => {
    const paged = makeCatalog({ pageSize: 1 });
    const resolved = await paged.resolveSkus(["CAS-COR-001", "CAM-RUN-BLA-M"]);
    expect(resolved.map((entry) => entry.sku).sort()).toEqual(["CAM-RUN-BLA-M", "CAS-COR-001"]);
  });

  it("propaga el fallo del catálogo en lugar de silenciarlo", async () => {
    const failingCatalog: CombosCatalogPort = {
      async listProducts() { return []; },
      async getProduct() { return null; },
      async resolveSkus() { throw new Error("Catálogo compartido no disponible."); },
    };
    await expect(failingCatalog.resolveSkus(["CAS-COR-001"])).rejects.toThrow("Catálogo compartido no disponible.");
    const repository = makeRepository({ catalog: failingCatalog });
    await expect(repository.create(validPayload)).rejects.toThrow("Catálogo compartido no disponible.");
  });

  it("describe el detalle de producto con sus variantes activas e inactivas", async () => {
    const catalog = makeCatalog();
    const detail = await catalog.getProduct("PROD-RUN-001");
    expect(detail?.variants.map((variant) => [variant.sku, variant.active])).toEqual([
      ["CAM-RUN-BLA-M", true],
      ["CAM-RUN-AZU-L", true],
      ["CAM-RUN-NEG-S", false],
    ]);
    expect(resolveProductSkus(detail!)).toEqual(["CAM-RUN-BLA-M", "CAM-RUN-AZU-L"]);
    expect(resolveProductSkus({ ...detail!, active: false })).toEqual([]);

    const simple = await catalog.getProduct("PROD-CAS-001");
    expect(resolveProductSkus(simple!)).toEqual(["CAS-COR-001"]);
  });
});

describe("COM-01 · validación definitiva al guardar un combo", () => {
  it("crea un combo válido y calcula su disponibilidad informativa", async () => {
    const created = await makeRepository().create(validPayload);
    expect(created).toMatchObject({ status: "ACTIVO", version: 1, priceMinor: 27990 });
    expect(created.availability).toMatchObject({ state: "DISPONIBLE", quantity: 4, freshness: "ACTUALIZADA", verifiable: true });
    expect(created.components.map((component) => component.sku)).toEqual(["CAS-COR-001", "CAM-RUN-BLA-M"]);
  });

  it("devuelve el código canónico para cada composición inválida", async () => {
    const repository = makeRepository();
    await expect(repository.create({ ...validPayload, components: [draft("CAS-COR-001", "Casaca")] }))
      .rejects.toMatchObject({ code: "COMBO_COMPONENTES_INSUFICIENTES" });
    await expect(repository.create({ ...validPayload, components: [draft("CAS-COR-001", "Casaca"), draft("CAS-COR-001", "Casaca")] }))
      .rejects.toMatchObject({ code: "COMBO_COMPONENTE_DUPLICADO" });
    await expect(repository.create({ ...validPayload, components: [draft("CAS-COR-001", "Casaca"), draft("CAM-RUN-BLA-M", "Camiseta deportiva", 1.5)] }))
      .rejects.toMatchObject({ code: "CANTIDAD_INVALIDA" });
    await expect(repository.create({ ...validPayload, components: [draft("CAS-COR-001", "Casaca"), draft("SKU-UNKNOWN", "Falso")] }))
      .rejects.toMatchObject({ code: "SKU_NO_ENCONTRADO" });
  });

  it("rechaza variantes inactivas, productos inactivos y SKU padre con SKU_INACTIVO", async () => {
    const repository = makeRepository();
    for (const sku of ["CAM-RUN-NEG-S", "ZAP-RUN-41", "CAM-RUN"]) {
      await expect(repository.create({ ...validPayload, components: [draft("CAS-COR-001", "Casaca"), draft(sku, "Componente")] }))
        .rejects.toMatchObject({ code: "SKU_INACTIVO" });
    }
  });

  it("rechaza un combo publicado por Catálogo como componente anidado", async () => {
    const repository = makeRepository({ catalog: makeCatalog({ comboTypeIds: new Set(["TIP-CASACA"]) }) });
    await expect(repository.create(validPayload)).rejects.toMatchObject({ code: "COMBO_ANIDADO_NO_PERMITIDO" });
  });

  it("rechaza precios iguales o superiores a las sumas de referencia", async () => {
    const repository = makeRepository();
    await expect(repository.create({ ...validPayload, priceMinor: 0 })).rejects.toMatchObject({ code: "COMBO_PRECIO_INVALIDO" });
    await expect(repository.create({ ...validPayload, priceMinor: 28890 })).rejects.toMatchObject({ code: "COMBO_PRECIO_INVALIDO" });
    await expect(repository.create({ ...validPayload, priceMinor: 31890 })).rejects.toMatchObject({ code: "COMBO_PRECIO_INVALIDO" });
  });

  it("no crea un combo si Pricing no confirma una referencia global vigente única", async () => {
    const repository = makeRepository({ pricing: new MockCombosPricingAdapter({ prices: [] }) });
    await expect(repository.create(validPayload)).rejects.toMatchObject({ kind: "pricing_unavailable" });
  });

  it("refleja la desactivación en el detalle y en el listado", async () => {
    const repository = makeRepository();
    const deactivated = await repository.deactivate("combo-001");
    expect(deactivated).toMatchObject({ status: "INACTIVO", version: 4 });
    expect(deactivated.availability).toMatchObject({ state: "COMBO_INACTIVO", quantity: null, verifiable: false });
    expect(await repository.getById("combo-001")).toMatchObject({ status: "INACTIVO" });

    const inactive = await repository.list({ status: "INACTIVO", page: 1, pageSize: 10 });
    expect(inactive.items.map((combo) => combo.id).sort()).toEqual(["combo-001", "combo-003"]);
  });

  it("recalcula la disponibilidad al cambiar cantidades y conserva su valor al renombrar", async () => {
    const repository = makeRepository();
    const original = await repository.getById("combo-001");
    expect(original?.availability).toMatchObject({ state: "DISPONIBLE", quantity: 4 });

    const quantityChanged = await repository.update("combo-001", {
      name: original!.name,
      description: original!.description,
      components: [draft("CAS-COR-001", "Casaca", 2), draft("CAM-RUN-BLA-M", "Camiseta deportiva", 1)],
      priceMinor: original!.priceMinor,
      version: original!.version,
    });
    expect(quantityChanged).toMatchObject({ version: original!.version + 1 });
    expect(quantityChanged.availability).toMatchObject({ state: "DISPONIBLE", quantity: 2 });

    const soldOut = await repository.update("combo-001", {
      name: original!.name,
      description: original!.description,
      components: [draft("CAS-COR-001", "Casaca", 5), draft("CAM-RUN-BLA-M", "Camiseta deportiva", 1)],
      priceMinor: original!.priceMinor,
      version: quantityChanged.version,
    });
    expect(soldOut.availability).toMatchObject({ state: "AGOTADO", quantity: 0, freshness: "ACTUALIZADA" });

    const renamed = await repository.update("combo-001", {
      name: "Conjunto Trail Esencial v2",
      description: original!.description,
      components: [draft("CAS-COR-001", "Casaca", 1), draft("CAM-RUN-BLA-M", "Camiseta deportiva", 1)],
      priceMinor: original!.priceMinor,
      version: soldOut.version,
    });
    expect(renamed.name).toBe("Conjunto Trail Esencial v2");
    expect(renamed.availability).toMatchObject({ state: "DISPONIBLE", quantity: 4 });
  });

  it("expone la versión conflictiva sin sustituir el borrador y permite el segundo guardado", async () => {
    const repository = makeRepository();
    const original = await repository.getById("combo-001");
    const local = draftFromCombo(original ?? undefined);
    local.name = "Borrador local conservado";

    const conflict = await repository
      .update("combo-001", { ...validPayload, version: original!.version }, "version-conflict")
      .catch((reason: unknown) => reason);
    expect(conflict).toBeInstanceOf(ComboError);
    expect(conflict).toMatchObject({ kind: "version_conflict" });
    expect((conflict as ComboError).currentVersion)
      .toMatchObject({ version: original!.version + 1, name: "Conjunto Trail Esencial (actualizado en servidor)" });

    const captured = keepDraftAfterVersionConflict(local, (conflict as ComboError).currentVersion);
    expect(captured.draft.name).toBe("Borrador local conservado");
    expect(captured.currentVersion).toEqual(await repository.getById("combo-001"));

    const secondSave = await repository.update("combo-001", { ...validPayload, version: captured.currentVersion!.version }, "version-conflict");
    expect(secondSave.version).toBe(captured.currentVersion!.version + 1);
  });

  it("devuelve exactamente la versión persistida ante una versión obsoleta", async () => {
    const repository = makeRepository();
    const persisted = await repository.getById("combo-002");
    const conflict = await repository
      .update("combo-002", { ...validPayload, version: persisted!.version - 1 })
      .catch((reason: unknown) => reason);
    expect(conflict).toMatchObject({ kind: "version_conflict" });
    expect((conflict as ComboError).currentVersion).toEqual(persisted);
    expect(await repository.getById("combo-002")).toEqual(persisted);
  });

  it("distingue error de listado, listado vacío y paginación", async () => {
    const errored = makeRepository();
    await expect(errored.list({ status: "TODOS", page: 1, pageSize: 5, scenario: "list-error" }))
      .rejects.toMatchObject({ kind: "unknown" });
    await expect(errored.list({ status: "TODOS", page: 1, pageSize: 5, scenario: "list-error" }))
      .resolves.toMatchObject({ total: 3 });

    const empty = await makeRepository().list({ status: "TODOS", page: 1, pageSize: 5, scenario: "list-empty" });
    expect(empty).toMatchObject({ items: [], total: 0 });

    const firstPage = await makeRepository().list({ status: "TODOS", page: 1, pageSize: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(3);
    const secondPage = await makeRepository().list({ status: "TODOS", page: 2, pageSize: 2 });
    expect(secondPage.items).toHaveLength(1);
  });
});

describe("COM-02 · comparación preventiva y referencias de Pricing", () => {
  it("interpreta importes con hasta dos decimales", () => {
    expect(parseMoneyMinor("120,05")).toBe(12005);
    expect(parseMoneyMinor("279.90")).toBe(27990);
    expect(parseMoneyMinor("0")).toBe(0);
    expect(parseMoneyMinor("abc")).toBeNull();
    expect(parseMoneyMinor("1.999")).toBeNull();
    expect(formatMoney(15900)).toContain("159");
    expect(formatMoney(null)).toBe("No disponible");
  });

  it("usa el precio regular cuando no hay oferta efectiva vigente", () => {
    expect(effectivePublicMinor({ sku: "X", regularMinor: 1000, offerMinor: null, currency: "PEN", channelId: null, priceVersion: 1, validityId: "v", validFrom: "2020-01-01T00:00:00Z", validUntil: null })).toBe(1000);
    expect(effectivePublicMinor(priceFixtures[0]!)).toBe(15900);
    expect(isCurrentGlobalPrice({ ...priceFixtures[0]!, validUntil: "2020-02-01T00:00:00Z" })).toBe(false);
  });

  it("aprueba un precio menor que las sumas regular y pública vigentes", () => {
    const components = toComparisonComponents(
      [draft("CAS-COR-001", "Casaca"), draft("CAM-RUN-BLA-M", "Camiseta deportiva")],
      priceFixtures,
    );
    expect(compareComboPrice(components, "279.90", priceFixtures))
      .toMatchObject({ status: "ready", regularMinor: 31890, publicMinor: 28890, valid: true });
  });

  it("rechaza igualar o superar cada referencia y no inventa una comparación sin Pricing", () => {
    const components = toComparisonComponents(
      [draft("CAS-COR-001", "Casaca"), draft("CAM-RUN-BLA-M", "Camiseta deportiva")],
      priceFixtures,
    );
    expect(compareComboPrice(components, "288.90", priceFixtures))
      .toMatchObject({ valid: false, reason: "El precio debe ser menor que la suma de precios públicos vigentes." });
    expect(compareComboPrice(components, "318.90", priceFixtures))
      .toMatchObject({ valid: false, reason: "El precio debe ser menor que la suma de precios regulares." });
    expect(compareComboPrice(components, "279.90", [])).toMatchObject({ status: "unavailable" });
    expect(compareComboPrice(components, "0", priceFixtures)).toMatchObject({ valid: false });
  });

  it("no elige arbitrariamente entre referencias globales vigentes duplicadas", () => {
    const base = priceFixtures.find((price) => price.sku === "CAS-COR-001")!;
    const duplicate = { ...base, priceVersion: base.priceVersion + 1, validityId: "otra-vigencia" };
    const ambiguous = [...priceFixtures, duplicate];
    const components = toComparisonComponents([draft("CAS-COR-001", "Casaca")], ambiguous);
    expect(compareComboPrice(components, "100.00", ambiguous)).toMatchObject({ status: "unavailable" });
  });

  it("exige dos SKU distintos, cantidades enteras y componentes de catálogo", () => {
    expect(validateComposition({ components: [draft("CAS-COR-001", "Casaca")] }))
      .toContain("Agrega al menos dos SKU vendibles.");
    expect(validateComposition({ components: [draft("CAS-COR-001", "Casaca"), draft("CAS-COR-001", "Casaca")] }))
      .toContain("Cada SKU debe aparecer una sola vez.");
    expect(validateComposition({ components: [draft("CAS-COR-001", "Casaca"), draft("CAM-RUN-BLA-M", "Camiseta deportiva", 1.5)] }))
      .toContain("La cantidad de cada componente debe ser un entero igual o mayor que 1.");
  });
});

describe("COM-03 · disponibilidad informativa sin inventar stock", () => {
  const stocks = readingMap({
    A: { sku: "A", stock: 5, stale: false, locationsCompatible: true },
    B: { sku: "B", stock: 8, stale: false, locationsCompatible: true },
    ZERO: { sku: "ZERO", stock: 0, stale: false, locationsCompatible: true },
  });

  it("calcula min(piso(stock / cantidad)) entre los componentes", () => {
    const availability = calculateInformativeAvailability(
      "ACTIVO",
      [active("A", 2), active("B", 3)],
      stocks,
      "2026-01-01T00:00:00.000Z",
    );
    expect(availability).toMatchObject({ state: "DISPONIBLE", quantity: 2, verifiable: true, freshness: "ACTUALIZADA" });
    expect(availability.calculatedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("marca agotado cuando la disponibilidad confirmada es cero", () => {
    expect(calculateInformativeAvailability("ACTIVO", [active("ZERO")], stocks))
      .toMatchObject({ state: "AGOTADO", quantity: 0, verifiable: true });
  });

  it("advierte desactualizada sin dejar de ser verificable", () => {
    const stale = readingMap({ A: { sku: "A", stock: 5, stale: true, locationsCompatible: true } });
    expect(calculateInformativeAvailability("ACTIVO", [active("A")], stale))
      .toMatchObject({ state: "DESACTUALIZADA", quantity: 5, verifiable: true, freshness: "DESACTUALIZADA" });
  });

  it("no convierte un saldo desconocido en un cero confiable", () => {
    const unknown = readingMap({ A: { sku: "A", stock: null, stale: false, locationsCompatible: true } });
    expect(calculateInformativeAvailability("ACTIVO", [active("A")], unknown))
      .toMatchObject({ state: "INCOMPLETA", quantity: null, verifiable: false });

    expect(calculateInformativeAvailability("ACTIVO", [active("A")], readingMap({})))
      .toMatchObject({ state: "INCOMPLETA", quantity: null, verifiable: false });

    const incompatible = readingMap({ A: { sku: "A", stock: 5, stale: false, locationsCompatible: false } });
    expect(calculateInformativeAvailability("ACTIVO", [active("A")], incompatible))
      .toMatchObject({ state: "INCOMPLETA", quantity: null });
  });

  it("distingue combo inactivo, componente inactivo y cantidad no verificable", () => {
    expect(calculateInformativeAvailability("INACTIVO", [active("A")], stocks))
      .toMatchObject({ state: "COMBO_INACTIVO", quantity: null });
    expect(calculateInformativeAvailability("ACTIVO", [active("A"), { sku: "B", quantity: 1, active: false }], stocks))
      .toMatchObject({ state: "COMPONENTE_INACTIVO", quantity: null });
    expect(calculateInformativeAvailability("ACTIVO", [], stocks))
      .toMatchObject({ state: "INCOMPLETA" });
    expect(calculateInformativeAvailability("ACTIVO", [active("A", 0.5)], stocks))
      .toMatchObject({ state: "NO_VERIFICABLE", quantity: null });
  });

  it("clasifica disponibilidad, venta y mensajes semánticos", () => {
    const available = comboWith({ state: "DISPONIBLE", verifiable: true, quantity: 4, freshness: "ACTUALIZADA", calculatedAt: "2026-01-01T00:00:00.000Z", reason: null });
    expect(isVerifiedPositiveAvailability(available.availability)).toBe(true);
    expect(isUnavailableForNewSales(available)).toBe(false);
    expect(availabilityMessage(available)).toMatchObject({ label: "4 combos estimados", semantic: "success" });

    expect(isVerifiedPositiveAvailability(comboWith({ state: "DESACTUALIZADA", verifiable: true, quantity: 4, freshness: "DESACTUALIZADA", calculatedAt: "2026-01-01T00:00:00.000Z", reason: null }).availability)).toBe(false);
    expect(isUnavailableForNewSales(comboWith({ state: "AGOTADO", verifiable: true, quantity: 0, freshness: "ACTUALIZADA", calculatedAt: null, reason: null }))).toBe(true);
    expect(availabilityMessage(comboWith({ state: "AGOTADO", verifiable: true, quantity: 0, freshness: "ACTUALIZADA", calculatedAt: null, reason: null })).label).toBe("Agotado (0 confirmado)");

    const inactive = { ...comboWith(available.availability), status: "INACTIVO" as const };
    expect(isUnavailableForNewSales(inactive)).toBe(true);
    expect(availabilityMessageText(inactive)).toBe("La definición administrativa se conserva y no se ofrece para nuevas ventas.");
  });
});

describe("COM-03 · prioridad de disponibilidad y recomputo autoritativo", () => {
  const readings = readingMap({
    OK: { sku: "OK", stock: 5, stale: false, locationsCompatible: true },
    ZERO: { sku: "ZERO", stock: 0, stale: false, locationsCompatible: true },
    STALE: { sku: "STALE", stock: 5, stale: true, locationsCompatible: true },
  });

  it("nunca considera vendible una identidad de componente no resuelta", () => {
    expect(calculateInformativeAvailability("ACTIVO", [{ sku: "OK", quantity: 1, active: null }], readings))
      .toMatchObject({ state: "NO_VERIFICABLE", quantity: null, verifiable: false, freshness: "NO_VERIFICABLE" });
  });

  it("respeta el orden: inactivo > vacío > identidad no resuelta > inactivo componente > cantidad inválida", () => {
    // Combo inactivo gana incluso con componentes en problemas.
    expect(calculateInformativeAvailability(
      "INACTIVO",
      [{ sku: "OK", quantity: 0, active: null }, { sku: "OK", quantity: 1, active: false }],
      readings,
    )).toMatchObject({ state: "COMBO_INACTIVO" });
    // Sin componentes -> incompleta, antes de evaluar identidades.
    expect(calculateInformativeAvailability("ACTIVO", [], readings)).toMatchObject({ state: "INCOMPLETA" });
    // Identidad no resuelta (null) gana sobre componente inactivo (false) y cantidad inválida.
    expect(calculateInformativeAvailability(
      "ACTIVO",
      [{ sku: "OK", quantity: 0, active: null }, { sku: "OK", quantity: 1, active: false }],
      readings,
    )).toMatchObject({ state: "NO_VERIFICABLE" });
    // Componente inactivo confirmado gana sobre cantidad inválida.
    expect(calculateInformativeAvailability(
      "ACTIVO",
      [{ sku: "OK", quantity: 1.5, active: false }],
      readings,
    )).toMatchObject({ state: "COMPONENTE_INACTIVO" });
    // Cantidad inválida gana sobre una lectura ausente.
    expect(calculateInformativeAvailability(
      "ACTIVO",
      [{ sku: "DESCONOCIDO", quantity: 0, active: true }],
      readings,
    )).toMatchObject({ state: "NO_VERIFICABLE" });
  });

  it("no publica un resultado positivo, cero ni desactualizado si falta una lectura", () => {
    // La lectura incompleta se decide antes de la desactualizada y del cero confirmado.
    expect(calculateInformativeAvailability(
      "ACTIVO",
      [active("STALE"), active("DESCONOCIDO")],
      readings,
    )).toMatchObject({ state: "INCOMPLETA", quantity: null, verifiable: false });
    // Con lecturas completas pero desactualizadas se conserva el estimado, nunca un positivo verificado.
    expect(calculateInformativeAvailability(
      "ACTIVO",
      [active("STALE"), active("OK")],
      readings,
    )).toMatchObject({ state: "DESACTUALIZADA", quantity: 5, verifiable: true, freshness: "DESACTUALIZADA" });
    // La desactualizada se decide antes del cero confirmado: no se degrada a AGOTADO.
    expect(calculateInformativeAvailability(
      "ACTIVO",
      [active("STALE"), active("ZERO")],
      readings,
    )).toMatchObject({ state: "DESACTUALIZADA", quantity: 0, verifiable: true, freshness: "DESACTUALIZADA" });
  });

  it("recomputa la disponibilidad en list() y getById() desde los puertos inyectados", async () => {
    const staleSeed: Combo = {
      id: "combo-seed",
      name: "Seed desactualizado",
      description: null,
      status: "ACTIVO",
      priceMinor: 1000,
      version: 1,
      components: [{ sku: "SKU-INEXISTENTE", productName: "Falso", quantity: 1, regularUnitMinor: 100, publicUnitMinor: 100 }],
      // Un snapshot semilla no confiable: no debe publicarse tal cual.
      availability: { state: "DISPONIBLE", verifiable: true, quantity: 999, freshness: "ACTUALIZADA", calculatedAt: "2000-01-01T00:00:00.000Z", reason: null },
    };
    const repository = makeRepository({ seed: [staleSeed] });
    expect(await repository.getById("combo-seed")).toMatchObject({
      availability: { state: "NO_VERIFICABLE", quantity: null, verifiable: false },
    });
    const listed = await repository.list({ status: "TODOS", page: 1, pageSize: 10 });
    // Conserva identidad, componentes, precio, versión y estado; solo recalcula la disponibilidad.
    expect(listed.items.find((item) => item.id === "combo-seed")).toMatchObject({
      id: "combo-seed",
      priceMinor: 1000,
      version: 1,
      status: "ACTIVO",
      availability: { state: "NO_VERIFICABLE", quantity: null, verifiable: false },
    });
  });

  it("nunca convierte un saldo desconocido en cero al recomputar", async () => {
    const seed: Combo = {
      ...comboFixtures[0]!,
      id: "combo-unknown-stock",
      components: [{ sku: "CAS-COR-001", productName: "Casaca", quantity: 1, regularUnitMinor: null, publicUnitMinor: null }],
    };
    const unknownStock = makeRepository({
      seed: [seed],
      availability: {
        async readStocks() {
          return [{ sku: "CAS-COR-001", stock: null, stale: false, locationsCompatible: true }];
        },
      },
    });
    expect((await unknownStock.getById("combo-unknown-stock"))?.availability)
      .toMatchObject({ state: "INCOMPLETA", quantity: null, verifiable: false });
  });

  it("propaga el fallo de un puerto en lugar de publicar un snapshot obsoleto", async () => {
    const failingCatalog = makeRepository({
      catalog: {
        async listProducts() { return []; },
        async getProduct() { return null; },
        async resolveSkus() { throw new Error("Catálogo no disponible."); },
      },
    });
    await expect(failingCatalog.getById("combo-001")).rejects.toThrow("Catálogo no disponible.");
    await expect(failingCatalog.list({ status: "TODOS", page: 1, pageSize: 10 })).rejects.toThrow("Catálogo no disponible.");

    const failingAvailability = makeRepository({
      availability: {
        async readStocks() { throw new Error("Inventario no disponible."); },
      },
    });
    await expect(failingAvailability.getById("combo-001")).rejects.toThrow("Inventario no disponible.");
  });
});

function comboWith(availability: ReturnType<typeof calculateInformativeAvailability>) {
  return {
    id: "combo",
    name: "Combo",
    description: null,
    status: "ACTIVO" as const,
    priceMinor: 1000,
    version: 1,
    components: [],
    availability,
  };
}

describe("borradores , diffs y protección frente a respuestas fuera de orden", () => {
  it("crea borradores independientes por combo", () => {
    const first = draftFromCombo(comboFixtures[0]);
    const second = draftFromCombo(comboFixtures[1]);
    first.name = "Borrador de la primera entidad";
    expect(second.name).toBe("Dúo Running");
    expect(second.components.map((item) => item.sku)).toEqual(["CAM-RUN-BLA-M", "CAM-RUN-AZU-L"]);
  });

  it("detecta cambios reales ignorando espacios y orden irrelevante", () => {
    const baseline = draftFromCombo(comboFixtures[0]);
    expect(isDraftDirty({ ...baseline, name: `  ${baseline.name}  ` }, baseline)).toBe(false);
    expect(isDraftDirty({ ...baseline, price: "100.00" }, baseline)).toBe(true);
  });

  it("describe el diff del conflicto de versión marcando los campos cambiados", () => {
    const local = draftFromCombo(comboFixtures[0]);
    local.name = "Nombre local";
    local.price = "120.00";
    const rows = diffComboDraft(local, { ...comboFixtures[0]!, name: "Versión servidor" });
    expect(rows.find((row) => row.field === "Nombre")).toMatchObject({ server: "Versión servidor", draft: "Nombre local", changed: true });
    expect(rows.find((row) => row.field === "Precio")).toMatchObject({ changed: true });
    expect(rows.find((row) => row.field === "Componentes")).toMatchObject({ changed: false });
  });

  it("solo permite aplicar el resultado de la consulta más reciente", async () => {
    let resolveOlder!: (value: string) => void;
    let resolveNewer!: (value: string) => void;
    const older = new Promise<string>((resolve) => { resolveOlder = resolve; });
    const newer = new Promise<string>((resolve) => { resolveNewer = resolve; });
    const identity = new RequestIdentity();
    const oldId = identity.begin();
    const newId = identity.begin();
    let visible = "";
    const apply = async (request: Promise<string>, requestId: number) => {
      const value = await request;
      if (identity.isCurrent(requestId)) visible = value;
    };
    const oldWork = apply(older, oldId);
    const newWork = apply(newer, newId);
    resolveNewer("filtro vigente");
    await newWork;
    resolveOlder("filtro anterior");
    await oldWork;
    expect(visible).toBe("filtro vigente");
  });

  it("normaliza entradas de paginación inválidas a la primera página", () => {
    for (const value of [null, "", "0", "-2", "1.5", "Infinity", "9007199254740992", "abc"]) {
      expect(parseComboPage(value)).toBe(1);
    }
    expect(parseComboPage("3")).toBe(3);
  });
});
