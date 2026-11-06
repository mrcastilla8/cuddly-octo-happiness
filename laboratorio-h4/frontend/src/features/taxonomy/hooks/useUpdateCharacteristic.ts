import { useEffect, useRef, useState } from "react";
import { characteristicService } from "../services/characteristicService";
import type {
  CharacteristicDetail,
  CharacteristicUpdateInput,
} from "../types";

export type UpdateCharacteristicPhase = "idle" | "guardando" | "actualizado";

export function useUpdateCharacteristic() {
  const [phase, setPhase] = useState<UpdateCharacteristicPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CharacteristicDetail | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const actualizar = (input: CharacteristicUpdateInput) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPhase("guardando");
    void characteristicService
      .actualizar(input, controller.signal)
      .then(
        (result) => {
          if (controller.signal.aborted) return;
          setResultado(result);
          setPhase("actualizado");
        },
        (err: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo guardar la característica.",
          );
          setPhase("idle");
        },
      );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    setError(null);
    setResultado(null);
    setPhase("idle");
  };

  return { phase, error, resultado, actualizar, reiniciar };
}