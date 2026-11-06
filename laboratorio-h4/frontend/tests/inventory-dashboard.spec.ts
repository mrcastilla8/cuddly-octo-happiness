import { test, expect, type Page } from "@playwright/test";
import { MockInventoryAdapter } from "../src/features/inventory/adapters/mockInventoryAdapter";
import type { ReceiveTransferPayload } from "../src/features/inventory/services/inventoryTypes";

// Regresiones de la auditoría funcional de MK-015/MK-016:
//   TAC-06 (P1) KPI por SKU en varias ubicaciones no debe ocultar stock bajo.
//   TAC-07 (P1) Alerta de discrepancia por destino con merma sin saldo.
//   TAC-08 (P2) Distinguir KPI "sin datos" (null) de valor real cero (0).
//   TAC-09 (P2) Mostrar errores parciales de categorías/marcas en los filtros.
//   TAC-10 (P1) KPI por ubicación: agotado en una, disponible en otra.
//   TAC-11 (P1) Coherencia entre alerta y contador de discrepancias.
//   TAC-12 (P2) Reintentar filtros sin recargar la página.
//   TAC-13 (P2) Aclarar que los estados por SKU no son mutuamente excluyentes.
//   TAC-14 (P2) Incluir el error de ubicaciones en el aviso parcial y reintentarlo.

const { describe, beforeEach } = test;
const it = test;

const OPERATION_IDS = {
  tac06: "123e4567-e89b-12d3-a456-426614174000",
  tac07: "123e4567-e89b-12d3-a456-426614174001",
  tac10: "123e4567-e89b-12d3-a456-426614174002",
  tac11: "123e4567-e89b-12d3-a456-426614174003",
} as const;

function reception(
  overrides: Partial<ReceiveTransferPayload> & Pick<ReceiveTransferPayload, "operationId">,
): ReceiveTransferPayload {
  return {
    transferId: "tr-002",
    quantityReceived: 1,
    disposition: "REINGRESAR_DISPONIBLE",
    finalReceipt: false,
    receivedAt: "2026-10-16T12:00:00Z",
    ...overrides,
  };
}

describe("Auditoría MK-016 · regresiones TAC-06…TAC-14", () => {
  describe("TAC-06 (P1) · KPI por SKU en varias ubicaciones", () => {
    let adapter: MockInventoryAdapter;

    beforeEach(() => {
      adapter = new MockInventoryAdapter();
    });

    it("cuenta como stock bajo al SKU con una ubicación bajo umbral aunque otra tenga excedente", async () => {
      const before = await adapter.getDashboardKpis();

      // POL-RUN-M-BLU tiene excedente en ALM-CEN (45). Se recibe poco (2) en
      // RET-SAN, que no tenía saldo: allí queda bajo umbral.
      await adapter.receiveTransfer(
        reception({
          transferId: "tr-002",
          quantityReceived: 2,
          disposition: "REINGRESAR_DISPONIBLE",
          finalReceipt: false,
          operationId: OPERATION_IDS.tac06,
        }),
      );

      const after = await adapter.getDashboardKpis();

      // No debe ocultarse el stock bajo de RET-SAN por el saldo de ALM-CEN.
      expect(after.skusLowStock).toBe((before.skusLowStock ?? 0) + 1);
      // El mismo SKU sigue disponible en ALM-CEN (coherencia por ubicación).
      expect(after.skusAvailable).toBe(before.skusAvailable);
    });
  });

  describe("TAC-10 (P1) · KPI por ubicación: agotado en una, disponible en otra", () => {
    let adapter: MockInventoryAdapter;

    beforeEach(() => {
      adapter = new MockInventoryAdapter();
    });

    it("cuenta el SKU como agotado donde no tiene saldo sin ocultar su disponibilidad en otra", async () => {
      const before = await adapter.getDashboardKpis();

      // En RET-SAN se recibe como bloqueado: el físico sube pero el disponible
      // queda en 0 (AGOTADO allí). En ALM-CEN el SKU sigue disponible.
      await adapter.receiveTransfer(
        reception({
          transferId: "tr-002",
          quantityReceived: 5,
          disposition: "REINGRESAR_BLOQUEADO",
          finalReceipt: false,
          operationId: OPERATION_IDS.tac10,
        }),
      );

      const after = await adapter.getDashboardKpis();

      // Coherente con la alerta "Quiebre de stock" por ubicación.
      expect(after.skusOutOfStock).toBe((before.skusOutOfStock ?? 0) + 1);
      // Y el SKU no se oculta donde sí tiene stock.
      expect(after.skusAvailable).toBe(before.skusAvailable);
    });
  });

  describe("TAC-07 (P1) · Alerta de discrepancia filtrada por destino", () => {
    let adapter: MockInventoryAdapter;

    beforeEach(() => {
      adapter = new MockInventoryAdapter();
    });

    it("muestra la discrepancia al filtrar por el destino aunque la merma no deje saldo allí", async () => {
      // tr-002 (POL-RUN-M-BLU) se recibe como MERMA con cierre final y faltante:
      // el destino RET-SAN queda sin saldo del SKU, pero la discrepancia existe.
      await adapter.receiveTransfer(
        reception({
          transferId: "tr-002",
          quantityReceived: 10,
          disposition: "CONFIRMAR_MERMA",
          finalReceipt: true,
          operationId: OPERATION_IDS.tac07,
        }),
      );

      const alerts = await adapter.getDashboardAlerts({ locationId: "RET-SAN" });

      expect(alerts.some((alert) => alert.transferId === "tr-002")).toBe(true);
    });
  });

  describe("TAC-11 (P1) · Coherencia entre alerta y contador de discrepancias", () => {
    let adapter: MockInventoryAdapter;

    beforeEach(() => {
      adapter = new MockInventoryAdapter();
    });

    it("el contador coincide con la alerta al filtrar por el destino, sin 0 ni 'sin datos'", async () => {
      await adapter.receiveTransfer(
        reception({
          transferId: "tr-002",
          quantityReceived: 10,
          disposition: "CONFIRMAR_MERMA",
          finalReceipt: true,
          operationId: OPERATION_IDS.tac11,
        }),
      );

      const filters = { locationId: "RET-SAN" };
      const alerts = await adapter.getDashboardAlerts(filters);
      const kpis = await adapter.getDashboardKpis(filters);

      const discrepancyAlerts = alerts.filter(
        (alert) => alert.transferId === "tr-002",
      );

      expect(discrepancyAlerts.length).toBe(1);
      // El KPI no puede ser 0 ni "sin datos" si la alerta está visible.
      expect(kpis.transfersWithDiscrepancy).toBe(discrepancyAlerts.length);
    });
  });

  describe("TAC-08 (P2) · KPI sin datos vs valor real cero", () => {
    let adapter: MockInventoryAdapter;

    beforeEach(() => {
      adapter = new MockInventoryAdapter();
    });

    it("devuelve null (sin datos) en los saldos cuando no hay datos para la selección", async () => {
      const kpis = await adapter.getDashboardKpis({ search: "SKU-INEXISTENTE-XYZ" });

      expect(kpis.availableUnits).toBeNull();
      expect(kpis.skusLowStock).toBeNull();
      // El catálogo de traslados sí existe: su contador es un cero real, no "sin datos".
      expect(kpis.transfersWithDiscrepancy).toBe(0);
      expect(kpis.transfersInTransit).toBe(0);
    });

    it("devuelve 0 (cero real) cuando el dato existe y vale cero", async () => {
      const kpis = await adapter.getDashboardKpis({ search: "MED-CP-U-BLK" });

      expect(kpis.skusLowStock).toBe(0);
      expect(kpis.transfersWithDiscrepancy).toBe(0);
      expect(kpis.skusOutOfStock).toBe(1);
    });

    it("la UI muestra 'Sin datos' (no 0) cuando el dashboard no tiene datos", async ({
      page,
    }) => {
      await page.goto(
        "/tests/harness/inventory-adapter.html?path=/inventario/dashboard&empty=1",
      );

      await expect(
        page.getByRole("heading", { name: "Resumen de indicadores clave" }),
      ).toBeVisible();
      await expect(page.getByText("Unidades disponibles", { exact: true })).toBeVisible();
      // El estado vacío no debe mostrar ceros como si fueran datos reales.
      await expect(page.getByText("Sin datos").first()).toBeVisible();
    });
  });

  describe("TAC-09 (P2) · Errores parciales de categorías y marcas", () => {
    it("muestra un aviso parcial sin ocultar los filtros que sí cargaron", async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(
        "/tests/harness/inventory-adapter.html?path=/inventario/dashboard&fail-categories=1&fail-brands=1",
      );

      // Aviso parcial explícito
      await expect(
        page.getByText("No se pudieron cargar algunas opciones de filtro"),
      ).toBeVisible();

      // El filtro de ubicación (que sí cargó) sigue operativo
      const locationFilter = page.getByRole("combobox", {
        name: "Filtrar por ubicación",
      });
      await expect(locationFilter).toBeEnabled();
      await locationFilter.click();
      await expect(
        page.getByRole("option", { name: "Tienda Cusco Imperial", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });

  describe("TAC-12 (P2) · Reintento de filtros sin recargar", () => {
    it("permite reintentar categorías/marcas y recupera las opciones conservando los filtros", async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(
        "/tests/harness/inventory-adapter.html?path=/inventario/dashboard&fail-categories=1&fail-brands=1",
      );

      const notice = page.getByText(
        "No se pudieron cargar algunas opciones de filtro",
      );
      await expect(notice).toBeVisible();

      // Antes del reintento, el filtro que sí cargó sigue utilizable.
      await expect(
        page.getByRole("combobox", { name: "Filtrar por ubicación" }),
      ).toBeEnabled();

      // Las fuentes dejan de fallar y el usuario reintenta sin recargar.
      await page.evaluate(() => {
        const audit = (
          window as unknown as { inventoryAudit: Record<string, boolean> }
        ).inventoryAudit;
        audit.failCategories = false;
        audit.failBrands = false;
      });
      await page.getByRole("button", { name: "Reintentar filtros" }).click();

      // Se recuperan categorías y marcas; el aviso desaparece.
      await expect(notice).toHaveCount(0);
      const categoryFilter = page.getByRole("combobox", {
        name: "Filtrar por categoría",
      });
      await categoryFilter.click();
      await expect(
        page.getByRole("option", { name: "Calzado", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });

  describe("TAC-13 (P2) · Estados por SKU no excluyentes", () => {
    it("aclara que un SKU puede contarse en varios estados y superar los SKU únicos", async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(
        "/tests/harness/inventory-adapter.html?path=/inventario/dashboard",
      );

      await expect(
        page.getByRole("heading", { name: "Resumen de indicadores clave" }),
      ).toBeVisible();
      // La nota debe explicar que los conteos por estado pueden solaparse.
      await expect(page.getByText(/no son excluyentes/i)).toBeVisible();
      await expect(
        page.getByText(/puede superar el total de SKU únicos/i),
      ).toBeVisible();
    });
  });

  describe("TAC-14 (P2) · Error de ubicaciones en el aviso parcial", () => {
    it("incluye ubicaciones en el aviso y las recupera al reintentar", async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.goto(
        "/tests/harness/inventory-adapter.html?path=/inventario/dashboard&fail-locations=1",
      );

      const notice = page.getByText(
        "No se pudieron cargar algunas opciones de filtro",
      );
      await expect(notice).toBeVisible();
      // El aviso nombra explícitamente la fuente que falló.
      await expect(page.getByText(/^Ubicaciones:/)).toBeVisible();
      // Y no inventa errores de las fuentes que sí cargaron.
      await expect(page.getByText(/^Categorías:/)).toHaveCount(0);
      await expect(page.getByText(/^Marcas:/)).toHaveCount(0);

      // La fuente deja de fallar y el usuario reintenta sin recargar.
      await page.evaluate(() => {
        const audit = (
          window as unknown as { inventoryAudit: Record<string, boolean> }
        ).inventoryAudit;
        audit.failLocations = false;
      });
      await page.getByRole("button", { name: "Reintentar filtros" }).click();

      // Se recuperan las ubicaciones; el aviso desaparece.
      await expect(notice).toHaveCount(0);
      const locationFilter = page.getByRole("combobox", {
        name: "Filtrar por ubicación",
      });
      await expect(locationFilter).toBeEnabled();
      await locationFilter.click();
      await expect(
        page.getByRole("option", { name: "Tienda Cusco Imperial", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    });
  });
});
