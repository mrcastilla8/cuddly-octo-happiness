import type { DataMode } from "../../../app/config/dataMode";
import type { BulkExportFormat } from "../types/bulk";
import { BulkRepositoryError } from "./bulkErrors";

export type BulkDownloadKind = "plantilla" | "exportación";

export function getUnavailableDownloadMessage(
  mode: DataMode,
  kind: BulkDownloadKind,
  format: BulkExportFormat,
): string {
  void mode;
  void format;
  return `El archivo solicitado para ${kind} no está disponible.`;
}

export function getDownloadFailureMessage(
  error: unknown,
  kind: BulkDownloadKind,
): string {
  if (error instanceof BulkRepositoryError && error.category === "communication") {
    return `Error de comunicación al obtener la ${kind}: ${error.message}`;
  }
  return error instanceof Error
    ? error.message
    : `No se pudo obtener la ${kind}.`;
}
