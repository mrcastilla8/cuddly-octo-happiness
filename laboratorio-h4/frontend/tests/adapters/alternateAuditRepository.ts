import {
  AuditFailure,
  type AuditEntry,
  type AuditExportInput,
  type AuditFailureKind,
  type AuditJob,
  type AuditQuery,
  type AuditRepository,
} from "../../src/features/price-audit/services/auditRepository";

export interface AlternateAuditControl {
  queries: AuditQuery[];
  requests: AuditExportInput[];
  reads: string[];
  downloads: string[];
  total: number;
  serverTotal?: number;
  afterAcceptedTotal?: number;
  phase: AuditJob["status"];
  listFailure?: AuditFailureKind;
  detailFailure?: AuditFailureKind;
  detailMissing?: boolean;
  requestFailure?: AuditFailureKind;
  readFailure?: AuditFailureKind;
  downloadFailure?: AuditFailureKind;
  fileAvailable: boolean;
  slowSku?: string;
  slowFinished?: boolean;
  slowExportId?: string;
  slowExportFinished?: boolean;
  slowDownloadId?: string;
  slowDownloadFinished?: boolean;
  returnedJobId?: string;
}
export const alternateAuditId = "audit-coffee-908";
export const alternateAuditEntry: AuditEntry = {
  id: alternateAuditId,
  sku: "COF-STEEL-XL",
  productId: "88999999-cccc-4444-aaaa-777777777777",
  priceType: "REGULAR",
  before: "99999999999999999.12345",
  after: "123.4567",
  variation: "-12.12345",
  operation: "MODIFICACION",
  origin: "UNRECOGNIZED",
  reason: "Motivo largo y autorizado. ".repeat(24),
  batchId: "lote-cafeteras-55",
  actorId: null,
  email: null,
  ip: null,
  at: "2026-10-17T12:00:00Z",
};
export function createAlternateAuditRepository(
  control: AlternateAuditControl,
): AuditRepository {
  const jobs = new Map<string, AuditJob>();
  const fail = (kind?: AuditFailureKind) => {
    if (kind)
      throw new AuditFailure(
        kind,
        kind === "forbidden"
          ? "No tienes permiso para consultar esta información."
          : kind === "session"
            ? "Verifica tu sesión para continuar."
            : "Origen alternativo no disponible.",
      );
  };
  return {
    async list(query, signal) {
      signal.throwIfAborted();
      control.queries.push(structuredClone(query));
      if (control.slowSku === query.sku) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        control.slowFinished = true;
      }
      fail(control.listFailure);
      const filteredOut = !!query.sku && query.sku !== alternateAuditEntry.sku;
      return {
        items:
          filteredOut || control.total === 0
            ? []
            : [structuredClone(alternateAuditEntry)],
        page: query.page,
        size: query.size,
        total: filteredOut ? 0 : control.total,
        pages: Math.ceil(control.total / query.size),
      };
    },
    async detail(id, signal) {
      signal.throwIfAborted();
      fail(control.detailFailure);
      if (control.detailMissing) return null;
      return id === alternateAuditId
        ? structuredClone(alternateAuditEntry)
        : null;
    },
    async requestExport(input, signal) {
      signal.throwIfAborted();
      control.requests.push(structuredClone(input));
      fail(control.requestFailure);
      if (
        (control.serverTotal ?? control.total) >
        (input.format === "CSV" ? 100000 : 500)
      )
        throw new AuditFailure(
          "limit",
          "El servicio rechazó la cantidad sin crear un trabajo.",
        );
      const job: AuditJob = {
        id: `export-coffee-${input.format.toLowerCase()}-${jobs.size + 1}`,
        format: input.format,
        status: "QUEUED",
        createdAt: "2026-10-17T12:00:00Z",
        completedAt: null,
        fileAvailable: false,
      };
      jobs.set(job.id, job);
      if (control.afterAcceptedTotal !== undefined)
        control.total = control.afterAcceptedTotal;
      return structuredClone(job);
    },
    async getExport(id, signal) {
      signal.throwIfAborted();
      control.reads.push(id);
      if (control.slowExportId === id) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        control.slowExportFinished = true;
      }
      fail(control.readFailure);
      const job = jobs.get(id);
      return job
        ? {
            ...job,
            id: control.returnedJobId ?? job.id,
            status: control.phase,
            completedAt:
              control.phase === "COMPLETED" ? "2026-10-17T12:01:00Z" : null,
            fileAvailable: control.fileAvailable && job.format === "CSV",
          }
        : null;
    },
    async download(id, signal) {
      signal.throwIfAborted();
      control.downloads.push(id);
      if (control.slowDownloadId === id) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        control.slowDownloadFinished = true;
      }
      fail(control.downloadFailure);
      if (
        !jobs.has(id) ||
        control.phase !== "COMPLETED" ||
        !control.fileAvailable
      )
        throw new AuditFailure("unavailable", "Archivo no disponible.");
      return {
        data: new Blob(["sku,resultado\nCOF-STEEL-XL,revision\n"], {
          type: "text/csv",
        }),
        filename: "auditoria-cafeteras.csv",
      };
    },
  };
}
