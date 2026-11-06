import { useEffect, useState } from "react";
import { seoService } from "../services/seoService";
import type { HistorialSlugItem } from "../types";

export type HistorialSlugState =
  | { status: "loading" }
  | { status: "success"; items: HistorialSlugItem[] }
  | { status: "error"; message: string };

export function useHistorialSlug(id: string): {
  state: HistorialSlugState;
  reload: () => void;
} {
  const [state, setState] = useState<HistorialSlugState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void seoService.historial(id, controller.signal).then(
      (items) => {
        if (controller.signal.aborted) return;
        setState({ status: "success", items });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo consultar el historial de slugs.",
        });
      },
    );
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  return { state, reload };
}