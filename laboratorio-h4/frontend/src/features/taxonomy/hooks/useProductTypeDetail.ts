import { useEffect, useState } from "react";
import { productTypeService } from "../services/productTypeService";
import type { ProductTypeDetail } from "../types";

export type ProductTypeDetailState =
  | { status: "loading" }
  | { status: "success"; detalle: ProductTypeDetail }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function useProductTypeDetail(id: string): {
  state: ProductTypeDetailState;
  reload: () => void;
} {
  const [state, setState] = useState<ProductTypeDetailState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void productTypeService.obtener(id, controller.signal).then(
      (detalle) => {
        if (controller.signal.aborted) return;
        if (detalle) {
          setState({ status: "success", detalle });
        } else {
          setState({ status: "not-found" });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el tipo de producto.",
        });
      },
    );
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  return { state, reload };
}