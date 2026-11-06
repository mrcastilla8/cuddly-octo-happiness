import { useEffect } from "react";
import { Select } from "@mantine/core";
import {
  inventoryScenarioOptions,
  resetInventoryScenario,
  setInventoryScenario,
  type InventoryScenario,
} from "./inventoryScenario";
import { useDevInventoryScenario } from "./useDevInventoryScenario";

// Control de revisión visual del piloto. Solo debe montarse en desarrollo
// cuando la URL habilita `modoRevision=1`; no forma parte del producto.
export function DevScenarioSelector() {
  const scenario = useDevInventoryScenario();

  useEffect(() => resetInventoryScenario, []);

  return (
    <Select
      label="Escenario de revisión del piloto"
      value={scenario}
      data={inventoryScenarioOptions}
      maw={320}
      onChange={(val) =>
        setInventoryScenario((val as InventoryScenario) ?? "default")
      }
    />
  );
}
