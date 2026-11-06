import { useEffect, useState } from "react";
import { characteristicService } from "../services/characteristicService";
import type { CharacteristicDetail } from "../types";

export type CharacteristicDetailState =
  | { status: "loading" }
  | { status: "success"; detalle: CharacteristicDetail }
  | { status: "not-found" }
  | { status: "error"; message: string };

export function useCharacteristicDetail(id: string): {
  state: CharacteristicDetailState;
  reload: () => void;
} {
  const [state, setState] = useState<CharacteristicDetailState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void characteristicService.obtener(id, controller.signal).then(
      (detalle) => {
        if (controller.signal.aborted) return;
        if (detalle) {
          setState({ status: "success", detalle });
        } else {
          setState({ status: "not-found" });
        }
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudo cargar la característica.",
        });
      },
    );
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  return { state, reload };
}