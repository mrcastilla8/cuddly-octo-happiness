import { useEffect, useState } from "react";
import { productTypeService } from "../services/productTypeService";
import type { ProductTypeListResult } from "../services/productTypeRepository";

export type ProductTypeListState =
  | { status: "loading" }
  | { status: "success"; result: ProductTypeListResult }
  | { status: "error"; message: string };

export function useProductTypeList(
  revision: number,
): { state: ProductTypeListState } {
  const requestKey = JSON.stringify([revision]);
  const [response, setResponse] = useState<{
    requestKey: string;
    state: ProductTypeListState;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    void productTypeService.list(controller.signal).then(
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
  }, [requestKey]);

  const state =
    response?.requestKey === requestKey
      ? response.state
      : ({ status: "loading" } as const);

  return { state };
}