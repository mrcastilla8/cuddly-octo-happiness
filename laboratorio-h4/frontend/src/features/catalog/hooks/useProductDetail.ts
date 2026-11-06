import { useEffect, useState } from "react";
import type { ProductDetailView } from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import { useCatalogServices } from "./useCatalogServices";

export interface ProductDetailState {
  status: "loading" | "success" | "error" | "not_found" | "forbidden" | "session";
  product?: ProductDetailView;
  error?: string;
}

export function useProductDetail(
  id: string,
  scenario?: string,
  revision = 0,
): ProductDetailState {
  const { catalog: catalogService } = useCatalogServices();
  const key = JSON.stringify([id, scenario, revision]);
  const [response, setResponse] = useState<{
    key: string;
    repository: typeof catalogService;
    state: ProductDetailState;
  }>();

  useEffect(() => {
    const controller = new AbortController();

    catalogService
      .getById(id, scenario, controller.signal)
      .then((product) => {
        if (!controller.signal.aborted) {
          if (!product) {
            setResponse({ repository: catalogService,
              key,
              state: { status: "not_found", error: "Producto no encontrado." },
            });
          } else {
            setResponse({ repository: catalogService,
              key,
              state: { status: "success", product },
            });
          }
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
          if (err.kind === "not_found") {
            setResponse({ repository: catalogService,
              key,
              state: { status: "not_found", error: err.message },
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
                : "Error al consultar el detalle del producto.",
          },
        });
      });

    return () => controller.abort();
  }, [id, key, scenario, catalogService]);

  return response?.key === key && response?.repository === catalogService
    ? response.state
    : { status: "loading" };
}
