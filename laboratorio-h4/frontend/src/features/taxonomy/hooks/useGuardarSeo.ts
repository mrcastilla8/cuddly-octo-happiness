import { useEffect, useRef, useState } from "react";
import {
  SeoConflictError,
  type GuardarSeoInput,
} from "../services/seoRepository";
import { seoService } from "../services/seoService";
import type { SeoCategory } from "../types";

export type GuardarSeoState =
  | { status: "idle" }
  | { status: "enviando" }
  | { status: "success"; detalle: SeoCategory }
  | { status: "conflicto"; message: string }
  | { status: "error"; message: string };

export function useGuardarSeo(
  onSuccess?: (detalle: SeoCategory) => void,
) {
  const [state, setState] = useState<GuardarSeoState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const guardar = (input: GuardarSeoInput) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando" });
    void seoService.guardar(input, controller.signal).then(
      (detalle) => {
        if (controller.signal.aborted) return;
        if (detalle) {
          setState({ status: "success", detalle });
          onSuccess?.(detalle);
        } else {
          setState({
            status: "error",
            message: "La categoría no existe o ya no está disponible.",
          });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof SeoConflictError) {
          setState({ status: "conflicto", message: error.message });
          return;
        }
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron guardar los metadatos.",
        });
      },
    );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  };

  return { state, guardar, reiniciar };
}