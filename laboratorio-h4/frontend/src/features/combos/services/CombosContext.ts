import { createContext } from "react";
import type { CombosRuntime } from "./combosService";

export const CombosContext = createContext<CombosRuntime | null>(null);
