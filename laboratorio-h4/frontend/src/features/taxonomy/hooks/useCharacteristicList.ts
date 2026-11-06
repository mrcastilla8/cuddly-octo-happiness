import { useEffect, useState } from "react";
import { characteristicService } from "../services/characteristicService";
import type { CharacteristicListResult } from "../services/characteristicRepository";

export type CharacteristicListState =
  | { status: "loading" }
  | { status: "success"; result: CharacteristicListResult }
  | { status: "error"; message: string };

export function useCharacteristicList(
  revision: number,
): { state: CharacteristicListState } {
  const requestKey = JSON.stringify([revision]);
  const [response, setResponse] = useState<{
    requestKey: string;
    state: CharacteristicListState;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    void characteristicService.list(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setResponse({ requestKey, state: { status: "success", result } });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResponse({
          requestKey,
          state: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar las características.",
          },
        });
      },
    );
    return () => controller.abort();
  }, [requestKey]);

  const state =
    response?.requestKey === requestKey
      ? response.state
      : ({ status: "loading" } as const);

  return { state };
}