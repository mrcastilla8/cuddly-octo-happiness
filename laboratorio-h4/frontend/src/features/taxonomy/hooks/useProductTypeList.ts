import { useContext, useEffect, useState } from "react";
import { DataModeContext } from "../../../app/config/DataModeContext";
import { getTaxonomyGateway } from "../services/taxonomyGatewayRuntime";
import { createHttpProductTypeAdapter } from "../adapters/httpProductTypeAdapter";
import type { ProductTypeListResult } from "../services/productTypeRepository";

export type ProductTypeListState =
  | { status: "loading" }
  | { status: "success"; result: ProductTypeListResult }
  | { status: "error"; message: string };

export function useProductTypeList(revision: number): {
  state: ProductTypeListState;
} {
  const mode = useContext(DataModeContext);
  const requestKey = JSON.stringify([revision, mode]);
  const [response, setResponse] = useState<{
    requestKey: string;
    state: ProductTypeListState;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    const list = async () => {
      if (mode === "mock")
        return (
          await import("../services/productTypeService")
        ).productTypeService.list(controller.signal);
      const gateway = getTaxonomyGateway();
      if (!gateway) throw new Error("Integración de Taxonomía no configurada.");
      return createHttpProductTypeAdapter(gateway).list(controller.signal);
    };
    void list().then(
      (result) => {
        if (controller.signal.aborted) return;
        setResponse({ requestKey, state: { status: "success", result } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResponse({
          requestKey,
          state: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar los tipos de producto.",
          },
        });
      },
    );
    return () => controller.abort();
  }, [requestKey, mode]);

  const state =
    response?.requestKey === requestKey
      ? response.state
      : ({ status: "loading" } as const);

  return { state };
}
