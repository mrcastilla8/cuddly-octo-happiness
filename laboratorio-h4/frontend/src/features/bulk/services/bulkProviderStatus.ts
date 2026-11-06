import type { DataMode } from "../../../app/config/dataMode";
import type { BulkRepository } from "./bulkRepository";

export function isBulkProviderConfigured(
  mode: DataMode,
  injectedRepository: BulkRepository | null,
): boolean {
  return mode === "mock" || injectedRepository !== null;
}
