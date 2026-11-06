import { mockCharacteristicAdapter } from "./mockCharacteristicAdapter";
import type { ProductTypeRepository } from "../services/productTypeRepository";
import { PRODUCT_TYPE_ATTRIBUTE_LIMIT } from "../services/productTypeRepository";
import {
  clearMockState,
  isMockPersistenceAvailable,
  loadMockArray,
  persistMockArray,
  publishMockChange,
  syncMockArrayOnExternalChange,
} from "../../shared/mockState";
import type {
  CharacteristicListItem,
  ProductTypeAssociarInput,
  ProductTypeAssociationCharacteristic,
  ProductTypeCreateInput,
  ProductTypeCreateResult,
  ProductTypeDesasociarResult,
  ProductTypeDesactivarResult,
  ProductTypeDetail,
  ProductTypeListItem,
  ProductTypeObligatoriedadInput,
  ProductTypeSeguimiento,
} from "../types";

interface RegistroAsociacion {
  caracteristicaId: string;
  obligatoria: boolean;
}

interface RegistroTipoProducto {
  tipoProductoId: string;
  nombre: string;
  estado: "Activo" | "Inactivo";
  schemaVersion: number;
  limiteCaracteristicas: number;
  asociadas: RegistroAsociacion[];
  // Revisión interna del ciclo de vida. No representa un DTO ni se expone en la
  // UI: cambia al confirmar una desactivación o reactivación para invalidar
  // operaciones pendientes admitidas antes de esa transición. Es opcional para
  // seguir leyendo estados persistidos por versiones anteriores del mock.
  revisionCicloVida?: number;
}

const storeFixtures: RegistroTipoProducto[] = [
  {
    tipoProductoId: "calzado",
    nombre: "Calzado deportivo",
    estado: "Activo",
    schemaVersion: 4,
    limiteCaracteristicas: PRODUCT_TYPE_ATTRIBUTE_LIMIT,
    asociadas: [
      { caracteristicaId: "talla", obligatoria: true },
      { caracteristicaId: "color", obligatoria: true },
      { caracteristicaId: "material", obligatoria: false },
    ],
  },
  {
    tipoProductoId: "ropa",
    nombre: "Ropa de entrenamiento",
    estado: "Activo",
    schemaVersion: 3,
    limiteCaracteristicas: PRODUCT_TYPE_ATTRIBUTE_LIMIT,
    asociadas: [
      { caracteristicaId: "talla", obligatoria: true },
      { caracteristicaId: "color", obligatoria: true },
      { caracteristicaId: "temporada", obligatoria: false },
    ],
  },
  {
    tipoProductoId: "accesorios",
    nombre: "Accesorios genéricos",
    estado: "Activo",
    schemaVersion: 1,
    limiteCaracteristicas: PRODUCT_TYPE_ATTRIBUTE_LIMIT,
    asociadas: [],
  },
];

const isProductType = (value: unknown): value is RegistroTipoProducto => {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.tipoProductoId === "string" &&
    typeof row.nombre === "string" &&
    (row.estado === "Activo" || row.estado === "Inactivo") &&
    typeof row.schemaVersion === "number" &&
    (row.revisionCicloVida === undefined ||
      (typeof row.revisionCicloVida === "number" &&
        Number.isInteger(row.revisionCicloVida) &&
        row.revisionCicloVida >= 0)) &&
    Array.isArray(row.asociadas)
  );
};

// Demo state restored from the current-browser session when available; otherwise a
// fresh clone of the fixtures. Cross-tab writes rehydrate this same array in place.
const store: RegistroTipoProducto[] = loadMockArray("taxonomy-product-types", storeFixtures, isProductType);
syncMockArrayOnExternalChange("taxonomy-product-types", store, isProductType);

const persist = () => persistMockArray("taxonomy-product-types", store);

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const cargarCatalogo = async (
  signal: AbortSignal | undefined,
): Promise<Map<string, CharacteristicListItem>> => {
  const catalogo = await mockCharacteristicAdapter.list(signal);
  signal?.throwIfAborted();
  return new Map(catalogo.caracteristicas.map((item) => [item.id, item]));
};

const aDetalle = (
  registro: RegistroTipoProducto,
  catalogo: Map<string, CharacteristicListItem>,
): ProductTypeDetail => {
  const asociadas = registro.asociadas
    .map((asociacion) => catalogo.get(asociacion.caracteristicaId))
    .filter(
      (catalogoItem): catalogoItem is CharacteristicListItem =>
        catalogoItem !== undefined,
    )
    .map((caracteristica) => ({
      caracteristicaId: caracteristica.id,
      obligatoria:
        registro.asociadas.find(
          (asociacion) => asociacion.caracteristicaId === caracteristica.id,
        )?.obligatoria ?? false,
      estado: caracteristica.estado,
      schemaVersion: registro.schemaVersion,
      caracteristica: { ...caracteristica },
    }));
  return {
    tipoProductoId: registro.tipoProductoId,
    nombre: registro.nombre,
    estado: registro.estado,
    schemaVersion: registro.schemaVersion,
    limiteCaracteristicas: registro.limiteCaracteristicas,
    caracteristicasAsignadas: asociadas.length,
    asociadas,
  };
};

const aItem = (registro: RegistroTipoProducto): ProductTypeListItem => ({
  tipoProductoId: registro.tipoProductoId,
  nombre: registro.nombre,
  estado: registro.estado,
  schemaVersion: registro.schemaVersion,
  caracteristicasAsignadas: registro.asociadas.length,
  limiteCaracteristicas: registro.limiteCaracteristicas,
});

const encontrar = (id: string): RegistroTipoProducto | undefined =>
  store.find((registro) => registro.tipoProductoId === id);

const revisionCicloVidaActual = (registro: RegistroTipoProducto): number =>
  registro.revisionCicloVida ?? 0;

const generarId = (nombre: string): string => {
  const base =
    nombre
      .trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tipo-producto";
  let id = base;
  let sufijo = 2;
  while (store.some((item) => item.tipoProductoId === id)) {
    id = `${base}-${sufijo}`;
    sufijo += 1;
  }
  return id;
};

// Contrato de seguimiento: GET /taxonomia/operaciones/{operationId}. El mock mantiene
// las operaciones en memoria y reproduce un resultado determinista sin afirmar que la
// integración HTTP esté implementada.
type TipoOperacionTipoProducto = "desasocio" | "desactivacion";

// Valores internos de la verificación simulada. CLEAR y HAS_ACTIVE_PRODUCTS reflejan
// el resultado publicado por OperacionMaestra; HAS_ACTIVE_PRODUCTS representa el uso
// activo (IN_USE) y NO_CONCLUYENTE representa ausencia de confirmación fiable.
type ResultadoVerificacion =
  | "CLEAR"
  | "HAS_ACTIVE_PRODUCTS"
  | "NO_CONCLUYENTE";

interface OperacionTipoProducto {
  tipoProductoId: string;
  tipo: TipoOperacionTipoProducto;
  caracteristicaId?: string;
  estado: "pendiente" | "confirmada" | "rechazada" | "no-concluyente";
  resultadoVerificacion: ResultadoVerificacion;
  // Versión del esquema con la que se admitió la operación. La confirmación solo
  // puede aplicarse si el esquema sigue en esa versión.
  schemaVersionAdmitida: number;
  // Revisión del ciclo de vida con la que se admitió la operación. Una
  // desactivación o reactivación posterior invalida la operación aunque
  // schemaVersion no cambie.
  revisionCicloVidaAdmitida: number;
  versionObsoleta?: boolean;
  tipoInactivo?: boolean;
  cicloVidaObsoleto?: boolean;
}

const copiarRegistroTipo = (item: RegistroTipoProducto): RegistroTipoProducto => ({
  ...item,
  asociadas: item.asociadas.map((asoc) => ({ ...asoc })),
});

const estadoInicialTipos: RegistroTipoProducto[] = storeFixtures.map(copiarRegistroTipo);

// Deterministic local states used only for review. The repository contract does not
// accept scenarios; reviewers change these values to reproduce error or edge cases
// without touching pages, hooks or the service contract.
type EscenarioLista = "default" | "empty" | "error";
export type EscenarioVerificacion =
  | "default"
  | "clear"
  | "en-uso"
  | "no-concluyente"
  | "pendiente-prolongado"
  | "error-consulta";

export interface ProductTypeMockScenarios {
  lista: EscenarioLista;
  verificacion: EscenarioVerificacion;
}

const DEFAULT_MOCK_SCENARIOS: ProductTypeMockScenarios = {
  lista: "default",
  verificacion: "default",
};

const MOCK: ProductTypeMockScenarios = { ...DEFAULT_MOCK_SCENARIOS };

const operacionesTipoProducto = new Map<string, OperacionTipoProducto>();
let secuenciaOperacionTipoProducto = 0;

// Limitación conocida del mock: estas operaciones viven en memoria y no se
// persisten. Al recargar se conserva el tipo y sus cambios confirmados, pero se
// pierde el operationId pendiente. El contrato solo ofrece seguimiento por
// operationId y no un listado de operaciones, por lo que la demo debe reiniciar
// la solicitud. La integración HTTP real deberá recuperar el seguimiento desde
// su backend. Esta limitación está documentada en README.md.
const siguienteOperacionId = (
  prefijo: "desasocio" | "desactivacion",
  tipoProductoId: string,
  caracteristicaId?: string,
): string => {
  secuenciaOperacionTipoProducto += 1;
  const partes = [
    `op-${prefijo}`,
    tipoProductoId,
    ...(caracteristicaId ? [caracteristicaId] : []),
    String(secuenciaOperacionTipoProducto),
  ];
  return partes.join("-");
};

// Los tipos de los fixtures representan tipos ya existentes en Catálogo y, por
// tanto, pueden tener productos activos. Un tipo recién creado en la sesión no
// tiene productos todavía. El escenario "clear" permite forzar de forma
// determinista una verificación segura para las pruebas y la revisión visual.
const TIPOS_CON_PRODUCTOS_ACTIVOS_EN_MOCK = new Set([
  "calzado",
  "ropa",
  "accesorios",
]);

const resultadoVerificacionActual = (
  tipoProductoId: string,
): ResultadoVerificacion => {
  if (MOCK.verificacion === "en-uso") return "HAS_ACTIVE_PRODUCTS";
  if (MOCK.verificacion === "no-concluyente") return "NO_CONCLUYENTE";
  if (MOCK.verificacion === "clear") return "CLEAR";
  return TIPOS_CON_PRODUCTOS_ACTIVOS_EN_MOCK.has(tipoProductoId)
    ? "HAS_ACTIVE_PRODUCTS"
    : "CLEAR";
};

const operacionPendiente = (
  tipo: TipoOperacionTipoProducto,
  tipoProductoId: string,
  schemaVersionAdmitida: number,
  revisionCicloVidaAdmitida: number,
  caracteristicaId?: string,
): OperacionTipoProducto => ({
  tipo,
  tipoProductoId,
  caracteristicaId,
  estado: "pendiente",
  resultadoVerificacion: resultadoVerificacionActual(tipoProductoId),
  schemaVersionAdmitida,
  revisionCicloVidaAdmitida,
});

// Adapter-only controls for reproducible UI review and tests. They do not form part
// of ProductTypeRepository or select a data mode.
export const __setProductTypeMockScenarios = (
  scenarios: Partial<ProductTypeMockScenarios>,
): void => {
  Object.assign(MOCK, scenarios);
};

export const __resetProductTypeMockScenarios = (): void => {
  Object.assign(MOCK, DEFAULT_MOCK_SCENARIOS);
};

export const __resetProductTypeStore = (): void => {
  store.length = 0;
  store.push(...estadoInicialTipos.map(copiarRegistroTipo));
  operacionesTipoProducto.clear();
  secuenciaOperacionTipoProducto = 0;
  __resetProductTypeMockScenarios();
  // Test isolation: also remove the persisted demo domain. Normal mock persistence
  // remains untouched; the next confirmed write creates a fresh envelope again.
  clearMockState("taxonomy-product-types");
  publishMockChange("taxonomy-product-types");
};

export const mockProductTypeAdapter: ProductTypeRepository = {
  async list(signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    if (MOCK.lista === "error") {
      throw new Error(
        "No se pudieron cargar los tipos de producto. Inténtalo de nuevo.",
      );
    }
    if (MOCK.lista === "empty") {
      return { items: [], limite: PRODUCT_TYPE_ATTRIBUTE_LIMIT };
    }
    return {
      items: store.map(aItem),
      limite: PRODUCT_TYPE_ATTRIBUTE_LIMIT,
    };
  },

  async crear(input: ProductTypeCreateInput, signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    const registro: RegistroTipoProducto = {
      tipoProductoId: generarId(input.nombre),
      nombre: input.nombre.trim(),
      estado: "Activo",
      schemaVersion: 0,
      limiteCaracteristicas: PRODUCT_TYPE_ATTRIBUTE_LIMIT,
      asociadas: [],
    };
    store.push(registro);
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      store.pop();
      throw new Error("No se pudo crear el tipo de producto. Vuelve a intentarlo.");
    }
    const resultado: ProductTypeCreateResult = {
      tipoProductoId: registro.tipoProductoId,
      nombre: registro.nombre,
      estado: registro.estado,
      schemaVersion: registro.schemaVersion,
    };
    return resultado;
  },

  async obtener(id: string, signal): Promise<ProductTypeDetail | null> {
    signal?.throwIfAborted();
    const registro = encontrar(id);
    if (!registro) return null;
    const catalogo = await cargarCatalogo(signal);
    signal?.throwIfAborted();
    return aDetalle(registro, catalogo);
  },

  async listarCaracteristicasDisponibles(
    id: string,
    signal,
  ): Promise<ProductTypeAssociationCharacteristic[]> {
    signal?.throwIfAborted();
    const registro = encontrar(id);
    if (!registro || registro.estado !== "Activo") return [];
    const catalogo = await cargarCatalogo(signal);
    return Array.from(catalogo.values())
      .filter(
        (caracteristica) =>
          caracteristica.estado === "Activo" &&
          !registro.asociadas.some(
            (asociacion) => asociacion.caracteristicaId === caracteristica.id,
          ),
      )
      .map((caracteristica) => ({ ...caracteristica }));
  },

  async asociarCaracteristica(input: ProductTypeAssociarInput, signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    const registro = encontrar(input.tipoProductoId);
    if (!registro) throw new Error("TIPO_PRODUCTO_NO_ENCONTRADO");
    if (registro.estado !== "Activo")
      throw new Error("TIPO_PRODUCTO_INVALIDO");
    if (
      registro.asociadas.some(
        (asociacion) => asociacion.caracteristicaId === input.caracteristicaId,
      )
    ) {
      throw new Error("ASOCIACION_DUPLICADA");
    }
    if (registro.asociadas.length >= registro.limiteCaracteristicas) {
      throw new Error(
        "Se alcanzó el límite de características del tipo de producto.",
      );
    }
    const catalogo = await cargarCatalogo(signal);
    const caracteristica = catalogo.get(input.caracteristicaId);
    if (!caracteristica || caracteristica.estado !== "Activo") {
      throw new Error("CARACTERISTICA_NO_DISPONIBLE");
    }
    registro.asociadas.push({
      caracteristicaId: input.caracteristicaId,
      obligatoria: input.obligatoria,
    });
    registro.schemaVersion += 1;
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      registro.asociadas.pop();
      registro.schemaVersion -= 1;
      throw new Error("No se pudo asociar la característica. Vuelve a intentarlo.");
    }
    return aDetalle(registro, catalogo);
  },

  async actualizarObligatoriedad(
    input: ProductTypeObligatoriedadInput,
    signal,
  ): Promise<ProductTypeDetail | null> {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    const registro = encontrar(input.tipoProductoId);
    if (!registro) throw new Error("TIPO_PRODUCTO_NO_ENCONTRADO");
    if (registro.estado !== "Activo") throw new Error("TIPO_PRODUCTO_INVALIDO");
    const asociacion = registro.asociadas.find(
      (item) => item.caracteristicaId === input.caracteristicaId,
    );
    if (!asociacion) throw new Error("ASOCIACION_NO_ENCONTRADA");
    // A confirmed change increments schemaVersion exactly once. Repeating the same
    // condition is idempotent and must not bump the version.
    if (asociacion.obligatoria !== input.obligatoria) {
      const anterior = asociacion.obligatoria;
      asociacion.obligatoria = input.obligatoria;
      registro.schemaVersion += 1;
      const ok = persist();
      if (!ok && isMockPersistenceAvailable()) {
        asociacion.obligatoria = anterior;
        registro.schemaVersion -= 1;
        throw new Error(
          "No se pudo actualizar la condición. Vuelve a intentarlo.",
        );
      }
    }
    // No se toca el estado de productos: la nueva exigencia se aplica cuando Catálogo
    // edite, guarde o reactive cada producto.
    const catalogo = await cargarCatalogo(signal);
    return aDetalle(registro, catalogo);
  },

  async desasociarCaracteristica(
    id: string,
    caracteristicaId: string,
    signal,
  ): Promise<ProductTypeDesasociarResult> {
    signal?.throwIfAborted();
    await esperar(500);
    signal?.throwIfAborted();
    const registro = encontrar(id);
    if (!registro) throw new Error("TIPO_PRODUCTO_NO_ENCONTRADO");
    if (registro.estado !== "Activo") throw new Error("TIPO_PRODUCTO_INVALIDO");
    const asociacion = registro.asociadas.find(
      (item) => item.caracteristicaId === caracteristicaId,
    );
    if (!asociacion) throw new Error("CARACTERISTICA_NO_ASOCIADA");

    // Toda desasociación, sea obligatoria u opcional, se admite como operación
    // pendiente: el mock no puede confirmar que sea segura sin verificar Catálogo.
    const operacionId = siguienteOperacionId(
      "desasocio",
      id,
      caracteristicaId,
    );
    operacionesTipoProducto.set(
      operacionId,
      operacionPendiente(
        "desasocio",
        id,
        registro.schemaVersion,
        revisionCicloVidaActual(registro),
        caracteristicaId,
      ),
    );
    return {
      resultado: "pendiente",
      mensaje:
        "La solicitud de desasociación se admitió (202) y quedó en verificación con Catálogo. El esquema aún no se modificó.",
      operacionId,
    };
  },

  async consultarEstadoOperacion(
    operacionId: string,
    signal,
  ): Promise<ProductTypeSeguimiento> {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();

    const operacion = operacionesTipoProducto.get(operacionId);
    if (!operacion) {
      throw new Error("No se encontró la operación de tipo de producto.");
    }
    const registro = encontrar(operacion.tipoProductoId);
    if (!registro) {
      throw new Error("El tipo de producto ya no está disponible.");
    }

    if (operacion.estado === "pendiente") {
      if (registro.estado !== "Activo") {
        // Otra operación pudo desactivar el tipo después de admitir esta baja.
        // Ninguna modificación es válida sobre un tipo Inactivo.
        operacion.estado = "rechazada";
        operacion.tipoInactivo = true;
      } else if (
        revisionCicloVidaActual(registro) !==
        operacion.revisionCicloVidaAdmitida
      ) {
        // El tipo pudo desactivarse y reactivarse: schemaVersion se conserva,
        // pero la operación admitida antes de esa transición ya no es válida.
        operacion.estado = "rechazada";
        operacion.cicloVidaObsoleto = true;
      } else if (registro.schemaVersion !== operacion.schemaVersionAdmitida) {
        // La admisión se hizo sobre una versión que ya no está vigente. Aunque la
        // verificación fuera CLEAR, no se aplica la baja sobre información obsoleta.
        operacion.estado = "rechazada";
        operacion.versionObsoleta = true;
      } else if (MOCK.verificacion === "error-consulta") {
        throw new Error(
          "No se pudo consultar la verificación. La asociación y la versión del esquema se conservan.",
        );
      } else if (MOCK.verificacion === "pendiente-prolongado") {
        const catalogoPendiente = await cargarCatalogo(signal);
        return {
          operacionId,
          estado: "pendiente",
          mensaje: "La operación continúa en verificación con Catálogo.",
          tipoProducto: aDetalle(registro, catalogoPendiente),
        };
      } else if (operacion.resultadoVerificacion === "HAS_ACTIVE_PRODUCTS") {
        // Fail closed: no mutation, no schemaVersion bump.
        operacion.estado = "rechazada";
      } else if (operacion.resultadoVerificacion === "NO_CONCLUYENTE") {
        // Fail closed: the UI must consult again; nothing is modified.
        operacion.estado = "no-concluyente";
      } else {
        operacion.estado = "confirmada";
        const prevAsociadas = registro.asociadas;
        const prevSchemaVersion = registro.schemaVersion;
        const prevEstado = registro.estado;
        const prevRevisionCicloVida = registro.revisionCicloVida;
        if (operacion.tipo === "desasocio" && operacion.caracteristicaId) {
          registro.asociadas = registro.asociadas.filter(
            (item) => item.caracteristicaId !== operacion.caracteristicaId,
          );
          registro.schemaVersion += 1;
        } else if (operacion.tipo === "desactivacion") {
          registro.estado = "Inactivo";
          registro.revisionCicloVida = revisionCicloVidaActual(registro) + 1;
        }
        const ok = persist();
        if (!ok && isMockPersistenceAvailable()) {
          operacion.estado = "pendiente";
          registro.asociadas = prevAsociadas;
          registro.schemaVersion = prevSchemaVersion;
          registro.estado = prevEstado;
          registro.revisionCicloVida = prevRevisionCicloVida;
          throw new Error(
            "No se pudo confirmar la operación del tipo de producto. Vuelve a intentarlo.",
          );
        }
      }
    }

    const mensaje = (() => {
      if (operacion.estado === "confirmada") {
        return operacion.tipo === "desasocio"
          ? "Verificación concluida: la característica se desasoció del esquema y se incrementó la versión del esquema."
          : "Verificación concluida: el tipo de producto quedó Inactivo.";
      }
      if (operacion.estado === "rechazada") {
        if (operacion.tipoInactivo) {
          return operacion.tipo === "desasocio"
            ? "No se aplicó la desasociación porque el tipo de producto está Inactivo. La asociación y la versión del esquema se conservan."
            : "No se aplicó la desactivación porque el tipo de producto ya está Inactivo. El estado, las asociaciones y la versión del esquema se conservan.";
        }
        if (operacion.cicloVidaObsoleto) {
          const alcance =
            operacion.tipo === "desasocio"
              ? "La asociación y la versión del esquema se conservan."
              : "El estado, las asociaciones y la versión del esquema se conservan.";
          return `No se aplicó la ${operacion.tipo === "desasocio" ? "desasociación" : "desactivación"} porque el estado del tipo de producto cambió durante la verificación (desactivación o reactivación). ${alcance} Vuelve a intentarlo con el estado vigente.`;
        }
        if (operacion.versionObsoleta) {
          const alcance =
            operacion.tipo === "desasocio"
              ? "La asociación y la versión del esquema se conservan."
              : "El estado, las asociaciones y la versión del esquema se conservan.";
          return `No se aplicó la baja porque el esquema cambió durante la verificación: la operación se admitió con v${operacion.schemaVersionAdmitida} y la versión vigente es v${registro.schemaVersion}. ${alcance} Vuelve a intentarlo con el esquema vigente.`;
        }
        return operacion.tipo === "desasocio"
          ? "No se puede retirar esta característica porque todavía participa en productos o variantes activos. La asociación y la versión del esquema se conservan."
          : "No se puede desactivar este tipo porque existen productos o variantes activos que dependen de él. El estado y la versión del esquema se conservan.";
      }
      if (operacion.estado === "no-concluyente") {
        return operacion.tipo === "desasocio"
          ? "No pudimos confirmar que el cambio sea seguro. No se realizó ninguna modificación; la asociación y la versión del esquema se conservan."
          : "No pudimos confirmar que el cambio sea seguro. No se realizó ninguna modificación; el estado y la versión del esquema se conservan.";
      }
      return "La operación continúa en verificación con Catálogo.";
    })();
    const catalogo = await cargarCatalogo(signal);
    return {
      operacionId,
      estado: operacion.estado,
      mensaje,
      tipoProducto: aDetalle(registro, catalogo),
    };
  },

  async desactivar(
    id: string,
    signal,
  ): Promise<ProductTypeDesactivarResult> {
    signal?.throwIfAborted();
    await esperar(500);
    signal?.throwIfAborted();
    const registro = encontrar(id);
    if (!registro) throw new Error("TIPO_PRODUCTO_NO_ENCONTRADO");
    if (registro.estado !== "Activo") throw new Error("TIPO_PRODUCTO_INVALIDO");

    // Toda desactivación se admite como operación pendiente y solo se confirma
    // con un resultado CLEAR vigente. Un rechazo en la admisión no sustituye la
    // verificación segura exigida por SPEC-010.
    const operacionId = siguienteOperacionId("desactivacion", id);
    operacionesTipoProducto.set(
      operacionId,
      operacionPendiente(
        "desactivacion",
        id,
        registro.schemaVersion,
        revisionCicloVidaActual(registro),
      ),
    );
    return {
      resultado: "pendiente",
      mensaje:
        "La solicitud de desactivación se admitió (202). El tipo conserva su estado Activo hasta que Catálogo confirme la verificación.",
      operacionId,
    };
  },

  async reactivar(id: string, signal): Promise<ProductTypeDetail | null> {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    const registro = encontrar(id);
    if (!registro) throw new Error("TIPO_PRODUCTO_NO_ENCONTRADO");
    if (registro.estado !== "Inactivo") throw new Error("TIPO_PRODUCTO_INVALIDO");
    const prevEstado = registro.estado;
    const prevRevisionCicloVida = registro.revisionCicloVida;
    // La reactivación reutiliza el mismo registro: tipoProductoId, asociaciones y
    // schemaVersion se conservan. No se crea un tipo nuevo ni se reescribe historial.
    registro.estado = "Activo";
    registro.revisionCicloVida = revisionCicloVidaActual(registro) + 1;
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      registro.estado = prevEstado;
      registro.revisionCicloVida = prevRevisionCicloVida;
      throw new Error("No se pudo reactivar el tipo de producto. Vuelve a intentarlo.");
    }
    const catalogo = await cargarCatalogo(signal);
    return aDetalle(registro, catalogo);
  },
};