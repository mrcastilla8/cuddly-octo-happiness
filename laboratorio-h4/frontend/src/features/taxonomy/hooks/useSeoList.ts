import { useEffect, useState } from "react";
import { seoService } from "../services/seoService";
import type { SeoListResult } from "../services/seoRepository";

export type SeoListState =
  | { status: "loading" }
  | { status: "success"; result: SeoListResult }
  | { status: "error"; message: string };

export function useSeoList(revision: number): { state: SeoListState } {
  const requestKey = JSON.stringify([revision]);
  const [response, setResponse] = useState<{ requestKey: string; state: SeoListState }>();

  useEffect(() => {
    const controller = new AbortController();
    void seoService.list(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setResponse({ requestKey, state: { status: "success", result } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResponse({
          requestKey,
          state: {
            status: "error",
            message: error instanceof Error ? error.message : "No se pudieron cargar los metadatos SEO.",
          },
        });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const state = response?.requestKey === requestKey ? response.state : ({ status: "loading" } as const);
  return { state };
}