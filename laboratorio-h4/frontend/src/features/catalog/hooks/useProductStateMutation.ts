import { useState } from "react";
import type { ProductDetailView } from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import { useCatalogServices } from "./useCatalogServices";

export interface UseProductStateMutationResult {
  submitting: boolean;
  reconciling: boolean;
  error?: string;
  isUnknownError: boolean;
  activate: (id: string, scenario?: string) => Promise<ProductDetailView | null>;
  deactivate: (id: string, scenario?: string) => Promise<ProductDetailView | null>;
  reactivate: (id: string, scenario?: string) => Promise<ProductDetailView | null>;
  reconcile: (id: string, expectedStatus: string) => Promise<boolean>;
  clearError: () => void;
}

export function useProductStateMutation(): UseProductStateMutationResult {
  const { catalog: catalogService } = useCatalogServices();
  const [submitting, setSubmitting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string>();
  const [isUnknownError, setIsUnknownError] = useState(false);

  const clearError = () => {
    setError(undefined);
    setIsUnknownError(false);
  };

  const execute = async (
    fn: () => Promise<ProductDetailView>,
  ): Promise<ProductDetailView | null> => {
    if (submitting || reconciling) return null;
    setSubmitting(true);
    clearError();

    try {
      const res = await fn();
      return res;
    } catch (err) {
      if (err instanceof CatalogError) {
        setError(err.message);
        if (err.kind === "unknown") {
          setIsUnknownError(true);
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Error inesperado al cambiar de estado.",
        );
      }
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const activate = (id: string, scenario?: string) =>
    execute(() => catalogService.activate(id, undefined, scenario));

  const deactivate = (id: string, scenario?: string) =>
    execute(() => catalogService.deactivate(id, undefined, scenario));

  const reactivate = (id: string, scenario?: string) =>
    execute(() => catalogService.reactivate(id, undefined, scenario));

  const reconcile = async (id: string, expectedStatus: string): Promise<boolean> => {
    if (reconciling) return false;
    setReconciling(true);
    try {
      const product = await catalogService.getById(id);
      if (product && product.status === expectedStatus) {
        clearError();
        return true;
      }
      setError(
        `La consulta no confirmó el estado solicitado (${expectedStatus}). El producto permanece en ${product?.status || "estado actual"}.`,
      );
      return false;
    } catch {
      setError("No se pudo verificar el estado en el servidor.");
      return false;
    } finally {
      setReconciling(false);
    }
  };

  return {
    submitting,
    reconciling,
    error,
    isUnknownError,
    activate,
    deactivate,
    reactivate,
    reconcile,
    clearError,
  };
}
