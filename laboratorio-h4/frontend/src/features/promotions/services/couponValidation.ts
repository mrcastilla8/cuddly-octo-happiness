import type {
  CouponFieldErrors,
  CouponInput,
  CouponView,
} from "./couponRepository";
import { positiveDecimal } from "./administration";

export type CouponConfiguration = Omit<CouponInput, "status">;
export function normalizeCouponConfiguration<T extends CouponConfiguration>(
  input: T,
): T {
  return {
    ...input,
    code: normalizeCouponCode(input.code),
    promotionId: input.promotionId.trim(),
    minimumAmount:
      input.minimumAmount === null
        ? null
        : input.minimumAmount.trim().replace(",", "."),
  };
}
export function couponInputErrors(
  input: CouponConfiguration & { status?: string },
  creating = false,
): CouponFieldErrors {
  const errors: CouponFieldErrors = {};
  if (!/^[A-Z0-9_-]+$/.test(normalizeCouponCode(input.code)))
    errors.code =
      "Ingresa un código con letras A–Z, números, guion o guion bajo.";
  if (!input.promotionId.trim())
    errors.promotionId = "Selecciona una promoción de modalidad cupón.";
  for (const field of ["globalLimit", "customerLimit"] as const) {
    if (
      input[field] !== null &&
      (!Number.isSafeInteger(input[field]) || input[field]! < 1)
    )
      errors[field] =
        "Ingresa un entero positivo o deja el campo vacío para indicar Sin límite.";
  }
  if (
    input.minimumAmount !== null &&
    !positiveDecimal(input.minimumAmount.trim().replace(",", "."))
  )
    errors.minimumAmount =
      "Ingresa un monto mayor que cero o deja el campo vacío.";
  if (
    input.cancellationPolicy !== "restore" &&
    input.cancellationPolicy !== "keep"
  )
    errors.cancellationPolicy = "Selecciona una política de restitución.";
  if (creating && input.status !== "active" && input.status !== "inactive")
    errors.status = "Selecciona el estado inicial.";
  return errors;
}

export interface CouponDraft {
  code: string;
  promotionId: string;
  status: CouponInput["status"] | "";
  globalLimit: string;
  customerLimit: string;
  minimumAmount: string;
  cancellationPolicy: CouponInput["cancellationPolicy"] | "";
}
export const emptyCouponDraft: CouponDraft = {
  code: "",
  promotionId: "",
  status: "",
  globalLimit: "",
  customerLimit: "",
  minimumAmount: "",
  cancellationPolicy: "",
};
export function normalizeCouponCode(code: string) {
  return code.trim().replace(/[a-z]/g, (letter) => letter.toUpperCase());
}
export function couponDraftFromRecord(coupon: CouponView): CouponDraft {
  return {
    code: coupon.code,
    promotionId: coupon.promotionId,
    status: coupon.status,
    globalLimit: coupon.globalLimit?.toString() ?? "",
    customerLimit: coupon.customerLimit?.toString() ?? "",
    minimumAmount: coupon.minimumAmount ?? "",
    cancellationPolicy: coupon.cancellationPolicy,
  };
}
export function validateCouponDraft(draft: CouponDraft): {
  errors: CouponFieldErrors;
  values: CouponInput | null;
} {
  const errors: CouponFieldErrors = {};
  const code = normalizeCouponCode(draft.code);
  const limit = (field: "globalLimit" | "customerLimit") => {
    const text = draft[field].trim();
    if (!text) return null;
    const number = Number(text);
    if (!/^\d+$/.test(text) || !Number.isSafeInteger(number) || number < 1) {
      errors[field] =
        "Ingresa un entero positivo o deja el campo vacío para indicar Sin límite.";
      return null;
    }
    return number;
  };
  const globalLimit = limit("globalLimit"),
    customerLimit = limit("customerLimit");
  const minimumAmount = draft.minimumAmount.trim().replace(",", ".") || null;
  Object.assign(
    errors,
    couponInputErrors(
      {
        code,
        promotionId: draft.promotionId,
        status: draft.status,
        globalLimit,
        customerLimit,
        minimumAmount,
        cancellationPolicy:
          draft.cancellationPolicy as CouponInput["cancellationPolicy"],
      },
      true,
    ),
  );
  if (Object.keys(errors).length || !draft.status || !draft.cancellationPolicy)
    return { errors, values: null };
  return {
    errors,
    values: {
      code,
      promotionId: draft.promotionId,
      status: draft.status,
      globalLimit,
      customerLimit,
      minimumAmount,
      cancellationPolicy: draft.cancellationPolicy,
    },
  };
}
export function couponMatchesInput(coupon: CouponView, input: CouponInput) {
  return (
    coupon.code === input.code &&
    coupon.promotionId === input.promotionId &&
    coupon.status === input.status &&
    coupon.globalLimit === input.globalLimit &&
    coupon.customerLimit === input.customerLimit &&
    coupon.minimumAmount === input.minimumAmount &&
    coupon.cancellationPolicy === input.cancellationPolicy
  );
}
