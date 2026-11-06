import type { CouponView } from "../services/couponRepository";
import {
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

// Simulated provider history, not a DTO or a capability computed by React.
export interface PromotionHistoryFacts {
  activated: boolean | undefined;
  used: boolean | undefined;
}

type PromotionHistoryState = Record<string, PromotionHistoryFacts>;

function isPromotionHistoryState(value: unknown): value is PromotionHistoryState {
  if (!isRecord(value)) return false;
  for (const [k, v] of Object.entries(value)) {
    if (typeof k !== "string" || k.trim().length === 0 || !isRecord(v)) return false;
    if (v.activated !== undefined && typeof v.activated !== "boolean") return false;
    if (v.used !== undefined && typeof v.used !== "boolean") return false;
  }
  return true;
}

export function createPromotionHistory(
  initial: Readonly<Record<string, PromotionHistoryFacts>>,
  options: { persist?: boolean } = {},
) {
  const persistEnabled = options.persist === true && isMockPersistenceAvailable();
  const restored = persistEnabled
    ? readMockState<PromotionHistoryState>("promotions-history", isPromotionHistoryState)
    : null;
  const facts = new Map(
    Object.entries(restored ?? initial).map(([id, value]) => [id, { ...value }]),
  );
  const observedCoupons = new Map<
    string,
    { promotionId: string; consumedUses: number | undefined }
  >();

  function persist(): boolean {
    // A non-persistent instance (persist: false) must never touch `localStorage`.
    let ok = true;
    if (persistEnabled) {
      ok = saveMockState("promotions-history", Object.fromEntries(facts) as PromotionHistoryState);
    }
    publishMockChange("promotions-history");
    publishMockChange("promotions");
    return ok;
  }

  if (persistEnabled) {
    subscribeExternalMockChanges("promotions-history", () => {
      const stored = readMockState<PromotionHistoryState>(
        "promotions-history",
        isPromotionHistoryState,
      );
      if (!stored) return;
      facts.clear();
      for (const [id, value] of Object.entries(stored)) {
        facts.set(id, { ...value });
      }
      publishMockChange("promotions-history");
      publishMockChange("promotions");
    });
  }

  return {
    initialize(id: string, active: boolean) {
      facts.set(id, { activated: active, used: false });
      if (persistEnabled) {
        const ok = persist();
        if (!ok) {
          facts.delete(id);
          throw new Error("No se pudo guardar el historial de la promoción.");
        }
      }
    },
    activate(id: string) {
      const value = facts.get(id);
      facts.set(id, { activated: true, used: value?.used });
      if (persistEnabled) {
        const ok = persist();
        if (!ok) {
          if (value) facts.set(id, value);
          else facts.delete(id);
          throw new Error("No se pudo actualizar el estado de la promoción.");
        }
      }
    },
    observe(coupon: CouponView) {
      const signature = persistEnabled
        ? JSON.stringify([...facts.entries()])
        : "";
      const value = facts.get(coupon.promotionId);
      const previous = observedCoupons.get(coupon.id);
      observedCoupons.set(coupon.id, {
        promotionId: coupon.promotionId,
        consumedUses: coupon.consumedUses,
      });
      if (!value) return;
      if (coupon.consumedUses === undefined) {
        if (value.used !== true) value.used = undefined;
      } else if (!previous) {
        if (coupon.consumedUses > 0) value.used = true;
      } else if (
        previous.consumedUses === undefined ||
        coupon.consumedUses < previous.consumedUses
      ) {
        if (value.used !== true) value.used = undefined;
      } else if (coupon.consumedUses > previous.consumedUses) {
        if (previous.promotionId === coupon.promotionId) value.used = true;
        else {
          // An external change in both association and count cannot locate the new uses.
          const priorHistory = facts.get(previous.promotionId);
          if (priorHistory && priorHistory.used !== true)
            priorHistory.used = undefined;
          if (value.used !== true) value.used = undefined;
        }
      }
      // A reassignment preserves the coupon's total uses; it is not a new use of the destination.
      if (persistEnabled && JSON.stringify([...facts.entries()]) !== signature) persist();
    },
    capability(
      id: string,
      active: boolean,
      hasCoupons: boolean,
    ): boolean | undefined {
      const value = facts.get(id);
      if (
        active ||
        hasCoupons ||
        value?.activated === true ||
        value?.used === true
      )
        return false;
      if (value?.activated === undefined || value.used === undefined)
        return undefined;
      return true;
    },
  };
}
export type PromotionHistory = ReturnType<typeof createPromotionHistory>;

export const promotionHistoryFixtures: Readonly<
  Record<string, PromotionHistoryFacts>
> = {
  carrera: { activated: true, used: false },
  bienvenida: { activated: false, used: true },
  running: { activated: true, used: false },
  cyber: { activated: true, used: true },
  flash: { activated: false, used: true },
  "nueva-inactiva": { activated: false, used: false },
  historica: { activated: true, used: false },
  "capacidad-desconocida": { activated: undefined, used: undefined },
};
