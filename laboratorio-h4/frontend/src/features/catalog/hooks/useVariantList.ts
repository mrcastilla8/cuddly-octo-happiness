import { useCallback, useEffect, useState } from "react";
import type {
  ProductDetailView,
  VariantDetailView,
  VariantQuery,
} from "../services/catalogRepository";
import { CatalogError } from "../services/catalogRepository";
import { useCatalogServices } from "./useCatalogServices";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

export interface UseVariantListOptions {
  productId?: string;
  query?: VariantQuery;
  scenario?: string;
}

export interface UseVariantListResult {
  product: ProductDetailView | null;
  variants: VariantDetailView[];
  total: number;
  loading: boolean;
  error: string | null;
  isSimpleProduct: boolean;
  reload: () => void;
}

export function useVariantList({
  productId,
  query,
  scenario,
}: UseVariantListOptions = {}): UseVariantListResult {
  const { catalog: catalogService } = useCatalogServices();
  const targetProductId = productId;
  const [revision, setRevision] = useState<number>(0);
  const mockRevision = useMockStateRevision(["catalog", "inventory"]);
  const queryStatus = query?.status;
  const queryPage = query?.page;
  const queryPageSize = query?.pageSize;

  const key = JSON.stringify([
    targetProductId,
    queryStatus,
    queryPage,
    queryPageSize,
    scenario,
    revision + mockRevision,
  ]);

  const [response, setResponse] = useState<{
    key: string;
    repository: typeof catalogService;
    product: ProductDetailView | null;
    variants: VariantDetailView[];
    total: number;
    error: string | null;
    isSimpleProduct: boolean;
  }>();

  const reload = useCallback(() => {
    setRevision((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!targetProductId) return;

    Promise.all([
      catalogService.getById(targetProductId, scenario, controller.signal),
      catalogService.listVariants(
        targetProductId,
        { status: queryStatus, page: queryPage, pageSize: queryPageSize },
        scenario,
        controller.signal,
      ),
    ])
      .then(([p, pageResult]) => {
        if (!controller.signal.aborted) {
          if (!p) {
            setResponse({ repository: catalogService,
              key,
              product: null,
              variants: [],
              total: 0,
              error: "El producto padre no fue encontrado.",
              isSimpleProduct: false,
            });
            return;
          }
          if (!p.hasVariants) {
            setResponse({ repository: catalogService,
              key,
              product: p,
              variants: [],
              total: 0,
              error: null,
              isSimpleProduct: true,
            });
          } else {
            setResponse({ repository: catalogService,
              key,
              product: p,
              variants: pageResult.items,
              total: pageResult.total,
              error: null,
              isSimpleProduct: false,
            });
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          if (err instanceof CatalogError && err.kind === "product_not_variants") {
            setResponse({ repository: catalogService,
              key,
              product: null,
              variants: [],
              total: 0,
              error: null,
              isSimpleProduct: true,
            });
          } else {
            setResponse({ repository: catalogService,
              key,
              product: null,
              variants: [],
              total: 0,
              error: err instanceof Error ? err.message : "Error al cargar variantes.",
              isSimpleProduct: false,
            });
          }
        }
      });

    return () => {
      controller.abort();
    };
  }, [key, targetProductId, queryStatus, queryPage, queryPageSize, scenario, revision, catalogService]);

  const isCurrent = response?.key === key && response?.repository === catalogService;

  return {
    product: isCurrent ? response.product : null,
    variants: isCurrent ? response.variants : [],
    total: isCurrent ? response.total : 0,
    loading: Boolean(targetProductId) && !isCurrent,
    error: !targetProductId ? "Seleccione un producto padre." : isCurrent ? response.error : null,
    isSimpleProduct: isCurrent ? response.isSimpleProduct : false,
    reload,
  };
}
