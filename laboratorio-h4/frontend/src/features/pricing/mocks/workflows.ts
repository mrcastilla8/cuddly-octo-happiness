import type {
  BatchView,
  ScheduleView,
  PrevalidationView,
} from "../services/pricingModels";

export const scheduleFixtures: ScheduleView[] = [
  {
    id: "schedule-01",
    targetId: "base",
    kind: "OFERTA",
    amount: "189.90",
    currency: "PEN",
    channel: "global",
    start: "2026-11-25T05:00:00Z",
    end: "2026-12-01T04:59:00Z",
    status: "SCHEDULED",
  },
  {
    id: "schedule-02",
    targetId: "base",
    kind: "OFERTA",
    amount: "199.90",
    currency: "PEN",
    channel: "global",
    start: "2026-12-15T05:00:00Z",
    end: "2026-12-26T04:59:00Z",
    status: "SCHEDULED",
  },
  {
    id: "schedule-03",
    targetId: "base",
    kind: "OFERTA",
    amount: "179.90",
    currency: "PEN",
    channel: "global",
    start: "2026-07-15T05:00:00Z",
    end: "2026-07-23T04:59:00Z",
    status: "HISTORICAL",
  },
];
export const partialBatch: BatchView = {
  id: "batch-013-01",
  status: "PARTIAL",
  allowPartial: true,
  total: 3,
  completed: 2,
  failed: 1,
  rows: [
    { id: "1", sku: "CAM-BASE", status: "COMPLETED", code: null, detail: null },
    { id: "2", sku: "CAM-AZ-M", status: "COMPLETED", code: null, detail: null },
    {
      id: "3",
      sku: "CAM-RO-L",
      status: "FAILED",
      code: "OFERTA_INVALIDA",
      detail: "La oferta debe ser menor que el precio regular",
    },
  ],
};
export const prevalidationFixtures: Record<
  "valid" | "rows",
  PrevalidationView
> = {
  valid: { valid: true, total: 3, errors: [] },
  rows: { valid: false, total: 3, errors: [partialBatch.rows![2]!] },
};
// Explicit mock report bytes returned by the adapter, never derived from the user's file.
export const mockReports = {
  partial:
    "row_id,sku,status,code,detail\n1,CAM-BASE,COMPLETED,,\n2,CAM-AZ-M,COMPLETED,,\n3,CAM-RO-L,FAILED,OFERTA_INVALIDA,La oferta debe ser menor que el precio regular\n",
  completed:
    "row_id,sku,status,code,detail\n1,CAM-BASE,COMPLETED,,\n2,CAM-AZ-M,COMPLETED,,\n3,CAM-RO-L,COMPLETED,,\n",
  failed:
    "row_id,sku,status,code,detail\n1,CAM-BASE,FAILED,PRECIO_INVALIDO,Precio rechazado\n2,CAM-AZ-M,FAILED,PRECIO_INVALIDO,Precio rechazado\n3,CAM-RO-L,FAILED,PRECIO_INVALIDO,Precio rechazado\n",
};
