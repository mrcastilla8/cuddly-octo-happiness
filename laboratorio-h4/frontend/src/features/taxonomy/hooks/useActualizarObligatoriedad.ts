import { useEffect, useRef, useState } from "react";
import { productTypeService } from "../services/productTypeService";
import type { ProductTypeDetail } from "../types";

export type ActualizarObligatoriedadState =
  | { status: "idle" }
  | { status: "enviando"; caracteristicaId: string }
  | {
      status: "success";
      detalle: ProductTypeDetail;
      caracteristicaId: string;
      obligatoria: boolean;
    }
  | { status: "error"; message: string; caracteristicaId: string };

export function useActualizarObligatoriedad(
  id: string,
  onSuccess?: (detalle: ProductTypeDetail) => void,
) {
  const [state, setState] = useState<ActualizarObligatoriedadState>({
    status: "idle",
  });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const enviar = (caracteristicaId: string, obligatoria: boolean) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "enviando", caracteristicaId });
    void productTypeService
      .actualizarObligatoriedad(
        { tipoProductoId: id, caracteristicaId, obligatoria },
        controller.signal,
      )
      .then(
        (detalle) => {
          if (controller.signal.aborted) return;
          if (detalle) {
            setState({
              status: "success",
              detalle,
              caracteristicaId,
              obligatoria,
            });
            onSuccess?.(detalle);
          } else {
            setState({
              status: "error",
              message: "El tipo de producto no existe.",
              caracteristicaId,
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
                : "No se pudo actualizar la condición de la característica.",
            caracteristicaId,
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
