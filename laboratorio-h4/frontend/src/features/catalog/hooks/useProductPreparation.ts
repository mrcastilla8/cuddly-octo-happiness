import { useEffect, useState, useCallback } from "react";
import type { ProductPreparationView } from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import { useCatalogServices } from "./useCatalogServices";

export interface ProductPreparationState {
  status: "loading" | "success" | "error";
  data?: ProductPreparationView;
  error?: string;
  retrying: boolean;
  retryError?: string;
  retrySuccess?: string;
}

export function useProductPreparation(
  productId: string,
  scenario?: string,
  revision = 0,
) {
  const { catalog: catalogService } = useCatalogServices();
  const [state, setState] = useState<ProductPreparationState>({
    status: "loading",
    retrying: false,
  });

  const load = useCallback(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: "loading", error: undefined }));

    catalogService
      .getPreparation(productId, scenario, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState((prev) => ({ ...prev, status: "success", data }));
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setState((prev) => ({
          ...prev,
          status: "error",
          error:
            err instanceof Error
              ? err.message
              : "Error al consultar la preparación del producto.",
        }));
      });

    return () => controller.abort();
  }, [productId, scenario, catalogService]);

  useEffect(() => {
    const cancel = load();
    return cancel;
  }, [load, revision]);

  const retry = async (dependencia: "PRICING" | "INVENTARIO") => {
    setState((prev) => ({
      ...prev,
      retrying: true,
      retryError: undefined,
      retrySuccess: undefined,
    }));
    try {
      const res = await catalogService.retryPreparation(
        productId,
        { dependencia },
        scenario,
      );
      setState((prev) => ({
        ...prev,
        retrying: false,
        retrySuccess: res.message,
      }));
      // Reload preparation after retry
      setTimeout(() => {
        load();
      }, 600);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        retrying: false,
        retryError:
          err instanceof CatalogError
            ? err.message
            : "No se pudo reintentar la preparación.",
      }));
    }
  };

  return {
    ...state,
    retry,
    reload: load,
  };
}
