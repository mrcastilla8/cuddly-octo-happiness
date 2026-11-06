import { useCallback, useEffect, useState } from "react";
import type {
  ProductDetailView,
  VariantDetailView,
} from "../services/catalogRepository";
import { useCatalogServices } from "./useCatalogServices";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

export interface UseVariantDetailResult {
  product: ProductDetailView | null;
  variant: VariantDetailView | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useVariantDetail(
  productId: string | undefined,
  variantId: string | undefined,
  scenario?: string,
): UseVariantDetailResult {
  const { catalog: catalogService } = useCatalogServices();
  const [revision, setRevision] = useState<number>(0);
  const mockRevision = useMockStateRevision(["catalog", "inventory"]);
  const key = JSON.stringify([productId, variantId, scenario, revision + mockRevision]);

  const [response, setResponse] = useState<{
    key: string;
    repository: typeof catalogService;
    product: ProductDetailView | null;
    variant: VariantDetailView | null;
    error: string | null;
  }>();

  const reload = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!productId || !variantId) return;

    const controller = new AbortController();

    Promise.all([
      catalogService.getById(productId, scenario, controller.signal),
      catalogService.getVariantById(productId, variantId, scenario, controller.signal),
    ])
      .then(([p, v]) => {
        if (!controller.signal.aborted) {
          if (!p || !v) {
            setResponse({ repository: catalogService,
              key,
              product: null,
              variant: null,
              error: "La variante o el producto padre no fueron encontrados.",
            });
          } else {
            setResponse({ repository: catalogService,
              key,
              product: p,
              variant: v,
              error: null,
            });
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setResponse({ repository: catalogService,
            key,
            product: null,
            variant: null,
            error: err instanceof Error ? err.message : "Error al consultar la variante.",
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [productId, variantId, scenario, revision, key, catalogService]);

  const isCurrent = response?.key === key && response?.repository === catalogService;

  return {
    product: isCurrent ? response.product : null,
    variant: isCurrent ? response.variant : null,
    loading: !isCurrent,
    error: isCurrent ? response.error : null,
    reload,
  };
}
