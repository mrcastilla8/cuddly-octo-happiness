import {
  AuditFailure,
  type AuditRepository,
} from "../services/auditRepository";

function currentCase() {
  const params = new URLSearchParams(window.location.search);
  return params.get("modoRevision") === "1" ? params.get("caso") : null;
}
function checkAccess(exporting = false) {
  const value = currentCase();
  if (value === "sin-sesion")
    throw new AuditFailure("session", "Verifica tu sesión para continuar.");
  if (
    value === "sin-permiso" ||
    (exporting && value === "exportacion-sin-permiso")
  )
    throw new AuditFailure(
      "forbidden",
      exporting
        ? "No tienes permiso para exportar esta información."
        : "No tienes permiso para consultar esta información.",
    );
}
const totals: Record<string, number> = {
  csv100000: 100000,
  csv100001: 100001,
  pdf500: 500,
  pdf501: 501,
  "cambio-conteo": 500,
};
export function createReviewRepository(
  repository: AuditRepository,
): AuditRepository {
  return {
    ...repository,
    async list(query, signal) {
      checkAccess();
      if (currentCase() === "cargando") {
        signal.throwIfAborted();
        await new Promise<never>((_, reject) =>
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelado", "AbortError")),
            { once: true },
          ),
        );
      }
      if (currentCase() === "error-listado")
        throw new AuditFailure(
          "unavailable",
          "No se pudo consultar el historial. Conservamos los filtros.",
        );
      const page = await repository.list(query, signal);
      if (currentCase() === "vacio")
        return { ...page, items: [], total: 0, pages: 0, page: 1 };
      const total = totals[currentCase() ?? ""];
      return total === undefined
        ? page
        : { ...page, total, pages: Math.ceil(total / page.size) };
    },
    async detail(id, signal) {
      checkAccess();
      if (currentCase() === "detalle-inexistente") return null;
      if (currentCase() === "error-detalle")
        throw new AuditFailure(
          "unavailable",
          "No se pudo consultar el asiento. Vuelve a consultar.",
        );
      return repository.detail(id, signal);
    },
    async requestExport(input, signal) {
      checkAccess(true);
      if (currentCase() === "resultado-desconocido")
        throw new AuditFailure(
          "unknown",
          "No pudimos confirmar la solicitud. No la hemos repetido.",
        );
      const total =
        currentCase() === "cambio-conteo" ? 501 : totals[currentCase() ?? ""];
      if (
        total !== undefined &&
        total > (input.format === "PDF" ? 500 : 100000)
      )
        throw new AuditFailure(
          "limit",
          "El resultado supera el límite del formato solicitado. No se ha creado una exportación.",
        );
      return repository.requestExport(input, signal);
    },
    async getExport(id, signal) {
      checkAccess(true);
      if (currentCase() === "fallo-seguimiento")
        throw new AuditFailure(
          "unavailable",
          "No se pudo consultar el estado. La referencia se conserva.",
        );
      const job = await repository.getExport(id, signal);
      if (!job) return null;
      if (currentCase() === "procesando")
        return {
          ...job,
          status: "PROCESSING",
          completedAt: null,
          fileAvailable: false,
        };
      if (currentCase() === "fallo-generacion")
        return { ...job, status: "FAILED_GENERAL", fileAvailable: false };
      if (currentCase() === "sin-archivo")
        return { ...job, fileAvailable: false };
      return job;
    },
    async download(id, signal) {
      checkAccess(true);
      if (currentCase() === "fallo-descarga")
        throw new AuditFailure(
          "unavailable",
          "No se pudo descargar el archivo. La generación permanece confirmada.",
        );
      return repository.download(id, signal);
    },
  };
}
