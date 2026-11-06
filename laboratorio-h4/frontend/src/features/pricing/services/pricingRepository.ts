import type {
  BatchView,
  PrevalidationView,
  PriceChange,
  ScheduleDraft,
  SchedulePage,
  ScheduleView,
  WriteTarget,
} from "./pricingModels";

// Internal ports/models, independent of HTTP DTOs, fixtures and display formatting.
export type PriceChannel = "global" | "retail";
interface TargetContext {
  id: string;
  label: string;
  productId: string;
}
export type PriceTarget =
  | (TargetContext & { kind: "product"; referenceSku?: string; initialRegular?: string })
  | (TargetContext & { kind: "variant"; sku: string; productTargetId: string });
export interface PriceView {
  id: string;
  name: string;
  sku?: string;
  regular: string;
  offer: string | null;
  currency: string;
  version: number;
  origin: "product" | "sku";
  channel: PriceChannel;
  validFrom: string;
  validUntil: string | null;
  inherited: boolean;
  validityId?: string;
}
export interface PriceQuery {
  targetId: string;
  channel: PriceChannel;
}
export interface PriceSnapshot {
  price: PriceView;
  breakdown: PriceView[];
}
export interface ImportInput {
  file: File;
  allowPartial: boolean;
}
export interface ReportFile {
  data: Blob;
  filename: string;
}
export interface PricingRepository {
  listTargets(signal: AbortSignal): Promise<PriceTarget[]>;
  read(query: PriceQuery, signal: AbortSignal): Promise<PriceSnapshot | null>;
  readEditable(
    target: WriteTarget,
    signal: AbortSignal,
  ): Promise<PriceView | null>;
  update(change: PriceChange, signal: AbortSignal): Promise<PriceView>;
  listSchedules(
    targetId: string,
    page: number,
    signal: AbortSignal,
  ): Promise<SchedulePage>;
  schedule(
    targetId: string,
    draft: ScheduleDraft,
    signal: AbortSignal,
  ): Promise<ScheduleView>;
  readHistorical(
    query: PriceQuery,
    at: string,
    signal: AbortSignal,
  ): Promise<{ price: PriceView; validityId: string } | null>;
  prevalidate(
    input: ImportInput,
    signal: AbortSignal,
  ): Promise<PrevalidationView>;
  readBatch(id: string, signal: AbortSignal): Promise<BatchView | null>;
  report(id: string, signal: AbortSignal): Promise<ReportFile>;
  reconcileAudit?(): void;
}
