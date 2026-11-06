import type { InventoryRepository } from "../services/inventoryRepository";
import { InventoryError } from "../services/inventoryErrors";
import { readMockInventoryCatalog } from "../../catalog/adapters/mockCatalogConsumers";
import {
  isTerminalTransferStatus,
  type DashboardFiltersQuery,
  type InventoryAlert,
  type InventoryBrandOption,
  type InventoryCategoryOption,
  type InventoryKpiSummary,
  type InventoryLocationOption,
  type LocationDistribution,
  type ReceiveTransferPayload,
  type StockFiltersQuery,
  type StockItem,
  type ThresholdConfig,
  type TransferFiltersQuery,
  type TransferItem,
} from "../services/inventoryTypes";
import {
  initialAlerts,
  initialStockItems,
  initialThresholds,
  initialTransfers,
} from "../mocks/inventoryFixtures";
import {
  isMockPersistenceAvailable,
  isRecord,
  publishMockChange,
  readMockState,
  saveMockState,
  subscribeExternalMockChanges,
} from "../../shared/mockState";

interface MockInventoryState {
  stockItems: StockItem[];
  thresholds: ThresholdConfig;
  transfers: TransferItem[];
  alerts: InventoryAlert[];
  processedOperations: [string, TransferItem][];
  processedOperationKeys: [string, string][];
  bulkOperations?: [string, { sku: string; quantity: number }][];
}

function isStockItemRecord(value: unknown): value is StockItem {
  return (
    isRecord(value) &&
    typeof value.sku === "string" &&
    value.sku.trim().length > 0 &&
    typeof value.locationId === "string" &&
    value.locationId.trim().length > 0 &&
    typeof value.onHand === "number" &&
    Number.isFinite(value.onHand) &&
    value.onHand >= 0 &&
    typeof value.reserved === "number" &&
    Number.isFinite(value.reserved) &&
    value.reserved >= 0 &&
    typeof value.blocked === "number" &&
    Number.isFinite(value.blocked) &&
    value.blocked >= 0 &&
    typeof value.available === "number" &&
    Number.isFinite(value.available) &&
    value.available >= 0
  );
}

function isTransferRecord(value: unknown): value is TransferItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.transferCode === "string" &&
    value.transferCode.trim().length > 0 &&
    typeof value.sku === "string" &&
    value.sku.trim().length > 0 &&
    typeof value.sourceLocationId === "string" &&
    value.sourceLocationId.trim().length > 0 &&
    typeof value.targetLocationId === "string" &&
    value.targetLocationId.trim().length > 0 &&
    typeof value.quantityShipped === "number" &&
    Number.isFinite(value.quantityShipped) &&
    value.quantityShipped >= 0 &&
    typeof value.quantityReceived === "number" &&
    Number.isFinite(value.quantityReceived) &&
    value.quantityReceived >= 0 &&
    typeof value.quantityPending === "number" &&
    Number.isFinite(value.quantityPending) &&
    value.quantityPending >= 0 &&
    (value.missingQuantity === undefined ||
      (typeof value.missingQuantity === "number" &&
        Number.isFinite(value.missingQuantity) &&
        value.missingQuantity >= 0)) &&
    typeof value.status === "string"
  );
}

function isThresholdConfig(value: unknown): value is ThresholdConfig {
  return (
    isRecord(value) &&
    typeof value.globalThreshold === "number" &&
    Number.isFinite(value.globalThreshold) &&
    value.globalThreshold >= 0 &&
    isRecord(value.skuOverrides) &&
    Object.values(value.skuOverrides).every(
      (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
    )
  );
}

function isMockInventoryState(value: unknown): value is MockInventoryState {
  return (
    isRecord(value) &&
    Array.isArray(value.stockItems) &&
    value.stockItems.every(isStockItemRecord) &&
    isThresholdConfig(value.thresholds) &&
    Array.isArray(value.transfers) &&
    value.transfers.every(isTransferRecord) &&
    Array.isArray(value.alerts) &&
    Array.isArray(value.processedOperations) &&
    value.processedOperations.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        isTransferRecord(entry[1]),
    ) &&
    Array.isArray(value.processedOperationKeys) &&
    value.processedOperationKeys.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length === 2 &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "string",
    ) &&
    (value.bulkOperations === undefined ||
      (Array.isArray(value.bulkOperations) &&
        value.bulkOperations.every(
          (entry) =>
            Array.isArray(entry) &&
            entry.length === 2 &&
            typeof entry[0] === "string" &&
            isRecord(entry[1]) &&
            typeof entry[1].sku === "string" &&
            typeof entry[1].quantity === "number",
        )))
  );
}

export class MockInventoryAdapter implements InventoryRepository {
  private stockItems: StockItem[] = JSON.parse(JSON.stringify(initialStockItems));
  private thresholds: ThresholdConfig = JSON.parse(JSON.stringify(initialThresholds));
  private transfers: TransferItem[] = JSON.parse(JSON.stringify(initialTransfers));
  private alerts: InventoryAlert[] = JSON.parse(JSON.stringify(initialAlerts));
  private processedOperations = new Map<string, TransferItem>();
  private processedOperationKeys = new Map<string, string>();
  private bulkOperations = new Map<string, { sku: string; quantity: number }>();
  private readonly persistEnabled: boolean;

  constructor(options: { persist?: boolean } = {}) {
    // Directly constructed adapters (tests, injection) stay isolated; only the demo
    // singleton opts into persistence explicitly.
    this.persistEnabled = options.persist === true && isMockPersistenceAvailable();
    if (this.persistEnabled) {
      const stored = readMockState<MockInventoryState>("inventory", isMockInventoryState);
      if (stored) {
        this.hydrate(stored);
      }
      subscribeExternalMockChanges("inventory", () => {
        const next = readMockState<MockInventoryState>("inventory", isMockInventoryState);
        if (!next) return;
        this.hydrate(next);
        publishMockChange("inventory");
      });
      subscribeExternalMockChanges("catalog", async () => {
        await this.refreshCatalogMetadata();
        publishMockChange("inventory");
      });
    }
  }

  private hydrate(stored: MockInventoryState): void {
    this.stockItems = stored.stockItems;
    this.thresholds = stored.thresholds;
    this.transfers = stored.transfers;
    this.alerts = stored.alerts;
    // Idempotency records must survive a reload as maps, never as derived balances.
    this.processedOperations = new Map(stored.processedOperations);
    this.processedOperationKeys = new Map(stored.processedOperationKeys);
    this.bulkOperations = new Map(stored.bulkOperations ?? []);
  }

  private persist(): boolean {
    let ok = true;
    if (this.persistEnabled) {
      ok = saveMockState("inventory", {
        stockItems: this.stockItems,
        thresholds: this.thresholds,
        transfers: this.transfers,
        alerts: this.alerts,
        processedOperations: [...this.processedOperations.entries()],
        processedOperationKeys: [...this.processedOperationKeys.entries()],
        bulkOperations: [...this.bulkOperations.entries()],
      } satisfies MockInventoryState);
    }
    publishMockChange("inventory");
    return ok;
  }

  private async refreshCatalogMetadata() {
    const metadata = await readMockInventoryCatalog();
    for (const item of this.stockItems) {
      const current = metadata.get(item.sku);
      if (current) Object.assign(item, current);
    }
    for (const transfer of this.transfers) {
      const current = metadata.get(transfer.sku);
      if (current) transfer.productName = current.productName;
    }
    let hasNewItems = false;
    for (const [sku, desc] of metadata) {
      const exists = this.stockItems.some((s) => s.sku === sku);
      if (!exists && desc.vendible) {
        const newItem: StockItem = {
          sku,
          productName: desc.productName,
          categoryName: desc.categoryName,
          brandName: desc.brandName,
          locationId: "ALM-CEN",
          locationName: "Almacén Central Lima",
          onHand: 0,
          reserved: 0,
          blocked: 0,
          available: 0,
          threshold:
            this.thresholds.skuOverrides[sku] ?? this.thresholds.globalThreshold,
          status: "AGOTADO",
          stockVersion: 0,
          updatedAt: new Date().toISOString(),
        };
        this.stockItems.push(newItem);
        hasNewItems = true;

        const existingTransfer = this.transfers.find((t) => t.sku === sku);
        if (!existingTransfer) {
          const newTransfer: TransferItem = {
            id: `TRF-${sku.replace(/[^A-Za-z0-9]/g, "-")}`,
            transferCode: `TRF-${sku}`,
            sku,
            productName: desc.productName,
            sourceLocationId: "ALM-NOR",
            sourceLocationName: "Almacén Regional Norte",
            targetLocationId: "ALM-CEN",
            targetLocationName: "Almacén Central Lima",
            quantityShipped: 25,
            quantityReceived: 0,
            quantityPending: 25,
            status: "EN_TRANSITO",
            shippedAt: new Date().toISOString(),
          };
          this.transfers.unshift(newTransfer);
        }
      }
    }
    if (hasNewItems && this.persistEnabled) {
      this.persist();
    }
    return metadata;
  }

  applyBulkStock(
    items: Array<{
      batchId?: string;
      rowId?: string | number;
      sku: string;
      productName: string;
      categoryName?: string;
      brandName?: string;
      stock?: number;
    }>,
    batchId?: string,
  ): void {
    for (const data of items) {
      const bId = data.batchId || batchId || "default-batch";
      const rId = data.rowId !== undefined ? data.rowId : "0";
      const operationKey = `${bId}:${rId}:INVENTARIO`;

      // 1. Buscar la clave de operación.
      const existingOp = this.bulkOperations.get(operationKey);
      const stockQty = data.stock ?? 0;

      // 2. Si existe con el mismo SKU y cantidad, devolver el resultado anterior sin sumar stock.
      if (existingOp) {
        if (existingOp.sku === data.sku && existingOp.quantity === stockQty) {
          continue;
        }
        // 3. Si existe con un SKU o cantidad diferente, rechazar la operación por conflicto.
        throw new InventoryError(
          "IDEMPOTENCY_CONFLICT",
          `Conflicto de idempotencia en la operación ${operationKey}: la clave ya fue registrada con SKU "${existingOp.sku}" y cantidad ${existingOp.quantity}, pero se recibió SKU "${data.sku}" y cantidad ${stockQty}.`,
        );
      }

      // 4. Si no existe, validar SKU y cantidad.
      if (!data.sku || !data.sku.trim()) {
        throw new InventoryError("VALIDACION", "El SKU es obligatorio para el registro de inventario.");
      }
      if (!Number.isFinite(stockQty) || stockQty < 0 || !Number.isInteger(stockQty)) {
        throw new InventoryError("CANTIDAD_INVALIDA", "La cantidad de stock inicial debe ser un número entero no negativo.");
      }

      // 5. Conservar una copia de los valores que se modificarán.
      const backupStockItems = JSON.parse(JSON.stringify(this.stockItems)) as StockItem[];
      const backupBulkOps = new Map(this.bulkOperations);

      // 6. Incrementar el stock.
      const existing = this.stockItems.find((s) => s.sku === data.sku);
      if (existing) {
        existing.productName = data.productName || existing.productName;
        if (data.categoryName) existing.categoryName = data.categoryName;
        if (data.brandName) existing.brandName = data.brandName;
        if (stockQty > 0) {
          existing.onHand += stockQty;
        }
        this.recalculateStockStatus(existing);
      } else {
        const created: StockItem = {
          sku: data.sku,
          productName: data.productName,
          categoryName: data.categoryName || "Calzado",
          brandName: data.brandName || "Inka Athletic",
          locationId: "ALM-CEN",
          locationName: "Almacén Central Lima",
          onHand: stockQty,
          reserved: 0,
          blocked: 0,
          available: stockQty,
          threshold:
            this.thresholds.skuOverrides[data.sku] ?? this.thresholds.globalThreshold,
          status: stockQty > 0 ? "DISPONIBLE" : "AGOTADO",
          stockVersion: 1,
          updatedAt: new Date().toISOString(),
        };
        this.stockItems.push(created);
      }

      // 7. Registrar la clave de operación.
      this.bulkOperations.set(operationKey, { sku: data.sku, quantity: stockQty });

      // 8. Guardar el estado completo de Inventory.
      const ok = this.persist();

      // 9. Si el almacenamiento falla, restaurar el stock y retirar la clave.
      if (!ok && this.persistEnabled) {
        this.stockItems = backupStockItems;
        this.bulkOperations = backupBulkOps;
        throw new InventoryError(
          "OPERATIVO",
          "No se pudo guardar el estado de inventario en el almacenamiento.",
        );
      }
      // 10. Solo devolver éxito cuando el guardado esté confirmado.
    }
  }

  private recalculateStockStatus(item: StockItem): void {
    const effectiveThreshold =
      this.thresholds.skuOverrides[item.sku] ?? this.thresholds.globalThreshold;
    item.threshold = effectiveThreshold;
    item.available = Math.max(item.onHand - item.reserved - item.blocked, 0);

    if (item.available === 0) {
      item.status = "AGOTADO";
    } else if (item.available <= effectiveThreshold) {
      item.status = "STOCK_BAJO";
    } else {
      item.status = "DISPONIBLE";
    }
  }

  private computeOperationIntent(payload: ReceiveTransferPayload): string {
    // Nota: la nota NO es parte de la intención, ya que puede cambiar en reintentos.
    // La intención se define por: transferId, quantityReceived, disposition, finalReceipt.
    return `${payload.transferId}|${payload.quantityReceived}|${payload.disposition}|${payload.finalReceipt}`;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private normalizeKey(val: string): string {
    return val.toUpperCase().replace(/[\s-]+/g, "_").trim();
  }

  // Catálogo SKU -> categoría/marca para resolver los filtros de traslados, que
  // no traen esos atributos en el propio traslado.
  private buildSkuCatalog(): Map<
    string,
    { productName: string; categoryName: string; brandName: string }
  > {
    const catalog = new Map<
      string,
      { productName: string; categoryName: string; brandName: string }
    >();
    for (const item of this.stockItems) {
      if (!catalog.has(item.sku)) {
        catalog.set(item.sku, {
          productName: item.productName,
          categoryName: item.categoryName,
          brandName: item.brandName,
        });
      }
    }
    return catalog;
  }

  // Criterio único de filtrado de traslados para el dashboard: destino, búsqueda
  // y categoría/marca por catálogo. Lo usan alertas y KPIs de traslado para no
  // contradecirse (hallazgo TAC-11).
  private matchesTransferFilters(
    transfer: TransferItem,
    filters: DashboardFiltersQuery | undefined,
    catalog: Map<string, { productName: string; categoryName: string; brandName: string }>,
  ): boolean {
    if (
      filters?.locationId &&
      filters.locationId !== "all" &&
      transfer.targetLocationId !== filters.locationId
    ) {
      return false;
    }

    const search = filters?.search?.toLowerCase().trim();
    if (
      search &&
      !transfer.sku.toLowerCase().includes(search) &&
      !(catalog.get(transfer.sku)?.productName ?? transfer.productName).toLowerCase().includes(search)
    ) {
      return false;
    }

    const catalogEntry = catalog.get(transfer.sku);

    if (filters?.category && filters.category !== "all") {
      const target = this.normalizeKey(filters.category);
      if (
        !catalogEntry ||
        (catalogEntry.categoryName !== filters.category &&
          this.normalizeKey(catalogEntry.categoryName) !== target)
      ) {
        return false;
      }
    }

    if (filters?.brand && filters.brand !== "all") {
      const target = this.normalizeKey(filters.brand);
      if (
        !catalogEntry ||
        (catalogEntry.brandName !== filters.brand &&
          this.normalizeKey(catalogEntry.brandName) !== target)
      ) {
        return false;
      }
    }

    return true;
  }

  private getOrCreateDestinationStockItem(transfer: TransferItem): StockItem {
    const existing = this.stockItems.find(
      (s) => s.sku === transfer.sku && s.locationId === transfer.targetLocationId,
    );
    if (existing) return existing;

    const reference = this.stockItems.find((s) => s.sku === transfer.sku);
    const created: StockItem = {
      sku: transfer.sku,
      productName: transfer.productName,
      categoryName: reference?.categoryName ?? "Sin categoría",
      brandName: reference?.brandName ?? "Sin marca",
      locationId: transfer.targetLocationId,
      locationName: transfer.targetLocationName,
      onHand: 0,
      reserved: 0,
      blocked: 0,
      available: 0,
      threshold:
        this.thresholds.skuOverrides[transfer.sku] ?? this.thresholds.globalThreshold,
      status: "AGOTADO",
      stockVersion: 0,
      updatedAt: transfer.shippedAt,
    };
    this.stockItems.push(created);
    return created;
  }

  private queryStockItems(filters?: StockFiltersQuery): StockItem[] {
    this.stockItems.forEach((item) => this.recalculateStockStatus(item));

    let result = [...this.stockItems];

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.sku.toLowerCase().includes(q) ||
          item.productName.toLowerCase().includes(q),
      );
    }

    if (filters?.category && filters.category !== "all") {
      const target = this.normalizeKey(filters.category);
      result = result.filter(
        (item) =>
          item.categoryName === filters.category ||
          this.normalizeKey(item.categoryName) === target,
      );
    }

    if (filters?.brand && filters.brand !== "all") {
      const target = this.normalizeKey(filters.brand);
      result = result.filter(
        (item) =>
          item.brandName === filters.brand ||
          this.normalizeKey(item.brandName) === target,
      );
    }

    if (filters?.locationId && filters.locationId !== "all") {
      result = result.filter((item) => item.locationId === filters.locationId);
    }

    if (filters?.status && filters.status !== "all") {
      result = result.filter((item) => item.status === filters.status);
    }

    return result;
  }

  async getStockItems(filters?: StockFiltersQuery): Promise<StockItem[]> {
    await this.refreshCatalogMetadata();
    return this.queryStockItems(filters).map(item => ({ ...item }));
  }

  async getStockDetail(
    sku: string,
    locationId: string,
  ): Promise<StockItem | null> {
    await this.refreshCatalogMetadata();
    const item = this.stockItems.find(
      (s) => s.sku === sku && s.locationId === locationId,
    );
    if (!item) return null;
    this.recalculateStockStatus(item);
    return { ...item };
  }

  async getThresholds(): Promise<ThresholdConfig> {
    return JSON.parse(JSON.stringify(this.thresholds));
  }

  async updateGlobalThreshold(threshold: number): Promise<ThresholdConfig> {
    if (threshold < 0 || !Number.isInteger(threshold)) {
      throw new InventoryError(
        "VALIDACION",
        "El umbral global debe ser un entero positivo o cero.",
      );
    }
    this.thresholds.globalThreshold = threshold;
    this.stockItems.forEach((item) => this.recalculateStockStatus(item));
    if (!this.persist() && this.persistEnabled) {
      throw new InventoryError(
        "OPERATIVO",
        "No se pudo guardar el cambio. Vuelve a intentarlo.",
      );
    }
    return JSON.parse(JSON.stringify(this.thresholds));
  }

  async updateSkuThreshold(
    sku: string,
    threshold: number,
  ): Promise<ThresholdConfig> {
    if (threshold < 0 || !Number.isInteger(threshold)) {
      throw new InventoryError(
        "VALIDACION",
        "El umbral por SKU debe ser un entero positivo o cero.",
      );
    }
    this.thresholds.skuOverrides[sku] = threshold;
    this.stockItems.forEach((item) => this.recalculateStockStatus(item));
    if (!this.persist() && this.persistEnabled) {
      throw new InventoryError(
        "OPERATIVO",
        "No se pudo guardar el cambio. Vuelve a intentarlo.",
      );
    }
    return JSON.parse(JSON.stringify(this.thresholds));
  }

  async getTransfers(filters?: TransferFiltersQuery): Promise<TransferItem[]> {
    const metadata = await this.refreshCatalogMetadata();
    let result = this.transfers.map(transfer => ({
      ...transfer,
      productName: metadata.get(transfer.sku)?.productName ?? transfer.productName,
    }));

    if (filters?.targetLocationId && filters.targetLocationId !== "all") {
      result = result.filter(
        (t) => t.targetLocationId === filters.targetLocationId,
      );
    }

    if (filters?.status && filters.status !== "all") {
      result = result.filter((t) => t.status === filters.status);
    }

    return result;
  }

  async receiveTransfer(payload: ReceiveTransferPayload): Promise<TransferItem> {
    // 1. Validación de formato de operation_id (UUID según OpenAPI)
    if (!payload.operationId || !this.isUuid(payload.operationId)) {
      throw new InventoryError(
        "VALIDACION",
        "El identificador de operación (operation_id) debe ser un UUID válido.",
      );
    }

    // 2. Validación de longitud de nota (máximo 500 caracteres según OpenAPI)
    if (payload.note && payload.note.length > 500) {
      throw new InventoryError(
        "VALIDACION",
        "La nota de recepción (note) no puede superar los 500 caracteres.",
      );
    }

    // 3. Validación de disposición permitida
    const validDispositions: ReceiveTransferPayload["disposition"][] = [
      "REINGRESAR_DISPONIBLE",
      "REINGRESAR_BLOQUEADO",
      "CONFIRMAR_MERMA",
    ];
    if (!validDispositions.includes(payload.disposition)) {
      throw new InventoryError(
        "DISPOSICION_RECEPCION_INVALIDA",
        "La disposición de recepción no es válida para la operación.",
      );
    }

    // 4. Verificación de Idempotencia
    const intent = this.computeOperationIntent(payload);
    const previousIntent = this.processedOperationKeys.get(payload.operationId);
    const alreadyProcessed = this.processedOperations.get(payload.operationId);

    // Si ya fue procesada con la misma identidad e intención: retornar sin modificar stock
    if (alreadyProcessed && previousIntent && previousIntent === intent) {
      return { ...alreadyProcessed };
    }

    // Si la misma identidad se reutiliza con intención diferente: conflicto de idempotencia
    if (alreadyProcessed && previousIntent && previousIntent !== intent) {
      throw new InventoryError(
        "IDEMPOTENCY_CONFLICT",
        "Idempotencia conflictiva: la misma operation_id fue reutilizada para otra intención.",
      );
    }

    // 5. Validación de existencia y estado del traslado
    const transfer = this.transfers.find((t) => t.id === payload.transferId);
    if (!transfer) {
      throw new InventoryError(
        "TRASLADO_NO_ENCONTRADO",
        `Traslado con ID ${payload.transferId} no encontrado.`,
      );
    }

    if (isTerminalTransferStatus(transfer.status)) {
      throw new InventoryError(
        "TRASLADO_NO_RECIBIBLE",
        "El traslado ya está cerrado o no admite nuevas recepciones.",
      );
    }

    // 6. Validación de cantidades
    if (
      !Number.isInteger(payload.quantityReceived) ||
      payload.quantityReceived <= 0
    ) {
      throw new InventoryError(
        "CANTIDAD_INVALIDA",
        "La cantidad recibida debe ser un número entero mayor que cero.",
      );
    }

    if (payload.quantityReceived > transfer.quantityPending) {
      throw new InventoryError(
        "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO",
        `La cantidad recibida (${payload.quantityReceived}) supera la cantidad pendiente (${transfer.quantityPending}).`,
      );
    }

    // 7. Aplicación de la recepción
    transfer.quantityReceived += payload.quantityReceived;
    transfer.quantityPending = Math.max(
      transfer.quantityShipped - transfer.quantityReceived,
      0,
    );

    if (transfer.quantityPending === 0) {
      transfer.status = "COMPLETADO";
      transfer.missingQuantity = 0;
    } else if (payload.finalReceipt) {
      const missing = transfer.quantityPending;
      transfer.status = "COMPLETADO_CON_DISCREPANCIA";
      transfer.missingQuantity = missing;
      transfer.quantityPending = 0;
      this.alerts.unshift({
        id: `alt-${Date.now()}`,
        severity: "error",
        title: `Discrepancia en recepción de traslado ${transfer.transferCode}`,
        message: `Traslado ${transfer.transferCode} cerrado con ${missing} unidades faltantes no recibidas para SKU ${transfer.sku}.`,
        actionLabel: "Ver traslados",
        targetRoute: "/inventario/traslados",
        transferId: transfer.id,
      });
    } else {
      transfer.status = "RECIBIDO_PARCIAL";
      transfer.missingQuantity = 0;
    }

    if (payload.note) {
      transfer.notes = payload.note;
    }

    // Solo las disposiciones de reingreso acreditan saldo físico; la merma no.
    if (payload.disposition !== "CONFIRMAR_MERMA") {
      const stockItem = this.getOrCreateDestinationStockItem(transfer);
      stockItem.onHand += payload.quantityReceived;
      if (payload.disposition === "REINGRESAR_BLOQUEADO") {
        stockItem.blocked += payload.quantityReceived;
      }
      stockItem.stockVersion += 1;
      stockItem.updatedAt = payload.receivedAt;
      this.recalculateStockStatus(stockItem);
    }

    const result: TransferItem = { ...transfer };
    this.processedOperations.set(payload.operationId, result);
    this.processedOperationKeys.set(payload.operationId, intent);
    if (!this.persist() && this.persistEnabled) {
      throw new InventoryError(
        "OPERATIVO",
        "No se pudo guardar el cambio. Vuelve a intentarlo.",
      );
    }
    return result;
  }

  async getDashboardKpis(
    filters?: DashboardFiltersQuery,
  ): Promise<InventoryKpiSummary> {
    await this.refreshCatalogMetadata();
    const items = this.queryStockItems({
      search: filters?.search,
      category: filters?.category,
      brand: filters?.brand,
      locationId: filters?.locationId,
      status: filters?.status,
    });

    // SALDOS: "sin datos" (null) cuando la selección no devuelve filas de stock.
    // El cero real queda reservado para cuando el dato existe y vale 0 (TAC-08).
    const hasStockData = items.length > 0;

    let availableUnits: number | null = null;
    let blockedUnits: number | null = null;
    let totalPhysicalUnits: number | null = null;
    let totalVendibleSkus: number | null = null;
    let skusAvailable: number | null = null;
    let skusLowStock: number | null = null;
    let skusOutOfStock: number | null = null;
    let reservedUnits: number | null = null;

    if (hasStockData) {
      availableUnits = items.reduce((acc, i) => acc + i.available, 0);
      blockedUnits = items.reduce((acc, i) => acc + i.blocked, 0);
      totalPhysicalUnits = items.reduce((acc, i) => acc + i.onHand, 0);
      reservedUnits = items.reduce((acc, i) => acc + i.reserved, 0);

      // KPIs por SKU coherentes con las alertas por ubicación: el SKU cuenta en
      // CADA estado para el que tenga al menos una ubicación, sin sumar saldos
      // que oculten el estado de otra (hallazgos TAC-06 y TAC-10).
      const availableSkus = new Set<string>();
      const lowStockSkus = new Set<string>();
      const outOfStockSkus = new Set<string>();
      const allSkus = new Set<string>();

      for (const item of items) {
        allSkus.add(item.sku);
        if (item.status === "AGOTADO") outOfStockSkus.add(item.sku);
        else if (item.status === "STOCK_BAJO") lowStockSkus.add(item.sku);
        else availableSkus.add(item.sku);
      }

      totalVendibleSkus = allSkus.size;
      skusAvailable = availableSkus.size;
      skusLowStock = lowStockSkus.size;
      skusOutOfStock = outOfStockSkus.size;
    }

    // TRASLADOS: mismos criterios que las alertas de discrepancia (destino,
    // búsqueda y catálogo del SKU), independientes del stock filtrado, para que
    // alerta y contador nunca se contradigan (hallazgo TAC-11). "Sin datos" solo
    // cuando no existe catálogo de traslados.
    const hasTransferData = this.transfers.length > 0;

    let totalPendingTransfers: number | null = null;
    let transfersInTransit: number | null = null;
    let transfersPartiallyReceived: number | null = null;
    let transfersWithDiscrepancy: number | null = null;

    if (hasTransferData) {
      const skuCatalog = this.buildSkuCatalog();
      const relatedTransfers = this.transfers.filter((transfer) =>
        this.matchesTransferFilters(transfer, filters, skuCatalog),
      );

      const inTransit = relatedTransfers.filter(
        (t) => t.status === "EN_TRANSITO",
      ).length;
      const partial = relatedTransfers.filter(
        (t) => t.status === "RECIBIDO_PARCIAL",
      ).length;
      const discrepancies = relatedTransfers.filter(
        (t) => t.status === "COMPLETADO_CON_DISCREPANCIA",
      ).length;

      totalPendingTransfers = inTransit + partial;
      transfersInTransit = inTransit;
      transfersPartiallyReceived = partial;
      transfersWithDiscrepancy = discrepancies;
    }

    return {
      availableUnits,
      blockedUnits,
      totalPhysicalUnits,
      totalVendibleSkus,
      skusAvailable,
      skusLowStock,
      skusOutOfStock,
      reservedUnits,
      totalPendingTransfers,
      transfersInTransit,
      transfersPartiallyReceived,
      transfersWithDiscrepancy,
      generatedAt: new Date().toISOString(),
    };
  }

  async getDashboardAlerts(
    filters?: DashboardFiltersQuery,
  ): Promise<InventoryAlert[]> {
    await this.refreshCatalogMetadata();
    const items = this.queryStockItems({
      search: filters?.search,
      category: filters?.category,
      brand: filters?.brand,
      locationId: filters?.locationId,
      status: filters?.status,
    });

    const alerts: InventoryAlert[] = [];

    // 1. Alertas dinámicas de stock bajo y agotado
    for (const item of items) {
      const effectiveThreshold =
        this.thresholds.skuOverrides[item.sku] ?? this.thresholds.globalThreshold;
      const isLowStock = item.available > 0 && item.available <= effectiveThreshold;
      const isOutOfStock = item.available === 0;

      if (isOutOfStock) {
        alerts.push({
          id: `out-${item.sku}-${item.locationId}`,
          severity: "error",
          title: `Quiebre de stock: ${item.productName}`,
          message: `${item.productName} (${item.sku}) en ${item.locationName} no tiene unidades disponibles.`,
          actionLabel: "Ver detalle",
          targetRoute: `/inventario?search=${item.sku}&locationId=${item.locationId}`,
          sku: item.sku,
          locationId: item.locationId,
        });
      } else if (isLowStock) {
        alerts.push({
          id: `low-${item.sku}-${item.locationId}`,
          severity: "warning",
          title: `Stock bajo: ${item.productName}`,
          message: `${item.productName} (${item.sku}) en ${item.locationName} tiene ${item.available} unidades, debajo del umbral de ${effectiveThreshold}.`,
          actionLabel: "Ver detalle",
          targetRoute: `/inventario?search=${item.sku}&locationId=${item.locationId}`,
          sku: item.sku,
          locationId: item.locationId,
        });
      }
    }

    // 2. Alertas de discrepancias en traslados cerrados. No dependen del saldo
    // filtrado del destino (una merma con cierre final puede no dejar saldo allí)
    // y usan los MISMOS criterios que el KPI de discrepancias para no
    // contradecirse (hallazgos TAC-07 y TAC-11).
    const skuCatalog = this.buildSkuCatalog();

    for (const transfer of this.transfers) {
      if (transfer.status !== "COMPLETADO_CON_DISCREPANCIA") continue;
      if (!this.matchesTransferFilters(transfer, filters, skuCatalog)) continue;

      const existingAlert = alerts.find(
        (a) => a.transferId === transfer.id && a.severity === "error",
      );
      if (!existingAlert) {
        alerts.push({
          id: `disc-${transfer.id}`,
          severity: "error",
          title: `Discrepancia en recepción de traslado ${transfer.transferCode}`,
          message: `Traslado ${transfer.transferCode} cerrado con ${transfer.quantityPending} unidades faltantes no recibidas para SKU ${transfer.sku}.`,
          actionLabel: "Ver traslados",
          targetRoute: "/inventario/traslados",
          transferId: transfer.id,
        });
      }
    }

    // Deduplicar usando identidad correcta: SKU+ubicación para stock, transferId para discrepancias
    const seen = new Set<string>();
    return alerts.filter((alt) => {
      const key = alt.transferId
        ? `transfer:${alt.transferId}`
        : alt.sku && alt.locationId
          ? `stock:${alt.sku}:${alt.locationId}`
          : alt.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async getLocationDistribution(
    filters?: DashboardFiltersQuery,
  ): Promise<LocationDistribution[]> {
    await this.refreshCatalogMetadata();
    const map = new Map<string, LocationDistribution>();

    for (const item of this.queryStockItems({
      search: filters?.search,
      category: filters?.category,
      brand: filters?.brand,
      locationId: filters?.locationId,
      status: filters?.status,
    })) {
      let dist = map.get(item.locationId);
      if (!dist) {
        dist = {
          locationId: item.locationId,
          locationName: item.locationName,
          onHandTotal: 0,
          reservedTotal: 0,
          blockedTotal: 0,
          availableTotal: 0,
          skusAvailableCount: 0,
          skusLowStockCount: 0,
          skusOutOfStockCount: 0,
        };
        map.set(item.locationId, dist);
      }
      dist.onHandTotal += item.onHand;
      dist.reservedTotal += item.reserved;
      dist.blockedTotal = (dist.blockedTotal ?? 0) + item.blocked;
      dist.availableTotal += item.available;
      if (item.status === "DISPONIBLE") dist.skusAvailableCount++;
      else if (item.status === "STOCK_BAJO") dist.skusLowStockCount++;
      else if (item.status === "AGOTADO") dist.skusOutOfStockCount++;
    }

return Array.from(map.values());
  }

  async getCategories(): Promise<InventoryCategoryOption[]> {
    await this.refreshCatalogMetadata();
    const categories = new Map<string, InventoryCategoryOption>();
    for (const item of this.stockItems) {
      if (!categories.has(item.categoryName)) {
        const id = item.categoryName
          .toUpperCase()
          .replace(/[\s-]+/g, "_")
          .trim();
        categories.set(item.categoryName, {
          id,
          name: item.categoryName,
          active: true,
        });
      }
    }
    return Array.from(categories.values());
  }

  async getBrands(): Promise<InventoryBrandOption[]> {
    await this.refreshCatalogMetadata();
    const brands = new Map<string, InventoryBrandOption>();
    for (const item of this.stockItems) {
      if (!brands.has(item.brandName)) {
        const id = item.brandName
          .toUpperCase()
          .replace(/[\s-]+/g, "_")
          .trim();
        brands.set(item.brandName, {
          id,
          name: item.brandName,
          active: true,
        });
      }
    }
    return Array.from(brands.values());
  }

  async getLocations(): Promise<InventoryLocationOption[]> {
    const locations = new Map<string, InventoryLocationOption>();
    for (const item of this.stockItems) {
      if (!locations.has(item.locationName)) {
        locations.set(item.locationName, {
          id: item.locationId,
          name: item.locationName,
          active: true,
        });
      }
    }
    return Array.from(locations.values());
  }
}

export const sharedMockInventoryAdapter = new MockInventoryAdapter({ persist: true });
