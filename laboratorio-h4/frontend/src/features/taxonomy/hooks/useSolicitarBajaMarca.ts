import { useEffect, useRef, useState } from "react";
import { brandService } from "../services/brandService";
import type { BrandBajaResult } from "../types";

export type SolicitarBajaMarcaFase = "solicitud" | "verificacion";

export type SolicitarBajaMarcaState =
  | { status: "idle" }
  | { status: "enviando"; fase: SolicitarBajaMarcaFase }
  | { status: "success"; result: BrandBajaResult }
  | { status: "error"; message: string };

export function useSolicitarBajaMarca(
  id: string,
  onSuccess?: (result: BrandBajaResult) => void,
) {
  const [state, setState] = useState<SolicitarBajaMarcaState>({
    status: "idle",
  });
  const controllerRef = useRef<AbortController | null>(null);
  const operacionIdRef = useRef<string | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const resolver = (result: BrandBajaResult) => {
    operacionIdRef.current =
      result.resultado === "pendiente" ? (result.operacionId ?? null) : null;
    setState({ status: "success", result });
    onSuccess?.(result);
  };

  const emitirError = (error: unknown, controller: AbortController) => {
    if (controller.signal.aborted) return;
    setState({
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo solicitar la baja de la marca.",
    });
  };

  const solicitar = () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando", fase: "solicitud" });
    void brandService.solicitarBaja(id, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        resolver(result);
      },
      (error: unknown) => emitirError(error, controller),
    );
  };

  const consultar = () => {
    const operacionId = operacionIdRef.current;
    if (!operacionId) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando", fase: "verificacion" });
    void brandService.consultarResultadoBaja(operacionId, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        resolver(result);
      },
      (error: unknown) => emitirError(error, controller),
    );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    operacionIdRef.current = null;
    setState({ status: "idle" });
  };

  return { state, solicitar, consultar, reiniciar };
}