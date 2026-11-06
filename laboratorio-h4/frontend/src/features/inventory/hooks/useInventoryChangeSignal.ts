import { useEffect, useState } from "react";
import { subscribeInventoryChanged } from "../services/inventoryEvents";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

// Devuelve una revisión que se incrementa cada vez que el feature notifica un
// cambio de datos confirmado (recepción, umbral), un cambio de escenario de
// desarrollo o una modificación en catálogos y taxonomía vinculados.
export function useInventoryChangeSignal(): number {
  const [localRevision, setLocalRevision] = useState(0);
  const mockRevision = useMockStateRevision([
    "inventory",
    "catalog",
    "taxonomy",
    "taxonomy-categories",
    "taxonomy-brands",
  ]);

  useEffect(
    () => subscribeInventoryChanged(() => setLocalRevision((r) => r + 1)),
    [],
  );

  return localRevision + mockRevision;
}
