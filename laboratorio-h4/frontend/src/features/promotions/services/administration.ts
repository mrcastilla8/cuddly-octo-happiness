import type { CouponStatus } from "./couponRepository";
export interface AdministrationQuery {
  status: CouponStatus | "all";
  kind: string;
  page: number;
  pageSize: number;
}
export interface AdministrationRecord {
  id: string;
  name: string;
  status: CouponStatus;
}
export interface AdministrationPage<T> {
  items: T[];
  total: number;
  page: number;
}
export interface AdministrationRepository<T extends AdministrationRecord, D> {
  list(
    query: AdministrationQuery,
    signal: AbortSignal,
  ): Promise<AdministrationPage<T>>;
  read(id: string, signal: AbortSignal): Promise<T | null>;
  save(id: string | null, draft: D, signal: AbortSignal): Promise<T>;
  changeStatus(
    id: string,
    status: CouponStatus,
    signal: AbortSignal,
  ): Promise<T>;
}
export class AdministrationError extends Error {
  constructor(
    public readonly kind:
      | "validation"
      | "rejected"
      | "unknown"
      | "conflict"
      | "access",
    message: string,
    public readonly fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "AdministrationError";
  }
}

export function localDateValid(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(`${value}:00-05:00`);
  return (
    Number.isFinite(date.getTime()) &&
    new Date(date.getTime() - 5 * 3600000).toISOString().slice(0, 16) === value
  );
}
export function validPeriod(from: string, until: string) {
  return localDateValid(from) && localDateValid(until) && from < until;
}
export function positiveInteger(value: string) {
  return (
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}
// Decimal configuration only: no monetary arithmetic or rounding.
export function positiveDecimal(value: string) {
  return /^\d+(\.\d+)?$/.test(value) && /[1-9]/.test(value);
}
export function percentageValid(value: string) {
  if (!positiveDecimal(value)) return false;
  const [whole = "", fraction = ""] = value.split(".");
  const normalized = whole.replace(/^0+/, "") || "0";
  return (
    normalized.length < 3 || (normalized === "100" && !/[1-9]/.test(fraction))
  );
}
export function pageOf<T>(
  rows: readonly T[],
  page: number,
  size: number,
): AdministrationPage<T> {
  const actual = Math.min(page, Math.max(1, Math.ceil(rows.length / size)));
  return {
    items: structuredClone(rows.slice((actual - 1) * size, actual * size)),
    total: rows.length,
    page: actual,
  };
}
