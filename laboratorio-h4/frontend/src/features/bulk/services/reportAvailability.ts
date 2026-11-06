import type { BulkImportBatch } from "../types/bulk";

export function canMockProvideImportReport(batch: BulkImportBatch): boolean {
  return (
    batch.failed_rows > 0 &&
    Boolean(batch.rows?.some((row) => row.status === "FAILED"))
  );
}
