import { useState, type ReactNode } from "react";
import type { DataMode } from "../../../app/config/dataMode";
import type { CombosRuntime } from "../services/combosService";
import { CombosContext } from "../services/CombosContext";

export function CombosProvider({ mode, runtime, children }: { mode: DataMode; runtime: CombosRuntime; children: ReactNode }) {
  const [services] = useState(() => ({ mode, ...runtime }));
  return <CombosContext.Provider value={services}>{children}</CombosContext.Provider>;
}
