import { expect, test, type Page } from "@playwright/test";
import { getCatalogServices } from "../src/features/catalog/services/catalogServices";
import { __resetCharacteristicStore } from "../src/features/taxonomy/adapters/mockCharacteristicAdapter";
import { characteristicService } from "../src/features/taxonomy/services/characteristicService";

type PersistedBajaOperation = {
  operacionId: string;
  caracteristicaId: string;
  valorId: string;
  estado: "pendiente" | "confirmada" | "rechazada" | "no-concluyente";
};

async function readBajaOperations(
  page: Page,
): Promise<PersistedBajaOperation[]> {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem(
      "g6-productos-ofertas:mock:v1:taxonomy-characteristic-baja",
    );
    if (!raw) return [];
    return (JSON.parse(raw) as { data: PersistedBajaOperation[] }).data;
  });
}


type CharacteristicMockScenarios = {
  lista?: "default" | "empty" | "error";
  catalogo?: "default" | "error" | "no-encontrado";
  formulario?: "default" | "error";
  valores?: "default" | "empty" | "lista-limite" | "error";
  baja?:
    | "default"
    | "error-solicitud"
    | "pendiente-prolongado"
    | "error-consulta"
    | "rechazada-asincrona"
    | "no-concluyente";
};

async function setCharacteristicScenario(
  page: Page,
  scenarios: CharacteristicMockScenarios,
): Promise<void> {
  await page.evaluate(async (configuration) => {
    const adapterPath = "/src/features/taxonomy/adapters/mockCharacteristicAdapter.ts";
    const adapter = await import(adapterPath);
    adapter.__setCharacteristicMockScenarios(configuration);
  }, scenarios);
}

async function resetCharacteristicMock(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const adapterPath = "/src/features/taxonomy/adapters/mockCharacteristicAdapter.ts";
    const adapter = await import(adapterPath);
    adapter.__resetCharacteristicStore();
  });
}

async function reopenValues(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Volver al detalle" }).click();
  await page.getByRole("button", { name: "Gestionar valores" }).click();
  await expect(page).toHaveURL(/\/caracteristicas\/[^/]+\/valores$/);
  await expect(page.getByRole("heading", { level: 1, name: /Valores de:/ })).toBeVisible();
}

test.describe("MK-009 mock funcional", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renombrar un valor conserva su ID y actualiza las opciones mock consultadas por Catálogo", async () => {
    __resetCharacteristicStore();
    try {
      const antes = await characteristicService.listarValores("color");
      const negro = antes?.find((valor) => valor.valorId === "negro");
      expect(negro).toBeDefined();

      const renombrado = await characteristicService.renombrarValor(
        "color",
        "negro",
        "Negro grafito",
      );
      expect(renombrado.valorId).toBe("negro");

      const esquema = await getCatalogServices("mock").taxonomy.getAttributeSchema("ropa");
      const color = esquema.find((atributo) => atributo.caracteristicaId === "color");
      expect(color?.opciones).toContainEqual({ id: "negro", valor: "Negro grafito" });
      expect(color?.opciones).not.toContainEqual({ id: "negro", valor: "Negro" });
    } finally {
      __resetCharacteristicStore();
    }
  });

  test("captura evidencia de las ocho pantallas y variantes P0 a 1440 × 900", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto("/caracteristicas");
    await expect(page.getByText("Talla", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-009-s01-1440.png" });

    await page.goto("/caracteristicas/nueva");
    await expect(page.getByRole("heading", { name: "Crear característica" })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-009-s02-1440.png" });

    await page.goto("/caracteristicas/talla/editar");
    await expect(page.getByRole("textbox", { name: "Tipo" })).toHaveValue("Lista");
    await page.screenshot({ path: "docs/evidencias/mk-009-s03-1440.png" });

    await page.goto("/caracteristicas/color/valores");
    await expect(page.getByText("Negro", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-009-s04-1440.png" });
    await setCharacteristicScenario(page, { baja: "pendiente-prolongado" });
    await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
    await expect(page.getByRole("button", { name: "Consultar estado" })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-009-s04-p-1440.png" });

    await page.goto("/caracteristicas/color/valores");
    await setCharacteristicScenario(page, { baja: "rechazada-asincrona" });
    await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(page.getByRole("alert", { name: "No se pudo dar de baja el valor" })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-009-s04-r-1440.png" });

    await page.goto("/caracteristicas/material/estado");
    await expect(page.getByRole("heading", { name: "Estado de: Material" })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-009-s05-1440.png" });

    await page.goto("/caracteristicas/color");
    await expect(page.getByRole("heading", { name: "Color", level: 1 })).toBeVisible();
    await expect(page.getByText("negro", { exact: true })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-009-s06-1440.png" });
  });

  test("S01 expone su estado de carga mientras consulta el adapter mock", async ({
    page,
  }) => {
    await page.goto("/caracteristicas", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("status", { name: "Cargando listado de características" }),
    ).toBeVisible();
    await expect(page.getByText("Talla", { exact: true })).toBeVisible();
  });

  test("S01 distingue listado vacío y error con reintento; busca por tipo", async ({
    page,
  }) => {
    await page.goto("/caracteristicas");
    const search = page.getByRole("textbox", { name: "Buscar característica" });
    await search.fill("LISTA");
    await expect(page.getByText("Talla", { exact: true })).toBeVisible();
    await expect(page.getByText("Peso", { exact: true })).toHaveCount(0);
    await search.fill("");

    await setCharacteristicScenario(page, { lista: "empty" });
    await page.getByRole("button", { name: "Crear característica" }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Sin características", { exact: true })).toBeVisible();

    await setCharacteristicScenario(page, { lista: "error" });
    await page.getByRole("button", { name: "Crear característica" }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("alert")).toContainText("No se pudieron cargar las características");
    await setCharacteristicScenario(page, { lista: "default" });
    await page.getByRole("button", { name: "Volver a intentar" }).click();
    await expect(page.getByText("Talla", { exact: true })).toBeVisible();
  });

  test("S02 valida nombre y unidad NUMERO y crea usando el mock", async ({ page }) => {
    await page.goto("/caracteristicas/nueva");
    await page.getByRole("button", { name: "Crear característica", exact: true }).click();
    await expect(page.getByText("Ingresa el nombre de la característica.")).toBeVisible();

    await page.getByLabel("Nombre").fill("Peso de demostración");
    await page.getByRole("combobox", { name: "Tipo" }).click();
    await page.getByRole("option", { name: "Número" }).click();
    await page.getByRole("button", { name: "Crear característica", exact: true }).click();
    await expect(page.getByText("Ingresa la unidad (por ejemplo kg o cm).")).toBeVisible();

    await page.getByLabel("Unidad").fill("kg");
    await page.getByRole("button", { name: "Crear característica", exact: true }).click();
    await expect(page.getByRole("status", { name: "Característica creada" })).toContainText("Peso de demostración");
  });

  test("S03 mantiene el tipo inmutable y conserva entradas ante un error de guardado", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/talla/editar");
    await expect(page.getByRole("textbox", { name: "Tipo" })).toBeDisabled();
    await setCharacteristicScenario(page, { formulario: "error" });
    await page.getByLabel("Nombre").fill("Talla editada en mock");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("alert")).toContainText("No se pudo guardar");
    await expect(page.getByLabel("Nombre")).toHaveValue("Talla editada en mock");
    await expect(page.getByRole("textbox", { name: "Tipo" })).toHaveValue("Lista");
  });

  test("S04 renombra por ID, aplica límite de valores e impide mutar una característica inactiva", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/color/valores");
    const row = page.locator("tbody tr", { hasText: "Negro" });
    await expect(row).toContainText("negro");
    await row.getByRole("button", { name: "Renombrar Negro" }).click();
    await page.getByLabel("Nuevo nombre de Negro").fill("Negro grafito");
    await page.getByRole("button", { name: "Guardar nombre de Negro" }).click();
    await expect(page.getByText("Negro grafito", { exact: true })).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Negro grafito" })).toContainText("negro");

    await page.goto("/caracteristicas/talla/valores");
    await setCharacteristicScenario(page, { valores: "lista-limite" });
    await reopenValues(page);
    await expect(page.getByText("Valores permitidos activos: 50 (máx. 50)")).toBeVisible();
    await page.getByLabel("Buscar valor").fill("Valor permitido 01");
    await expect(page.getByText("1 valores visibles")).toBeVisible();
    await expect(page.getByText("Valores permitidos activos: 50 (máx. 50)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar valor" })).toBeDisabled();

    await page.goto("/caracteristicas/temporada/valores");
    await expect(page.getByRole("status", { name: "Característica inactiva" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar valor" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Renombrar Invierno" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Solicitar baja de Invierno" })).toBeDisabled();
  });

  test("S04 diferencia valores vacíos y error de lectura con reintento", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/caracteristicas/talla/valores");
    await setCharacteristicScenario(page, { valores: "empty" });
    await reopenValues(page);
    await expect(page.getByText("Sin valores permitidos", { exact: true })).toBeVisible();

    await setCharacteristicScenario(page, { valores: "error" });
    await reopenValues(page);
    await expect(page.getByRole("alert")).toContainText("No se pudieron cargar los valores");
    await resetCharacteristicMock(page);
    await page.getByRole("button", { name: "Volver a intentar" }).click();
    await expect(page.getByText("XS", { exact: true })).toBeVisible();
  });

  test("S06 presenta error de lectura y reintenta la consulta de detalle", async ({ page }) => {
    await page.goto("/caracteristicas/color");
    await setCharacteristicScenario(page, { catalogo: "error" });
    await page.getByRole("button", { name: "Volver al listado" }).click();
    await page.getByRole("button", { name: "Ver detalle de Color" }).click();
    await expect(page.getByRole("alert")).toContainText("No se pudo cargar la característica");

    await setCharacteristicScenario(page, { catalogo: "default" });
    await page.getByRole("button", { name: "Reintentar consulta" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Color" })).toBeVisible();
    await expect(page.getByText("negro", { exact: true })).toBeVisible();
  });

  test("S04-P mantiene la admisión, representa pending prolongado y no confirma una baja sin resultado", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/color/valores");
    await setCharacteristicScenario(page, { baja: "pendiente-prolongado" });
    await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
    const pending = page.getByRole("status", { name: /Solicitud de baja admitida/ });
    await expect(pending).toContainText("Solicitud de baja admitida");
    await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText("Comprobando uso");
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(pending).toContainText("La comprobación sigue pendiente");
    await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText("Comprobando uso");
  });

  test("S04-P conserva el valor ante error/no concluyente y S04-R conserva uso activo", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/color/valores");
    await setCharacteristicScenario(page, { baja: "error-consulta" });
    await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(page.getByRole("alert")).toContainText("No se pudo consultar el resultado");
    await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText("Activo");
    await page.getByRole("button", { name: "Cerrar" }).click();

    await setCharacteristicScenario(page, { baja: "no-concluyente" });
    await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(
      page.getByRole("status", { name: "Verificación no concluyente" }),
    ).toContainText("No pudimos confirmar");
    await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText("Activo");
    await page.getByRole("button", { name: "Entendido" }).click();

    await setCharacteristicScenario(page, { baja: "rechazada-asincrona" });
    await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(page.getByRole("alert")).toContainText("No se pudo dar de baja el valor");
    await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText("Activo");
  });

  test("S05 conserva el identificador al desactivar/reactivar y S06 muestra IDs estables", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/material/estado");
    await page.getByRole("button", { name: "Desactivar característica" }).click();
    await expect(page.getByRole("status", { name: "Estado actualizado" })).toContainText("Inactivo");
    await page.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByText("material", { exact: true })).toBeVisible();
    await expect(page.getByText("Inactivo", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Cambiar estado" }).click();
    await page.getByRole("button", { name: "Activar característica" }).click();
    await expect(page.getByRole("status", { name: "Estado actualizado" })).toContainText("Activo");
    await page.getByRole("button", { name: "Ver detalle" }).click();
    await expect(page.getByText("material", { exact: true })).toBeVisible();

    await page.goto("/caracteristicas/color");
    await expect(page.getByText("color", { exact: true })).toBeVisible();
    await expect(page.getByText("negro", { exact: true })).toBeVisible();
    await expect(page.getByText("Negro", { exact: true })).toBeVisible();
  });

  test("Catálogo efectivo oculta un valor con baja pendiente y lo descarta al confirmar", async () => {
    __resetCharacteristicStore();
    try {
      const taxonomia = getCatalogServices("mock").taxonomy;
      const antes = await taxonomia.getAttributeSchema("ropa");
      expect(
        antes.find((atributo) => atributo.caracteristicaId === "color")?.opciones,
      ).toContainEqual({ id: "negro", valor: "Negro" });

      const solicitud = await characteristicService.solicitarBajaValor("color", "negro");
      expect(solicitud.resultado).toBe("pendiente");

      const durante = await taxonomia.getAttributeSchema("ropa");
      const colorDurante = durante.find(
        (atributo) => atributo.caracteristicaId === "color",
      );
      expect(colorDurante?.opciones).not.toContainEqual({ id: "negro", valor: "Negro" });
      expect(colorDurante?.opciones).toContainEqual({ id: "blanco", valor: "Blanco" });

      const seguimiento = await characteristicService.consultarEstadoOperacion(
        solicitud.operacionId!,
      );
      expect(seguimiento.estado).toBe("confirmada");

      const despues = await taxonomia.getAttributeSchema("ropa");
      expect(
        despues.find((atributo) => atributo.caracteristicaId === "color")?.opciones,
      ).not.toContainEqual({ id: "negro", valor: "Negro" });
    } finally {
      __resetCharacteristicStore();
    }
  });

  test("S04 rechaza etiquetas duplicadas normalizadas y conserva el valorId original", async () => {
    __resetCharacteristicStore();
    try {
      await expect(
        characteristicService.renombrarValor("color", "negro", "  BLANCO  "),
      ).rejects.toThrow("Ya existe un valor con ese nombre en esta característica.");
      const sinCambios = await characteristicService.listarValores("color");
      expect(sinCambios?.find((valor) => valor.valorId === "negro")?.nombre).toBe("Negro");

      const renombrado = await characteristicService.renombrarValor(
        "color",
        "negro",
        "Negro Grafito",
      );
      expect(renombrado.valorId).toBe("negro");
      expect(renombrado.nombre).toBe("Negro Grafito");
    } finally {
      __resetCharacteristicStore();
    }
  });

  test("S04-R rechaza desde la interfaz un nombre duplicado y conserva el valorId", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/color/valores");
    const fila = page.locator("tbody tr", { hasText: "Blanco" });
    await fila.getByRole("button", { name: "Renombrar Blanco" }).click();
    await page.getByLabel("Nuevo nombre de Blanco").fill("  negro  ");
    await page.getByRole("button", { name: "Guardar nombre de Blanco" }).click();
    await expect(
      page.getByText("Ya existe un valor con ese nombre en esta característica."),
    ).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Blanco" })).toContainText(
      "blanco",
    );
    await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText(
      "negro",
    );
  });

  test("S04-R recupera una baja pendiente tras recargar sin reenviar la solicitud", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/color/valores");
    await setCharacteristicScenario(page, { baja: "pendiente-prolongado" });
    await page.getByRole("button", { name: "Solicitar baja de Negro" }).click();
    await expect(
      page.getByRole("status", { name: /Solicitud de baja admitida/ }),
    ).toBeVisible();

    const antes = await readBajaOperations(page);
    expect(antes).toHaveLength(1);
    expect(antes[0]!.estado).toBe("pendiente");

    await page.reload();
    await expect(
      page.getByRole("status", { name: /Solicitud de baja admitida/ }),
    ).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Negro" })).toContainText(
      "Comprobando uso",
    );

    const despues = await readBajaOperations(page);
    expect(despues).toHaveLength(1);
    expect(despues[0]!.operacionId).toBe(antes[0]!.operacionId);
  });

  test("S04-R no reutiliza el operacionId tras recargar y conserva el historial resuelto", async ({
    page,
  }) => {
    await page.goto("/caracteristicas/talla/valores");
    await page.getByRole("button", { name: "Solicitar baja de M" }).click();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(page.getByRole("alert")).toContainText("No se pudo dar de baja el valor");

    const historial = await readBajaOperations(page);
    expect(historial).toHaveLength(1);
    const rechazada = historial[0]!;
    expect(rechazada.estado).toBe("rechazada");

    await page.reload();
    await page.getByRole("button", { name: "Solicitar baja de M" }).click();
    await expect(
      page.getByRole("status", { name: /Solicitud de baja admitida/ }),
    ).toBeVisible();

    const actualizado = await readBajaOperations(page);
    expect(actualizado).toHaveLength(2);
    expect(
      actualizado.find((operacion) => operacion.operacionId === rechazada.operacionId)
        ?.estado,
    ).toBe("rechazada");
    const nueva = actualizado.find(
      (operacion) => operacion.operacionId !== rechazada.operacionId,
    );
    expect(nueva?.estado).toBe("pendiente");
    expect(nueva?.operacionId).not.toBe(rechazada.operacionId);

    const consultaAnterior = await page.evaluate(async (operacionId) => {
      const adapterPath =
        "/src/features/taxonomy/adapters/mockCharacteristicAdapter.ts";
      const adapter = await import(adapterPath);
      return adapter.mockCharacteristicAdapter.consultarEstadoOperacion(operacionId);
    }, rechazada.operacionId);
    expect(consultaAnterior.estado).toBe("rechazada");
  });
});
