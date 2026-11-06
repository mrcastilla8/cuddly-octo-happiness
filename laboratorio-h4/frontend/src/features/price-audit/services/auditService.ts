import type { DataMode } from "../../../app/config/dataMode";
import { browserReportDownloader } from "../../pricing/services/browserReportDownloader";
import {
  AuditFailure,
  type AuditRuntime,
  type AuditRepository,
} from "./auditRepository";

export async function createAuditRuntime(
  mode: DataMode,
  dependencies: { api?: () => Promise<AuditRepository> } = {},
): Promise<AuditRuntime> {
  const downloader = browserReportDownloader;
  if (mode === "mock") {
    const { createMockAuditRuntime } = await import(
      "../mocks/createMockAuditRuntime"
    );
    return createMockAuditRuntime(downloader);
  }
  if (mode !== "api") throw new Error("VITE_DATA_MODE debe ser mock o api.");
  const unavailable = async (): Promise<never> => {
    throw new AuditFailure(
      "configuration",
      "La consulta del historial de precios no está disponible.",
    );
  };
  return {
    downloader,
    repository: dependencies.api
      ? await dependencies.api()
      : {
          list: unavailable,
          detail: unavailable,
          requestExport: unavailable,
          getExport: unavailable,
          download: unavailable,
        },
  };
}
