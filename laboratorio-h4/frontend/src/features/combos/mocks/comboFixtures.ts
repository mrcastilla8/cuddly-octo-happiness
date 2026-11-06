import { calculateInformativeAvailability } from "../services/availability";
import type { Combo, ComboStatus, StockReading, SkuPrice } from "../types/combos";
import { initialStockItems } from "../../inventory/mocks/inventoryFixtures";

// Demonstration combos. Every SKU below exists in the shared Catalog used by
// MK-003/MK-004 (see src/features/catalog/mocks/catalogFixtures.ts):
//   CAS-COR-001      simple, ACTIVE product
//   CAM-RUN-BLA-M    active variant of PROD-RUN-001
//   CAM-RUN-AZU-L    active variant of PROD-RUN-001
// Combos never insert fictitious products into the shared Catalog.

export const stockFixtures: Readonly<Record<string, StockReading>> = Object.fromEntries(
  Array.from(new Set(initialStockItems.map((item) => item.sku))).map((sku) => {
    const stock = initialStockItems
      .filter((item) => item.sku === sku)
      .reduce((sum, item) => sum + item.available, 0);
    return [sku, { sku, stock, stale: false, locationsCompatible: true }];
  }),
);

export const priceFixtures: SkuPrice[] = [
  { sku: "CAS-COR-001", regularMinor: 17900, offerMinor: 15900, currency: "PEN", channelId: null, priceVersion: 1, validityId: "vigencia-cas-cor-001", validFrom: "2020-10-01T00:00:00Z", validUntil: null },
  { sku: "CAM-RUN-BLA-M", regularMinor: 13990, offerMinor: 12990, currency: "PEN", channelId: null, priceVersion: 1, validityId: "vigencia-cam-run-bla-m", validFrom: "2020-10-01T00:00:00Z", validUntil: null },
  { sku: "CAM-RUN-AZU-L", regularMinor: 14990, offerMinor: null, currency: "PEN", channelId: null, priceVersion: 1, validityId: "vigencia-cam-run-azu-l", validFrom: "2020-10-01T00:00:00Z", validUntil: null },
  { sku: "CAM-RUN-NEG-S", regularMinor: 13990, offerMinor: null, currency: "PEN", channelId: null, priceVersion: 1, validityId: "vigencia-cam-run-neg-s", validFrom: "2020-10-01T00:00:00Z", validUntil: null },
  { sku: "ZAP-RUN-41", regularMinor: 24900, offerMinor: null, currency: "PEN", channelId: null, priceVersion: 1, validityId: "vigencia-zap-run-41", validFrom: "2020-10-01T00:00:00Z", validUntil: null },
];

// Demo instant used to seed informative availability. It matches the shared
// Pricing demo clock so a recomputed read is byte-identical to the seed.
const CALCULATED_AT = "2026-10-17T12:00:00.000Z";

function priceFor(sku: string): { regularUnitMinor: number | null; publicUnitMinor: number | null } {
  const price = priceFixtures.find((candidate) => candidate.sku === sku);
  return {
    regularUnitMinor: price?.regularMinor ?? null,
    publicUnitMinor: price ? price.offerMinor ?? price.regularMinor : null,
  };
}

function component(sku: string, productName: string, quantity: number) {
  return { sku, productName, quantity, ...priceFor(sku) };
}

interface ComboSeed {
  id: string;
  name: string;
  description: string;
  status: ComboStatus;
  priceMinor: number;
  version: number;
  components: { sku: string; productName: string; quantity: number }[];
}

const seeds: ComboSeed[] = [
  {
    id: "combo-001",
    name: "Conjunto Trail Esencial",
    description: "Casaca cortaviento y camiseta deportiva Running para salidas de media montaña.",
    status: "ACTIVO",
    priceMinor: 20990,
    version: 3,
    components: [
      { sku: "CAS-COR-001", productName: "Casaca Cortaviento Trail", quantity: 1 },
      { sku: "CAM-RUN-BLA-M", productName: "Camiseta Running Endurance", quantity: 1 },
    ],
  },
  {
    id: "combo-002",
    name: "Dúo Running",
    description: "Dos camisetas deportivas Running para rotación diaria.",
    status: "ACTIVO",
    priceMinor: 19990,
    version: 1,
    components: [
      { sku: "CAM-RUN-BLA-M", productName: "Camiseta Running Endurance", quantity: 1 },
      { sku: "CAM-RUN-AZU-L", productName: "Camiseta Running Endurance", quantity: 1 },
    ],
  },
  {
    id: "combo-003",
    name: "Pack Urbano histórico",
    description: "Combo descontinuado conservado para consulta.",
    status: "INACTIVO",
    priceMinor: 18990,
    version: 2,
    components: [
      { sku: "CAS-COR-001", productName: "Casaca Cortaviento Trail", quantity: 1 },
      { sku: "CAM-RUN-AZU-L", productName: "Camiseta Running Endurance", quantity: 1 },
    ],
  },
];

const stockMap = new Map(Object.entries(stockFixtures));

export const comboFixtures: Combo[] = seeds.map((seed) => ({
  ...seed,
  components: seed.components.map((item) => component(item.sku, item.productName, item.quantity)),
  availability: calculateInformativeAvailability(
    seed.status,
    seed.components.map((item) => ({ sku: item.sku, quantity: item.quantity, active: true })),
    stockMap,
    CALCULATED_AT,
  ),
}));
