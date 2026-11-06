import { useEffect, useState } from "react";
import { categoryService } from "../services/categoryService";
import type { CategoryDetail } from "../types";

export type CategoryDetailState =
  | { status: "loading" }
  | { status: "success"; detalle: CategoryDetail }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function useCategoryDetail(id: string): {
  state: CategoryDetailState;
  reload: () => void;
} {
  const [state, setState] = useState<CategoryDetailState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void categoryService.obtener(id, controller.signal).then(
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
              : "No se pudo cargar la categoría.",
        });
      },
    );
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  return { state, reload };
}