import { useCallback, useEffect, useState } from "react";
import type {
  ProductDetailView,
  VariantDetailView,
  VariantPreparation,
} from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import { useCatalogServices } from "./useCatalogServices";

export interface UseVariantPreparationResult {
  product: ProductDetailView | null;
  variant: VariantDetailView | null;
  preparation: VariantPreparation | null;
  loading: boolean;
  retrying: boolean;
  error: string | null;
  retryMessage: string | null;
  canRetry: boolean;
  reload: () => Promise<void>;
  retry: () => Promise<void>;
}

export function useVariantPreparation(
  productId: string | undefined,
  variantId: string | undefined,
  scenario?: string,
): UseVariantPreparationResult {
  const { catalog: catalogService } = useCatalogServices();
  const [revision, setRevision] = useState<number>(0);
  const key = JSON.stringify([productId, variantId, scenario, revision]);

  const [response, setResponse] = useState<{
    key: string;
    repository: typeof catalogService;
    product: ProductDetailView | null;
    variant: VariantDetailView | null;
    preparation: VariantPreparation | null;
    error: string | null;
  }>();

  const [retrying, setRetrying] = useState<boolean>(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setRevision((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!productId || !variantId) return;

    const controller = new AbortController();

    Promise.all([
      catalogService.getById(productId, scenario, controller.signal),
      catalogService.getVariantById(productId, variantId, scenario, controller.signal),
    ])
      .then(([prod, v]) => {
        if (!controller.signal.aborted) {
          if (!prod || !v) {
            setResponse({ repository: catalogService,
              key,
              product: null,
              variant: null,
              preparation: null,
              error: "Producto o variante no encontrados.",
            });
            return;
          }

          const foundPrep = prod.preparation?.variantes?.find((p) => p.sku === v.sku);
          const prep: VariantPreparation = foundPrep || {
            variantId: v.variantId,
            sku: v.sku,
            inventario: {
              status: v.inventoryPreparationStatus ?? v.inventoryStatus,
              manualRetryAllowed: v.inventoryManualRetryAllowed ?? false,
              code: v.inventoryPreparationCode ?? null,
            },
            inventoryStatus: v.inventoryPreparationStatus ?? v.inventoryStatus,
            manualRetryAllowed: v.inventoryManualRetryAllowed ?? false,
            lastCheckedAt: new Date().toISOString(),
          };

          setResponse({ repository: catalogService,
            key,
            product: prod,
            variant: v,
            preparation: prep,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setResponse({ repository: catalogService,
            key,
            product: null,
            variant: null,
            preparation: null,
            error: err instanceof Error ? err.message : "Error al cargar preparación.",
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [productId, variantId, scenario, revision, key, catalogService]);

  const retry = useCallback(async () => {
    if (!productId || !variantId || retrying) return;
    setRetrying(true);
    setRetryMessage(null);
    setRetryError(null);
    try {
      const result = await catalogService.retryVariantPreparation(
        productId,
        variantId,
        scenario,
      );
      setRetryMessage(result.message);
      setRevision((prev) => prev + 1);
    } catch (err) {
      if (err instanceof CatalogError) {
        setRetryError(err.message);
      } else {
        setRetryError("Error al solicitar el reintento de preparación.");
      }
    } finally {
      setRetrying(false);
    }
  }, [productId, variantId, scenario, retrying, catalogService]);

  const isCurrent = response?.key === key && response?.repository === catalogService;
  const preparation = isCurrent ? response.preparation : null;
  const canRetry = Boolean(
    preparation?.inventario?.manualRetryAllowed &&
      preparation.inventario.status !== "COMPLETED",
  );

  return {
    product: isCurrent ? response.product : null,
    variant: isCurrent ? response.variant : null,
    preparation,
    loading: !isCurrent,
    retrying,
    error: retryError || (isCurrent ? response.error : null),
    retryMessage,
    canRetry,
    reload,
    retry,
  };
}
