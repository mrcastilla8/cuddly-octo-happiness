import { useEffect, useRef, useState } from "react";
import { categoryService } from "../services/categoryService";
import type { ReactivacionResult } from "../types";

export type ReactivarState =
  | { status: "idle" }
  | { status: "enviando" }
  | { status: "reactivada"; result: ReactivacionResult }
  | { status: "bloqueada"; result: ReactivacionResult }
  | { status: "error"; message: string };

export function useReactivarCategoria() {
  const [state, setState] = useState<ReactivarState>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const reactivar = (id: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando" });
    void categoryService.reactivar(id, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setState(
          result.resultado === "reactivada"
            ? { status: "reactivada", result }
            : { status: "bloqueada", result },
        );
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo reactivar la categoría.",
        });
      },
    );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  };

  return { state, reactivar, reiniciar };
}