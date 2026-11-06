import type { DataMode } from "../../../app/config/dataMode";

export function getQueuedBatchDescription(_mode?: DataMode): string {
  void _mode;
  return "La solicitud está en cola y pendiente de iniciar el procesamiento.";
}

export function getUnknownRowCountDescription(_mode?: DataMode): string {
  void _mode;
  return "El total de filas y el resultado final aún no están disponibles.";
}
