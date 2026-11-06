import type { PriceQuery, PriceView } from "./pricingRepository";
export type OfferAction = "CONSERVAR" | "ESTABLECER" | "ELIMINAR";
export interface WriteTarget {
  targetId: string;
  channel: PriceQuery["channel"];
}
export type EditablePrice = PriceView;
export interface PriceDraft {
  regular: string;
  offer: string;
  offerAction: OfferAction;
  currency: string;
  reason: string;
}
export interface PriceChange {
  target: WriteTarget;
  draft: PriceDraft;
  version: number;
}
export interface ScheduleDraft {
  kind: "REGULAR" | "OFERTA";
  amount: string;
  currency: string;
  channel: "global" | "retail";
  start: string;
  end: string;
  reason: string;
}
export interface ScheduleView {
  id: string;
  targetId: string;
  kind: ScheduleDraft["kind"];
  amount: string;
  currency: string;
  channel: "global" | "retail";
  start: string;
  end: string | null;
  status: "SCHEDULED" | "ACTIVE" | "HISTORICAL" | "CANCELLED";
  version?: number;
}
export interface SchedulePage {
  items: ScheduleView[];
  page: number;
  pageSize: number;
  total: number;
}
export type BatchStatus =
  "QUEUED" | "PROCESSING" | "COMPLETED" | "PARTIAL" | "FAILED";
export interface ImportRow {
  id: string;
  sku: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  code: string | null;
  detail: string | null;
}
export interface PrevalidationView {
  valid: boolean;
  total: number;
  errors: ImportRow[];
}
export interface BatchView {
  id: string;
  status: BatchStatus;
  allowPartial: boolean;
  total: number;
  completed: number;
  failed: number;
  rows?: ImportRow[];
}
export class PricingFailure extends Error {
  constructor(
    public kind:
      | "conflict"
      | "overlap"
      | "unauthorized"
      | "forbidden"
      | "unknown"
      | "error"
      | "blocked_contract"
      | "configuration",
    message: string,
  ) {
    super(message);
  }
}
