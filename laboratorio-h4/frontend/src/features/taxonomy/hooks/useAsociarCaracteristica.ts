import { useEffect, useRef, useState } from "react";
import { productTypeService } from "../services/productTypeService";
import type { ProductTypeDetail } from "../types";

export type AsociarCaracteristicaState =
  | { status: "idle" }
  | { status: "enviando" }
  | { status: "success"; detalle: ProductTypeDetail }
  | { status: "error"; message: string };

export function useAsociarCaracteristica(
  id: string,
  onSuccess?: (detalle: ProductTypeDetail) => void,
) {
  const [state, setState] = useState<AsociarCaracteristicaState>({
    status: "idle",
  });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const enviar = (caracteristicaId: string, obligatoria: boolean) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando" });
    void productTypeService
      .asociarCaracteristica(
        { tipoProductoId: id, caracteristicaId, obligatoria },
        controller.signal,
      )
      .then(
        (detalle) => {
          if (controller.signal.aborted) return;
          if (detalle) {
            setState({ status: "success", detalle });
            onSuccess?.(detalle);
          } else {
            setState({
              status: "error",
              message: "El tipo de producto no existe.",
            });
          }
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudo asociar la característica.",
          });
        },
      );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  };

  return { state, enviar, reiniciar };
}