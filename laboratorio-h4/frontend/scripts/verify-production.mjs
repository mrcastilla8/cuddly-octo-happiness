import assert from "node:assert/strict";
import { chromium } from "playwright";

const mode = process.argv[2];
assert.ok(["mock", "api"].includes(mode), "Uso: node scripts/verify-production.mjs <mock|api> [baseURL]");
const baseURL = process.argv[3] || "http://127.0.0.1:5174";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
const errors = [];
const requests = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => requests.push(request.url()));
async function verifyCommercialCopy() {
  assert.doesNotMatch(await page.locator("main").innerText(),
    /\b(?:mock|fixtures?|adapters?|providers?|backend|piloto)\b|datos (?:ficticios|simulados|de demostración)|(?:viven|cambios) en memoria|MK-\d{3}|Q-\d{3}/i);
  assert.equal(await page.getByRole("combobox", { name: /Escenario de|Respuesta ficticia|Caso de demostración/ }).count(), 0);
}
try {
  // Loop grueso: rutas de listado y entrada de cada módulo, simulando en DEV los
  // estados loading/forbidden que el navegador no puede reproducir por URL.
  for (const path of [
    "/precios",
    "/cupones",
    "/promociones",
    "/recomendaciones",
  ]) {
    await page.goto(baseURL + path + "?modoRevision=1&escenario=loading");
    if (mode === "api") {
      const alert = page.getByRole("alert");
      await alert.waitFor();
      const mensaje = await alert.innerText();
      if (path === "/precios") {
        // Bloqueo específico del adapter de Pricing sin provider configurado y
        // persistencia del error tras reintento y tras recarga de la página.
        assert.match(mensaje, /Esta función no está disponible en el modo actual/);
        const reintento = page.getByRole("button", {
          name: /Volver a cargar productos y SKU/,
        });
        assert.equal(await reintento.count(), 1);
        await reintento.click();
        await alert.waitFor();
        assert.match(
          await alert.innerText(),
          /Esta función no está disponible en el modo actual/,
        );
        assert.equal(await page.getByRole("table").count(), 0);
        await page.reload();
        await alert.waitFor();
        assert.match(
          await alert.innerText(),
          /Esta función no está disponible en el modo actual/,
        );
      } else {
        // Bloqueo específico del gate de Promotions (cupones, promociones y
        // recomendaciones) en modo API.
        assert.match(mensaje, /Función no disponible/);
      }
      assert.equal(await page.getByRole("table").count(), 0);
      assert.equal(await page.locator("main form").count(), 0);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.getByText("Datos de demostración", { exact: true }).count(), 0);
    } else {
      await page.getByRole("heading", { level: 1 }).waitFor();
      assert.equal(await page.getByRole("alert").count(), 0);
      assert.equal(await page.locator("main form").count(), 0);
      assert.equal(await page.getByRole("combobox", { name: /Escenario/ }).count(), 0);
    }
    await verifyCommercialCopy();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  // Cover nested editors, selectors and state dialogs as well as the four lists.
  for (const path of [
    "/cupones/nuevo",
    "/cupones/run10/editar",
    "/cupones/run10",
    "/cupones/run10/limites",
    "/cupones/run10/estado",
    "/promociones/nueva",
    "/promociones/carrera/editar",
    "/promociones/nueva/alcance",
    "/promociones/carrera",
    "/promociones/carrera/estado",
    "/recomendaciones/nueva/venta-cruzada",
    "/recomendaciones/mejora-rendimiento/editar",
    "/recomendaciones/nueva/upselling",
    "/recomendaciones/nueva/venta-cruzada/productos",
    "/recomendaciones/mejora-rendimiento",
    "/recomendaciones/mejora-rendimiento/estado",
  ]) {
    await page.goto(baseURL + path + "?modoRevision=1&escenario=forbidden");
    if (mode === "api") {
      await page.getByRole("alert").waitFor();
      assert.match(
        await page.getByRole("alert").innerText(),
        /Función no disponible/,
      );
      assert.equal(await page.locator("main form").count(), 0);
      assert.equal(await page.getByRole("table").count(), 0);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.getByText("Datos de demostración", { exact: true }).count(), 0);
    } else {
      await page.getByRole("heading", { level: 1 }).waitFor();
      assert.equal(await page.getByRole("alert").count(), 0);
      if (path.endsWith("/estado")) await page.getByRole("dialog").waitFor();
    }
    await verifyCommercialCopy();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
  }
  const catalogPaths = [
    "/productos", "/productos/nuevo", "/productos/PROD-RUN-001",
    "/productos/PROD-RUN-001/editar", "/productos/PROD-RUN-001/preparacion",
    "/productos/PROD-RUN-001/variantes", "/productos/PROD-RUN-001/variantes/nueva",
    "/productos/PROD-RUN-001/variantes/VAR-RUN-BLA-M/preparacion",
  ];
  for (const path of catalogPaths) {
    await page.goto(baseURL + path);
    if (mode === "api") {
      await page.getByRole("alert").first().waitFor();
      assert.equal(await page.getByRole("table").count(), 0);
      for (const save of await page.getByRole("button", { name: /Guardar/ }).all()) {
        assert.equal(await save.isDisabled(), true, path);
      }
    } else {
      await page.getByRole("heading", { level: 1 }).waitFor();
      assert.doesNotMatch(await page.getByRole("heading", { level: 1 }).innerText(), /no encontrado|no disponible/i, path);
      if (/\/nuevo$|\/editar$|\/nueva$/.test(path)) await page.locator("main form").waitFor();
      if (path === "/productos" || path.endsWith("/variantes")) await page.getByRole("table").waitFor();
    }
    await verifyCommercialCopy();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  // Taxonomía (MK-008 a MK-012), estrictamente ADITIVO sobre los loops anteriores:
  // las secciones y rutas internas representativas no alteran ningún check previo.
  // En modo mock cada ruta debe estar operativa y sin avisos técnicos; en
  // modo api el gate debe bloquear con el mensaje exacto y sin formularios,
  // tablas, diálogos ni aviso de demo (prohibido el fallback silencioso).
  const taxonomyPaths = [
    { path: "/categorias", table: true, form: false },
    { path: "/categorias/nueva", table: false, form: true },
    { path: "/categorias/calzado/desactivar", table: false, form: false },
    { path: "/caracteristicas", table: true, form: false },
    { path: "/caracteristicas/talla/valores", table: true, form: false },
    { path: "/tipos-producto", table: true, form: false },
    { path: "/tipos-producto/ropa", table: true, form: false },
    { path: "/marcas", table: true, form: false },
    { path: "/marcas/nike/editar", table: false, form: true },
    { path: "/seo", table: true, form: false },
    { path: "/seo/cat-ropa", table: false, form: true },
  ];
  for (const { path, table, form } of taxonomyPaths) {
    await page.goto(baseURL + path + "?modoRevision=1&escenario=loading");
    if (mode === "api") {
      const alert = page.getByRole("alert");
      await alert.waitFor();
      assert.match(
        await alert.innerText(),
        /Función no disponible/,
      );
      assert.equal(await page.getByRole("table").count(), 0);
      assert.equal(await page.locator("main form").count(), 0);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.getByText("Datos de demostración", { exact: true }).count(), 0);
    } else {
      await page.getByRole("heading", { level: 1 }).waitFor();
      if (table) await page.getByRole("table").waitFor();
      if (form) await page.locator("main form").waitFor();
      assert.equal(await page.getByRole("alert").count(), 0);
      assert.equal(await page.getByText("Datos de demostración", { exact: true }).count(), 0);
      assert.equal(await page.getByRole("combobox", { name: /Escenario/ }).count(), 0);
    }
    await verifyCommercialCopy();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
  }
  // Modo mock: los listados comerciales deben renderizar sus tablas. El bucle
  // grueso usaba escenario=loading (estado pendiente), así que se re-consultan
  // con escenario=default para verificar la existencia real de las tablas.
  if (mode === "mock") {
    for (const path of [
      "/precios",
      "/cupones",
      "/promociones",
      "/recomendaciones",
    ]) {
      await page.goto(baseURL + path + "?modoRevision=1&escenario=default");
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.getByRole("table").waitFor();
      assert.equal(await page.getByRole("alert").count(), 0);
    }
  }
  // MK-014: additive coverage; API uses an explicit unavailable port, never fixtures.
  for (const path of [
    "/precios/auditoria",
    "/precios/auditoria/asientos/aud-014-mod-01",
    "/precios/auditoria/asientos/no-existe",
    "/precios/auditoria/exportar/csv",
    "/precios/auditoria/exportar/pdf",
  ]) {
    await page.goto(baseURL + path + "?modoRevision=1&caso=cargando");
    if (mode === "api") {
      const alert = page.getByRole("alert").first();
      await alert.waitFor();
      assert.match(await alert.innerText(), /La consulta del historial de precios no está disponible/);
      assert.equal(await page.getByRole("table", { includeHidden: true }).count(), 0);
      assert.equal(await page.getByText("Datos de demostración", { exact: true }).count(), 0);
    } else {
      if (path.includes("/asientos/")) await page.getByRole("dialog").waitFor();
      else if (path.endsWith("/auditoria")) await page.getByRole("table").waitFor();
      else await page.getByRole("button", { name: /Solicitar (CSV|PDF)/ }).waitFor();
      assert.equal(await page.getByRole("combobox", { name: "Caso de demostración de auditoría" }).count(), 0);
    }
    await verifyCommercialCopy();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  // Verificaciones aditivas de las cuatro rutas de Inventario (MK-015 y MK-016)
  const inventoryChecks = [
    {
      path: "/inventario",
      mockCheck: async (p) => {
        await p.getByRole("heading", { level: 1 }).waitFor();
        await p.getByRole("table").first().waitFor();
        assert.ok(await p.getByRole("heading", { level: 1 }).isVisible());
        assert.ok((await p.getByRole("table").count()) >= 1);
      },
    },
    {
      path: "/inventario/umbrales",
      mockCheck: async (p) => {
        await p.getByRole("heading", { level: 1 }).waitFor();
        assert.ok(await p.getByRole("heading", { level: 1 }).isVisible());
        const form = p.locator("main form, [role='form']").first();
        const hasForm = (await form.count()) > 0;
        const hasInput =
          (await p.getByRole("spinbutton").count()) > 0 ||
          (await p.getByRole("textbox").count()) > 0;
        assert.ok(hasForm || hasInput, "Umbrales: debe tener formulario de umbral global");
      },
    },
    {
      path: "/inventario/traslados",
      mockCheck: async (p) => {
        await p.getByRole("heading", { level: 1 }).waitFor();
        await p.getByRole("table").or(p.getByText("No hay traslados", { exact: false })).first().waitFor();
        assert.ok(await p.getByRole("heading", { level: 1 }).isVisible());
        const hasTable = (await p.getByRole("table").count()) > 0;
        const hasEmpty =
          (await p.getByText("No hay traslados", { exact: false }).count()) > 0;
        assert.ok(hasTable || hasEmpty, "Traslados: debe tener tabla o mensaje de lista vacía");
      },
    },
    {
      path: "/inventario/dashboard",
      mockCheck: async (p) => {
        await p.getByRole("heading", { level: 1 }).waitFor();
        await p.getByRole("table").or(p.getByText("Total unidades físicas", { exact: false }))
          .or(p.getByText("Unidades disponibles", { exact: false })).first().waitFor();
        assert.ok(await p.getByRole("heading", { level: 1 }).isVisible());
        const hasKpi =
          (await p.getByText("Total unidades físicas", { exact: false }).count()) > 0 ||
          (await p.getByText("Unidades disponibles", { exact: false }).count()) > 0 ||
          (await p.getByRole("table").count()) > 0;
        assert.ok(hasKpi, "Dashboard: debe mostrar KPIs o tabla de distribución");
      },
    },
  ];
  for (const { path, mockCheck } of inventoryChecks) {
    await page.goto(baseURL + path + "?modoRevision=1&escenario=loading");
    if (mode === "api") {
      const alert = page.getByRole("alert");
      await alert.waitFor();
      const message = await alert.innerText();
      assert.match(message, /Función no disponible/);
      assert.equal(await page.getByRole("table").count(), 0);
      assert.equal(await page.locator("main form").count(), 0);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.getByText("Total unidades físicas").count(), 0);
      assert.equal(await page.getByText("Unidades disponibles").count(), 0);
      assert.equal(await page.getByText("Alertas operativas de inventario").count(), 0);
    } else {
      await mockCheck(page);
      assert.equal(
        await page.getByRole("combobox", { name: /Escenario/ }).count(),
        0,
      );
      assert.equal(await page.getByText("Función no disponible").count(), 0);
    }
    await verifyCommercialCopy();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  }
  // MK-002 Combos: rutas canónicas integradas. En mock cada ruta es operativa
  // contra el Catálogo y Pricing compartidos; en api el gate falla cerrado, sin
  // datos de demostración ni fallback silencioso a fixtures.
  const comboPaths = [
    { path: "/combos", table: true, form: false },
    { path: "/combos/nuevo", table: false, form: true },
    { path: "/combos/combo-001", table: true, form: false },
    { path: "/combos/combo-001/editar", table: false, form: true },
    { path: "/combos/combo-001/no-disponible", table: false, form: false },
  ];
  for (const { path, table, form } of comboPaths) {
    await page.goto(baseURL + path);
    if (mode === "api") {
      const alert = page.getByRole("alert");
      await alert.waitFor();
      assert.match(await alert.innerText(), /Función no disponible/);
      assert.equal(await page.getByRole("table").count(), 0);
      assert.equal(await page.locator("main form").count(), 0);
      assert.equal(await page.getByRole("dialog").count(), 0);
      assert.equal(await page.getByText("Datos de demostración", { exact: true }).count(), 0);
    } else {
      await page.getByRole("heading", { level: 1 }).waitFor();
      if (table) await page.getByRole("table").waitFor();
      if (form) await page.locator("main form").waitFor();
      assert.equal(await page.getByText("Datos de demostración", { exact: true }).count(), 0);
    }
    await verifyCommercialCopy();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  // Estado de error de listado: alerta con reintento que recupera el listado.
  if (mode === "mock") {
    await page.goto(baseURL + "/combos?scenario=list-error");
    await page.getByRole("alert").waitFor();
    assert.match(await page.getByRole("alert").innerText(), /No se pudieron consultar los combos/);
    await page.getByRole("button", { name: "Reintentar" }).click();
    await page.getByRole("table").waitFor();
    await verifyCommercialCopy();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  }
  if (mode === "mock") {
    await page.goto(baseURL + "/precios/editar?target=base");
    await page.getByRole("textbox", { name: "Nuevo precio regular", exact: true }).fill("279.90");
    await page.getByRole("textbox", { name: "Motivo del cambio", exact: true }).fill("VER-01 producción simulada");
    await page.getByRole("button", { name: "Guardar cambios", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar cambio de precio", exact: true }).click();
    await page.getByText("Precio actualizado", { exact: true }).waitFor();
    await page.getByRole("link", { name: "Historial de precios", exact: true }).click();
    await page.getByRole("row").filter({ hasText: "ZAP-TRL-EXP" }).getByRole("link", { name: /Ver detalle/ }).click();
    const detail = page.getByRole("dialog");
    await detail.getByText(/VER-01 producción simulada/).waitFor();
    assert.match(await detail.innerText(), /VER-01 producción simulada/);
    const detailText = await detail.innerText();

    assert.match(detailText, /aud-/);
    assert.doesNotMatch(detailText, /demo-pricing/);
    assert.match(detailText, /ZAP-TRL-EXP/);
    await page.getByRole("button", { name: "Volver al historial", exact: true }).click();
    await verifyCommercialCopy();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    console.log("PASS VER-01 producción: edición → asiento simulado, sin herramientas DEV");
  }
  if (mode === "api")
    assert.equal(
      requests.some((url) =>
        // Adapters de revisión, páginas Promotions/Inventory no bloqueadas y mocks de
        // Taxonomía ni en URLs de DEV (/features/taxonomy/) ni en bundles
        // compilados de dist/assets/ (chunks derivados de las páginas y el
        // servicio de taxonomía).
        /pricingChanges|createMockAuditRuntime|reviewRepository|audit-demo\.(csv|pdf)|createDemoPricingRuntime|mock[A-Z]|mockInventory|inventoryFixtures|\/prices-|\/catalogChoices-|\/promotionServices-|\/PromotionDataNotice-|\/(?:Coupon|Campaign|Recommendation|StockControl|Thresholds|Transfers|InventoryDashboard)[^/]*Page-|\/features\/taxonomy\/|\/assets\/[^/]*(?:Category(?:Tree|Create|Edit|Detail|Deactivate)|Characteristic|ProductType|Brand|Seo(?:List|Config)|SEO|taxonomyServices)[^/]*\.(?:js|css)/.test(
          url,
        ),
      ),
      false,
    );
  assert.deepEqual(errors, []);
  const totalViews = 4 + 16 + catalogPaths.length + taxonomyPaths.length + (mode === "mock" ? 4 : 0) + 5 + inventoryChecks.length + comboPaths.length + (mode === "mock" ? 1 : 0);
  console.log(
    `PASS producción ${mode}: ${totalViews} vistas de Catálogo, Promotions, Pricing S01, Auditoría S01–S05, Taxonomía, Inventario y Combos S01–S03, 1440 px, sin errores; ${mode === "api" ? "providers ausentes explícitos, reintento y persistencia del error de Pricing, taxonomía, inventario y combos bloqueados y cero carga de mocks/bundles" : "módulos presentes, tablas comerciales verificadas y controles de revisión ausentes"}.`,
  );
} finally {
  await browser.close();
}
