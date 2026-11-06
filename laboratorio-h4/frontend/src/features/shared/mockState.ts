// Shared local persistence for the G6 mock demonstration.
//
// This module is the single place that knows how demonstration state is stored
// in `localStorage`. It never talks to HTTP, never invents backend contracts and
// never mutates a domain by itself: repositories decide *what* to persist and
// call these helpers at their confirmed write points.
//
// Storage rules implemented here:
// - Versioned key namespace: `g6-productos-ofertas:mock:v1:<domain>`.
// - Each domain keeps its own envelope; nothing is stored in one giant object.
// - Stored payloads are validated (shape + version) before being trusted.
// - Reads/writes are gated to mock mode with a real `localStorage`; API mode and
//   non-browser (unit tests, Node) executions stay isolated in memory.
// - Storage failures are reported but never erase confirmed session state.

export type MockDomain =
  | "catalog"
  | "taxonomy"
  | "taxonomy-brands"
  | "taxonomy-categories"
  | "taxonomy-characteristics"
  | "taxonomy-product-types"
  | "taxonomy-seo"
  | "taxonomy-brand-baja"
  | "taxonomy-category-baja"
  | "taxonomy-characteristic-baja"
  | "pricing"
  | "price-audit"
  | "inventory"
  | "combos"
  | "promotions"
  | "promotions-campaigns"
  | "promotions-coupons"
  | "promotions-recommendations"
  | "promotions-history"
  | "bulk";

export const MOCK_STATE_PREFIX = "g6-productos-ofertas:mock:v1:";
export const MOCK_STATE_VERSION = 1;

export interface MockStateEnvelope<T> {
  version: number;
  savedAt: string;
  data: T;
}

export type MockStateValidator<T> = (data: unknown) => data is T;

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    // Access can throw in blocked/private contexts. Treat as "no storage".
    return null;
  }
}

function isMockMode(): boolean {
  try {
    const env = (import.meta as ImportMeta & {
      env?: { VITE_DATA_MODE?: string; DEV?: boolean };
    }).env;
    if (!env) return false;
    if (env.VITE_DATA_MODE === "mock") return true;
    if (env.VITE_DATA_MODE === "api") return false;
    // Development without an explicit value resolves to mock (see dataMode.ts).
    return env.DEV === true;
  } catch {
    return false;
  }
}

// True only inside the mock demonstration running in a real browser. Unit and
// Playwright (Node) executions, and API builds, get an isolated in-memory store.
export function isMockPersistenceAvailable(): boolean {
  return isMockMode() && getStorage() !== null;
}

export function mockStateKey(domain: MockDomain): string {
  return `${MOCK_STATE_PREFIX}${domain}`;
}

function parseDomainFromKey(key: string): MockDomain | null {
  if (!key.startsWith(MOCK_STATE_PREFIX)) return null;
  return key.slice(MOCK_STATE_PREFIX.length) as MockDomain;
}

/**
 * Reads and validates a persisted domain. Returns `null` when persistence is
 * unavailable, nothing is stored, or the stored envelope is invalid/mismatched
 * (an invalid entry is discarded so the next confirmed write starts clean).
 */
export function readMockState<T>(
  domain: MockDomain,
  isValid: MockStateValidator<T>,
): T | null {
  if (!isMockPersistenceAvailable()) return null;
  const storage = getStorage();
  if (!storage) return null;
  const key = mockStateKey(domain);
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch (error) {
    console.warn(`[mock-state] No se pudo leer "${domain}".`, error);
    return null;
  }
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as MockStateEnvelope<unknown>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== MOCK_STATE_VERSION ||
      !("data" in parsed) ||
      !isValid(parsed.data)
    ) {
      console.warn(`[mock-state] Estado inválido o incompatible en "${domain}"; se descarta.`);
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.warn(`[mock-state] JSON inválido en "${domain}"; se descarta.`, error);
    try {
      storage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/**
 * Persists a confirmed domain state. Returns `true` only when the write was
 * actually completed. A quota/security failure is reported and returns `false`;
 * the caller keeps serving the in-session state instead of losing it.
 */
export function saveMockState<T>(domain: MockDomain, data: T): boolean {
  if (!isMockPersistenceAvailable()) return false;
  const storage = getStorage();
  if (!storage) return false;
  const envelope: MockStateEnvelope<T> = {
    version: MOCK_STATE_VERSION,
    savedAt: new Date().toISOString(),
    data,
  };
  try {
    storage.setItem(mockStateKey(domain), JSON.stringify(envelope));
    return true;
  } catch (error) {
    console.warn(
      `[mock-state] No se pudo persistir "${domain}". Se conserva el estado de la sesión.`,
      error,
    );
    return false;
  }
}

/** Explicitly removes a stored domain (used by demo reset actions). */
export function clearMockState(domain: MockDomain): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(mockStateKey(domain));
  } catch (error) {
    console.warn(`[mock-state] No se pudo limpiar "${domain}".`, error);
  }
}

// ---------------------------------------------------------------------------
// Change notification
// ---------------------------------------------------------------------------

type ChangeListener = (domain: MockDomain) => void;
type ExternalListener = () => void;

const changeListeners = new Set<ChangeListener>();
const externalListeners = new Map<MockDomain, Set<ExternalListener>>();

/**
 * Registers a listener for confirmed changes in any of the given domains.
 * Used by consumers that must re-read derived data (UI invalidation).
 */
export function subscribeMockChanges(
  domains: readonly MockDomain[],
  listener: ChangeListener,
): () => void {
  const wrapped: ChangeListener = (domain) => {
    if (domains.includes(domain)) listener(domain);
  };
  changeListeners.add(wrapped);
  return () => {
    changeListeners.delete(wrapped);
  };
}

/**
 * Notifies an in-session confirmed change. Callers invoke this after their
 * repository has already applied and persisted the mutation.
 */
export function publishMockChange(domain: MockDomain): void {
  for (const listener of Array.from(changeListeners)) {
    try {
      listener(domain);
    } catch (error) {
      console.warn(`[mock-state] Listener de cambios falló para "${domain}".`, error);
    }
  }
}

/**
 * Registers a repository-level listener that must re-hydrate when another tab
 * writes to `localStorage` for the same domain. Local writes do not trigger it.
 */
export function subscribeExternalMockChanges(
  domain: MockDomain,
  listener: ExternalListener,
): () => void {
  ensureStorageSync();
  let set = externalListeners.get(domain);
  if (!set) {
    set = new Set();
    externalListeners.set(domain, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
  };
}

let storageSyncInstalled = false;

function ensureStorageSync(): void {
  if (storageSyncInstalled) return;
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
  storageSyncInstalled = true;
  window.addEventListener("storage", (event) => {
    if (!event.key) return;
    const domain = parseDomainFromKey(event.key);
    if (!domain) return;
    // Another tab changed this domain: refresh local repositories first, then
    // notify consumers so their projections are recomputed from the new state.
    const handlers = externalListeners.get(domain);
    if (handlers) {
      for (const handler of Array.from(handlers)) {
        try {
          handler();
        } catch (error) {
          console.warn(`[mock-state] Rehidratación cruzada falló para "${domain}".`, error);
        }
      }
    }
    publishMockChange(domain);
  });
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArrayOfRecords(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every(isRecord);
}

// ---------------------------------------------------------------------------
// Array-domain helpers (module-level demo stores)
// ---------------------------------------------------------------------------

function arrayValidator<T>(
  isItem: (value: unknown) => boolean,
): MockStateValidator<T[]> {
  return (value): value is T[] => Array.isArray(value) && value.every(isItem);
}

/**
 * Hydrates a mutable array store from persistence, falling back to a deep clone
 * of its fixtures. The returned array is the one the adapter keeps mutating.
 */
export function loadMockArray<T>(
  domain: MockDomain,
  fixtures: readonly T[],
  isItem: (value: unknown) => boolean = isRecord,
): T[] {
  const stored = readMockState(domain, arrayValidator<T>(isItem));
  if (stored) return stored;
  return structuredClone(fixtures as T[]) as T[];
}

/** Saves a confirmed array store and notifies consumers (taxonomy family too). */
export function persistMockArray<T>(domain: MockDomain, data: readonly T[]): boolean {
  const saved = saveMockState(domain, data);
  publishMockChange(domain);
  if (domain !== "taxonomy") publishMockChange("taxonomy");
  return saved;
}

/** Rehydrates a module-level array store when another tab writes the domain. */
export function syncMockArrayOnExternalChange<T>(
  domain: MockDomain,
  store: T[],
  isItem: (value: unknown) => boolean = isRecord,
): void {
  subscribeExternalMockChanges(domain, () => {
    const stored = readMockState(domain, arrayValidator<T>(isItem));
    if (!stored) return;
    store.length = 0;
    store.push(...stored);
    publishMockChange(domain);
    if (domain !== "taxonomy") publishMockChange("taxonomy");
  });
}
