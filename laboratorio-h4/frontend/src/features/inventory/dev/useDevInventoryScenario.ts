import { useSyncExternalStore } from "react";
import {
  getInventoryScenario,
  setInventoryScenario,
  subscribeInventoryScenario,
  type InventoryScenario,
} from "./inventoryScenario";

export function useDevInventoryScenario(): InventoryScenario {
  return useSyncExternalStore(
    subscribeInventoryScenario,
    getInventoryScenario,
    getInventoryScenario,
  );
}

export { setInventoryScenario };
export type { InventoryScenario };
