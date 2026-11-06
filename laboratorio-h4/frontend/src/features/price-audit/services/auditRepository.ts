import type { ComponentType } from "react";
import type { ReportFile } from "../../pricing/services/pricingRepository";
import type { ReportDownloader } from "../../pricing/services/pricingRuntime";

// Internal models, not HTTP DTOs. Decimal strings retain precision; currency is absent.
export interface AuditFilters {
  sku: string;
  desde: string;
  hasta: string;
  usuarioId: string;
  canal: string;
  batchId: string;
}
export interface AuditQuery extends AuditFilters {
  page: number;
  size: number;
}
export interface AuditEntry {
  id: string;
  sku: string;
  productId: string;
  priceType: "REGULAR" | "OFERTA";
  before: string | null;
  after: string | null;
  variation: string | null;
  operation: "CREACION" | "MODIFICACION" | "RETIRO_OFERTA";
  origin: string;
  reason: string;
  batchId: string | null;
  actorId: string | null;
  email: string | null;
  ip: string | null;
  at: string;
}
export interface AuditPage {
  items: AuditEntry[];
  page: number;
  size: number;
  total: number;
  pages: number;
}
export type AuditFormat = "CSV" | "PDF";
export interface AuditExportInput {
  format: AuditFormat;
  filters: AuditFilters;
}
export interface AuditJob {
  id: string;
  format: AuditFormat;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED_GENERAL";
  createdAt: string;
  completedAt: string | null;
  fileAvailable: boolean;
}
export type AuditFailureKind =
  | "session"
  | "forbidden"
  | "limit"
  | "unknown"
  | "unavailable"
  | "configuration";
export class AuditFailure extends Error {
  constructor(
    readonly kind: AuditFailureKind,
    message: string,
  ) {
    super(message);
  }
}
export interface AuditRepository {
  list(query: AuditQuery, signal: AbortSignal): Promise<AuditPage>;
  detail(id: string, signal: AbortSignal): Promise<AuditEntry | null>;
  requestExport(
    input: AuditExportInput,
    signal: AbortSignal,
  ): Promise<AuditJob>;
  getExport(id: string, signal: AbortSignal): Promise<AuditJob | null>;
  download(id: string, signal: AbortSignal): Promise<ReportFile>;
}
export interface AuditRuntime {
  repository: AuditRepository;
  downloader: ReportDownloader;
  notice?: string;
  ReviewTools?: ComponentType;
}
