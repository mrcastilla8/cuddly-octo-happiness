import { createContext } from "react";
import type { BulkRepository } from "./bulkRepository";

/** Optional provider injection for a configured HTTP adapter or isolated harness. */
export const BulkRepositoryContext = createContext<BulkRepository | null>(null);
