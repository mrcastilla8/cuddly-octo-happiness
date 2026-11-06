import { createContext } from "react";
import type { CatalogServices } from "./catalogServices";

// Composition root may provide initialized adapters without changing pages/hooks.
export const CatalogServicesContext = createContext<CatalogServices | null>(null);
