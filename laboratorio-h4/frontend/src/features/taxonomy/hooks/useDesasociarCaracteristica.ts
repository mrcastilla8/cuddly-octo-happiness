import { useEffect, useRef, useState } from "react";
import { productTypeService } from "../services/productTypeService";
import type {
  DesasociacionSeguimiento,
  ProductTypeDesasociarResult,
} from "../types";

export type DesasociarCaracteristicaState =
  | { status: "idle" }
  | { status: "enviando" }
  | { status: "success"; result: ProductTypeDesasociarResult }
  | { status: "error"; message: string };

export type DesasociarSeguimientoState =
  | { status: "idle" }
  | { status: "consultando" }
  | { status: "success"; result: DesasociacionSeguimiento }
  | { status: "error"; message: string };

export function useDesasociarCaracteristica(
  id: string,
  onSuccess?: (result: ProductTypeDesasociarResult) => void,
) {
  const [state, setState] = useState<DesasociarCaracteristicaState>({
    status: "idle",
  });
  const [seguimiento, setSeguimiento] = useState<DesasociarSeguimientoState>({
    status: "idle",
  });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const enviar = (caracteristicaId: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando" });
    setSeguimiento({ status: "idle" });
    void productTypeService
      .desasociarCaracteristica(id, caracteristicaId, controller.signal)
      .then(
        (result) => {
          if (controller.signal.aborted) return;
          setState({ status: "success", result });
          onSuccess?.(result);
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo desasociar la característica.",
          });
        },
      );
  };

  const consultarEstado = (
    operacionId: string,
    onResultado?: (result: DesasociacionSeguimiento) => void,
  ) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setSeguimiento({ status: "consultando" });
    void productTypeService
      .consultarEstadoOperacion(operacionId, controller.signal)
      .then(
        (result) => {
          if (controller.signal.aborted) return;
          setSeguimiento({ status: "success", result });
          onResultado?.(result);
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setSeguimiento({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo consultar el estado de la desasociación.",
          });
        },
      );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
    setSeguimiento({ status: "idle" });
  };

  return { state, seguimiento, enviar, consultarEstado, reiniciar };
}