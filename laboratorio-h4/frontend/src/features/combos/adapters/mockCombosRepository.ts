import { comboFixtures } from "../mocks/comboFixtures";
import { calculateInformativeAvailability } from "../services/availability";
import { currentGlobalPricesForSku, effectivePublicMinor } from "../services/comboRules";
import { validateMockComboPayload } from "../services/validateMockComboPayload";
import {
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";
import {
  ComboError,
  type Combo,
  type ComboAvailability,
  type ComboPayload,
  type ComboQuery,
  type ComboStatus,
  type CombosAvailabilityPort,
  type CombosCatalogPort,
  type CombosPricingPort,
  type CombosRepository,
} from "../types/combos";

const clone = <T,>(value: T): T => structuredClone(value);

function isCombo(value: unknown): value is Combo {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    (value.status === "ACTIVO" || value.status === "INACTIVO") &&
    Array.isArray(value.components) &&
    value.components.length > 0 &&
    value.components.every(
      (c) =>
        isRecord(c) &&
        typeof c.sku === "string" &&
        c.sku.trim().length > 0 &&
        typeof c.quantity === "number" &&
        Number.isFinite(c.quantity) &&
        c.quantity > 0,
    )
  );
}

function isComboArray(value: unknown): value is Combo[] {
  return Array.isArray(value) && value.every(isCombo);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("La consulta fue cancelada.", "AbortError");
}

export interface MockCombosDependencies {
  catalog: CombosCatalogPort;
  pricing: CombosPricingPort;
  availability: CombosAvailabilityPort;
  seed?: Combo[];
  now?: () => number;
  knownComboIds?: ReadonlySet<string>;
  // Only the demo composition opts in; directly constructed instances stay isolated.
  persist?: boolean;
}

export class MockCombosRepository implements CombosRepository {
  private combos: Combo[] = clone(comboFixtures);
  private listErrorDelivered = false;
  private readonly versionConflictScenariosTriggered = new Set<string>();
  private readonly deps: MockCombosDependencies;
  private readonly now: () => number;
  private readonly persistEnabled: boolean;

  constructor(deps: MockCombosDependencies) {
    this.deps = deps;
    this.now = deps.now ?? (() => Date.now());
    this.persistEnabled = deps.persist === true && isMockPersistenceAvailable();
    if (this.persistEnabled) {
      const stored = readMockState<Combo[]>("combos", isComboArray);
      if (stored) this.combos = stored;
      else if (deps.seed) this.combos = clone(deps.seed);
      subscribeExternalMockChanges("combos", () => {
        const next = readMockState<Combo[]>("combos", isComboArray);
        if (!next) return;
        this.combos = next;
        publishMockChange("combos");
      });
    } else if (deps.seed) {
      this.combos = clone(deps.seed);
    }
  }

  private persist(): boolean {
    let ok = true;
    if (this.persistEnabled) {
      ok = saveMockState("combos", this.combos);
    }
    publishMockChange("combos");
    return ok;
  }

  async list(query: ComboQuery, signal?: AbortSignal): Promise<{ items: Combo[]; page: number; pageSize: number; total: number }> {
    throwIfAborted(signal);
    if (query.scenario === "list-error" && !this.listErrorDelivered) {
      await Promise.resolve();
      throwIfAborted(signal);
      this.listErrorDelivered = true;
      throw new ComboError("unknown", "No se pudieron consultar los combos.");
    }
    if (!Number.isSafeInteger(query.page) || query.page < 1 || !Number.isSafeInteger(query.pageSize) || query.pageSize < 1) {
      throw new ComboError("unknown", "La página solicitada no es válida.");
    }
    const all = query.scenario === "list-empty" ? [] : this.combos.filter((item) => query.status === "TODOS" || item.status === query.status);
    const start = (query.page - 1) * query.pageSize;
    // Availability is derived, never trusted from a snapshot: recompute it at read
    // time from the injected Catalog/Inventory ports so a stale seed can never be
    // published as a current reading.
    const items = await Promise.all(
      all.slice(start, start + query.pageSize).map((item) => this.withCurrentAvailability(item, signal)),
    );
    return { items, page: query.page, pageSize: query.pageSize, total: all.length };
  }

  async getById(id: string, signal?: AbortSignal): Promise<Combo | null> {
    throwIfAborted(signal);
    const found = this.combos.find((item) => item.id === id) ?? null;
    if (!found) return null;
    return this.withCurrentAvailability(found, signal);
  }

  async create(payload: ComboPayload, scenario?: string): Promise<Combo> {
    if (scenario === "server-price-rejected") {
      throw new ComboError("price_invalid", "El precio del combo no cumple la regla económica.");
    }
    await validateMockComboPayload(payload, this.validationContext());
    const combo = await this.buildCombo(payload, `combo-${this.combos.length + 1}`, 1, "ACTIVO");
    this.combos.unshift(combo);
    if (!this.persist() && this.persistEnabled) {
      throw new ComboError("unknown", "No se pudo guardar el cambio. Vuelve a intentarlo.");
    }
    return clone(combo);
  }

  async update(id: string, payload: ComboPayload, scenario?: string): Promise<Combo> {
    let current = this.combos.find((item) => item.id === id);
    if (!current) throw new ComboError("not_found", "No se encontró el combo.");
    if (scenario === "version-conflict" && !this.versionConflictScenariosTriggered.has(id)) {
      const concurrent = { ...clone(current), name: `${current.name} (actualizado en servidor)`, version: current.version + 1 };
      this.combos = this.combos.map((item) => item.id === id ? concurrent : item);
      this.versionConflictScenariosTriggered.add(id);
      current = concurrent;
      this.persist();
      throw new ComboError("version_conflict", "Este combo cambió desde que comenzaste a editarlo.", clone(current));
    }
    if (payload.version !== undefined && payload.version !== current.version) {
      throw new ComboError("version_conflict", "Este combo cambió desde que comenzaste a editarlo.", clone(current));
    }
    if (scenario === "server-price-rejected") {
      throw new ComboError("price_invalid", "El precio del combo no cumple la regla económica.");
    }
    await validateMockComboPayload(payload, this.validationContext());
    const updated = await this.buildCombo(payload, current.id, current.version + 1, current.status);
    this.combos = this.combos.map((item) => item.id === id ? updated : item);
    if (!this.persist() && this.persistEnabled) {
      throw new ComboError("unknown", "No se pudo guardar el cambio. Vuelve a intentarlo.");
    }
    return clone(updated);
  }

  async deactivate(id: string): Promise<Combo> {
    const current = this.combos.find((item) => item.id === id);
    if (!current) throw new ComboError("not_found", "No se encontró el combo.");
    const availability = current.availability.state === "COMBO_INACTIVO"
      ? current.availability
      : calculateInformativeAvailability("INACTIVO", [], new Map(), null);
    const updated: Combo = { ...current, status: "INACTIVO", version: current.version + 1, availability };
    this.combos = this.combos.map((item) => item.id === id ? updated : item);
    if (!this.persist() && this.persistEnabled) {
      throw new ComboError("unknown", "No se pudo guardar el cambio. Vuelve a intentarlo.");
    }
    return clone(updated);
  }

  private validationContext() {
    return {
      catalog: this.deps.catalog,
      pricing: this.deps.pricing,
      existingComboIds: this.deps.knownComboIds ?? new Set(this.combos.map((combo) => combo.id)),
      now: this.now(),
    };
  }

  private async withCurrentAvailability(combo: Combo, signal?: AbortSignal): Promise<Combo> {
    const [availability, resolved] = await Promise.all([
      this.computeAvailability(combo.status, combo.components, signal),
      this.deps.catalog.resolveSkus(combo.components.map(component => component.sku), signal),
    ]);
    const names = new Map(resolved.map(component => [component.sku, component.productName]));
    return { ...clone(combo), availability, components: combo.components.map(component => ({
      ...component, productName: names.get(component.sku) ?? component.productName,
    })) };
  }

  private async computeAvailability(
    status: ComboStatus,
    components: { sku: string; quantity: number }[],
    signal?: AbortSignal,
  ): Promise<ComboAvailability> {
    throwIfAborted(signal);
    const skus = components.map((component) => component.sku);
    const [resolved, readings] = await Promise.all([
      this.deps.catalog.resolveSkus(skus, signal),
      this.deps.availability.readStocks(skus, signal),
    ]);
    const sellable = new Map(resolved.map((entry) => [entry.sku, entry.sellable]));
    return calculateInformativeAvailability(
      status,
      components.map((component) => ({
        sku: component.sku,
        quantity: component.quantity,
        // Unresolved identity stays null; it is never coerced into a sellable (true)
        // nor into a false inactive component.
        active: sellable.get(component.sku) ?? null,
      })),
      new Map(readings.map((reading) => [reading.sku, reading])),
      new Date(this.now()).toISOString(),
    );
  }

  private async buildCombo(payload: ComboPayload, id: string, version: number, status: ComboStatus): Promise<Combo> {
    const skus = payload.components.map(item => item.sku);
    const [prices, resolved, availability] = await Promise.all([
      this.deps.pricing.readCurrent(skus),
      this.deps.catalog.resolveSkus(skus),
      this.computeAvailability(status, payload.components),
    ]);
    const nameBySku = new Map(resolved.map((entry) => [entry.sku, entry.productName]));
    const components = payload.components.map((item) => {
      const matches = currentGlobalPricesForSku(item.sku, prices, this.now());
      const price = matches.length === 1 ? matches[0] : undefined;
      return {
        sku: item.sku,
        productName: nameBySku.get(item.sku) ?? item.sku,
        quantity: item.quantity,
        regularUnitMinor: price?.regularMinor ?? null,
        publicUnitMinor: price ? effectivePublicMinor(price) : null,
      };
    });
    return {
      id,
      name: payload.name.trim(),
      description: payload.description,
      status,
      priceMinor: payload.priceMinor,
      version,
      components,
      availability,
    };
  }
}
