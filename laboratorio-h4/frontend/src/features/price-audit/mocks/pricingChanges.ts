import type { PriceTarget, PriceView } from "../../pricing/services/pricingRepository";
import { decimalLess } from "../../pricing/services/pricingValidation";
import { AuditFailure, type AuditEntry } from "../services/auditRepository";
import {
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

export interface StoredAuditJob {
  id: string;
  format: "CSV" | "PDF";
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED_GENERAL";
  createdAt: string;
  completedAt: string | null;
  fileAvailable: boolean;
  filters: {
    sku: string;
    desde: string;
    hasta: string;
    usuarioId: string;
    canal: string;
    batchId: string;
  };
}

interface MockPricingAuditState {
  entries: AuditEntry[];
  sequence: number;
  jobs?: StoredAuditJob[];
  jobSequence?: number;
}

function isAuditEntryRecord(value: unknown): value is AuditEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.sku === "string" &&
    value.sku.trim().length > 0 &&
    typeof value.productId === "string" &&
    value.productId.trim().length > 0 &&
    (value.priceType === "REGULAR" || value.priceType === "OFERTA") &&
    typeof value.at === "string" &&
    (value.operation === "CREACION" || value.operation === "MODIFICACION" || value.operation === "RETIRO_OFERTA")
  );
}

function isStoredAuditJob(value: unknown): value is StoredAuditJob {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    (value.format === "CSV" || value.format === "PDF") &&
    (value.status === "QUEUED" ||
      value.status === "PROCESSING" ||
      value.status === "COMPLETED" ||
      value.status === "FAILED_GENERAL") &&
    typeof value.createdAt === "string" &&
    (value.completedAt === null || typeof value.completedAt === "string") &&
    typeof value.fileAvailable === "boolean" &&
    isRecord(value.filters)
  );
}

function isMockPricingAuditState(value: unknown): value is MockPricingAuditState {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.every(isAuditEntryRecord) &&
    typeof value.sequence === "number" &&
    Number.isFinite(value.sequence) &&
    value.sequence >= 0 &&
    (value.jobs === undefined ||
      (Array.isArray(value.jobs) && value.jobs.every(isStoredAuditJob))) &&
    (value.jobSequence === undefined ||
      (typeof value.jobSequence === "number" &&
        Number.isFinite(value.jobSequence) &&
        value.jobSequence >= 0))
  );
}

export function reconcilePendingFromPricing(
  recordFn: (target: PriceTarget, before: PriceView, after: PriceView, reason: string) => void,
) {
  if (!isMockPersistenceAvailable()) return;
  const pricingData = readMockState<Record<string, unknown>>("pricing", isRecord);
  if (!pricingData || !Array.isArray(pricingData.pendingAudit) || pricingData.pendingAudit.length === 0) {
    return;
  }
  const pending = pricingData.pendingAudit as Array<{
    id: string;
    target: PriceTarget;
    before: PriceView;
    after: PriceView;
    reason: string;
  }>;
  const remaining: typeof pending = [];
  for (const item of pending) {
    try {
      recordFn(item.target, item.before, item.after, item.reason);
    } catch {
      remaining.push(item);
    }
  }
  if (remaining.length !== pending.length) {
    const backupPending = [...pending];
    pricingData.pendingAudit = remaining;
    const ok = saveMockState("pricing", pricingData);
    if (!ok) {
      pricingData.pendingAudit = backupPending;
      return;
    }
    publishMockChange("pricing");
  }
}

// Demonstration audit log fed by confirmed Precios edits. It is only restored and
// persisted inside the mock browser demonstration; API composition never imports it.
export function createMockPricingAudit(options: { persist?: boolean } = {}) {
  const persistEnabled = options.persist === true && isMockPersistenceAvailable();
  const restored = persistEnabled
    ? readMockState<MockPricingAuditState>("price-audit", isMockPricingAuditState)
    : null;
  const entries: AuditEntry[] = restored ? restored.entries : [];
  let sequence = restored ? restored.sequence : 0;
  const jobs: StoredAuditJob[] = restored?.jobs
    ? structuredClone(restored.jobs)
    : [];
  let jobSequence = restored?.jobSequence ?? 0;

  // A non-persistent instance (persist: false) must never touch `localStorage`.
  function persist(): boolean {
    let ok = true;
    if (persistEnabled) {
      ok = saveMockState("price-audit", {
        entries,
        sequence,
        jobs,
        jobSequence,
      } satisfies MockPricingAuditState);
    }
    if (ok) {
      publishMockChange("price-audit");
    }
    return ok;
  }

  function record(target: PriceTarget, before: PriceView, after: PriceView, reason: string) {
    const sku = target.kind === "variant" ? target.sku : target.referenceSku;
    if (!sku) return; // A product ID is never substituted for an unknown SKU.
    let changed = false;
    const addedEntries: AuditEntry[] = [];
    const prevSequence = sequence;
    for (const priceType of ["REGULAR", "OFERTA"] as const) {
      const previous = priceType === "REGULAR" ? before.regular : before.offer;
      const next = priceType === "REGULAR" ? after.regular : after.offer;
      if (previous === next || (previous !== null && next !== null &&
        !decimalLess(previous, next) && !decimalLess(next, previous))) continue;
      const channelKey = `${after.channel}-v${after.version}`;
      const stableId = `demo-pricing-${target.id}-${sku}-${channelKey}-${priceType.toLowerCase()}`;
      const alreadyRecorded = entries.some(
        (e) =>
          e.id === stableId ||
          (e.sku === sku &&
            e.productId === target.productId &&
            e.priceType === priceType &&
            e.id.includes(`-${channelKey}-`)),
      );
      if (alreadyRecorded) continue;
      const entry: AuditEntry = {
        id: stableId,
        sku,
        productId: target.productId,
        priceType,
        before: previous,
        after: next,
        variation: previous === null || next === null ? null : percentage(previous, next),
        operation: next === null ? "RETIRO_OFERTA" : previous === null ? "CREACION" : "MODIFICACION",
        origin: "BACKOFFICE",
        reason,
        batchId: null,
        actorId: "demo-pricing",
        email: null,
        ip: null,
        at: after.validFrom,
      };
      entries.unshift(entry);
      addedEntries.push(entry);
      changed = true;
    }
    if (changed) {
      const persisted = persist();
      if (!persisted && persistEnabled) {
        for (const item of addedEntries) {
          const idx = entries.indexOf(item);
          if (idx !== -1) {
            entries.splice(idx, 1);
          }
        }
        sequence = prevSequence;
        throw new Error("No se pudo guardar el asiento de auditoría en el almacenamiento local.");
      }
    }
  }

  if (persistEnabled) {
    reconcilePendingFromPricing(record);
    subscribeExternalMockChanges("price-audit", () => {
      const next = readMockState<MockPricingAuditState>("price-audit", isMockPricingAuditState);
      if (!next) return;
      entries.length = 0;
      entries.push(...next.entries);
      sequence = next.sequence;
      jobs.length = 0;
      if (next.jobs) {
        jobs.push(...next.jobs);
      }
      jobSequence = next.jobSequence ?? 0;
      publishMockChange("price-audit");
    });
    subscribeExternalMockChanges("pricing", () => {
      reconcilePendingFromPricing(record);
    });
  }

  return {
    read: () => {
      if (persistEnabled) {
        reconcilePendingFromPricing(record);
      }
      return structuredClone(entries);
    },
    record,
    getJobs: () => structuredClone(jobs),
    getJob: (id: string) => {
      const found = jobs.find((j) => j.id === id);
      return found ? structuredClone(found) : null;
    },
    saveJob: (job: StoredAuditJob) => {
      const idx = jobs.findIndex((j) => j.id === job.id);
      const prev = idx !== -1 ? structuredClone(jobs[idx]) : undefined;
      if (idx !== -1) {
        jobs[idx] = structuredClone(job);
      } else {
        jobs.push(structuredClone(job));
      }
      const ok = persist();
      if (!ok && persistEnabled) {
        if (prev !== undefined) {
          jobs[idx] = prev;
        } else {
          jobs.pop();
        }
        return false;
      }
      return ok;
    },
    nextJobId: (format: "CSV" | "PDF") => {
      const prevSequence = jobSequence;
      jobSequence++;
      const ok = persist();
      if (!ok && persistEnabled) {
        jobSequence = prevSequence;
        throw new AuditFailure(
          "unavailable",
          "No se pudo generar el identificador de exportación por fallo de persistencia.",
        );
      }
      return `exp-014-${format.toLowerCase()}-${jobSequence}`;
    },
  };
}

function percentage(before: string, after: string) {
  const precision = Math.max(before.split(".")[1]?.length ?? 0, after.split(".")[1]?.length ?? 0);
  const units = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return BigInt(whole + fraction.padEnd(precision, "0"));
  };
  const previous = units(before);
  // Demo variation truncated to four decimals; price strings remain unchanged.
  const value = (units(after) - previous) * 1_000_000n / previous;
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${absolute / 10_000n}.${String(absolute % 10_000n).padStart(4, "0")}`;
}

export const mockPricingAudit = createMockPricingAudit({ persist: true });
