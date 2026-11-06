import type { DataMode } from "../../../app/config/dataMode";
import { mockBulkRepository } from "../adapters/mockBulkRepository";
import type { BulkRepository } from "./bulkRepository";
import { BulkRepositoryError } from "./bulkErrors";
export { BulkRepositoryError } from "./bulkErrors";
export type { BulkFailureCategory } from "./bulkErrors";

export interface BulkRepositoryDependencies {
  api?: BulkRepository;
}

function createUnavailableRepository(): BulkRepository {
  const unavailable = async (): Promise<never> => {
    throw new BulkRepositoryError(
      "Esta función no está disponible en el modo actual.",
      "configuration",
    );
  };

  return {
    getTemplate: unavailable,
    createImport: unavailable,
    getImport: unavailable,
    getImportReport: unavailable,
    resumeImport: unavailable,
    createExport: unavailable,
    getExport: unavailable,
    getExportFile: unavailable,
  };
}

export function createBulkRepository(
  mode: DataMode,
  dependencies: BulkRepositoryDependencies = {},
): BulkRepository {
  if (mode === "mock") {
    // Keep mock fixtures out of the API selection branch and make the choice explicit.
    return mockRepository();
  }
  if (mode !== "api") {
    throw new Error("VITE_DATA_MODE debe ser mock o api.");
  }
  return dependencies.api ?? createUnavailableRepository();
}

function mockRepository(): BulkRepository {
  // This branch is reached only after the global mode explicitly selects mock.
  return mockBulkRepository;
}
