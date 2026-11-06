import { expect, test, type Page } from "@playwright/test";
import { productTypeService } from "../src/features/taxonomy/services/productTypeService";
import { characteristicService } from "../src/features/taxonomy/services/characteristicService";
import {
  __resetProductTypeStore,
  __setProductTypeMockScenarios,
} from "../src/features/taxonomy/adapters/mockProductTypeAdapter";
import { __resetCharacteristicStore } from "../src/features/taxonomy/adapters/mockCharacteristicAdapter";

type ProductTypeScenario = {
  lista?: "default" | "empty" | "error";
  verificacion?:
    | "default"
    | "clear"
    | "en-uso"
    | "no-concluyente"
    | "pendiente-prolongado"
    | "error-consulta";
};

type BrowserProductTypeSnapshot = {
  tipoProductoId: string;
  estado: "Activo" | "Inactivo";
  schemaVersion: number;
  asociadas: { caracteristicaId: string; obligatoria: boolean }[];
};

async function setProductTypeScenario(
  page: Page,
  scenarios: ProductTypeScenario,
): Promise<void> {
  await page.evaluate(async (configuration) => {
    const adapterPath =
      "/src/features/taxonomy/adapters/mockProductTypeAdapter.ts";
    const adapter = await import(adapterPath);
    adapter.__setProductTypeMockScenarios(configuration);
  }, scenarios);
}

async function resetProductTypeMock(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const adapterPath =
      "/src/features/taxonomy/adapters/mockProductTypeAdapter.ts";
    const adapter = await import(adapterPath);
    adapter.__resetProductTypeStore();
  });
}

async function createTypeInBrowser(
  page: Page,
  nombre: string,
): Promise<string> {
  return page.evaluate(async (value) => {
    const adapterPath =
      "/src/features/taxonomy/adapters/mockProductTypeAdapter.ts";
    const adapter = await import(adapterPath);
    const result = await adapter.mockProductTypeAdapter.crear({ nombre: value });
    return result.tipoProductoId as string;
  }, nombre);
}

async function listTypeIdsInBrowser(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const adapterPath =
      "/src/features/taxonomy/adapters/mockProductTypeAdapter.ts";
    const adapter = await import(adapterPath);
    const result = await adapter.mockProductTypeAdapter.list();
    return result.items.map(
      (item: { tipoProductoId: string }) => item.tipoProductoId,
    );
  });
}

async function readProductTypeInBrowser(
  page: Page,
  id: string,
): Promise<BrowserProductTypeSnapshot | null> {
  return page.evaluate(async (tipoProductoId) => {
    const adapterPath =
      "/src/features/taxonomy/adapters/mockProductTypeAdapter.ts";
    const adapter = await import(adapterPath);
    const detalle = await adapter.mockProductTypeAdapter.obtener(
      tipoProductoId,
    );
    if (!detalle) return null;
    return {
      tipoProductoId: detalle.tipoProductoId,
      estado: detalle.estado,
      schemaVersion: detalle.schemaVersion,
      asociadas: detalle.asociadas.map(
        (asoc: { caracteristicaId: string; obligatoria: boolean }) => ({
          caracteristicaId: asoc.caracteristicaId,
          obligatoria: asoc.obligatoria,
        }),
      ),
    };
  }, id);
}

test.describe("MK-010 Tipos de producto y esquemas de caracteristicas", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(() => {
    __resetProductTypeStore();
    __resetCharacteristicStore();
  });

  test.afterEach(() => {
    __resetProductTypeStore();
    __resetCharacteristicStore();
  });

  test("CA-01 y CA-07: asocia caracteristica activa indicando condicion e incrementa schema_version", async () => {
    const tipo = await productTypeService.crear({ nombre: "Zapatilla Trail QA" });
    expect(tipo.schemaVersion).toBe(0);

    const asociado = await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "talla",
      obligatoria: true,
    });

    expect(asociado).not.toBeNull();
    expect(asociado?.schemaVersion).toBe(1);
    expect(asociado?.caracteristicasAsignadas).toBe(1);
    expect(asociado?.asociadas[0]?.caracteristicaId).toBe("talla");
    expect(asociado?.asociadas[0]?.obligatoria).toBe(true);
  });

  test("CA-02: rechaza asociacion duplicada (409 ASOCIACION_DUPLICADA) sin alterar el esquema", async () => {
    const tipo = await productTypeService.crear({ nombre: "Calzado Duplicado QA" });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "color",
      obligatoria: false,
    });

    await expect(
      productTypeService.asociarCaracteristica({
        tipoProductoId: tipo.tipoProductoId,
        caracteristicaId: "color",
        obligatoria: true,
      }),
    ).rejects.toThrow("ASOCIACION_DUPLICADA");

    const detalle = await productTypeService.obtener(tipo.tipoProductoId);
    expect(detalle?.schemaVersion).toBe(1);
    expect(detalle?.caracteristicasAsignadas).toBe(1);
  });

  test("CA-02: rechaza caracteristica inactiva sin alterar el esquema", async () => {
    const tipo = await productTypeService.crear({ nombre: "Tipo Inactiva QA" });

    await expect(
      productTypeService.asociarCaracteristica({
        tipoProductoId: tipo.tipoProductoId,
        caracteristicaId: "temporada",
        obligatoria: false,
      }),
    ).rejects.toThrow("CARACTERISTICA_NO_DISPONIBLE");

    const detalle = await productTypeService.obtener(tipo.tipoProductoId);
    expect(detalle?.schemaVersion).toBe(0);
    expect(detalle?.caracteristicasAsignadas).toBe(0);
  });

  test("CA-03: rechaza asociacion cuando se supera MAX_PRODUCT_TYPE_ATTRIBUTES (20)", async () => {
    test.setTimeout(40000);
    const tipo = await productTypeService.crear({ nombre: "Tipo Limite QA" });
    // Asociar 20 caracteristicas
    for (let i = 1; i <= 20; i++) {
      const c = await characteristicService.crear({
        nombre: `Caract Extra QA ${i}`,
        tipo: "TEXTO",
        estado: "Activo",
      });
      await productTypeService.asociarCaracteristica({
        tipoProductoId: tipo.tipoProductoId,
        caracteristicaId: c.id,
        obligatoria: false,
      });
    }

    const c21 = await characteristicService.crear({
      nombre: "Caract 21 Rebasada QA",
      tipo: "TEXTO",
      estado: "Activo",
    });

    await expect(
      productTypeService.asociarCaracteristica({
        tipoProductoId: tipo.tipoProductoId,
        caracteristicaId: c21.id,
        obligatoria: false,
      }),
    ).rejects.toThrow(/l.mite/i);
  });

  test("CA-04: consulta de esquema sin asociaciones devuelve lista vacia", async () => {
    const detalle = await productTypeService.obtener("accesorios");
    expect(detalle).not.toBeNull();
    expect(detalle?.asociadas).toEqual([]);
    expect(detalle?.caracteristicasAsignadas).toBe(0);
    expect(detalle?.limiteCaracteristicas).toBe(20);
  });

  test("CA-06: cambia obligatoriedad e incrementa schema_version solo con un cambio confirmado", async () => {
    test.setTimeout(30000);
    const tipo = await productTypeService.crear({ nombre: "Tipo Condicion QA" });
    const asociado = await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "material",
      obligatoria: false,
    });
    expect(asociado?.schemaVersion).toBe(1);

    const obligatoria = await productTypeService.actualizarObligatoriedad({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "material",
      obligatoria: true,
    });
    expect(obligatoria?.schemaVersion).toBe(2);
    expect(obligatoria?.asociadas[0]?.obligatoria).toBe(true);

    // Repetir la misma condición es idempotente: no incrementa la versión.
    const repetida = await productTypeService.actualizarObligatoriedad({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "material",
      obligatoria: true,
    });
    expect(repetida?.schemaVersion).toBe(2);

    // La UI no auto-desactiva productos: la asociación sigue existiendo y el
    // tipo permanece Activo; el mock no modela productos para afirmar más.
    expect(repetida?.estado).toBe("Activo");
    expect(repetida?.caracteristicasAsignadas).toBe(1);
  });

  test("CA-08 y CA-09: desasociacion 202 confirmada, rechazada y no concluyente conserva el esquema", async () => {
    test.setTimeout(40000);

    const tipoSeguro = await productTypeService.crear({
      nombre: "Tipo Desasocio Seguro QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipoSeguro.tipoProductoId,
      caracteristicaId: "talla",
      obligatoria: true,
    });
    const pendiente = await productTypeService.desasociarCaracteristica(
      tipoSeguro.tipoProductoId,
      "talla",
    );
    expect(pendiente.resultado).toBe("pendiente");
    expect(pendiente.operacionId).toBeTruthy();
    const antesDeConfirmar = await productTypeService.obtener(
      tipoSeguro.tipoProductoId,
    );
    expect(antesDeConfirmar?.schemaVersion).toBe(1);
    expect(antesDeConfirmar?.caracteristicasAsignadas).toBe(1);

    const confirmada = await productTypeService.consultarEstadoOperacion(
      pendiente.operacionId!,
    );
    expect(confirmada.estado).toBe("confirmada");
    expect(confirmada.tipoProducto?.schemaVersion).toBe(2);
    expect(confirmada.tipoProducto?.caracteristicasAsignadas).toBe(0);
    expect(confirmada.mensaje).toContain("se desasoció");

    __setProductTypeMockScenarios({ verificacion: "en-uso" });
    const tipoEnUso = await productTypeService.crear({
      nombre: "Tipo Rechazo Uso QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipoEnUso.tipoProductoId,
      caracteristicaId: "color",
      obligatoria: true,
    });
    const pendienteUso = await productTypeService.desasociarCaracteristica(
      tipoEnUso.tipoProductoId,
      "color",
    );
    expect(pendienteUso.resultado).toBe("pendiente");
    const rechazada = await productTypeService.consultarEstadoOperacion(
      pendienteUso.operacionId!,
    );
    expect(rechazada.estado).toBe("rechazada");
    expect(rechazada.tipoProducto?.schemaVersion).toBe(1);
    expect(rechazada.tipoProducto?.caracteristicasAsignadas).toBe(1);
    expect(rechazada.mensaje).toContain("productos o variantes activos");
    expect(rechazada.mensaje).toContain("se conservan");

    __setProductTypeMockScenarios({ verificacion: "no-concluyente" });
    const tipoNoConcluyente = await productTypeService.crear({
      nombre: "Tipo No Concluyente QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipoNoConcluyente.tipoProductoId,
      caracteristicaId: "peso",
      obligatoria: true,
    });
    const pendienteNoConcluyente =
      await productTypeService.desasociarCaracteristica(
        tipoNoConcluyente.tipoProductoId,
        "peso",
      );
    const noConcluyente = await productTypeService.consultarEstadoOperacion(
      pendienteNoConcluyente.operacionId!,
    );
    expect(noConcluyente.estado).toBe("no-concluyente");
    expect(noConcluyente.tipoProducto?.schemaVersion).toBe(1);
    expect(noConcluyente.tipoProducto?.caracteristicasAsignadas).toBe(1);
    expect(noConcluyente.mensaje).toContain("No pudimos confirmar");
  });

  test("CA-09 y CA-10: desactivacion segura y reactivacion conservan id, asociaciones y schema_version", async () => {
    test.setTimeout(40000);

    __setProductTypeMockScenarios({ verificacion: "en-uso" });
    const rechazoUso = await productTypeService.desactivar("ropa");
    expect(rechazoUso.resultado).toBe("pendiente");
    expect(rechazoUso.operacionId).toBeTruthy();
    const rechazada = await productTypeService.consultarEstadoOperacion(
      rechazoUso.operacionId!,
    );
    expect(rechazada.estado).toBe("rechazada");
    expect(rechazada.tipoProducto?.estado).toBe("Activo");
    expect(rechazada.tipoProducto?.schemaVersion).toBe(3);
    expect(rechazada.tipoProducto?.caracteristicasAsignadas).toBe(3);

    __setProductTypeMockScenarios({ verificacion: "no-concluyente" });
    const intentoNoConcluyente = await productTypeService.desactivar("ropa");
    const noConcluyente = await productTypeService.consultarEstadoOperacion(
      intentoNoConcluyente.operacionId!,
    );
    expect(noConcluyente.estado).toBe("no-concluyente");
    expect(noConcluyente.tipoProducto?.estado).toBe("Activo");
    expect(noConcluyente.tipoProducto?.schemaVersion).toBe(3);

    __setProductTypeMockScenarios({ verificacion: "clear" });
    const pendiente = await productTypeService.desactivar("ropa");
    expect(pendiente.resultado).toBe("pendiente");
    const confirmada = await productTypeService.consultarEstadoOperacion(
      pendiente.operacionId!,
    );
    expect(confirmada.estado).toBe("confirmada");
    expect(confirmada.tipoProducto?.estado).toBe("Inactivo");
    expect(confirmada.tipoProducto?.schemaVersion).toBe(3);
    expect(confirmada.tipoProducto?.caracteristicasAsignadas).toBe(3);
    expect(
      await productTypeService.listarCaracteristicasDisponibles("ropa"),
    ).toEqual([]);

    const reactivado = await productTypeService.reactivar("ropa");
    expect(reactivado?.tipoProductoId).toBe("ropa");
    expect(reactivado?.estado).toBe("Activo");
    expect(reactivado?.schemaVersion).toBe(3);
    expect(reactivado?.caracteristicasAsignadas).toBe(3);
    expect(
      reactivado?.asociadas.map((asoc) => asoc.caracteristicaId),
    ).toEqual(["talla", "color", "temporada"]);

    const listado = await productTypeService.list();
    expect(
      listado.items.filter((item) => item.tipoProductoId === "ropa"),
    ).toHaveLength(1);

    await expect(productTypeService.reactivar("ropa")).rejects.toThrow(
      "TIPO_PRODUCTO_INVALIDO",
    );
  });

  test("CA-06 y CA-09: operaciones invalidas conservan schema_version y asociaciones", async () => {
    test.setTimeout(30000);
    const tipo = await productTypeService.crear({
      nombre: "Tipo Operaciones Invalidas QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "material",
      obligatoria: false,
    });

    await expect(
      productTypeService.actualizarObligatoriedad({
        tipoProductoId: tipo.tipoProductoId,
        caracteristicaId: "talla",
        obligatoria: true,
      }),
    ).rejects.toThrow("ASOCIACION_NO_ENCONTRADA");

    const desactivado = await productTypeService.desactivar(
      tipo.tipoProductoId,
    );
    expect(desactivado.resultado).toBe("pendiente");
    expect(desactivado.operacionId).toBeTruthy();
    const desactivacionConfirmada =
      await productTypeService.consultarEstadoOperacion(
        desactivado.operacionId!,
      );
    expect(desactivacionConfirmada.estado).toBe("confirmada");
    expect(desactivacionConfirmada.tipoProducto?.estado).toBe("Inactivo");

    await expect(
      productTypeService.asociarCaracteristica({
        tipoProductoId: tipo.tipoProductoId,
        caracteristicaId: "color",
        obligatoria: false,
      }),
    ).rejects.toThrow("TIPO_PRODUCTO_INVALIDO");

    await expect(
      productTypeService.actualizarObligatoriedad({
        tipoProductoId: tipo.tipoProductoId,
        caracteristicaId: "material",
        obligatoria: true,
      }),
    ).rejects.toThrow("TIPO_PRODUCTO_INVALIDO");

    const detalle = await productTypeService.obtener(tipo.tipoProductoId);
    expect(detalle?.schemaVersion).toBe(1);
    expect(detalle?.caracteristicasAsignadas).toBe(1);
    expect(detalle?.asociadas[0]?.obligatoria).toBe(false);

    const reactivado = await productTypeService.reactivar(
      tipo.tipoProductoId,
    );
    expect(reactivado?.estado).toBe("Activo");
    expect(reactivado?.schemaVersion).toBe(1);
    expect(reactivado?.caracteristicasAsignadas).toBe(1);
  });

  test("CA-08: rechaza la desasociación si schema_version cambió durante la verificación", async () => {
    test.setTimeout(40000);
    const tipo = await productTypeService.crear({
      nombre: "Tipo Version Obsoleta QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "material",
      obligatoria: false,
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "color",
      obligatoria: true,
    });

    const pendiente = await productTypeService.desasociarCaracteristica(
      tipo.tipoProductoId,
      "material",
    );
    expect(pendiente.resultado).toBe("pendiente");

    // El esquema cambia mientras la baja sigue en verificación. La operación se
    // admitió con v2 y ya no puede aplicarse sobre la versión v3.
    const actualizado = await productTypeService.actualizarObligatoriedad({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "color",
      obligatoria: false,
    });
    expect(actualizado?.schemaVersion).toBe(3);

    const rechazada = await productTypeService.consultarEstadoOperacion(
      pendiente.operacionId!,
    );
    expect(rechazada.estado).toBe("rechazada");
    expect(rechazada.mensaje).toContain("v2");
    expect(rechazada.mensaje).toContain("v3");
    expect(rechazada.mensaje).toContain("se conservan");
    expect(rechazada.tipoProducto?.schemaVersion).toBe(3);
    expect(rechazada.tipoProducto?.caracteristicasAsignadas).toBe(2);
    expect(
      rechazada.tipoProducto?.asociadas.map((asoc) => asoc.caracteristicaId),
    ).toEqual(["material", "color"]);

    // Reintentar con la versión vigente sí permite confirmar la baja.
    const reintento = await productTypeService.desasociarCaracteristica(
      tipo.tipoProductoId,
      "material",
    );
    const confirmada = await productTypeService.consultarEstadoOperacion(
      reintento.operacionId!,
    );
    expect(confirmada.estado).toBe("confirmada");
    expect(confirmada.tipoProducto?.schemaVersion).toBe(4);
    expect(confirmada.tipoProducto?.caracteristicasAsignadas).toBe(1);
  });

  test("CA-11: rechaza la desactivación si schema_version cambió durante la verificación", async () => {
    test.setTimeout(30000);
    const tipo = await productTypeService.crear({
      nombre: "Tipo Desactiva Version Obsoleta QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "talla",
      obligatoria: true,
    });

    const pendiente = await productTypeService.desactivar(
      tipo.tipoProductoId,
    );
    expect(pendiente.resultado).toBe("pendiente");

    const actualizado = await productTypeService.actualizarObligatoriedad({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "talla",
      obligatoria: false,
    });
    expect(actualizado?.schemaVersion).toBe(2);

    const rechazada = await productTypeService.consultarEstadoOperacion(
      pendiente.operacionId!,
    );
    expect(rechazada.estado).toBe("rechazada");
    expect(rechazada.mensaje).toContain("v1");
    expect(rechazada.mensaje).toContain("v2");
    expect(rechazada.tipoProducto?.estado).toBe("Activo");
    expect(rechazada.tipoProducto?.schemaVersion).toBe(2);
    expect(rechazada.tipoProducto?.caracteristicasAsignadas).toBe(1);
    expect(rechazada.tipoProducto?.asociadas[0]?.caracteristicaId).toBe("talla");
  });

  test("CA-08 y CA-11: rechaza una desasociación pendiente si el tipo fue desactivado", async () => {
    test.setTimeout(40000);
    const tipo = await productTypeService.crear({
      nombre: "Tipo Concurrencia QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "talla",
      obligatoria: true,
    });

    const desasocio = await productTypeService.desasociarCaracteristica(
      tipo.tipoProductoId,
      "talla",
    );
    const desactivacion = await productTypeService.desactivar(
      tipo.tipoProductoId,
    );
    expect(desasocio.resultado).toBe("pendiente");
    expect(desactivacion.resultado).toBe("pendiente");
    expect(desactivacion.operacionId).not.toBe(desasocio.operacionId);

    // La desactivación se confirma primero y deja el tipo Inactivo.
    const tipoDesactivado = await productTypeService.consultarEstadoOperacion(
      desactivacion.operacionId!,
    );
    expect(tipoDesactivado.estado).toBe("confirmada");
    expect(tipoDesactivado.tipoProducto?.estado).toBe("Inactivo");
    expect(tipoDesactivado.tipoProducto?.schemaVersion).toBe(1);

    // La desasociación sigue admitida con la misma versión, pero ya no puede
    // aplicarse porque el tipo dejó de estar Activo.
    const asocioRechazado = await productTypeService.consultarEstadoOperacion(
      desasocio.operacionId!,
    );
    expect(asocioRechazado.estado).toBe("rechazada");
    expect(asocioRechazado.mensaje).toContain("Inactivo");
    expect(asocioRechazado.tipoProducto?.estado).toBe("Inactivo");
    expect(asocioRechazado.tipoProducto?.schemaVersion).toBe(1);
    expect(asocioRechazado.tipoProducto?.caracteristicasAsignadas).toBe(1);
    expect(
      asocioRechazado.tipoProducto?.asociadas[0]?.caracteristicaId,
    ).toBe("talla");
  });

  test("CA-08 y CA-11: los IDs únicos no reemplazan operaciones pendientes", async () => {
    test.setTimeout(50000);
    const tipo = await productTypeService.crear({
      nombre: "Tipo IDs Operaciones QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "material",
      obligatoria: false,
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "color",
      obligatoria: true,
    });

    const primera = await productTypeService.desasociarCaracteristica(
      tipo.tipoProductoId,
      "material",
    );
    const segunda = await productTypeService.desasociarCaracteristica(
      tipo.tipoProductoId,
      "material",
    );
    expect(segunda.operacionId).not.toBe(primera.operacionId);

    // Confirmar la primera no debe verse afectado por la segunda solicitud.
    const primeraConfirmada = await productTypeService.consultarEstadoOperacion(
      primera.operacionId!,
    );
    expect(primeraConfirmada.estado).toBe("confirmada");
    expect(primeraConfirmada.tipoProducto?.schemaVersion).toBe(3);
    expect(primeraConfirmada.tipoProducto?.caracteristicasAsignadas).toBe(1);

    // La segunda conserva su propia correlación y detecta la versión obsoleta.
    const segundaRechazada = await productTypeService.consultarEstadoOperacion(
      segunda.operacionId!,
    );
    expect(segundaRechazada.estado).toBe("rechazada");
    expect(segundaRechazada.mensaje).toContain("v2");
    expect(segundaRechazada.mensaje).toContain("v3");

    const tipoDesactivar = await productTypeService.crear({
      nombre: "Tipo IDs Desactivacion QA",
    });
    const primeraDesactivacion = await productTypeService.desactivar(
      tipoDesactivar.tipoProductoId,
    );
    const segundaDesactivacion = await productTypeService.desactivar(
      tipoDesactivar.tipoProductoId,
    );
    expect(segundaDesactivacion.operacionId).not.toBe(
      primeraDesactivacion.operacionId,
    );

    const desactivacionConfirmada =
      await productTypeService.consultarEstadoOperacion(
        primeraDesactivacion.operacionId!,
      );
    expect(desactivacionConfirmada.estado).toBe("confirmada");
    expect(desactivacionConfirmada.tipoProducto?.estado).toBe("Inactivo");

    const desactivacionRechazada =
      await productTypeService.consultarEstadoOperacion(
        segundaDesactivacion.operacionId!,
      );
    expect(desactivacionRechazada.estado).toBe("rechazada");
    expect(desactivacionRechazada.mensaje).toContain("Inactivo");
    expect(desactivacionRechazada.tipoProducto?.estado).toBe("Inactivo");
  });

  test("CA-11: invalida una desactivación pendiente tras desactivar y reactivar", async () => {
    test.setTimeout(40000);
    const tipo = await productTypeService.crear({
      nombre: "Tipo Ciclo Vida Desactivacion QA",
    });
    const primera = await productTypeService.desactivar(tipo.tipoProductoId);
    const segunda = await productTypeService.desactivar(tipo.tipoProductoId);
    expect(primera.resultado).toBe("pendiente");
    expect(segunda.resultado).toBe("pendiente");
    expect(segunda.operacionId).not.toBe(primera.operacionId);

    const primeraConfirmada = await productTypeService.consultarEstadoOperacion(
      primera.operacionId!,
    );
    expect(primeraConfirmada.estado).toBe("confirmada");
    expect(primeraConfirmada.tipoProducto?.estado).toBe("Inactivo");

    const reactivado = await productTypeService.reactivar(tipo.tipoProductoId);
    expect(reactivado?.estado).toBe("Activo");
    expect(reactivado?.schemaVersion).toBe(0);

    // La segunda desactivación se admitió antes del ciclo desactivar/reactivar.
    // Aunque schemaVersion sigue en v0, ya no puede volver a desactivar el tipo.
    const segundaConsultada = await productTypeService.consultarEstadoOperacion(
      segunda.operacionId!,
    );
    expect(segundaConsultada.estado).toBe("rechazada");
    expect(segundaConsultada.mensaje).toContain(
      "estado del tipo de producto cambió",
    );
    expect(segundaConsultada.tipoProducto?.estado).toBe("Activo");
    expect(segundaConsultada.tipoProducto?.schemaVersion).toBe(0);
  });

  test("CA-08 y CA-11: invalida una desasociación pendiente tras desactivar y reactivar", async () => {
    test.setTimeout(45000);
    const tipo = await productTypeService.crear({
      nombre: "Tipo Ciclo Vida Desasociacion QA",
    });
    await productTypeService.asociarCaracteristica({
      tipoProductoId: tipo.tipoProductoId,
      caracteristicaId: "talla",
      obligatoria: true,
    });

    const desasocio = await productTypeService.desasociarCaracteristica(
      tipo.tipoProductoId,
      "talla",
    );
    const desactivacion = await productTypeService.desactivar(
      tipo.tipoProductoId,
    );
    expect(desasocio.resultado).toBe("pendiente");
    expect(desactivacion.resultado).toBe("pendiente");

    const desactivacionConfirmada =
      await productTypeService.consultarEstadoOperacion(
        desactivacion.operacionId!,
      );
    expect(desactivacionConfirmada.estado).toBe("confirmada");
    expect(desactivacionConfirmada.tipoProducto?.estado).toBe("Inactivo");

    const reactivado = await productTypeService.reactivar(tipo.tipoProductoId);
    expect(reactivado?.estado).toBe("Activo");
    expect(reactivado?.schemaVersion).toBe(1);

    const desasocioConsultado =
      await productTypeService.consultarEstadoOperacion(desasocio.operacionId!);
    expect(desasocioConsultado.estado).toBe("rechazada");
    expect(desasocioConsultado.mensaje).toContain(
      "estado del tipo de producto cambió",
    );
    expect(desasocioConsultado.mensaje).toContain(
      "La asociación y la versión del esquema se conservan.",
    );
    expect(desasocioConsultado.tipoProducto?.estado).toBe("Activo");
    expect(desasocioConsultado.tipoProducto?.schemaVersion).toBe(1);
    expect(desasocioConsultado.tipoProducto?.caracteristicasAsignadas).toBe(1);
    expect(
      desasocioConsultado.tipoProducto?.asociadas[0]?.caracteristicaId,
    ).toBe("talla");

    // Una operación admitida después de la reactivación sí puede confirmarse.
    const nuevaDesasociacion =
      await productTypeService.desasociarCaracteristica(
        tipo.tipoProductoId,
        "talla",
      );
    const nuevaConfirmada = await productTypeService.consultarEstadoOperacion(
      nuevaDesasociacion.operacionId!,
    );
    expect(nuevaConfirmada.estado).toBe("confirmada");
    expect(nuevaConfirmada.tipoProducto?.schemaVersion).toBe(2);
    expect(nuevaConfirmada.tipoProducto?.caracteristicasAsignadas).toBe(0);
  });

  test("S01-E: distingue listado vacio y error, permite crear el primero y reintentar", async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.goto("/tipos-producto");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tipos de producto" }),
    ).toBeVisible();
    await expect(page.getByText("Calzado deportivo")).toBeVisible();

    await setProductTypeScenario(page, { lista: "empty" });
    await page.getByRole("button", { name: "Nuevo tipo de producto" }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByText("Sin tipos de producto")).toBeVisible();
    const crearPrimero = page.getByRole("button", {
      name: "Crear tipo de producto",
    });
    await expect(crearPrimero).toBeVisible();
    await crearPrimero.click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Nuevo tipo de producto" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Cancelar" }).click();

    await setProductTypeScenario(page, { lista: "error" });
    await page.getByRole("button", { name: "Nuevo tipo de producto" }).click();
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "No se pudieron cargar los tipos de producto",
    );
    await expect(
      page.getByRole("button", { name: "Volver a intentar" }),
    ).toBeVisible();

    await setProductTypeScenario(page, { lista: "default" });
    await page.getByRole("button", { name: "Volver a intentar" }).click();
    await expect(page.getByText("Calzado deportivo")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Volver a intentar" }),
    ).toHaveCount(0);
  });

  test("S02 y S03: asocia, evita duplicados y no ofrece caracteristicas inactivas", async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.goto("/tipos-producto");
    await page.getByRole("button", { name: "Nuevo tipo de producto" }).click();
    await page.getByLabel("Nombre").fill("Zapatilla UI QA");
    await page.getByRole("button", { name: "Crear tipo de producto" }).click();

    await expect(page).toHaveURL(/\/tipos-producto\/zapatilla-ui-qa$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Zapatilla UI QA" }),
    ).toBeVisible();
    await expect(page.getByText("v0", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Asociar característica" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Asociar característica" }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Característica activa" }).click();
    await expect(page.getByRole("option", { name: /Talla/ })).toBeVisible();
    await expect(page.getByRole("option", { name: /Temporada/ })).toHaveCount(0);
    await page.getByRole("option", { name: /Talla/ }).click();
    await page.getByRole("button", { name: "Asociar", exact: true }).click();

    await expect(page).toHaveURL(/\/tipos-producto\/zapatilla-ui-qa$/);
    const tallaRow = page.locator("tbody tr", { hasText: "Talla" }).first();
    await expect(tallaRow.getByText("Obligatoria", { exact: true })).toBeVisible();
    await expect(page.getByText("v1", { exact: true })).toBeVisible();
    await expect(page.getByText("1 de 20")).toBeVisible();

    await page.getByRole("button", { name: "Asociar característica" }).click();
    await page.getByRole("combobox", { name: "Característica activa" }).click();
    await expect(page.getByRole("option", { name: /Talla/ })).toHaveCount(0);
    await expect(page.getByRole("option", { name: /Temporada/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Zapatilla UI QA" }),
    ).toBeVisible();
  });

  test("S02: alterna obligatoria y opcional incrementando schema_version solo al cambiar", async ({
    page,
  }) => {
    test.setTimeout(45000);
    await page.goto("/tipos-producto/calzado");
    await expect(
      page.getByRole("heading", { level: 1, name: "Calzado deportivo" }),
    ).toBeVisible();
    await expect(page.getByText("v4", { exact: true })).toBeVisible();

    const materialSwitch = page.getByRole("switch", {
      name: "Condición obligatoria de Material",
    });
    await expect(materialSwitch).not.toBeChecked();

    // El control es operable con teclado; el track visual de Mantine intercepta
    // el puntero sobre el input, así que la prueba usa la interacción accesible.
    await materialSwitch.press("Space");
    await expect(
      page.getByRole("status").filter({ hasText: "Condición actualizada" }),
    ).toContainText("ahora es Obligatoria");
    await expect(materialSwitch).toBeChecked();
    await expect(page.getByText("v5", { exact: true })).toBeVisible();

    await materialSwitch.press("Space");
    await expect(
      page.getByRole("status").filter({ hasText: "Condición actualizada" }),
    ).toContainText("ahora es Opcional");
    await expect(materialSwitch).not.toBeChecked();
    await expect(page.getByText("v6", { exact: true })).toBeVisible();
    // El tipo no se desactiva automáticamente.
    await expect(
      page.getByRole("button", { name: "Desactivar tipo" }),
    ).toBeVisible();
  });

  test("S02-P y S04: 202 no retira antes de tiempo; confirma, rechaza y reporta no concluyente", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/tipos-producto/calzado");
    await expect(page.getByText("v4", { exact: true })).toBeVisible();

    // Para confirmar una baja segura se fuerza el escenario CLEAR; el escenario
    // por defecto trata los fixtures como tipos con productos activos.
    await setProductTypeScenario(page, { verificacion: "clear" });
    const colorRow = page.locator("tbody tr", { hasText: "Color" }).first();
    await colorRow.getByRole("button", { name: "Desasociar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Desasociación admitida" }),
    ).toBeVisible();
    // 202: la fila y la versión todavía no cambian.
    await expect(
      page.locator("tbody tr", { hasText: "Color" }).first(),
    ).toBeVisible();
    await expect(page.getByText("v4", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Desasociación confirmada" }),
    ).toBeVisible();
    await expect(page.locator("tbody tr", { hasText: "Color" })).toHaveCount(0);
    await expect(page.getByText("v5", { exact: true })).toBeVisible();

    await setProductTypeScenario(page, { verificacion: "en-uso" });
    const tallaRow = page.locator("tbody tr", { hasText: "Talla" }).first();
    await tallaRow.getByRole("button", { name: "Desasociar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    const rechazo = page
      .getByRole("alert")
      .filter({ hasText: "Desasociación rechazada" });
    await expect(rechazo).toBeVisible();
    await expect(rechazo).toContainText("productos o variantes activos");
    await expect(
      page.locator("tbody tr", { hasText: "Talla" }).first(),
    ).toBeVisible();
    await expect(page.getByText("v5", { exact: true })).toBeVisible();
    await rechazo.getByRole("button", { name: "Entendido" }).click();

    await setProductTypeScenario(page, { verificacion: "no-concluyente" });
    await tallaRow.getByRole("button", { name: "Desasociar" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    const noConcluyente = page
      .getByRole("status")
      .filter({ hasText: "Verificación no concluyente" });
    await expect(noConcluyente).toBeVisible();
    await expect(noConcluyente).toContainText("No pudimos confirmar");
    await expect(
      page.locator("tbody tr", { hasText: "Talla" }).first(),
    ).toBeVisible();
    await expect(page.getByText("v5", { exact: true })).toBeVisible();
  });

  test("S05 y S02-R: desactiva de forma segura y reactiva conservando id, asociaciones y version", async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto("/tipos-producto/ropa");
    await expect(
      page.getByRole("heading", { level: 1, name: "Ropa de entrenamiento" }),
    ).toBeVisible();
    await expect(page.getByText("v3", { exact: true })).toBeVisible();

    await setProductTypeScenario(page, { verificacion: "clear" });
    await page.getByRole("button", { name: "Desactivar tipo" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Solicitud de desactivación admitida" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Desactivar tipo" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Tipo de producto desactivado" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Desactivar tipo" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Asociar característica" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reactivar tipo" })).toBeVisible();
    await expect(page.getByText("v3", { exact: true })).toBeVisible();
    await expect(
      page.locator("tbody tr", { hasText: "Temporada" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Reactivar tipo" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Reactivar tipo de producto",
    });
    await expect(dialog).toContainText("conservará el identificador");
    await dialog.getByRole("button", { name: "Reactivar", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Tipo de producto reactivado" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Desactivar tipo" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/tipos-producto\/ropa$/);
    await expect(page.getByText("v3", { exact: true })).toBeVisible();

    const snapshot = await readProductTypeInBrowser(page, "ropa");
    expect(snapshot).toEqual({
      tipoProductoId: "ropa",
      estado: "Activo",
      schemaVersion: 3,
      asociadas: [
        { caracteristicaId: "talla", obligatoria: true },
        { caracteristicaId: "color", obligatoria: true },
        { caracteristicaId: "temporada", obligatoria: false },
      ],
    });
    expect(
      (await listTypeIdsInBrowser(page)).filter((id) => id === "ropa"),
    ).toHaveLength(1);
  });

  test("reset de pruebas limpia la persistencia del navegador sin romper la persistencia normal", async ({
    page,
  }) => {
    test.setTimeout(45000);
    const storageKey =
      "g6-productos-ofertas:mock:v1:taxonomy-product-types";
    await page.goto("/tipos-producto");
    await expect(
      page.getByRole("heading", { level: 1, name: "Tipos de producto" }),
    ).toBeVisible();

    await createTypeInBrowser(page, "Persistencia QA");
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key) !== null,
        storageKey,
      ),
    ).toBe(true);

    await resetProductTypeMock(page);
    expect(
      await page.evaluate((key) => window.localStorage.getItem(key), storageKey),
    ).toBeNull();
    const idsDespuesDelReset = await listTypeIdsInBrowser(page);
    expect(idsDespuesDelReset).toEqual(["calzado", "ropa", "accesorios"]);

    await createTypeInBrowser(page, "Persistencia Posterior");
    expect(
      await page.evaluate(
        (key) => window.localStorage.getItem(key) !== null,
        storageKey,
      ),
    ).toBe(true);
    const idsFinales = await listTypeIdsInBrowser(page);
    expect(idsFinales).toContain("persistencia-posterior");
    expect(idsFinales).not.toContain("persistencia-qa");
  });

  test("captura evidencias visuales de pantallas MK-010 a 1440 x 900", async ({ page }) => {
    test.setTimeout(60000);

    // S01: Listado
    await page.goto("/tipos-producto");
    await expect(page.getByRole("heading", { level: 1, name: "Tipos de producto" })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-010-s01-1440.png" });

    // S01-N: Nuevo tipo de producto
    await page.goto("/tipos-producto/nuevo");
    await expect(page.getByRole("heading", { level: 1, name: "Nuevo tipo de producto" })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-010-s01-n-1440.png" });

    // S02: Detalle y esquema
    await page.goto("/tipos-producto/calzado");
    await expect(page.getByRole("heading", { level: 1, name: "Calzado deportivo" })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-010-s02-1440.png" });

    // S03: Asociar caracteristica
    await page.goto("/tipos-producto/accesorios/asociar");
    await expect(page.getByRole("heading", { level: 1, name: /Asociar caracter/i })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-010-s03-1440.png" });

    // S04: Desasociar caracteristica confirmacion
    await page.goto("/tipos-producto/calzado");
    const tallaRow = page.locator("tbody tr", { hasText: "Talla" }).first();
    await tallaRow.getByRole("button", { name: "Desasociar" }).click();
    await expect(page.getByRole("dialog", { name: /Desasociar caracter/i })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-010-s04-1440.png" });

    // S02-P: Operacion en verificacion (202 admitida)
    await setProductTypeScenario(page, { verificacion: "clear" });
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Desasociaci.n admitida/i })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-010-s02-p-1440.png" });

    // Confirmar la operacion
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Desasociaci.n confirmada/i })).toBeVisible();

    // S05: Confirmar desactivacion
    await page.goto("/tipos-producto/ropa");
    await page.getByRole("button", { name: "Desactivar tipo" }).click();
    await expect(page.getByRole("dialog", { name: /Desactivar tipo de producto/i })).toBeVisible();
    await page.screenshot({ path: "docs/evidencias/mk-010-s05-1440.png" });

    // S02-R: Rechazo de desactivacion por uso activo (ej. calzado)
    await page.goto("/tipos-producto/calzado");
    await setProductTypeScenario(page, { verificacion: "default" });
    await page.getByRole("button", { name: "Desactivar tipo" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /Solicitud de desactivaci.n admitida/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Consultar estado" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /Desactivaci.n rechazada/i }),
    ).toContainText(/productos o variantes activos/i);
    await page.screenshot({ path: "docs/evidencias/mk-010-s02-r-1440.png" });
  });
});
