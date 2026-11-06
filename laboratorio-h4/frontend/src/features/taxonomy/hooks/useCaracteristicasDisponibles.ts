import { useEffect, useState } from "react";
import { productTypeService } from "../services/productTypeService";
import type { ProductTypeAssociationCharacteristic } from "../types";

export type CaracteristicasDisponiblesState =
  | { status: "loading" }
  | { status: "success"; items: ProductTypeAssociationCharacteristic[] }
  | { status: "error"; message: string };

export function useCaracteristicasDisponibles(id: string): {
  state: CaracteristicasDisponiblesState;
  reload: () => void;
} {
  const [state, setState] = useState<CaracteristicasDisponiblesState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void productTypeService
      .listarCaracteristicasDisponibles(id, controller.signal)
      .then(
        (items) => {
          if (controller.signal.aborted) return;
          setState({ status: "success", items });
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "No se pudieron cargar las características disponibles.",
          });
        },
      );
    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  return { state, reload };
}