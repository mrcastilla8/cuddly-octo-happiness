import { useEffect, useRef, useState } from "react";
import { productTypeService } from "../services/productTypeService";
import type { ProductTypeDesactivarResult, ProductTypeSeguimiento } from "../types";

export type DesactivarTipoProductoState =
  | { status: "idle" }
  | { status: "enviando" }
  | { status: "success"; result: ProductTypeDesactivarResult }
  | { status: "error"; message: string };

export type DesactivarSeguimientoState =
  | { status: "idle" }
  | { status: "consultando" }
  | { status: "success"; result: ProductTypeSeguimiento }
  | { status: "error"; message: string };

export function useDesactivarTipoProducto(
  id: string,
  onSuccess?: (result: ProductTypeDesactivarResult) => void,
) {
  const [state, setState] = useState<DesactivarTipoProductoState>({
    status: "idle",
  });
  const [seguimiento, setSeguimiento] = useState<DesactivarSeguimientoState>({
    status: "idle",
  });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const enviar = () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando" });
    setSeguimiento({ status: "idle" });
    void productTypeService.desactivar(id, controller.signal).then(
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
              : "No se pudo desactivar el tipo de producto.",
        });
      },
    );
  };

  const consultarEstado = (
    operacionId: string,
    onResultado?: (result: ProductTypeSeguimiento) => void,
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
                : "No se pudo consultar el estado de la desactivación.",
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