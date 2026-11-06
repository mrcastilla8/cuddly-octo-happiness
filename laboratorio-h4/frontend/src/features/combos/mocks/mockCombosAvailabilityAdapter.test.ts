import { describe, expect, it } from "vitest";
import type { InventoryRepository } from "../../inventory/services/inventoryRepository";
import type { StockItem } from "../../inventory/services/inventoryTypes";
import { MockInventoryAdapter } from "../../inventory/adapters/mockInventoryAdapter";
import { MockCombosAvailabilityAdapter } from "./mockCombosAvailabilityAdapter";

const item: StockItem = {
  sku: "CAM-RUN-BLA-M",
  productName: "Camiseta Running Endurance",
  categoryName: "Ropa",
  brandName: "Inka Athletic",
  locationId: "ALM-CEN",
  locationName: "Almacén Central Lima",
  onHand: 10,
  reserved: 1,
  blocked: 1,
  available: 8,
  threshold: 5,
  status: "DISPONIBLE",
  stockVersion: 1,
  updatedAt: "2026-10-17T12:00:00Z",
};

describe("MockCombosAvailabilityAdapter · Inventory compartido", () => {
  it("relee el stock de Inventory y refleja una recepción durante la sesión", async () => {
    const repository = new MockInventoryAdapter();
    // Exercise the same receiving operation exposed by the Inventory UI.
    const transfer = (await repository.getTransfers()).find((row) => row.id === "tr-running-bla-m")!;
    const inventory = repository as Pick<InventoryRepository, "getStockItems">;
    const adapter = new MockCombosAvailabilityAdapter({ inventory });

    await expect(adapter.readStocks([item.sku]))
      .resolves.toMatchObject([{ sku: item.sku, stock: 8 }]);

    await repository.receiveTransfer({
      transferId: transfer.id,
      quantityReceived: 5,
      disposition: "REINGRESAR_DISPONIBLE",
      finalReceipt: true,
      operationId: "6cc68c8e-3f91-4dc5-9c70-b9a46a1bd1e8",
      receivedAt: "2026-10-17T13:00:00Z",
    });
    await expect(adapter.readStocks([item.sku]))
      .resolves.toMatchObject([{ sku: item.sku, stock: 13 }]);
  });

  it("mantiene como desconocido un SKU sin registro en Inventory", async () => {
    const inventory = {
      getStockItems: async () => [],
    } as unknown as Pick<InventoryRepository, "getStockItems">;
    const adapter = new MockCombosAvailabilityAdapter({ inventory });

    await expect(adapter.readStocks(["SKU-SIN-INVENTARIO"]))
      .resolves.toMatchObject([{ stock: null }]);
  });
});
