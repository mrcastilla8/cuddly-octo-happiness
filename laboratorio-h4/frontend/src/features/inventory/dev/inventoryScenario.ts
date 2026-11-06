// Herramienta de desarrollo: escenarios simulados del feature de inventario.
//
// NO forma parte del contrato de negocio. Vive solo en el bundle de
// desarrollo/pruebas: el adaptador HTTP nunca recibe ni interpreta escenarios.
// Cambiar de escenario dispara un refresco de datos mediante la señal interna
// de inventario, de modo que los hooks reaccionan sin conocer esta herramienta.

import { notifyInventoryChanged } from "../services/inventoryEvents";

export type InventoryScenario = "default" | "loading" | "empty" | "error";

export interface InventoryScenarioOption {
  value: InventoryScenario;
  label: string;
}

export const inventoryScenarioOptions: InventoryScenarioOption[] = [
  { value: "default", label: "Datos normales" },
  { value: "loading", label: "Cargando datos" },
  { value: "empty", label: "Sin registros" },
  { value: "error", label: "Error de consulta" },
];

type ScenarioListener = () => void;

let currentScenario: InventoryScenario = "default";
const listeners = new Set<ScenarioListener>();

export function getInventoryScenario(): InventoryScenario {
  return currentScenario;
}

export function setInventoryScenario(scenario: InventoryScenario): void {
  if (scenario === currentScenario) return;
  currentScenario = scenario;
  for (const listener of Array.from(listeners)) {
    listener();
  }
  notifyInventoryChanged();
}

export function subscribeInventoryScenario(
  listener: ScenarioListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetInventoryScenario(): void {
  setInventoryScenario("default");
}
