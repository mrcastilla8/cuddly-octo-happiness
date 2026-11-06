import type { PromotionServices } from "../services/promotionServices";
import type {
  AdministrationRecord,
  AdministrationRepository,
} from "../services/administration";
import {
  CouponReadError,
  CouponWriteError,
} from "../services/couponRepository";
import {
  administrationResponse,
  checkAdministrationRead,
  checkAdministrationWrite,
  type AdministrationScenario,
} from "./demoScenarios";

// Fault injection wraps productive ports. Only the mock composition selects it in DEV.
export function createDemoServices(
  base: PromotionServices,
  scenario: AdministrationScenario | "expired" | "usage-unavailable",
): PromotionServices {
  if (scenario === "default") return base;
  const pending = (signal: AbortSignal) =>
    new Promise<never>((_, reject) => {
      signal.throwIfAborted();
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
  const administrativeScenario =
    scenario === "usage-unavailable" || scenario === "expired"
      ? "default"
      : scenario;
  const read = (signal: AbortSignal) =>
    checkAdministrationRead(
      administrativeScenario === "selection-error" ||
        administrativeScenario === "selection-empty"
        ? "default"
        : administrativeScenario,
      signal,
    );
  function administrative<T extends AdministrationRecord, D>(
    repository: AdministrationRepository<T, D>,
  ): AdministrationRepository<T, D> {
    return {
      async list(query, signal) {
        await read(signal);
        return scenario === "empty"
          ? { items: [], total: 0, page: 1 }
          : repository.list(query, signal);
      },
      async read(id, signal) {
        await read(signal);
        const record =
          scenario === "missing" ? null : await repository.read(id, signal);
        return record && scenario === "unknown-capability"
          ? { ...record, canChangeMode: undefined }
          : record;
      },
      async save(id, draft, signal) {
        await checkAdministrationWrite(administrativeScenario, signal);
        return administrationResponse(
          await repository.save(id, draft, signal),
          administrativeScenario,
        );
      },
      async changeStatus(id, status, signal) {
        await checkAdministrationWrite(administrativeScenario, signal);
        return administrationResponse(
          await repository.changeStatus(id, status, signal),
          administrativeScenario,
        );
      },
    };
  }
  async function couponRead(signal: AbortSignal) {
    signal.throwIfAborted();
    if (scenario === "loading") await pending(signal);
    if (scenario === "error")
      throw new CouponReadError(
        "unavailable",
        "No se pudo consultar la información. El contexto se conserva; puedes volver a consultar.",
      );
    if (scenario === "session" || scenario === "forbidden")
      throw new CouponReadError(
        scenario,
        scenario === "session"
          ? "Tu sesión no permite consultar cupones. Verifica el acceso antes de continuar."
          : "No tienes permiso para consultar cupones. Solicita acceso al responsable de tu cuenta.",
      );
  }
  async function couponWrite(signal: AbortSignal) {
    signal.throwIfAborted();
    if (scenario === "saving") await pending(signal);
    if (scenario === "session" || scenario === "forbidden")
      throw new CouponWriteError(
        "access",
        "No tienes acceso para modificar cupones. Se conserva la información anterior.",
      );
    if (scenario === "save-error" || scenario === "rejected")
      throw new CouponWriteError(
        "rejected",
        "No se pudo guardar el cambio. Tus entradas y la información anterior se conservan.",
      );
    if (scenario === "conflict")
      throw new CouponWriteError(
        "conflict",
        "La información cambió antes del guardado. Consulta el registro y revisa tu propuesta antes de continuar.",
      );
  }
  function couponResponse<T>(record: T) {
    if (scenario === "unknown-result")
      throw new CouponWriteError(
        "unknown",
        "No se pudo confirmar el resultado. Conservamos tu propuesta; consulta el resultado antes de enviar nuevamente.",
      );
    return record;
  }
  return {
    campaigns: administrative(base.campaigns),
    recommendations: administrative(base.recommendations),
    catalog: {
      async products(signal, retain) {
        if (scenario === "selection-error")
          await checkAdministrationRead("selection-error", signal);
        return scenario === "selection-empty"
          ? []
          : base.catalog.products(signal, retain);
      },
      categories: (signal) => base.catalog.categories(signal),
    },
    coupons: {
      promotions: (signal) => base.coupons.promotions(signal),
      async list(query, signal) {
        await couponRead(signal);
        return scenario === "empty"
          ? { items: [], total: 0, page: 1 }
          : base.coupons.list(query, signal);
      },
      async read(id, signal) {
        await couponRead(signal);
        const record =
          scenario === "missing" ? null : await base.coupons.read(id, signal);
        if (!record) return record;
        if (scenario === "usage-unavailable")
          return { ...record, consumedUses: undefined, remainingUses: undefined };
        if (scenario === "expired")
          return {
            ...record,
            promotion: record.promotion
              ? {
                  ...record.promotion,
                  validFrom: "2026-09-01T00:00:00-05:00",
                  validUntil: "2026-09-30T23:59:59-05:00",
                }
              : record.promotion,
          };
        return record;
      },
      async create(input, signal) {
        await couponWrite(signal);
        return couponResponse(await base.coupons.create(input, signal));
      },
      async update(id, input, signal) {
        await couponWrite(signal);
        return couponResponse(await base.coupons.update(id, input, signal));
      },
      async changeStatus(id, status, signal) {
        await couponWrite(signal);
        return couponResponse(
          await base.coupons.changeStatus(id, status, signal),
        );
      },
    },
  };
}
