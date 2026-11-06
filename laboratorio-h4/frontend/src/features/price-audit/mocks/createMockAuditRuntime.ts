import { lazy } from "react";
import { createMockAuditRepository } from "../adapters/mockAuditRepository";
import type { AuditRuntime } from "../services/auditRepository";
import type { ReportDownloader } from "../../pricing/services/pricingRuntime";
import { mockPricingAudit } from "./pricingChanges";

export async function createMockAuditRuntime(
  downloader: ReportDownloader,
): Promise<AuditRuntime> {
  const repository = createMockAuditRepository(
    mockPricingAudit.read,
    mockPricingAudit,
  );
  return {
    repository: import.meta.env?.DEV
      ? (await import("./reviewRepository")).createReviewRepository(repository)
      : repository,
    downloader,
    ReviewTools: import.meta.env?.DEV
      ? lazy(() =>
          import("./AuditReviewTools").then((module) => ({
            default: module.AuditReviewTools,
          })),
        )
      : undefined,
  };
}
