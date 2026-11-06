import { useEffect, useState } from "react";
import type { CatalogPageResult, CatalogQuery } from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import { useCatalogServices } from "./useCatalogServices";

export interface ProductListState {
  status: "loading" | "success" | "error" | "forbidden" | "session";
  data?: CatalogPageResult;
  error?: string;
}

export function useProductList(
  query: CatalogQuery,
  scenario?: string,
  revision = 0,
): ProductListState {
  const { catalog: catalogService } = useCatalogServices();
  const { q, categoryId, typeId, saleModel, status, page, pageSize } = query;
  const key = JSON.stringify([
    q,
    categoryId,
    typeId,
    saleModel,
    status,
    page,
    pageSize,
    scenario,
    revision,
  ]);

  const [response, setResponse] = useState<{
    key: string;
    repository: typeof catalogService;
    state: ProductListState;
  }>();

  useEffect(() => {
    const controller = new AbortController();

    catalogService
      .list(
        { q, categoryId, typeId, saleModel, status, page, pageSize },
        scenario,
        controller.signal,
      )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResponse({ repository: catalogService, key, state: { status: "success", data } });
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof CatalogError) {
          if (err.kind === "forbidden") {
            setResponse({ repository: catalogService,
              key,
              state: { status: "forbidden", error: err.message },
            });
            return;
          }
          if (err.kind === "session") {
            setResponse({ repository: catalogService,
              key,
              state: { status: "session", error: err.message },
            });
            return;
          }
        }
        setResponse({ repository: catalogService,
          key,
          state: {
            status: "error",
            error:
              err instanceof Error
                ? err.message
                : "No se pudieron consultar los productos.",
          },
        });
      });

    return () => controller.abort();
  }, [key, q, categoryId, typeId, saleModel, status, page, pageSize, scenario, catalogService]);

  return response?.key === key && response?.repository === catalogService
    ? response.state
    : { status: "loading" };
}
