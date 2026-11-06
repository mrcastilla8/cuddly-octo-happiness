import type {
  ImportInput,
  PriceQuery,
  PriceTarget,
  PriceView,
  PricingRepository,
  ReportFile,
} from "../../src/features/pricing/services/pricingRepository";
import type {
  PriceChange,
  ScheduleDraft,
  ScheduleView,
} from "../../src/features/pricing/services/pricingModels";
import { PricingFailure } from "../../src/features/pricing/services/pricingModels";
import {
  localInstant,
  validatePrice,
  validateSchedule,
} from "../../src/features/pricing/services/pricingValidation";
import type { Clock } from "../../src/features/pricing/services/pricingRuntime";

export interface AdapterCall {
  operation: string;
  targetId?: string;
  channel?: string;
  at?: string;
  fileName?: string;
  fileText?: string;
  allowPartial?: boolean;
  isFile?: boolean;
  kind?: string;
}
export interface AdapterAudit {
  calls: AdapterCall[];
  failRead: boolean;
  failReport: boolean;
  failCatalog: boolean;
}
export const alternateIds = {
  product: "catalog-coffee-908",
  sku: "catalog-steel-771",
  batch: "import-coffee-55",
};
// Independent implementation: no import from mock adapter, demo control or existing fixture data.
export class AlternatePricingRepository implements PricingRepository {
  readonly audit: AdapterAudit = {
    calls: [],
    failRead: false,
    failReport: false,
    failCatalog: false,
  };
  private readonly targets: PriceTarget[] = [
    {
      id: alternateIds.product,
      productId: "88999999-cccc-4444-aaaa-777777777777",
      kind: "product",
      label: "Cafetera Andina · Producto base",
      referenceSku: "COF-BASE-908",
    },
    {
      id: alternateIds.sku,
      productId: "88999999-cccc-4444-aaaa-777777777777",
      kind: "variant",
      label: "Acero · 1 litro — COF-STEEL-XL",
      sku: "COF-STEEL-XL",
      productTargetId: alternateIds.product,
    },
  ];
  private readonly saved = new Map<string, PriceView>();
  private readonly programs: ScheduleView[] = [
    {
      id: "alt-program-1",
      targetId: alternateIds.product,
      kind: "REGULAR",
      amount: "350.00",
      currency: "CHF",
      channel: "global",
      start: "2027-01-01T05:00:00Z",
      end: "2027-01-15T05:00:00Z",
      status: "SCHEDULED",
    },
    {
      id: "alt-program-2",
      targetId: alternateIds.product,
      kind: "OFERTA",
      amount: "200.00",
      currency: "CHF",
      channel: "global",
      start: "2027-02-01T05:00:00Z",
      end: "2027-02-15T05:00:00Z",
      status: "SCHEDULED",
    },
  ];
  constructor(private readonly clock: Clock) {}
  private current(query: PriceQuery): PriceView | null {
    const target = this.targets.find((row) => row.id === query.targetId);
    if (!target) return null;
    const saved = this.saved.get(`${query.targetId}:${query.channel}`);
    if (saved) return structuredClone(saved);
    const retail = target.kind === "variant" && query.channel === "retail";
    return {
      id: target.id,
      name: target.kind === "product" ? "Cafetera Andina" : "Acero · 1 litro",
      sku: target.kind === "variant" ? target.sku : undefined,
      regular: retail ? "450.500" : "310.125",
      offer: retail ? "400.25" : null,
      currency: "CHF",
      version: retail ? 19 : 7,
      origin: retail ? "sku" : "product",
      inherited: target.kind === "variant" && !retail,
      channel: retail ? "retail" : "global",
      validFrom: "2026-10-01T05:00:00Z",
      validUntil: null,
    };
  }
  async listTargets(signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "listTargets" });
    if (this.audit.failCatalog)
      throw new Error("Catálogo alternativo no disponible.");
    return structuredClone(this.targets);
  }
  async read(query: PriceQuery, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "read", ...query });
    if (this.audit.failRead)
      throw new Error("Origen alternativo no disponible.");
    const price = this.current(query);
    if (!price) return null;
    return {
      price,
      breakdown: this.targets.flatMap((target) => {
        const row = this.current({
          targetId: target.id,
          channel: query.channel,
        });
        return row ? [row] : [];
      }),
    };
  }
  async readEditable(target: PriceQuery, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "readEditable", ...target });
    return this.current(target);
  }
  async update(change: PriceChange, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "update", ...change.target });
    const current = this.current(change.target);
    if (!current) throw new Error("Objetivo desconocido.");
    if (change.version !== current.version)
      throw new PricingFailure("conflict", "Versión alternativa obsoleta.");
    const errors = validatePrice(change.draft, current);
    if (Object.keys(errors).length)
      throw new Error(Object.values(errors).join(" "));
    const target = this.targets.find(
      (row) => row.id === change.target.targetId,
    )!;
    const saved = {
      ...current,
      regular: change.draft.regular,
      offer:
        change.draft.offerAction === "ESTABLECER"
          ? change.draft.offer
          : change.draft.offerAction === "ELIMINAR"
            ? null
            : current.offer,
      version: current.version + 1,
      origin:
        target.kind === "product" ? ("product" as const) : ("sku" as const),
      inherited: false,
      validFrom: this.clock.now(),
    };
    this.saved.set(`${target.id}:${change.target.channel}`, saved);
    return structuredClone(saved);
  }
  async listSchedules(targetId: string, page: number, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "listSchedules", targetId });
    const rows = this.programs.filter((row) => row.targetId === targetId);
    return {
      items: structuredClone(rows.slice((page - 1) * 2, page * 2)),
      page,
      pageSize: 2,
      total: rows.length,
    };
  }
  async readHistorical(query: PriceQuery, at: string, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "readHistorical", ...query, at });
    const price = this.current(query);
    if (!price || Date.parse(at) < Date.parse("2026-09-01T00:00:00Z"))
      return null;
    const future = Date.parse(at) >= Date.parse("2027-01-01T00:00:00Z");
    return {
      price: {
        ...price,
        regular: future ? "500.005" : "120.00",
        offer: future ? null : "90.00",
        validFrom: future ? "2027-01-01T00:00:00Z" : "2026-09-01T00:00:00Z",
        validUntil: future ? null : "2027-01-01T00:00:00Z",
      },
      validityId: "alt-validity-008",
    };
  }
  async schedule(targetId: string, draft: ScheduleDraft, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({
      operation: "schedule",
      targetId,
      channel: draft.channel,
      kind: draft.kind,
    });
    const start = localInstant(draft.start)!;
    const reference = await this.readHistorical(
      { targetId, channel: draft.channel },
      start,
      signal,
    );
    const errors = validateSchedule(
      draft,
      this.clock.now(),
      reference?.price ?? null,
    );
    if (Object.keys(errors).length)
      throw new Error(Object.values(errors).join(" "));
    const row: ScheduleView = {
      id: "alt-program-new",
      targetId,
      kind: draft.kind,
      amount: draft.amount,
      currency: draft.currency,
      channel: draft.channel,
      start,
      end: draft.end ? localInstant(draft.end) : null,
      status: "SCHEDULED",
    };
    this.programs.unshift(row);
    return structuredClone(row);
  }
  async prevalidate(input: ImportInput, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({
      operation: "prevalidate",
      fileName: input.file.name,
      fileText: await input.file.text(),
      isFile: input.file instanceof File,
      allowPartial: input.allowPartial,
    });
    return { valid: true, total: 8, errors: [] };
  }
  async readBatch(id: string, signal: AbortSignal) {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "readBatch", targetId: id });
    return id === alternateIds.batch
      ? {
          id,
          status: "COMPLETED" as const,
          allowPartial: false,
          total: 8,
          completed: 8,
          failed: 0,
          rows: [
            {
              id: "row-alt-77",
              sku: "COF-STEEL-XL",
              status: "COMPLETED" as const,
              code: null,
              detail: "Resultado de otra fuente",
            },
          ],
        }
      : null;
  }
  async report(id: string, signal: AbortSignal): Promise<ReportFile> {
    signal.throwIfAborted();
    this.audit.calls.push({ operation: "report", targetId: id });
    if (this.audit.failReport)
      throw new Error("Reporte alternativo no disponible.");
    return {
      filename: "resultado-cafeteras.csv",
      data: new Blob(["sku,status\nCOF-STEEL-XL,COMPLETED\n"], {
        type: "text/csv;charset=utf-8",
      }),
    };
  }
}
