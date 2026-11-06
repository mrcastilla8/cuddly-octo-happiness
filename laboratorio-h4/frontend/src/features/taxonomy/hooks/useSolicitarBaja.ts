import { useEffect, useRef, useState } from "react";
import { categoryService } from "../services/categoryService";
import type { BajaCategoriaSeguimiento, BajaSolicitudResult } from "../types";

export type SolicitarBajaState =
  | { status: "idle" }
  | { status: "enviando" }
  | { status: "success"; result: BajaSolicitudResult }
  | { status: "error"; message: string };

export type BajaSeguimientoState =
  | { status: "idle" }
  | { status: "consultando" }
  | { status: "success"; result: BajaCategoriaSeguimiento }
  | { status: "error"; message: string };

export function useSolicitarBaja(id: string) {
  const [state, setState] = useState<SolicitarBajaState>({ status: "idle" });
  const [seguimiento, setSeguimiento] = useState<BajaSeguimientoState>({
    status: "idle",
  });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const solicitar = () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando" });
    setSeguimiento({ status: "idle" });
    void categoryService.solicitarBaja(id, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setState({ status: "success", result });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo verificar la baja.",
        });
      },
    );
  };

  const consultarEstado = (operacionId: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSeguimiento({ status: "consultando" });
    void categoryService
      .consultarEstadoOperacion(operacionId, controller.signal)
      .then(
        (result) => {
          if (controller.signal.aborted) return;
          setSeguimiento({ status: "success", result });
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setSeguimiento({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo consultar el estado de la operación.",
          });
        },
      );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
    setSeguimiento({ status: "idle" });
  };

  return { state, seguimiento, solicitar, consultarEstado, reiniciar };
}