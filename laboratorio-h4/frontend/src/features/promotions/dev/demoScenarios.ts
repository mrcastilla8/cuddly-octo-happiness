import { CouponReadError } from "../services/couponRepository";
import { AdministrationError } from "../services/administration";
export type CouponScenario =
  | "default"
  | "loading"
  | "empty"
  | "error"
  | "session"
  | "forbidden"
  | "missing"
  | "expired"
  | "usage-unavailable";

export type CouponMutationScenario =
  | "default"
  | "saving"
  | "save-error"
  | "rejected"
  | "conflict"
  | "unknown-result"
  | "session"
  | "forbidden";
export type AdministrationScenario =
  | CouponMutationScenario
  | "loading"
  | "empty"
  | "error"
  | "missing"
  | "selection-empty"
  | "selection-error"
  | "unknown-capability";
export function administrationScenario(
  params: URLSearchParams,
): AdministrationScenario {
  if (!import.meta.env.DEV || params.get("modoRevision") !== "1")
    return "default";
  const value = params.get("escenario");
  switch (value) {
    case "loading":
    case "empty":
    case "error":
    case "missing":
    case "selection-empty":
    case "selection-error":
    case "unknown-capability":
    case "saving":
    case "save-error":
    case "rejected":
    case "conflict":
    case "unknown-result":
    case "session":
    case "forbidden":
      return value;
    default:
      return "default";
  }
}

export async function checkAdministrationRead(
  scenario: AdministrationScenario,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  if (scenario === "loading")
    await new Promise<never>((_, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    );
  if (scenario === "error" || scenario === "selection-error")
    throw new CouponReadError(
      "unavailable",
      "No se pudo consultar la información. Conservamos el contexto y la selección anterior.",
    );
  if (scenario === "session" || scenario === "forbidden")
    throw new CouponReadError(
      scenario,
      scenario === "session"
        ? "Verifica tu sesión antes de continuar."
        : "No tienes permiso para administrar esta información.",
    );
}

export async function checkAdministrationWrite(
  scenario: AdministrationScenario,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  if (scenario === "saving")
    await new Promise<never>((_, reject) =>
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      }),
    );
  if (scenario === "session" || scenario === "forbidden")
    throw new AdministrationError(
      "access",
      "No tienes permiso para guardar. La configuración anterior se conserva.",
    );
  if (scenario === "save-error" || scenario === "rejected")
    throw new AdministrationError(
      "rejected",
      "El cambio fue rechazado. El borrador y la configuración anterior se conservan.",
    );
  if (scenario === "conflict")
    throw new AdministrationError(
      "conflict",
      "La configuración cambió antes de guardar. Consulta el registro actual y revisa tu propuesta.",
    );
}

export function administrationResponse<T>(
  record: T,
  scenario: AdministrationScenario,
) {
  if (scenario === "unknown-result")
    throw new AdministrationError(
      "unknown",
      "No se pudo confirmar el resultado. Consulta el registro antes de volver a enviar el cambio.",
    );
  return structuredClone(record);
}
export function readCouponScenario(params: URLSearchParams): CouponScenario {
  if (!import.meta.env.DEV || params.get("modoRevision") !== "1")
    return "default";
  const value = params.get("escenario");
  switch (value) {
    case "loading":
    case "empty":
    case "error":
    case "session":
    case "forbidden":
    case "missing":
    case "expired":
    case "usage-unavailable":
      return value;
    default:
      return "default";
  }
}
