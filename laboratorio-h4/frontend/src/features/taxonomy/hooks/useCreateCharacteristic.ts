import { useEffect, useRef, useState } from "react";
import { characteristicService } from "../services/characteristicService";
import type {
  CharacteristicCreateInput,
  CharacteristicCreateResult,
} from "../types";

export type CreateCharacteristicPhase = "idle" | "guardando" | "creado";

export function useCreateCharacteristic() {
  const [phase, setPhase] = useState<CreateCharacteristicPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<CharacteristicCreateResult | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const crear = (input: CharacteristicCreateInput) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPhase("guardando");
    void characteristicService.crear(input, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setCreado(result);
        setPhase("creado");
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo crear la característica.",
        );
        setPhase("idle");
      },
    );
  };

  const reiniciar = () => {
    controllerRef.current?.abort();
    setError(null);
    setCreado(null);
    setPhase("idle");
  };

  return { phase, error, creado, crear, reiniciar };
}