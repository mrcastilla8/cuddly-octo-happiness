import { useEffect, useState } from "react";
import { brandService } from "../services/brandService";
import type { BrandDetail } from "../types";

export type BrandDetailState =
  | { status: "loading" }
  | { status: "success"; detalle: BrandDetail }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function useBrandDetail(id: string): {
  state: BrandDetailState;
  reload: () => void;
} {
  const [state, setState] = useState<BrandDetailState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void brandService.obtener(id, controller.signal).then(
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
              : "No se pudo cargar la marca.",
        });
      },
    );
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  return { state, reload };
}