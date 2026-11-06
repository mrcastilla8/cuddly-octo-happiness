import { ComboError, type CombosAvailabilityPort, type StockReading } from "../types/combos";
import type { InventoryRepository } from "../../inventory/services/inventoryRepository";

export type StockSnapshot = Readonly<Record<string, StockReading>>;

export interface MockCombosAvailabilityOptions {
  snapshot?: StockSnapshot;
  inventory?: Pick<InventoryRepository, "getStockItems">;
  fail?: boolean;
}

// Reads the shared Inventory repository when composed by the app. Snapshot
// injection remains available for isolated adapter tests; absent SKUs stay
// unknown instead of becoming a confident zero.
export class MockCombosAvailabilityAdapter implements CombosAvailabilityPort {
  private snapshot: StockSnapshot;
  private inventory?: Pick<InventoryRepository, "getStockItems">;
  private failing: boolean;

  constructor(options: MockCombosAvailabilityOptions = {}) {
    this.snapshot = options.snapshot ?? {};
    this.inventory = options.inventory;
    this.failing = options.fail ?? false;
  }

  setSnapshot(snapshot: StockSnapshot): void {
    this.snapshot = snapshot;
  }

  setFailing(failing: boolean): void {
    this.failing = failing;
  }

  async readStocks(skus: string[], signal?: AbortSignal): Promise<StockReading[]> {
    if (signal?.aborted) throw new DOMException("La consulta fue cancelada.", "AbortError");
    if (this.failing) {
      throw new ComboError("unavailable", "El snapshot de disponibilidad no está disponible.");
    }
    if (this.inventory) {
      const rows = await this.inventory.getStockItems();
      return skus.map((sku) => {
        const matching = rows.filter((row) => row.sku === sku);
        if (matching.length === 0) {
          return { sku, stock: null, stale: false, locationsCompatible: true };
        }
        return {
          sku,
          stock: matching.reduce((sum, row) => sum + row.available, 0),
          stale: false,
          locationsCompatible: true,
        };
      });
    }
    return skus.map((sku) => {
      const reading = this.snapshot[sku];
      return reading
        ? { ...reading, sku }
        : { sku, stock: null, stale: false, locationsCompatible: true };
    });
  }
}
