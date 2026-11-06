import { useContext, useMemo } from "react";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { createBulkRepository } from "../services/bulkService";
import { BulkRepositoryContext } from "../services/BulkRepositoryContext";
import { isBulkProviderConfigured } from "../services/bulkProviderStatus";

export function useBulkRepositorySelection() {
  const mode = useContext(DataModeContext);
  const injected = useContext(BulkRepositoryContext);
  if (!mode) {
    throw new Error("Carga masiva requiere DataModeContext.");
  }
  const repository = useMemo(
    () => injected ?? createBulkRepository(mode),
    [injected, mode],
  );
  return {
    mode,
    repository,
    providerConfigured: isBulkProviderConfigured(mode, injected),
  };
}

export function useBulkRepository() {
  return useBulkRepositorySelection().repository;
}
