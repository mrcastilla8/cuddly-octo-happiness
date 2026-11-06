import type { InventoryRepository } from "../../src/features/inventory/services/inventoryRepository";
import type {
  DashboardFiltersQuery,
  InventoryAlert,
  InventoryBrandOption,
  InventoryCategoryOption,
  InventoryKpiSummary,
  InventoryLocationOption,
  LocationDistribution,
  ReceiveTransferPayload,
  StockFiltersQuery,
  StockItem,
  ThresholdConfig,
  TransferFiltersQuery,
  TransferItem,
} from "../../src/features/inventory/services/inventoryTypes";
import { notifyInventoryChanged } from "../../src/features/inventory/services/inventoryEvents";
import { InventoryError } from "../../src/features/inventory/services/inventoryErrors";

export interface AlternateInventoryAudit {
  calls: { operation: string; args?: unknown }[];
  failRead: boolean;
  failReceive: boolean;
  empty: boolean;
  failCategories: boolean;
  failBrands: boolean;
  failLocations: boolean;
}

// Indicadores "sin datos": se usan cuando no hay datos para la selección, para
// no reportar un cero inexistente (hallazgo TAC-08).
const NO_DATA_KPIS: InventoryKpiSummary = {
  availableUnits: null,
  blockedUnits: null,
  totalPhysicalUnits: null,
  totalVendibleSkus: null,
  skusAvailable: null,
  skusLowStock: null,
  skusOutOfStock: null,
  reservedUnits: null,
  totalPendingTransfers: null,
  transfersInTransit: null,
  transfersPartiallyReceived: null,
  transfersWithDiscrepancy: null,
};

export const alternateInventoryStock: StockItem[] = [
  {
    sku: "ALT-RUN-41-BLU",
    productName: "Zapatilla Alternate Trail Runner",
    categoryName: "Calzado",
    brandName: "Inka Athletics",
    locationId: "ALT-LOC-01",
    locationName: "Centro de Distribucion Arequipa",
    onHand: 50,
    reserved: 10,
    blocked: 5,
    available: 35,
    threshold: 15,
    status: "DISPONIBLE",
    stockVersion: 1,
    updatedAt: "2026-10-12T10:00:00Z",
  },
  {
    sku: "ALT-POL-M-RED",
    productName: "Polo Alternate Performance",
    categoryName: "Ropa Deportiva",
    brandName: "Inka Athletics",
    locationId: "ALT-LOC-01",
    locationName: "Centro de Distribucion Arequipa",
    onHand: 12,
    reserved: 2,
    blocked: 0,
    available: 10,
    threshold: 10,
    status: "STOCK_BAJO",
    stockVersion: 1,
    updatedAt: "2026-10-12T10:00:00Z",
  },
  {
    sku: "ALT-GOR-U-BLK",
    productName: "Gorra Alternate DryFit",
    categoryName: "Accesorios",
    brandName: "Inka Athletics",
    locationId: "ALT-LOC-02",
    locationName: "Tienda Cusco Imperial",
    onHand: 5,
    reserved: 5,
    blocked: 0,
    available: 0,
    threshold: 5,
    status: "AGOTADO",
    stockVersion: 1,
    updatedAt: "2026-10-12T10:00:00Z",
  },
];

export const alternateInventoryTransfers: TransferItem[] = [
  {
    id: "alt-tr-901",
    transferCode: "TR-ALT-901",
    sku: "ALT-RUN-41-BLU",
    productName: "Zapatilla Alternate Trail Runner",
    sourceLocationId: "ALT-LOC-01",
    sourceLocationName: "Centro de Distribucion Arequipa",
    targetLocationId: "ALT-LOC-02",
    targetLocationName: "Tienda Cusco Imperial",
    quantityShipped: 20,
    quantityReceived: 0,
    quantityPending: 20,
    status: "EN_TRANSITO",
    shippedAt: "2026-10-11T08:00:00Z",
  },
];

export class AlternateInventoryRepository implements InventoryRepository {
  readonly audit: AlternateInventoryAudit = {
    calls: [],
    failRead: false,
    failReceive: false,
    empty: false,
    failCategories: false,
    failBrands: false,
    failLocations: false,
  };

  private stock: StockItem[] = JSON.parse(JSON.stringify(alternateInventoryStock));
  private transfers: TransferItem[] = JSON.parse(JSON.stringify(alternateInventoryTransfers));
  private thresholds: ThresholdConfig = {
    globalThreshold: 10,
    skuOverrides: { "ALT-RUN-41-BLU": 15 },
  };
  private alerts: InventoryAlert[] = [];
  private processedOperations = new Map<string, TransferItem>();
  private processedOperationKeys = new Map<string, string>();

  private record(operation: string, args?: unknown): void {
    this.audit.calls.push({ operation, args });
  }

  private normalizeKey(val: string): string {
    return val.toUpperCase().replace(/[\s-]+/g, "_").trim();
  }

  // Catálogo SKU -> categoría/marca para resolver los filtros de traslados.
  private buildSkuCatalog(): Map<
    string,
    { categoryName: string; brandName: string }
  > {
    const catalog = new Map<
      string,
      { categoryName: string; brandName: string }
    >();
    for (const item of this.stock) {
      if (!catalog.has(item.sku)) {
        catalog.set(item.sku, {
          categoryName: item.categoryName,
          brandName: item.brandName,
        });
      }
    }
    return catalog;
  }

  // Criterio único de filtrado de traslados para el dashboard: destino, búsqueda
  // y categoría/marca por catálogo. Lo comparten alertas y KPIs para no
  // contradecirse (hallazgo TAC-11).
  private matchesTransferFilters(
    transfer: TransferItem,
    filters: DashboardFiltersQuery | undefined,
    catalog: Map<string, { categoryName: string; brandName: string }>,
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
      !transfer.productName.toLowerCase().includes(search)
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

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private computeOperationIntent(payload: ReceiveTransferPayload): string {
    // Nota: la nota NO es parte de la intencin, ya que puede cambiar en reintentos.
    // La intencin se define por: transferId, quantityReceived, disposition, finalReceipt.
    return `${payload.transferId}|${payload.quantityReceived}|${payload.disposition}|${payload.finalReceipt}`;
  }

  private isTerminalTransferStatus(status: TransferItem["status"]): boolean {
    return status === "COMPLETADO" || status === "COMPLETADO_CON_DISCREPANCIA";
  }

  private getOrCreateDestinationStockItem(transfer: TransferItem): StockItem {
    const existing = this.stock.find(
      (s) => s.sku === transfer.sku && s.locationId === transfer.targetLocationId,
    );
    if (existing) return existing;

    const reference = this.stock.find((s) => s.sku === transfer.sku);
    const created: StockItem = {
      sku: transfer.sku,
      productName: transfer.productName,
      categoryName: reference?.categoryName ?? "Sin categora",
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
    this.stock.push(created);
    return created;
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

  async getStockItems(filters?: StockFiltersQuery): Promise<StockItem[]> {
    this.record("getStockItems", filters);
    if (this.audit.failRead) {
      throw new Error("Error controlado en AlternateInventoryRepository.getStockItems");
    }
    if (this.audit.empty) {
      return [];
    }
    let res = [...this.stock];
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      res = res.filter(
        (i) => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q),
      );
    }
    if (filters?.locationId && filters.locationId !== "all") {
      res = res.filter((i) => i.locationId === filters.locationId);
    }
    if (filters?.status && filters.status !== "all") {
      res = res.filter((i) => i.status === filters.status);
    }
    return res;
  }

  async getStockDetail(sku: string, locationId: string): Promise<StockItem | null> {
    this.record("getStockDetail", { sku, locationId });
    if (this.audit.failRead) {
      throw new Error("Error controlado en AlternateInventoryRepository.getStockDetail");
    }
    return this.stock.find((i) => i.sku === sku && i.locationId === locationId) ?? null;
  }

  async getThresholds(): Promise<ThresholdConfig> {
    this.record("getThresholds");
    if (this.audit.failRead) {
      throw new Error("Error controlado en AlternateInventoryRepository.getThresholds");
    }
    return JSON.parse(JSON.stringify(this.thresholds));
  }

  async updateGlobalThreshold(threshold: number): Promise<ThresholdConfig> {
    this.record("updateGlobalThreshold", threshold);
    this.thresholds.globalThreshold = threshold;
    notifyInventoryChanged();
    return JSON.parse(JSON.stringify(this.thresholds));
  }

  async updateSkuThreshold(sku: string, threshold: number): Promise<ThresholdConfig> {
    this.record("updateSkuThreshold", { sku, threshold });
    this.thresholds.skuOverrides[sku] = threshold;
    notifyInventoryChanged();
    return JSON.parse(JSON.stringify(this.thresholds));
  }

  async getTransfers(filters?: TransferFiltersQuery): Promise<TransferItem[]> {
    this.record("getTransfers", filters);
    if (this.audit.failRead) {
      throw new Error("Error controlado en AlternateInventoryRepository.getTransfers");
    }
    if (this.audit.empty) {
      return [];
    }
    let res = [...this.transfers];
    if (filters?.targetLocationId && filters.targetLocationId !== "all") {
      res = res.filter((t) => t.targetLocationId === filters.targetLocationId);
    }
    if (filters?.status && filters.status !== "all") {
      res = res.filter((t) => t.status === filters.status);
    }
    return res;
  }

  async receiveTransfer(payload: ReceiveTransferPayload): Promise<TransferItem> {
    this.record("receiveTransfer", payload);
    if (this.audit.failReceive) {
      throw new InventoryError("VALIDACION", "Error controlado en AlternateInventoryRepository.receiveTransfer");
    }

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

    if (this.isTerminalTransferStatus(transfer.status)) {
      throw new InventoryError(
        "TRASLADO_NO_RECIBIBLE",
        "El traslado ya está cerrado o no admite nuevas recepciones.",
      );
    }

    // 6. Validacin de cantidades
    if (
      !Number.isInteger(payload.quantityReceived) ||
      payload.quantityReceived <= 0
    ) {
      throw new InventoryError(
        "CANTIDAD_INVALIDA",
        "La cantidad recibida debe ser un nmero entero mayor que cero.",
      );
    }

    if (payload.quantityReceived > transfer.quantityPending) {
      throw new InventoryError(
        "CANTIDAD_RECIBIDA_EXCEDE_TRASLADO",
        `La cantidad recibida (${payload.quantityReceived}) supera la cantidad pendiente (${transfer.quantityPending}).`,
      );
    }

    // 7. Aplicacin de la recepcin
    transfer.quantityReceived += payload.quantityReceived;
    transfer.quantityPending = Math.max(
      transfer.quantityShipped - transfer.quantityReceived,
      0,
    );

    if (transfer.quantityPending === 0) {
      transfer.status = "COMPLETADO";
    } else if (payload.finalReceipt) {
      transfer.status = "COMPLETADO_CON_DISCREPANCIA";
      this.alerts.unshift({
        id: `alt-${Date.now()}`,
        severity: "error",
        title: `Discrepancia en recepcin de traslado ${transfer.transferCode}`,
        message: `Traslado ${transfer.transferCode} cerrado con ${transfer.quantityPending} unidades faltantes no recibidas para SKU ${transfer.sku}.`,
        actionLabel: "Ver traslados",
        targetRoute: "/inventario/traslados",
        transferId: transfer.id,
      });
    } else {
      transfer.status = "RECIBIDO_PARCIAL";
    }

    if (payload.note) {
      transfer.notes = payload.note;
    }

    // Solo las disposiciones de reingreso acreditan saldo fsico; la merma no.
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
    notifyInventoryChanged();
    return result;
  }

  async getDashboardKpis(
    filters?: DashboardFiltersQuery,
  ): Promise<InventoryKpiSummary> {
    this.record("getDashboardKpis", filters);
    if (this.audit.failRead) {
      throw new Error("Error controlado en AlternateInventoryRepository.getDashboardKpis");
    }
    if (this.audit.empty) {
      return { ...NO_DATA_KPIS };
    }
    const items = await this.getStockItems(filters);
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
      availableUnits = items.reduce((a, b) => a + b.available, 0);
      blockedUnits = items.reduce((a, b) => a + b.blocked, 0);
      totalPhysicalUnits = items.reduce((a, b) => a + b.onHand, 0);
      reservedUnits = items.reduce((a, b) => a + b.reserved, 0);

      // KPIs por SKU coherentes con las alertas por ubicación: el SKU cuenta en
      // cada estado para el que tenga alguna ubicación (hallazgos TAC-06 y TAC-10).
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

    // Traslados: mismos criterios que las alertas (hallazgo TAC-11).
    let totalPendingTransfers: number | null = null;
    let transfersInTransit: number | null = null;
    let transfersPartiallyReceived: number | null = null;
    let transfersWithDiscrepancy: number | null = null;

    if (this.transfers.length > 0) {
      const catalog = this.buildSkuCatalog();
      const relatedTransfers = this.transfers.filter((transfer) =>
        this.matchesTransferFilters(transfer, filters, catalog),
      );
      const inTransit = relatedTransfers.filter(
        (t) => t.status === "EN_TRANSITO",
      ).length;
      const partiallyReceived = relatedTransfers.filter(
        (t) => t.status === "RECIBIDO_PARCIAL",
      ).length;
      const discrepancies = relatedTransfers.filter(
        (t) => t.status === "COMPLETADO_CON_DISCREPANCIA",
      ).length;

      totalPendingTransfers = inTransit + partiallyReceived;
      transfersInTransit = inTransit;
      transfersPartiallyReceived = partiallyReceived;
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
    };
  }

  async getDashboardAlerts(
    filters?: DashboardFiltersQuery,
  ): Promise<InventoryAlert[]> {
    this.record("getDashboardAlerts", filters);
    if (this.audit.failRead) {
      throw new Error("Error controlado en AlternateInventoryRepository.getDashboardAlerts");
    }
    if (this.audit.empty) {
      return [];
    }
    const items = await this.getStockItems(filters);
    const alerts: InventoryAlert[] = [];
    for (const item of items) {
      if (item.status === "AGOTADO") {
        alerts.push({
          id: `alt-out-${item.sku}`,
          severity: "error",
          title: `Quiebre de stock: ${item.sku}`,
          message: `${item.productName} sin unidades disponibles.`,
          actionLabel: "Ver detalle",
          targetRoute: `/inventario?search=${item.sku}&locationId=${item.locationId}`,
          sku: item.sku,
          locationId: item.locationId,
        });
      } else if (item.status === "STOCK_BAJO") {
        alerts.push({
          id: `alt-low-${item.sku}`,
          severity: "warning",
          title: `Stock bajo: ${item.sku}`,
          message: `${item.productName} tiene existencias por debajo del umbral.`,
          actionLabel: "Ver detalle",
          targetRoute: `/inventario?search=${item.sku}&locationId=${item.locationId}`,
          sku: item.sku,
          locationId: item.locationId,
        });
      }
    }

    // Alertas de discrepancia derivadas del traslado (destino), sin depender
    // del saldo filtrado del destino y con el mismo criterio que el KPI de
    // discrepancias (hallazgos TAC-07 y TAC-11).
    const skuCatalog = this.buildSkuCatalog();
    for (const transfer of this.transfers) {
      if (transfer.status !== "COMPLETADO_CON_DISCREPANCIA") continue;
      if (!this.matchesTransferFilters(transfer, filters, skuCatalog)) continue;
      if (alerts.some((a) => a.transferId === transfer.id)) continue;
      alerts.push({
        id: `alt-disc-${transfer.id}`,
        severity: "error",
        title: `Discrepancia en recepción de traslado ${transfer.transferCode}`,
        message: `Traslado ${transfer.transferCode} cerrado con ${transfer.quantityPending} unidades faltantes no recibidas para SKU ${transfer.sku}.`,
        actionLabel: "Ver traslados",
        targetRoute: "/inventario/traslados",
        transferId: transfer.id,
      });
    }

    return alerts;
  }

  async getLocationDistribution(
    filters?: DashboardFiltersQuery,
  ): Promise<LocationDistribution[]> {
    this.record("getLocationDistribution", filters);
    if (this.audit.failRead) {
      throw new Error("Error controlado en AlternateInventoryRepository.getLocationDistribution");
    }
    if (this.audit.empty) {
      return [];
    }
    const items = await this.getStockItems(filters);
    const map = new Map<string, LocationDistribution>();
    for (const item of items) {
      let d = map.get(item.locationId);
      if (!d) {
        d = {
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
        map.set(item.locationId, d);
      }
      d.onHandTotal += item.onHand;
      d.reservedTotal += item.reserved;
      d.blockedTotal = (d.blockedTotal ?? 0) + item.blocked;
      d.availableTotal += item.available;
      if (item.status === "DISPONIBLE") d.skusAvailableCount++;
      else if (item.status === "STOCK_BAJO") d.skusLowStockCount++;
      else if (item.status === "AGOTADO") d.skusOutOfStockCount++;
    }
    return Array.from(map.values());
  }

  async getCategories(): Promise<InventoryCategoryOption[]> {
    this.record("getCategories");
    if (this.audit.failCategories) {
      throw new Error(
        "Error controlado en AlternateInventoryRepository.getCategories",
      );
    }
    const categories = new Map<string, InventoryCategoryOption>();
    for (const item of this.stock) {
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
    this.record("getBrands");
    if (this.audit.failBrands) {
      throw new Error(
        "Error controlado en AlternateInventoryRepository.getBrands",
      );
    }
    const brands = new Map<string, InventoryBrandOption>();
    for (const item of this.stock) {
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
    if (this.audit.failLocations) {
      throw new Error(
        "Error controlado en AlternateInventoryRepository.getLocations",
      );
    }
    const locations = new Map<string, InventoryLocationOption>();
    for (const item of this.stock) {
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
