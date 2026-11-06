import { useEffect, useState } from "react";
import { seoService } from "../services/seoService";
import type { SeoCategory } from "../types";

export type SeoDetailState =
  | { status: "loading" }
  | { status: "success"; detalle: SeoCategory }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function useSeoDetail(id: string): {
  state: SeoDetailState;
  reload: () => void;
} {
  const [state, setState] = useState<SeoDetailState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void seoService.obtener(id, controller.signal).then(
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
              : "No se pudieron cargar los metadatos SEO.",
        });
      },
    );
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  return { state, reload };
}