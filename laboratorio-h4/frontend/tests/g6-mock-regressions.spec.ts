import { expect, test, type Page } from "@playwright/test";
import {
  isMockPersistenceAvailable,
  readMockState,
  saveMockState,
} from "../src/features/shared/mockState";
import { createMockPricingAudit } from "../src/features/price-audit/mocks/pricingChanges";
import { createMockPricingRepository } from "../src/features/pricing/adapters/mockPricingRepository";
import { mockBrandAdapter } from "../src/features/taxonomy/adapters/mockBrandAdapter";
import { mockCategoryAdapter } from "../src/features/taxonomy/adapters/mockCategoryAdapter";
import type { PriceTarget, PriceView } from "../src/features/pricing/services/pricingRepository";

const PREFIX = "g6-productos-ofertas:mock:v1:";

async function readEnvelope(page: Page, domain: string) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }, `${PREFIX}${domain}`);
}

// ---------------------------------------------------------------------------
// Ronda R3: regresiones y seguridad de merge en ejecución Node (sin navegador).
// ---------------------------------------------------------------------------

test("R3: la persistencia queda deshabilitada fuera de un navegador mock", () => {
  expect(isMockPersistenceAvailable()).toBe(false);
  expect(saveMockState("catalog", { productos: [] })).toBe(false);
  expect(readMockState("catalog", (value: unknown): value is unknown => value !== undefined)).toBeNull();
});

test("R3: la auditoría no inventa un SKU cuando el objetivo carece de él", () => {
  const audit = createMockPricingAudit();
  const target: PriceTarget = {
    id: "producto-sin-sku",
    kind: "product",
    label: "Producto sin SKU",
    productId: "fixture-producto-sin-sku",
    referenceSku: undefined,
  };
  const before: PriceView = {
    id: target.id, name: target.label, regular: "100.00", offer: null, currency: "PEN",
    version: 1, origin: "product", channel: "global", validFrom: "2026-10-17T12:00:00Z",
    validUntil: null, inherited: false,
  };
  const after: PriceView = { ...before, regular: "120.00", version: 2 };
  audit.record(target, before, after, "Cambio sin SKU");
  expect(audit.read()).toEqual([]);
});

test("R3: solicitar dos veces la baja de una marca no duplica la operación", async () => {
  const first = await mockBrandAdapter.solicitarBaja("adidas", new AbortController().signal);
  const second = await mockBrandAdapter.solicitarBaja("adidas", new AbortController().signal);
  expect(first.resultado).toBe("pendiente");
  expect(first.operacionId).toBe("op-marca-adidas");
  expect(second.operacionId).toBe(first.operacionId);
});

test("R3 P1-3: la baja de categoría pendiente se conserva con ID determinista y puede ser consultada", async () => {
  const op1 = await mockCategoryAdapter.solicitarBaja("casual", new AbortController().signal);
  expect(op1.resultado).toBe("verificando");
  expect(op1.operacionId).toBe("op-baja-categoria-casual");

  const op2 = await mockCategoryAdapter.solicitarBaja("casual", new AbortController().signal);
  expect(op2.operacionId).toBe(op1.operacionId);

  const consultada = await mockCategoryAdapter.consultarEstadoOperacion(
    op1.operacionId!,
    new AbortController().signal,
  );
  expect(consultada.estado).toBe("confirmada");
  expect(consultada.operacionId).toBe(op1.operacionId);
});

// ---------------------------------------------------------------------------
// Ronda R3: regresiones en navegador.
// ---------------------------------------------------------------------------

test("R3: el estado válido sobrevive a varias recargas y las fixtures no lo sobrescriben", async ({
  page,
}) => {
  await page.goto("/productos");
  await page.getByRole("link", { name: "Ver detalle de Camiseta Running Endurance" }).click();
  await page.getByRole("link", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nombre del producto").fill("Camiseta Sobrevive R3");
  await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Camiseta Sobrevive R3", exact: true }),
  ).toBeVisible();

  for (let i = 0; i < 2; i += 1) {
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Camiseta Sobrevive R3", exact: true }),
    ).toBeVisible();
  }
  await page.goto("/productos");
  await expect(
    page.getByRole("link", { name: "Ver detalle de Camiseta Sobrevive R3" }),
  ).toBeVisible();
});

test("R3: recargar no reaplica una recepción de inventario ya confirmada", async ({
  page,
}) => {
  await page.goto("/inventario/traslados");
  const row = page.getByRole("row", { name: /TR-2026-101/ });
  await row.getByRole("button", { name: "Recepcionar traslado TR-2026-101" }).click();
  const dialog = page.getByRole("dialog", { name: /Registrar recepción/ });
  await dialog
    .getByRole("textbox", { name: "Cantidad recibida físicamente" })
    .fill("5");
  await dialog.getByRole("button", { name: "Confirmar recepción" }).click();
  await expect(
    page.getByText(/Recepción registrada para traslado TR-2026-101/),
  ).toBeVisible();

  const afterReceipt = await readEnvelope(page, "inventory");
  expect(afterReceipt.data.processedOperations).toHaveLength(1);
  expect(afterReceipt.data.processedOperationKeys).toHaveLength(1);

  await page.goto("/inventario");
  await expect(
    page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" }),
  ).toContainText("13");

  await page.reload();
  await expect(
    page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" }),
  ).toContainText("13");

  const afterReload = await readEnvelope(page, "inventory");
  expect(afterReload.data.processedOperations).toHaveLength(1);
  expect(afterReload.data.processedOperationKeys).toHaveLength(1);
});

test("R3: una importación masiva se restaura tras recargar y no duplica el lote", async ({
  page,
}) => {
  await page.goto("/carga-masiva");
  await page.locator('input[type="file"]').setInputFiles({
    name: "regresion.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("sku,nombre\nSKU-R3,Producto R3\n"),
  });
  await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
  await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-1001-/);
  const batchUrl = page.url();

  const bulk = await readEnvelope(page, "bulk");
  expect(bulk).not.toBeNull();
  expect(bulk.version).toBe(1);
  expect(bulk.data.batches).toHaveLength(1);

  await page.reload();
  expect(page.url()).toBe(batchUrl);
  await expect(page.getByText("Lote no encontrado")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const afterReload = await readEnvelope(page, "bulk");
  expect(afterReload.data.batches).toHaveLength(1);
});

test("R3 P1-1: los repositorios con persist: false no escriben en el almacenamiento del navegador", async ({
  page,
}) => {
  await page.goto("/precios");
  await expect(page.getByRole("heading", { name: "Gestión de precios" })).toBeVisible();
  await page.waitForFunction(() => localStorage.getItem("g6-productos-ofertas:mock:v1:pricing") !== null);
  const result = await page.evaluate(async () => {
    const specifier = "/src/features/pricing/adapters/mockPricingRepository.ts";
    const { createMockPricingRepository } = await import(
      /* @vite-ignore */ specifier
    );
    const keysBefore = Object.keys(localStorage);
    const isolatedRepo = createMockPricingRepository(
      { now: () => "2026-10-17T12:00:00Z" },
      undefined,
      { persist: false },
    );
    await isolatedRepo.update({
      target: { targetId: "base", channel: "global" },
      version: 4,
      draft: {
        regular: "987.65",
        offer: "",
        offerAction: "CONSERVAR",
        currency: "PEN",
        reason: "Aislamiento verificado",
      },
    });
    const keysAfter = Object.keys(localStorage);
    const leakedData = keysAfter.some((k) => {
      const val = localStorage.getItem(k) ?? "";
      return val.includes("987.65") || val.includes("Aislamiento verificado");
    });
    return {
      newKeys: keysAfter.filter((k) => !keysBefore.includes(k)),
      leakedData,
    };
  });
  expect(result.newKeys).toHaveLength(0);
  expect(result.leakedData).toBe(false);
});

test("R3 P1-2: las mutaciones de un módulo actualizan reactivamente a los módulos dependientes sin F5", async ({
  page,
}) => {
  await page.goto("/combos");
  await expect(page.getByRole("heading", { name: "Gestión de combos" })).toBeVisible();
  const row = page.getByRole("row", { name: /Conjunto Trail Esencial/ });
  await expect(row).toBeVisible();
  await expect(row.getByText(/combos estimados/)).toBeVisible();

  // En el mismo navegador y sin recargar la página, mutamos el stock disponible en Inventario a 0
  await page.evaluate(async () => {
    const invSpecifier =
      "/src/features/inventory/services/inventoryProvider.ts";
    const stateSpecifier = "/src/features/shared/mockState.ts";
    const { getInventoryRepository } = await import(
      /* @vite-ignore */ invSpecifier
    );
    const { publishMockChange } = await import(
      /* @vite-ignore */ stateSpecifier
    );
    interface ModifiableStock {
      stockItems?: Array<{ sku: string; onHand: number; available: number }>;
      delegate?: {
        stockItems?: Array<{ sku: string; onHand: number; available: number }>;
      };
      base?: { stockItems?: Array<{ sku: string; onHand: number; available: number }> };
    }
    const repo = getInventoryRepository() as unknown as ModifiableStock;
    const items = repo.stockItems ?? repo.delegate?.stockItems ?? repo.base?.stockItems;
    const target = items?.find((i) => i.sku === "CAS-COR-001");
    if (target) {
      target.onHand = 0;
      target.available = 0;
    }
    publishMockChange("inventory");
  });

  // La disponibilidad del combo en la tabla reacciona y cambia a "Agotado (0 confirmado)" de inmediato sin recarga
  await expect(row.getByText(/Agotado/)).toBeVisible();
});

test("R3 P1-4: sobre corrupto (versión incompatible, valores negativos, tipos erróneos) se descarta y revierte a fixtures", async ({
  page,
}) => {
  await page.goto("/inventario");
  // Inyectar sobre de inventario corrupto con saldo negativo y tipos erróneos
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        data: {
          stockItems: [
            { sku: "SKU-CORRUPTO", locationId: "LOC-1", onHand: -50, available: -50, reserved: 0, blocked: 0 },
          ],
          thresholds: { globalThreshold: -10, skuThresholds: [] },
          transfers: [],
          alerts: [],
          processedOperations: [],
          processedOperationKeys: [],
        },
      }),
    );
  }, `${PREFIX}inventory`);

  await page.reload();
  // El sobre corrupto con saldo negativo debe ser descartado y revertido a fixtures
  await expect(page.getByText("SKU-CORRUPTO")).toHaveCount(0);
  await expect(page.getByRole("row").filter({ hasText: "ZAP-TRL-40-BLK" })).toBeVisible();

  // Inyectar sobre con versión errónea (ej. version 99) en catálogo
  await page.evaluate((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 99,
        savedAt: new Date().toISOString(),
        data: { products: [{ id: "prod-99", name: "Incompatible", skuBase: "INC", status: "ACTIVO", version: 1 }], variants: [] },
      }),
    );
  }, `${PREFIX}catalog`);

  await page.goto("/productos");
  await expect(page.getByText("Incompatible")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Camiseta Running Endurance/ })).toBeVisible();
});

test("R3 P1-7: fallo en localStorage (QuotaExceededError) no bloquea la sesión y registra advertencia", async ({
  page,
}) => {
  const warnings: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "warning") warnings.push(msg.text());
  });

  await page.goto("/inventario/umbrales");
  await expect(page.getByRole("heading", { name: /Configuración de umbrales/ })).toBeVisible();

  // Simular fallo de cuota en localStorage.setItem
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
    (window as unknown as { __restoreStorage?: () => void }).__restoreStorage = () => {
      Storage.prototype.setItem = originalSetItem;
    };
  });

  // Guardar un cambio de umbral
  const globalInput = page.getByRole("textbox", { name: "Umbral global de stock bajo" });
  await globalInput.fill("15");
  await page.getByRole("button", { name: "Guardar umbral global" }).click();

  // La UI no colapsa: comunica fallo operativo de guardado, mantiene el valor en sesión y NO muestra «Guardado»
  await expect(page.getByRole("alert")).toContainText("No se pudo guardar el cambio. Vuelve a intentarlo.");
  await expect(page.getByText(/Umbral global (guardado|actualizado)/)).toHaveCount(0);
  await expect(globalInput).toHaveValue("15");

  // Se registró la advertencia en consola
  expect(warnings.some((w) => w.includes("[mock-state] No se pudo persistir"))).toBe(true);

  // Restaurar storage en la página
  await page.evaluate(() => {
    const win = window as unknown as { __restoreStorage?: () => void };
    if (typeof win.__restoreStorage === "function") {
      win.__restoreStorage();
    }
  });
});

test("R3 P1-5: aviso de datos de auditoría preserva consistencia y no muestra error espurio", async ({
  page,
}) => {
  await page.goto("/precios/auditoria");
  await expect(page.getByText(/Bitácora de cambios confirmados/)).toBeVisible();
  await expect(page.getByText("Acceso no disponible")).toHaveCount(0);
});

test("R3 P1-6: reanudación de carga masiva previene duplicación de lotes y timers al recargar", async ({
  page,
}) => {
  await page.goto("/carga-masiva");
  await page.locator('input[type="file"]').setInputFiles({
    name: "recon-test.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("sku,nombre\nSKU-RECON,Producto Recon\n"),
  });
  await page.getByRole("button", { name: "Continuar a revisión", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar importación", exact: true }).first().click();
  await expect(page).toHaveURL(/\/carga-masiva\/importaciones\/lote-imp-/);

  const beforeReload = await readEnvelope(page, "bulk");
  expect(beforeReload.data.batches).toHaveLength(1);

  await page.reload();
  await expect(page.getByText("Lote no encontrado")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const afterReload = await readEnvelope(page, "bulk");
  expect(afterReload.data.batches).toHaveLength(1);
  expect(afterReload.data.batches[0][0]).toBe(beforeReload.data.batches[0][0]);
});

test("R3 P1-05: sincronización de stock a combos mediante operación pública (receiveTransfer) sin F5, detalle y conservación tras F5", async ({
  page,
}) => {
  await page.goto("/combos");
  await expect(page.getByRole("heading", { name: "Gestión de combos" })).toBeVisible();
  const row = page.getByRole("row", { name: /Conjunto Trail Esencial/ });
  await expect(row).toBeVisible();
  await expect(row.getByText("4 combos estimados")).toBeVisible();

  // 1. Modificar stock mediante operación pública válida de inventario (recepción de traslado)
  const operationId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  await page.evaluate(async (opId) => {
    const invSpecifier = "/src/features/inventory/services/inventoryProvider.ts";
    const { getInventoryRepository } = await import(
      /* @vite-ignore */ invSpecifier
    );
    await getInventoryRepository().receiveTransfer({
      transferId: "tr-cas-cor-001",
      quantityReceived: 3,
      disposition: "REINGRESAR_DISPONIBLE",
      receivedAt: "2026-10-17T12:00:00Z",
      finalReceipt: false,
      operationId: opId,
      note: "Reposición sincronizada a Combos",
    });
  }, operationId);

  // 2. Lista de Combos actualizada sin F5 (4 + 3 = 7 combos estimados)
  await expect(row.getByText("7 combos estimados")).toBeVisible();

  // 3. Detalle de Combo actualizado
  await page.goto("/combos/combo-001");
  await expect(page.getByRole("heading", { name: "Conjunto Trail Esencial" })).toBeVisible();
  await expect(page.getByText("7 combos estimados")).toBeVisible();

  // 4. F5 y conservación del resultado
  await page.reload();
  await expect(page.getByRole("heading", { name: "Conjunto Trail Esencial" })).toBeVisible();
  await expect(page.getByText("7 combos estimados")).toBeVisible();

  // 5. Sin duplicación de operaciones (reintento idempotente con la misma operation_id)
  await page.evaluate(async (opId) => {
    const invSpecifier = "/src/features/inventory/services/inventoryProvider.ts";
    const { getInventoryRepository } = await import(
      /* @vite-ignore */ invSpecifier
    );
    await getInventoryRepository().receiveTransfer({
      transferId: "tr-cas-cor-001",
      quantityReceived: 3,
      disposition: "REINGRESAR_DISPONIBLE",
      receivedAt: "2026-10-17T12:00:00Z",
      finalReceipt: false,
      operationId: opId,
      note: "Reintento de recepción con misma operation_id",
    });
  }, operationId);

  await page.reload();
  await expect(page.getByText("7 combos estimados")).toBeVisible();
});

test("R3 P1-04: integración económica Catalog–Pricing con precioBaseInicial, edición, auditoría y F5", async ({
  page,
}) => {
  await page.goto("/precios");
  await expect(page.getByRole("heading", { name: "Gestión de precios" })).toBeVisible();
  const newProd = await page.evaluate(async () => {
    const catSpecifier = "/src/features/catalog/services/catalogServices.ts";
    const { getCatalogServices } = await import(
      /* @vite-ignore */ catSpecifier
    );
    return await getCatalogServices("mock").catalog.create({
      nombre: "Cortaviento Trail Explorer",
      marcaId: "BRD-INKA",
      categoriaId: "CAT-ROPA",
      tipoProductoId: "TIP-CASACA",
      descripcion: "Cortaviento ultra liviano",
      skuBase: "COR-TRL-001",
      tieneVariantes: false,
      precioBaseInicial: 159.9,
    });
  });
  expect(newProd.id).toBeDefined();

  // 1. Verificar precio inicial en Pricing
  await page.goto(`/precios?target=${newProd.id}&channel=global`);
  await expect(page.getByText(newProd.name).first()).toBeVisible();
  await expect(page.getByText("159.90").first()).toBeVisible();

  // 2. Editar el precio en Pricing
  await page.evaluate(async (targetId) => {
    const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
    const { createPricingRuntime } = await import(
      /* @vite-ignore */ pricingSpecifier
    );
    const pricing = await createPricingRuntime("mock");
    await pricing.service.update(
      {
        target: { targetId, channel: "global" },
        version: 1,
        draft: {
          regular: "179.90",
          offer: "",
          offerAction: "CONSERVAR",
          currency: "PEN",
          reason: "Ajuste inflacionario trimestral",
        },
      },
      new AbortController().signal,
    );
  }, newProd.id);

  await page.reload();
  await expect(page.getByText("179.90").first()).toBeVisible();

  // 3. Comprobar el asiento en Auditoría (fila y detalle con motivo)
  await page.goto("/precios/auditoria");
  const auditRow = page.getByRole("row").filter({ hasText: "COR-TRL-001" });
  await expect(auditRow).toBeVisible();
  await expect(auditRow.getByText(/179,90/)).toBeVisible();
  await auditRow.getByRole("link", { name: /Ver detalle/ }).click();
  await expect(page.getByText("Ajuste inflacionario trimestral")).toBeVisible();

  // 4. F5 y verificación de persistencia en Auditoría y Pricing
  await page.reload();
  await expect(page.getByText("Ajuste inflacionario trimestral")).toBeVisible();
  await expect(page.getByText(/179,90/).first()).toBeVisible();

  await page.goto(`/precios?target=${newProd.id}&channel=global`);
  await page.reload();
  await expect(page.getByText("179.90").first()).toBeVisible();
});

test("R3 P1-06b: variante nueva en catálogo aparece en Pricing, respeta herencia o ausencia y persiste tras F5", async ({
  page,
}) => {
  await page.goto("/productos");
  // Crear variante para PROD-RUN-001 (que sí tiene precio regular 139.90 en Pricing)
  const variant = await page.evaluate(async () => {
    const catSpecifier = "/src/features/catalog/services/catalogServices.ts";
    const { getCatalogServices } = await import(
      /* @vite-ignore */ catSpecifier
    );
    return await getCatalogServices("mock").catalog.createVariant("PROD-RUN-001", {
      sku: "CAM-RUN-ROJ-XL",
      atributosIdentificadores: [
        { caracteristicaId: "CAR-COLOR", valor: "COL-ROJ" },
        { caracteristicaId: "CAR-TALLA", valor: "TAL-XL" },
      ],
      status: "ACTIVO",
    });
  });
  expect(variant.variantId).toBeDefined();

  // Ir a Pricing consultando la nueva variante
  await page.goto(`/precios?target=${variant.variantId}&channel=global`);
  // Debe heredar el precio del padre PROD-RUN-001 (139.90)
  await expect(page.getByText("Hereda precio del producto").first()).toBeVisible();
  await expect(page.getByText(/139\.90/).first()).toBeVisible();

  // F5 y persistencia
  await page.reload();
  await expect(page.getByText("Hereda precio del producto").first()).toBeVisible();
  await expect(page.getByText(/139\.90/).first()).toBeVisible();
});

test("R3 P1-06c: cupón creado en promociones se restaura y persiste tras F5", async ({
  page,
}) => {
  await page.goto("/cupones");
  const nuevoCupon = await page.evaluate(async () => {
    const promoSpecifier = "/src/features/promotions/services/promotionServices.ts";
    const { getPromotionRuntime } = await import(
      /* @vite-ignore */ promoSpecifier
    );
    const services = getPromotionRuntime("mock").resolve(new URLSearchParams()).services;
    return await services.coupons.create(
      {
        code: "CUPON-REGRESION-R3",
        promotionId: "bienvenida",
        status: "active",
        globalLimit: 100,
        customerLimit: 1,
        minimumAmount: null,
        cancellationPolicy: "restore",
      },
      new AbortController().signal,
    );
  });
  expect(nuevoCupon.code).toBe("CUPON-REGRESION-R3");

  await page.reload();
  await expect(page.getByText("CUPON-REGRESION-R3")).toBeVisible();

  // F5 y comprobación de persistencia
  await page.reload();
  await expect(page.getByText("CUPON-REGRESION-R3")).toBeVisible();
});

test("R3 P1-06d: regla de recomendación creada persiste y se restaura tras F5", async ({
  page,
}) => {
  await page.goto("/recomendaciones");
  const nuevaRegla = await page.evaluate(async () => {
    const promoSpecifier = "/src/features/promotions/services/promotionServices.ts";
    const { getPromotionRuntime } = await import(
      /* @vite-ignore */ promoSpecifier
    );
    const services = getPromotionRuntime("mock").resolve(new URLSearchParams()).services;
    return await services.recommendations.save(
      null,
      {
        name: "Regla Cross-Sell Montaña R3",
        kind: "cross-sell",
        originType: "product",
        originId: "PROD-RUN-001",
        priority: "1",
        status: "active",
        validFrom: "2026-10-01T00:00",
        validUntil: "2026-11-01T00:00",
        candidates: [
          {
            productId: "PROD-CAS-001",
            order: "1",
            criterion: "",
            justification: "",
          },
        ],
      },
      new AbortController().signal,
    );
  });
  expect(nuevaRegla.id).toBeDefined();

  await page.reload();
  await expect(page.getByText("Regla Cross-Sell Montaña R3")).toBeVisible();

  // F5 y persistencia
  await page.reload();
  await expect(page.getByText("Regla Cross-Sell Montaña R3")).toBeVisible();
});

test("R3 P1-06e: combo creado y editado tras F5 preserva cambios e integridad", async ({
  page,
}) => {
  await page.goto("/combos");
  const createdCombo = await page.evaluate(async () => {
    const comboSpecifier = "/src/features/combos/services/combosService.ts";
    const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
    const { createCombosRuntime } = await import(
      /* @vite-ignore */ comboSpecifier
    );
    const { createPricingRuntime } = await import(
      /* @vite-ignore */ pricingSpecifier
    );
    const pricing = await createPricingRuntime("mock");
    const runtime = await createCombosRuntime("mock", pricing);
    return await runtime.combos.create({
      name: "Combo Alpinismo R3",
      description: "Conjunto exclusivo de alta montaña",
      priceMinor: 25000,
      components: [
        { sku: "CAS-COR-001", quantity: 1 },
        { sku: "CAM-RUN-BLA-M", quantity: 1 },
      ],
    });
  });
  expect(createdCombo.id).toBeDefined();

  await page.reload();
  await expect(page.getByText("Combo Alpinismo R3")).toBeVisible();

  // Editar el combo tras F5
  await page.evaluate(async (id) => {
    const comboSpecifier = "/src/features/combos/services/combosService.ts";
    const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
    const { createCombosRuntime } = await import(
      /* @vite-ignore */ comboSpecifier
    );
    const { createPricingRuntime } = await import(
      /* @vite-ignore */ pricingSpecifier
    );
    const pricing = await createPricingRuntime("mock");
    const runtime = await createCombosRuntime("mock", pricing);
    const current = await runtime.combos.getById(id);
    await runtime.combos.update(id, {
      name: "Combo Alpinismo R3 Editado",
      description: "Descripción actualizada para alta montaña",
      priceMinor: 26000,
      version: current?.version,
      components: [
        { sku: "CAS-COR-001", quantity: 1 },
        { sku: "CAM-RUN-BLA-M", quantity: 1 },
      ],
    });
  }, createdCombo.id);

  // F5 y verificar que el cambio editado se conserva
  await page.reload();
  await expect(page.getByText("Combo Alpinismo R3 Editado")).toBeVisible();
});

test("R3 P1-06f: marca y categoría renombradas en Taxonomy se propagan a Catálogo e Inventario y persisten tras F5", async ({
  page,
}) => {
  // 1. Renombrar la marca BRD-INKA en /marcas
  await page.goto("/marcas/BRD-INKA/editar");
  const brandInput = page.getByRole("textbox", { name: /Nombre/ });
  await brandInput.fill("Inka Renombrada R3");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page).toHaveURL(/\/marcas\/BRD-INKA$/);
  await expect(page.getByText("Inka Renombrada R3").first()).toBeVisible();

  // Verificar en Catálogo (producto PROD-RUN-001)
  await page.goto("/productos/PROD-RUN-001");
  await expect(page.getByText("Inka Renombrada R3")).toBeVisible();

  // Verificar en Inventario (fila de su SKU CAM-RUN-BLA-M)
  await page.goto("/inventario");
  const invRowBrand = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
  await expect(invRowBrand.getByText(/Inka Renombrada R3/)).toBeVisible();

  // 2. Renombrar la categoría CAT-ROPA en /categorias
  await page.goto("/categorias/CAT-ROPA/editar");
  const catInput = page.getByRole("textbox", { name: "Nombre" });
  await catInput.fill("Ropa Renombrada R3");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText(/Se actualizó «Ropa Renombrada R3»/)).toBeVisible();

  // Verificar en Catálogo (producto PROD-RUN-001)
  await page.goto("/productos/PROD-RUN-001");
  await expect(page.getByText("Ropa Renombrada R3")).toBeVisible();

  // Verificar en Inventario (fila de su SKU CAM-RUN-BLA-M)
  await page.goto("/inventario");
  const invRowCat = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
  await expect(invRowCat.getByText(/Ropa Renombrada R3/)).toBeVisible();

  // 3. Recargar con F5 y verificar de nuevo en ambos módulos
  await page.reload();
  const invRowAfterF5 = page.getByRole("row").filter({ hasText: "CAM-RUN-BLA-M" });
  await expect(invRowAfterF5.getByText(/Inka Renombrada R3/)).toBeVisible();
  await expect(invRowAfterF5.getByText(/Ropa Renombrada R3/)).toBeVisible();

  await page.goto("/productos/PROD-RUN-001");
  await page.reload();
  await expect(page.getByText("Inka Renombrada R3")).toBeVisible();
  await expect(page.getByText("Ropa Renombrada R3")).toBeVisible();
});

test("R3 P1-02: unicidad de asientos por canal sin colisión entre global y retail", async () => {
  const audit = createMockPricingAudit();
  const target: PriceTarget = {
    id: "base",
    label: "Zapatilla Trail Inka Explorer · Producto base",
    productId: "fixture-product-013",
    kind: "product",
    referenceSku: "ZAP-TRL-EXP",
  };

  const beforeGlobal: PriceView = {
    id: target.id,
    name: target.label,
    regular: "249.90",
    offer: "219.90",
    currency: "PEN",
    version: 3,
    origin: "product",
    channel: "global",
    validFrom: "2026-10-01T00:00:00Z",
    validUntil: null,
    inherited: false,
  };
  const afterGlobal: PriceView = {
    ...beforeGlobal,
    regular: "249.90",
    offer: null,
    version: 4,
    validFrom: "2026-10-18T10:00:00Z",
  };

  const beforeRetail: PriceView = {
    id: target.id,
    name: target.label,
    regular: "249.90",
    offer: null,
    currency: "PEN",
    version: 3,
    origin: "product",
    channel: "retail",
    validFrom: "2026-10-01T00:00:00Z",
    validUntil: null,
    inherited: false,
  };
  const afterRetail: PriceView = {
    ...beforeRetail,
    regular: "259.90",
    version: 4,
    validFrom: "2026-10-18T10:05:00Z",
  };

  // Cambio 1 en canal global a versión 4
  audit.record(target, beforeGlobal, afterGlobal, "Ajuste en canal global");

  // Cambio 2 en canal retail a la misma versión (4) con precio y motivo distintos
  audit.record(target, beforeRetail, afterRetail, "Ajuste en canal retail");

  // Reintento idéntico del canal global: no debe duplicar
  audit.record(target, beforeGlobal, afterGlobal, "Ajuste en canal global");

  const records = audit.read();
  expect(records).toHaveLength(2);
  const globalRecord = records.find((r) => r.id.includes("-global-v4-") || r.reason.includes("global"));
  const retailRecord = records.find((r) => r.id.includes("-retail-v4-") || r.reason.includes("retail"));
  expect(globalRecord).toBeDefined();
  expect(retailRecord).toBeDefined();
  expect(globalRecord?.operation).toBe("RETIRO_OFERTA");
  expect(retailRecord?.after).toBe("259.90");
});

test("R3 P1-03: fallos de persistencia (QuotaExceededError) en Pricing, Taxonomy, Bulk y Promotions", async ({
  page,
}) => {
  await page.goto("/precios");
  await page.evaluate(async () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };

    try {
      // 1. Pricing schedule falla al persistir
      const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
      const { createPricingRuntime } = await import(/* @vite-ignore */ pricingSpecifier);
      const pricing = await createPricingRuntime("mock");
      let pricingFailed = false;
      try {
        await pricing.prices.schedule("base", {
          kind: "OFFER",
          amount: "199.90",
          currency: "PEN",
          channel: "global",
          start: "2026-11-01T00:00:00Z",
          end: "2026-11-05T00:00:00Z",
        });
      } catch {
        pricingFailed = true;
      }
      if (!pricingFailed) throw new Error("Pricing schedule debió fallar al no poder persistir");

      // 2. Taxonomy brand crear falla al persistir
      const brandSpecifier = "/src/features/taxonomy/services/brandService.ts";
      const { brandService } = await import(/* @vite-ignore */ brandSpecifier);
      let brandFailed = false;
      try {
        await brandService.crear({ nombre: "Marca Fallo Cuota" }, new AbortController().signal);
      } catch {
        brandFailed = true;
      }
      if (!brandFailed) throw new Error("Taxonomy brand crear debió fallar al no poder persistir");

      // 3. Bulk createImport falla al persistir
      const bulkSpecifier = "/src/features/bulk/services/bulkService.ts";
      const { getBulkRepository } = await import(/* @vite-ignore */ bulkSpecifier);
      const fakeFile = new File(["sku,nombre\nTEST,Test\n"], "test.csv", { type: "text/csv" });
      let bulkFailed = false;
      try {
        await getBulkRepository("mock").createImport(fakeFile);
      } catch {
        bulkFailed = true;
      }
      if (!bulkFailed) throw new Error("Bulk createImport debió fallar al no poder persistir");

      // 4. Promotions history activate falla al persistir
      const promoHistSpecifier = "/src/features/promotions/mocks/promotionHistory.ts";
      const { createPromotionHistory } = await import(/* @vite-ignore */ promoHistSpecifier);
      const history = createPromotionHistory({ test: { activated: false, used: false } }, { persist: true });
      let promoFailed = false;
      try {
        history.activate("test");
      } catch {
        promoFailed = true;
      }
      if (!promoFailed) throw new Error("Promotion history activate debió fallar al no poder persistir");
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });
});

test("R3 P1-06g: fallo de notificación en guardado de precio y conciliación con auditoría sin duplicar asientos", async () => {
  const audit = createMockPricingAudit();
  let failAudit = true;
  const signal = new AbortController().signal;
  const repo = createMockPricingRepository(
    { now: () => "2026-10-17T12:00:00Z" },
    (target, before, after, reason) => {
      if (failAudit) {
        throw new Error("Fallo de red transitorio al registrar auditoría");
      }
      audit.record(target, before, after, reason);
    },
    { persist: false },
  );

  const targets = await repo.listTargets(signal);
  const target = targets.find((t: PriceTarget) => t.id === "base")!;
  expect(target).toBeDefined();

  // Actualizar precio mientras el servicio de auditoría falla
  const updated = await repo.update(
    {
      target: { targetId: target.id, channel: "global" },
      version: 4,
      draft: {
        regular: "260.00",
        offer: "",
        offerAction: "CONSERVAR",
        currency: "PEN",
        reason: "Actualización con fallo de auditoría",
      },
    },
    signal,
  );
  expect(updated.regular).toBe("260.00");
  // La bitácora de auditoría no recibió el asiento aún
  expect(audit.read()).toHaveLength(0);

  // El servicio de auditoría se recupera y se concilia
  failAudit = false;
  repo.reconcileAudit?.();
  // Ahora el asiento se concilió
  const records = audit.read();
  expect(records).toHaveLength(1);
  expect(records[0]?.after).toBe("260.00");

  // Reconciliación idempotente: una segunda llamada no duplica el asiento
  repo.reconcileAudit?.();
  expect(audit.read()).toHaveLength(1);
});

test("R3 P1-02-E2E: QuotaExceededError exclusivamente en price-audit, conciliación tras recuperar storage y persistencia de un solo asiento tras F5", async ({
  page,
}) => {
  await page.goto("/precios");
  await expect(page.getByRole("heading", { name: "Gestión de precios" })).toBeVisible();

  await page.evaluate(async () => {
    const originalSetItem = Storage.prototype.setItem;
    (window as unknown as { __originalSetItem?: typeof originalSetItem }).__originalSetItem = originalSetItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.endsWith("price-audit")) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };

    const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
    const { createPricingRuntime } = await import(/* @vite-ignore */ pricingSpecifier);
    const runtime = await createPricingRuntime("mock");
    const signal = new AbortController().signal;

    // Actualizar precio de target "base"
    const currentResult = await runtime.service.read({ targetId: "base", channel: "global" }, signal);
    if (!currentResult?.price) throw new Error("No se encontró el precio base");

    await runtime.service.update(
      {
        target: { targetId: "base", channel: "global" },
        version: currentResult.price.version,
        draft: {
          regular: "279.90",
          offer: "",
          offerAction: "CONSERVAR",
          currency: "PEN",
          reason: "Prueba E2E cuota audit exclusiva",
        },
      },
      signal,
    );

    // Pricing persistió pero price-audit falló
    const pricingRaw = localStorage.getItem("g6-productos-ofertas:mock:v1:pricing");
    if (!pricingRaw) throw new Error("pricing debió persistir en localStorage");
    const pricingEnvelope = JSON.parse(pricingRaw);
    const pricingState = pricingEnvelope.data ?? pricingEnvelope;
    if (!pricingState.pendingAudit || pricingState.pendingAudit.length === 0) {
      throw new Error("pricing debió conservar el asiento en pendingAudit");
    }
  });

  // Rehabilitar almacenamiento y ejecutar conciliación
  await page.evaluate(async () => {
    const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
    if (original) Storage.prototype.setItem = original;
    const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
    const { createPricingRuntime } = await import(/* @vite-ignore */ pricingSpecifier);
    const runtime = await createPricingRuntime("mock");
    runtime.service.reconcileAudit?.();
  });

  // Recargar la página (F5)
  await page.reload();
  await expect(page.getByRole("heading", { name: "Gestión de precios" })).toBeVisible();

  // Verificar en bitácora de auditoría que hay exactamente un asiento para este cambio
  await page.goto("/precios/auditoria");
  await expect(page.getByRole("heading", { name: "Historial de precios" })).toBeVisible();
  const row = page.locator("tbody tr").filter({ hasText: /279[,.]90/ });
  await expect(row).toHaveCount(1);

  // Una segunda recarga conserva exactamente un asiento sin duplicación
  await page.reload();
  await expect(page.getByRole("heading", { name: "Historial de precios" })).toBeVisible();
  const rowAfterReload = page.locator("tbody tr").filter({ hasText: /279[,.]90/ });
  await expect(rowAfterReload).toHaveCount(1);
});

test("R3 P1-03-Rollback: fallo de almacenamiento al actualizar precio, consulta del mismo objetivo sin recargar conserva vigencia y versión anterior", async ({
  page,
}) => {
  await page.goto("/precios");
  await expect(page.getByRole("heading", { name: "Gestión de precios" })).toBeVisible();

  await page.evaluate(async () => {
    const originalSetItem = Storage.prototype.setItem;
    const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
    const { createPricingRuntime } = await import(/* @vite-ignore */ pricingSpecifier);
    const runtime = await createPricingRuntime("mock");
    const signal = new AbortController().signal;

    // 1. Consultar precio inicial del objetivo "base"
    const initialResult = await runtime.service.read({ targetId: "base", channel: "global" }, signal);
    if (!initialResult?.price) throw new Error("No se encontró el precio inicial");
    const expectedRegular = initialResult.price.regular;
    const expectedVersion = initialResult.price.version;
    const expectedValidUntil = initialResult.price.validUntil;

    // 2. Provocar fallo de almacenamiento exclusivo para "pricing"
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.endsWith("pricing")) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };

    let updateFailed = false;
    try {
      await runtime.service.update(
        {
          target: { targetId: "base", channel: "global" },
          version: expectedVersion,
          draft: {
            regular: "399.90",
            offer: "",
            offerAction: "CONSERVAR",
            currency: "PEN",
            reason: "Intento fallido por cuota",
          },
        },
        signal,
      );
    } catch {
      updateFailed = true;
    }
    if (!updateFailed) throw new Error("La actualización debió fallar al no poder persistir");

    // 3. Consultar nuevamente el mismo objetivo SIN RECARGAR
    const rereadResult = await runtime.service.read({ targetId: "base", channel: "global" }, signal);
    if (!rereadResult?.price) throw new Error("El precio anterior debió seguir disponible");
    if (rereadResult.price.regular !== expectedRegular) {
      throw new Error(`El precio regular cambió a ${rereadResult.price.regular}, se esperaba ${expectedRegular}`);
    }
    if (rereadResult.price.version !== expectedVersion) {
      throw new Error(`La versión cambió a ${rereadResult.price.version}, se esperaba ${expectedVersion}`);
    }
    if (rereadResult.price.validUntil !== expectedValidUntil) {
      throw new Error(`validUntil cambió a ${rereadResult.price.validUntil}, se esperaba ${expectedValidUntil}`);
    }

    // 4. Restaurar Storage y confirmar que el precio anterior sigue siendo editable con la versión correcta
    Storage.prototype.setItem = originalSetItem;
    const successfulUpdate = await runtime.service.update(
      {
        target: { targetId: "base", channel: "global" },
        version: expectedVersion,
        draft: {
          regular: "289.90",
          offer: "",
          offerAction: "CONSERVAR",
          currency: "PEN",
          reason: "Actualización exitosa tras recuperación de storage",
        },
      },
      signal,
    );
    if (successfulUpdate.version !== expectedVersion + 1) {
      throw new Error("La versión debió incrementarse desde la versión anterior confirmada");
    }
    if (successfulUpdate.regular !== "289.90") {
      throw new Error("El precio regular debió quedar actualizado a 289.90");
    }
  });
});

test("R3 P1-04-Transversal: fallo de persistencia en resumeImport y baja de taxonomía realizan rollback coherente", async ({
  page,
}) => {
  await page.goto("/precios");
  await page.evaluate(async () => {
    const originalSetItem = Storage.prototype.setItem;

    try {
      // 1. Bulk resumeImport falla si el almacenamiento local falla
      const bulkSpecifier = "/src/features/bulk/services/bulkService.ts";
      const { createBulkRepository } = await import(/* @vite-ignore */ bulkSpecifier);
      const bulkRepo = createBulkRepository("mock");

      // Forzar fallo de almacenamiento en bulk
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.endsWith("bulk")) {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      };

      let resumeFailed = false;
      try {
        await bulkRepo.resumeImport("batch-partial");
      } catch {
        resumeFailed = true;
      }
      if (!resumeFailed) throw new Error("resumeImport debió fallar al no poder persistir");

      // Restaurar storage y verificar que el lote conserva su estado original
      Storage.prototype.setItem = originalSetItem;
      const batchAfterFailure = await bulkRepo.getImport("batch-partial");
      if (!batchAfterFailure || batchAfterFailure.status === "QUEUED") {
        throw new Error("El lote no debió quedar en estado QUEUED tras fallar la persistencia de reanudación");
      }

      // 2. Taxonomy Brand consultarResultadoBaja rollback ante fallo de almacenamiento
      const brandSpecifier = "/src/features/taxonomy/services/brandService.ts";
      const { brandService } = await import(/* @vite-ignore */ brandSpecifier);

      // Iniciar baja de adidas (que pasa a verificando)
      await brandService.solicitarBaja("adidas", new AbortController().signal);

      // Provocar fallo de almacenamiento para taxonomy-brands
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.endsWith("taxonomy-brands")) {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        }
        return originalSetItem.call(this, key, value);
      };

      let bajaFailed = false;
      try {
        await brandService.consultarResultadoBaja("op-marca-adidas", new AbortController().signal);
      } catch {
        bajaFailed = true;
      }
      if (!bajaFailed) throw new Error("consultarResultadoBaja debió fallar al no poder persistir");

      // Restaurar storage y verificar que la marca no quedó en estado Inactivo
      Storage.prototype.setItem = originalSetItem;
      const adidas = await brandService.obtener("adidas", new AbortController().signal);
      if (adidas && adidas.estado === "Inactivo") {
        throw new Error("La marca adidas no debió quedar Inactiva tras fallar la persistencia");
      }
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });
});

test("R4 P1-01: exportación de auditoría persiste tras F5, recupera el mismo trabajo y descarga contenido conectado a filtros", async ({
  page,
}) => {
  await page.goto("/precios/auditoria?sku=CAM-BASE");
  await expect(page.getByRole("heading", { name: "Historial de precios" })).toBeVisible();

  await page.getByRole("link", { name: "Exportar CSV" }).click();
  await expect(page.getByRole("heading", { name: "Exportar historial en CSV" })).toBeVisible();

  await page.getByRole("button", { name: "Solicitar CSV" }).click();
  await expect(page.getByRole("button", { name: "Descargar CSV" })).toBeEnabled();

  const urlBeforeReload = page.url();
  const exportId = new URL(urlBeforeReload).searchParams.get("exportId");
  expect(exportId).toBeTruthy();

  await page.reload();

  await expect(page.getByText("Exportación no disponible")).toHaveCount(0);
  await expect(page.getByText(`Referencia: ${exportId}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar CSV" })).toBeEnabled();

  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar CSV" }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe(`reporte_auditoria_${exportId!.toLowerCase()}.csv`);

  const stream = (await file.createReadStream())!;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const content = Buffer.concat(chunks).toString("utf-8");

  expect(content.startsWith("id_auditoria,sku,product_id")).toBe(true);
  expect(content).toContain("CAM-BASE");
  expect(content).not.toContain("RUN-41");
  expect(content).not.toContain("demo-pricing");
});

test("R4 P1-02: conciliación automática de pendingAudit al entrar directamente a /precios/auditoria tras fallo y F5", async ({
  page,
}) => {
  await page.goto("/precios");
  await expect(page.getByRole("heading", { name: "Gestión de precios" })).toBeVisible();

  await page.evaluate(async () => {
    const originalSetItem = Storage.prototype.setItem;
    (window as unknown as { __originalSetItem?: typeof originalSetItem }).__originalSetItem = originalSetItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.endsWith("price-audit")) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };

    const pricingSpecifier = "/src/features/pricing/services/pricingService.ts";
    const { createPricingRuntime } = await import(/* @vite-ignore */ pricingSpecifier);
    const runtime = await createPricingRuntime("mock");
    const signal = new AbortController().signal;

    const currentResult = await runtime.service.read({ targetId: "base", channel: "global" }, signal);
    if (!currentResult?.price) throw new Error("No se encontró el precio base");

    await runtime.service.update(
      {
        target: { targetId: "base", channel: "global" },
        version: currentResult.price.version,
        draft: {
          regular: "289.90",
          offer: "",
          offerAction: "CONSERVAR",
          currency: "PEN",
          reason: "Prueba E2E conciliacion directa historial",
        },
      },
      signal,
    );
  });

  await page.evaluate(() => {
    const original = (window as unknown as { __originalSetItem?: typeof Storage.prototype.setItem }).__originalSetItem;
    if (original) Storage.prototype.setItem = original;
  });

  const hasPendingBefore = await page.evaluate(() => {
    const raw = localStorage.getItem("g6-productos-ofertas:mock:v1:pricing");
    if (!raw) return false;
    const envelope = JSON.parse(raw);
    const state = envelope.data ?? envelope;
    return Array.isArray(state.pendingAudit) && state.pendingAudit.length > 0;
  });
  expect(hasPendingBefore).toBe(true);

  // Navegación directa a /precios/auditoria sin pasar por /precios
  await page.goto("/precios/auditoria");
  await expect(page.getByRole("heading", { name: "Historial de precios" })).toBeVisible();

  const row = page.getByRole("row").filter({ hasText: "ZAP-TRL-EXP" }).first();
  await expect(row).toBeVisible();

  // F5 directo en historial: recuperación y asiento visible exactamente una vez
  await page.reload();
  await expect(page.getByRole("table")).toBeVisible();
  const matchingRows = page.getByRole("row").filter({ hasText: "289,90" });
  await expect(matchingRows).toHaveCount(1);

  await matchingRows.getByRole("link", { name: /Ver detalle/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Prueba E2E conciliacion directa historial");
  await expect(dialog).not.toContainText("demo-pricing");
  await expect(dialog).toContainText("ZAP-TRL-EXP");

  const pendingCountAfter = await page.evaluate(() => {
    const raw = localStorage.getItem("g6-productos-ofertas:mock:v1:pricing");
    if (!raw) return -1;
    const envelope = JSON.parse(raw);
    const state = envelope.data ?? envelope;
    return state.pendingAudit ? state.pendingAudit.length : 0;
  });
  expect(pendingCountAfter).toBe(0);
});
