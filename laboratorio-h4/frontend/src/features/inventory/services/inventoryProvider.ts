import { ScenarioInventoryAdapter } from "../adapters/scenarioInventoryAdapter";
import { MockInventoryAdapter } from "../adapters/mockInventoryAdapter";
import type { InventoryRepository } from "./inventoryRepository";

// Único punto de selección de fuente de datos del feature de inventario.
// Resolución de fuente (en orden):
//   1. VITE_DATA_MODE (global del proyecto) como única fuente de verdad.
//   2. "mock" en desarrollo / "error" en producción si no está configurada.
// En producción NO existe fallback silencioso al mock: si la API no está
// configurada se lanza un error explícitamente visible.
// En desarrollo/pruebas se compone con ScenarioInventoryAdapter para
// permitir simular estados (loading/empty/error) sin contaminar el contrato.

export type InventorySource = "mock" | "api";

function resolveSource(): InventorySource {
  const global_ = (
    import.meta.env.VITE_DATA_MODE as string | undefined
  )?.toLowerCase();
  if (global_ === "api") return "api";
  if (global_ === "mock") return "mock";

  // Sin configuración explícita: en development usamos mock con ScenarioInventoryAdapter
  // para simular estados sin alterar el contrato de negocio.
  // En producción NO hay fallback silencioso: lanzamos error si no hay configuración.
  if (import.meta.env.DEV) return "mock";

  throw new Error(
    "[inventory] VITE_DATA_MODE debe estar configurado en producción (mock|api). " +
      "No existe fallback silencioso al mock.",
  );
}

// Repositorio lazy que falla bajo demanda en modo API sin cliente configurado.
// No hay fallback al mock: el composition root debe inyectar el transporte del
// cliente compartido mediante `configureInventoryApi`.
class ApiPendingRepository implements InventoryRepository {
  private error: Error;

  constructor() {
    this.error = new Error(
      "[inventory] El adaptador HTTP de inventario no está configurado. " +
        "Inyecta el transporte del cliente compartido (#109) con " +
        "configureInventoryApi, o usa VITE_DATA_MODE=mock.",
    );
  }

  private fail(): Promise<never> {
    return Promise.reject(this.error);
  }

  getStockItems(): Promise<never> { return this.fail(); }
  getStockDetail(): Promise<never> { return this.fail(); }
  getThresholds(): Promise<never> { return this.fail(); }
  updateGlobalThreshold(): Promise<never> { return this.fail(); }
  updateSkuThreshold(): Promise<never> { return this.fail(); }
  getTransfers(): Promise<never> { return this.fail(); }
  receiveTransfer(): Promise<never> { return this.fail(); }
  getDashboardKpis(): Promise<never> { return this.fail(); }
  getDashboardAlerts(): Promise<never> { return this.fail(); }
  getLocationDistribution(): Promise<never> { return this.fail(); }
  getCategories(): Promise<never> { return this.fail(); }
  getBrands(): Promise<never> { return this.fail(); }
  getLocations(): Promise<never> { return this.fail(); }
}

let repository: InventoryRepository | null = null;
let apiFactory: (() => InventoryRepository) | null = null;

// Punto exacto de integración para el composition root compartido (#45/#109):
// debe inyectar aquí el transporte del cliente HTTP común y, si corresponde, el
// resolvedor autoritativo de presentación de traslados. No crea un segundo
// transporte productivo ni un cliente propio de inventario.
export function configureInventoryApi(
  factory: (() => InventoryRepository) | null,
): void {
  apiFactory = factory;
  repository = null;
}

export function getInventoryRepository(): InventoryRepository {
  if (!repository) {
    const source = resolveSource();

    let base: InventoryRepository;
    if (source === "api") {
      // Sin cliente inyectado, el repo falla BAJO DEMANDA (lazy) al invocar
      // métodos, no al instanciar: la app arranca y los hooks renderizan el
      // error controlado en modo API. Nunca se cae silenciosamente al mock.
      base = apiFactory ? apiFactory() : new ApiPendingRepository();
    } else {
      base = new MockInventoryAdapter({ persist: true });
    }

    // En desarrollo/pruebas se decora con ScenarioInventoryAdapter para
    // permitir simular estados sin alterar el contrato de negocio.
    repository = import.meta.env.DEV
      ? new ScenarioInventoryAdapter(base)
      : base;
  }
  return repository;
}

// Resetea el singleton (útil en pruebas para inyectar repositorios alternativos).
export function resetInventoryRepository(instance?: InventoryRepository): void {
  repository = instance ?? null;
}
