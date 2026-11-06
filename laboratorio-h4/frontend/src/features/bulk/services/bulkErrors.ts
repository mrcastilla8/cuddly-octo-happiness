export type BulkFailureCategory =
  | "configuration"
  | "rejected"
  | "communication"
  | "unknown";

export class BulkRepositoryError extends Error {
  constructor(
    message: string,
    readonly category: BulkFailureCategory,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "BulkRepositoryError";
  }
}
