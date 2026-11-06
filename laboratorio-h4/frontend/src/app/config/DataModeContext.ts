import { createContext } from "react";
import type { DataMode } from "./dataMode";

export const DataModeContext = createContext<DataMode | null>(null);
