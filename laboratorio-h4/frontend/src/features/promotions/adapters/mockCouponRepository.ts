import { couponFixtures } from "../mocks/coupons";
import {
  CouponWriteError,
  type CouponInput,
  type CouponView,
  type CouponRepository,
  type CouponPromotion,
} from "../services/couponRepository";
import {
  couponInputErrors,
  normalizeCouponConfiguration,
  type CouponConfiguration,
} from "../services/couponValidation";
import { pageOf } from "../services/administration";
import {
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

interface MockCouponState {
  records: CouponView[];
  sequence: number;
}

function isCouponRecord(value: unknown): value is CouponView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.code === "string" &&
    value.code.trim().length > 0 &&
    typeof value.status === "string" &&
    ["active", "inactive", "expired"].includes(value.status)
  );
}

function isMockCouponState(value: unknown): value is MockCouponState {
  return (
    isRecord(value) &&
    Array.isArray(value.records) &&
    value.records.every(isCouponRecord) &&
    typeof value.sequence === "number" &&
    Number.isFinite(value.sequence) &&
    value.sequence >= 0
  );
}

export function createMockCouponRepository(
  dependencies: {
    promotions: (signal: AbortSignal) => Promise<CouponPromotion[]>;
  },
  fixtures: readonly CouponView[] = couponFixtures,
  options: { persist?: boolean } = {},
): CouponRepository {
  const persistEnabled = options.persist === true && isMockPersistenceAvailable();
  const restored = persistEnabled
    ? readMockState<MockCouponState>("promotions-coupons", isMockCouponState)
    : null;
  const records = restored ? restored.records : fixtures.map((item) => structuredClone(item));
  let sequence = restored ? restored.sequence : 0;
  const persist = (): boolean => {
    // A non-persistent instance (persist: false) must never touch `localStorage`.
    let ok = true;
    if (persistEnabled) {
      ok = saveMockState("promotions-coupons", { records, sequence } satisfies MockCouponState);
    }
    publishMockChange("promotions-coupons");
    publishMockChange("promotions");
    return ok;
  };
  if (persistEnabled) {
    subscribeExternalMockChanges("promotions-coupons", () => {
      const stored = readMockState<MockCouponState>(
        "promotions-coupons",
        isMockCouponState,
      );
      if (!stored) return;
      records.length = 0;
      records.push(...stored.records);
      sequence = stored.sequence;
      publishMockChange("promotions-coupons");
      publishMockChange("promotions");
    });
  }
  async function configure(
    values: CouponConfiguration,
    signal: AbortSignal,
    excludeId?: string,
  ) {
    const errors = couponInputErrors(values);
    if (Object.keys(errors).length)
      throw new CouponWriteError(
        "validation",
        "Revisa los campos indicados.",
        errors,
      );
    const normalized = normalizeCouponConfiguration(values);
    if (
      records.some(
        (item) => item.id !== excludeId && item.code === normalized.code,
      )
    )
      throw new CouponWriteError(
        "validation",
        "El código ya está registrado.",
        { code: "Ya existe otro cupón con este código." },
      );
    const promotion = (await dependencies.promotions(signal)).find(
      (item) => item.id === normalized.promotionId && item.mode === "coupon",
    );
    signal.throwIfAborted();
    if (!promotion)
      throw new CouponWriteError(
        "validation",
        "La promoción no está disponible.",
        {
          promotionId:
            "Selecciona una promoción de modalidad cupón disponible.",
        },
      );
    return {
      code: normalized.code,
      promotionId: normalized.promotionId,
      globalLimit: normalized.globalLimit,
      customerLimit: normalized.customerLimit,
      minimumAmount: normalized.minimumAmount,
      cancellationPolicy: normalized.cancellationPolicy,
      promotion: {
        name: promotion.name,
        validFrom: promotion.validFrom,
        validUntil: promotion.validUntil,
      },
    };
  }
  return {
    promotions: dependencies.promotions,
    async create(values: CouponInput, signal) {
      signal.throwIfAborted();
      const errors = couponInputErrors(values, true);
      if (Object.keys(errors).length)
        throw new CouponWriteError(
          "validation",
          "Revisa los campos indicados.",
          errors,
        );
      const mapped = await configure(values, signal);
      signal.throwIfAborted();
      // The injected reference query can yield; recheck uniqueness immediately before storing.
      if (records.some((item) => item.code === mapped.code))
        throw new CouponWriteError(
          "validation",
          "El código ya está registrado.",
          { code: "Ya existe otro cupón con este código." },
        );
      const coupon: CouponView = {
        ...mapped,
        status: values.status,
        id: "cupon-demo-" + ++sequence,
        consumedUses: 0,
        remainingUses: values.globalLimit === null ? null : undefined,
      };
      records.push(coupon);
      if (!persist() && persistEnabled) {
        throw new CouponWriteError(
          "rejected",
          "No se pudo guardar el cambio. Vuelve a intentarlo.",
        );
      }
      return structuredClone(coupon);
    },
    async update(id, values, signal) {
      signal.throwIfAborted();
      const previous = records.find((item) => item.id === id);
      if (!previous)
        throw new CouponWriteError(
          "rejected",
          "El cupón ya no está disponible. No se guardó el cambio.",
        );
      const mapped = await configure(values, signal, id);
      signal.throwIfAborted();
      if (records.some((item) => item.id !== id && item.code === mapped.code))
        throw new CouponWriteError(
          "validation",
          "El código ya está registrado.",
          { code: "Ya existe otro cupón con este código." },
        );
      const current = records.find((item) => item.id === id)!;
      const coupon: CouponView = {
        ...current,
        ...mapped,
        remainingUses:
          mapped.globalLimit === current.globalLimit
            ? current.remainingUses
            : mapped.globalLimit === null
              ? null
              : undefined,
      };
      records[records.findIndex((item) => item.id === id)] = coupon;
      if (!persist() && persistEnabled) {
        throw new CouponWriteError(
          "rejected",
          "No se pudo guardar el cambio. Vuelve a intentarlo.",
        );
      }
      return structuredClone(coupon);
    },
    async changeStatus(id, status, signal) {
      signal.throwIfAborted();
      if (status !== "active" && status !== "inactive")
        throw new CouponWriteError(
          "validation",
          "Selecciona un estado válido.",
          { status: "Selecciona el estado inicial." },
        );
      const index = records.findIndex((item) => item.id === id),
        previous = records[index];
      if (!previous)
        throw new CouponWriteError(
          "rejected",
          "El cupón ya no está disponible. No se cambió el estado.",
        );
      const coupon = { ...previous, status };
      records[index] = coupon;
      if (!persist() && persistEnabled) {
        throw new CouponWriteError(
          "rejected",
          "No se pudo guardar el cambio. Vuelve a intentarlo.",
        );
      }
      return structuredClone(coupon);
    },
    async list(query, signal) {
      signal.throwIfAborted();
      return pageOf(
        records.filter(
          (item) => query.status === "all" || item.status === query.status,
        ),
        query.page,
        query.pageSize,
      );
    },
    async read(id, signal) {
      signal.throwIfAborted();
      const item = records.find((row) => row.id === id);
      return item ? structuredClone(item) : null;
    },
  };
}
