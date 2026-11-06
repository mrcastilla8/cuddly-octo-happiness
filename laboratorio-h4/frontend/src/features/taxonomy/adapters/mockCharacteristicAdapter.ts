import type { CharacteristicRepository } from "../services/characteristicRepository";
import { characteristicConfigDefaults } from "../services/characteristicRepository";
import {
  isMockPersistenceAvailable,
  loadMockArray,
  persistMockArray,
  readMockState,
  saveMockState,
  syncMockArrayOnExternalChange,
  subscribeExternalMockChanges,
} from "../../shared/mockState";
import type {
  CharacteristicDetail,
  CharacteristicListItem,
  CharacteristicType,
  CharacteristicValue,
} from "../types";

// In-memory fixture store for MK-009. No HTTP contract exists yet; the adapter returns
// deterministic simulated data and never claims a real backend response.
interface RegistroValor {
  valorId: string;
  nombre: string;
  estado: "Activo" | "Inactivo";
  version: number;
}

interface RegistroCaracteristica {
  id: string;
  nombre: string;
  tipo: CharacteristicType;
  estado: CharacteristicListItem["estado"];
  unidad?: string;
  valoresActivos: number;
  valores?: RegistroValor[];
}

const storeFixtures: RegistroCaracteristica[] = [
  {
    id: "talla",
    nombre: "Talla",
    tipo: "LISTA",
    estado: "Activo",
    valoresActivos: 2,
    valores: [
      { valorId: "xs", nombre: "XS", estado: "Activo", version: 1 },
      { valorId: "m", nombre: "M", estado: "Activo", version: 1 },
    ],
  },
  {
    id: "color",
    nombre: "Color",
    tipo: "LISTA",
    estado: "Activo",
    valoresActivos: 2,
    valores: [
      { valorId: "negro", nombre: "Negro", estado: "Activo", version: 1 },
      { valorId: "blanco", nombre: "Blanco", estado: "Activo", version: 1 },
    ],
  },
  {
    id: "peso",
    nombre: "Peso",
    tipo: "NUMERO",
    estado: "Activo",
    unidad: "kg",
    valoresActivos: 0,
  },
  {
    id: "material",
    nombre: "Material",
    tipo: "TEXTO",
    estado: "Activo",
    valoresActivos: 0,
  },
  {
    id: "temporada",
    nombre: "Temporada",
    tipo: "LISTA",
    estado: "Inactivo",
    valoresActivos: 3,
    valores: [
      { valorId: "invierno", nombre: "Invierno", estado: "Activo", version: 1 },
      { valorId: "verano", nombre: "Verano", estado: "Activo", version: 1 },
      { valorId: "primavera", nombre: "Primavera", estado: "Activo", version: 1 },
    ],
  },
];

const isCharacteristic = (value: unknown): value is RegistroCaracteristica => {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.nombre === "string" &&
    (row.tipo === "TEXTO" || row.tipo === "NUMERO" || row.tipo === "LISTA") &&
    (row.estado === "Activo" || row.estado === "Inactivo")
  );
};

// Demo state restored from the current-browser session when available; otherwise a
// fresh clone of the fixtures. Cross-tab writes rehydrate this same array in place.
const store: RegistroCaracteristica[] = loadMockArray("taxonomy-characteristics", storeFixtures, isCharacteristic);
syncMockArrayOnExternalChange("taxonomy-characteristics", store, isCharacteristic);

const persist = () => persistMockArray("taxonomy-characteristics", store);

const esperar = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const hallar = (id: string): RegistroCaracteristica | undefined =>
  store.find((item) => item.id === id);

const aItem = (registro: RegistroCaracteristica): CharacteristicListItem => ({
  id: registro.id,
  nombre: registro.nombre,
  tipo: registro.tipo,
  estado: registro.estado,
  unidad: registro.unidad,
  valoresActivos: registro.valoresActivos,
});

const aDetalle = (registro: RegistroCaracteristica): CharacteristicDetail => ({
  id: registro.id,
  nombre: registro.nombre,
  tipo: registro.tipo,
  estado: registro.estado,
  unidad: registro.unidad,
  valoresActivos: registro.valoresActivos,
  valores: (registro.valores ?? []).map((v) => ({ ...v })),
});

const generarId = (nombre: string): string => {
  const base =
    nombre
      .trim()
      .toLocaleLowerCase("es")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "caracteristica";
  let id = base;
  let sufijo = 2;
  while (store.some((item) => item.id === id)) {
    id = `${base}-${sufijo}`;
    sufijo += 1;
  }
  return id;
};

const contarActivos = (valores: RegistroValor[]): number =>
  valores.filter((valor) => valor.estado === "Activo").length;

// MK-009: labels are compared ignoring case, surrounding whitespace and accents so
// "  BLANCO " cannot duplicate "Blanco" inside the same characteristic.
const normalizarEtiqueta = (nombre: string): string =>
  nombre
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// BLOCKED_CONTRACT: no hay contrato OpenAPI confirmado para el sondeo del resultado
// de una baja asíncrona de valor (202). Este registro mantiene las operaciones
// pendientes en memoria para que la UI consulte su estado sin inventar un endpoint.
export interface OperacionBajaValor {
  operacionId: string;
  caracteristicaId: string;
  valorId: string;
  estado: "pendiente" | "confirmada" | "rechazada" | "no-concluyente";
}

const isOperacionBajaValor = (value: unknown): value is OperacionBajaValor => {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.operacionId === "string" &&
    typeof row.caracteristicaId === "string" &&
    typeof row.valorId === "string" &&
    ["pendiente", "confirmada", "rechazada", "no-concluyente"].includes(
      String(row.estado),
    )
  );
};

// H-06: test isolation — snapshot/restore baseline store.
const copiarRegistro = (item: RegistroCaracteristica): RegistroCaracteristica => ({
  ...item,
  valores: item.valores?.map((valor) => ({ ...valor })),
});
const estadoInicialCaracteristicas: RegistroCaracteristica[] = store.map(copiarRegistro);

export const __resetCharacteristicStore = (): void => {
  store.length = 0;
  store.push(...estadoInicialCaracteristicas.map(copiarRegistro));
  operacionesBajaValor.clear();
  __resetCharacteristicMockScenarios();
};

const operacionesBajaValor = new Map<string, OperacionBajaValor>(
  (
    readMockState<OperacionBajaValor[]>(
      "taxonomy-characteristic-baja",
      (value): value is OperacionBajaValor[] =>
        Array.isArray(value) && value.every(isOperacionBajaValor),
    ) ?? []
  ).map((operation) => [operation.operacionId, operation]),
);
// H-07: the sequence is restored from persisted operations so a reload cannot reuse
// an identifier that already belongs to a resolved operation. Without this, a new
// request after reload would overwrite the previous rejection/history.
let secuenciaOperacionBaja = Array.from(operacionesBajaValor.keys()).reduce(
  (maximo, operacionId) => {
    const coincidencia = /-(\d+)$/.exec(operacionId);
    return coincidencia
      ? Math.max(maximo, Number(coincidencia[1]))
      : maximo;
  },
  0,
);

const persistirOperacionesBaja = () =>
  saveMockState(
    "taxonomy-characteristic-baja",
    Array.from(operacionesBajaValor.values()),
  );

subscribeExternalMockChanges("taxonomy-characteristic-baja", () => {
  const stored = readMockState<OperacionBajaValor[]>(
    "taxonomy-characteristic-baja",
    (value): value is OperacionBajaValor[] =>
      Array.isArray(value) && value.every(isOperacionBajaValor),
  );
  if (!stored) return;
  operacionesBajaValor.clear();
  for (const operation of stored)
    operacionesBajaValor.set(operation.operacionId, operation);
});

export function isCharacteristicValuePending(
  caracteristicaId: string,
  valorId: string,
): boolean {
  return Array.from(operacionesBajaValor.values()).some(
    (operation) =>
      operation.caracteristicaId === caracteristicaId &&
      operation.valorId === valorId &&
      operation.estado === "pendiente",
  );
}

export function getPendingCharacteristicValueOperation(
  caracteristicaId: string,
): OperacionBajaValor | undefined {
  return Array.from(operacionesBajaValor.values()).find(
    (operation) =>
      operation.caracteristicaId === caracteristicaId &&
      operation.estado === "pendiente",
  );
}

// Deterministic local states used only for review. The repository contract does not
// accept scenarios; reviewers change these values to reproduce error or edge cases
// without touching pages, hooks or the service contract.
type EscenarioLista = "default" | "empty" | "error";
type EscenarioCatalogo = "default" | "error" | "no-encontrado";
type EscenarioFormulario = "default" | "error";
type EscenarioValores = "default" | "empty" | "lista-limite" | "error";
type EscenarioBajaValor =
  | "default"
  | "error-solicitud"
  | "pendiente-prolongado"
  | "error-consulta"
  | "rechazada-asincrona"
  | "no-concluyente";
export interface CharacteristicMockScenarios {
  lista: EscenarioLista;
  catalogo: EscenarioCatalogo;
  formulario: EscenarioFormulario;
  valores: EscenarioValores;
  baja: EscenarioBajaValor;
}

const DEFAULT_MOCK_SCENARIOS: CharacteristicMockScenarios = {
  lista: "default",
  catalogo: "default",
  formulario: "default",
  valores: "default",
  baja: "default",
};
const MOCK: CharacteristicMockScenarios = { ...DEFAULT_MOCK_SCENARIOS };

// Adapter-only controls for reproducible UI review and tests. They do not form
// part of CharacteristicRepository or select a data mode.
export const __setCharacteristicMockScenarios = (
  scenarios: Partial<CharacteristicMockScenarios>,
): void => {
  if (scenarios.baja && scenarios.baja !== MOCK.baja)
    operacionesBajaValor.clear();
  Object.assign(MOCK, scenarios);
  if (scenarios.valores === "empty") {
    const caracteristica = store.find((item) => item.tipo === "LISTA");
    if (caracteristica) {
      caracteristica.valores = [];
      caracteristica.valoresActivos = 0;
    }
  }
  if (scenarios.valores === "lista-limite") {
    const caracteristica = store.find((item) => item.tipo === "LISTA");
    if (caracteristica) {
      caracteristica.valores = Array.from(
        { length: characteristicConfigDefaults.maxValoresLista },
        (_, index) => ({
          valorId: `fixture-${index + 1}`,
          nombre: `Valor permitido ${String(index + 1).padStart(2, "0")}`,
          estado: "Activo" as const,
          version: 1,
        }),
      );
      caracteristica.valoresActivos = caracteristica.valores.length;
    }
  }
};

export const __resetCharacteristicMockScenarios = (): void => {
  Object.assign(MOCK, DEFAULT_MOCK_SCENARIOS);
};

export const mockCharacteristicAdapter: CharacteristicRepository = {
  async list(signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    if (MOCK.lista === "error") {
      throw new Error(
        "No se pudieron cargar las características. Inténtalo de nuevo.",
      );
    }
    if (MOCK.lista === "empty") {
      return { caracteristicas: [], config: characteristicConfigDefaults };
    }
    return {
      caracteristicas: store.map(aItem),
      config: characteristicConfigDefaults,
    };
  },

  async obtener(id, signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    if (MOCK.catalogo === "error") {
      throw new Error(
        "No se pudo cargar la característica. Inténtalo de nuevo.",
      );
    }
    if (MOCK.catalogo === "no-encontrado") return null;
    const registro = hallar(id);
    return registro ? aDetalle(registro) : null;
  },

  async crear(input, signal) {
    signal?.throwIfAborted();
    await esperar(500);
    signal?.throwIfAborted();
    if (MOCK.formulario === "error") {
      throw new Error(
        "No se pudo crear la característica. Inténtalo de nuevo.",
      );
    }
    if (!input.nombre.trim())
      throw new Error("Ingresa el nombre de la característica.");
    if (input.tipo !== "TEXTO" && input.tipo !== "NUMERO" && input.tipo !== "LISTA")
      throw new Error("Selecciona un tipo de característica válido.");
    if (input.tipo === "NUMERO" && !input.unidad?.trim())
      throw new Error("Ingresa la unidad para una característica NUMERO.");
    const unidad = input.tipo === "NUMERO" ? input.unidad : undefined;
    const registro: RegistroCaracteristica = {
      id: generarId(input.nombre),
      nombre: input.nombre,
      tipo: input.tipo,
      estado: input.estado,
      unidad,
      valoresActivos: 0,
      valores: input.tipo === "LISTA" ? [] : undefined,
    };
    store.push(registro);
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      store.pop();
      throw new Error(
        "No se pudo crear la característica. Vuelve a intentarlo.",
      );
    }
    return {
      id: registro.id,
      nombre: registro.nombre,
      tipo: registro.tipo,
      estado: registro.estado,
      unidad: registro.unidad,
    };
  },

  async actualizar(input, signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    const registro = hallar(input.id);
    if (!registro) {
      throw new Error(
        "La característica ya no está disponible para editar.",
      );
    }
    if (MOCK.formulario === "error") {
      throw new Error(
        "No se pudo guardar la característica. Inténtalo de nuevo.",
      );
    }
    const prevNombre = registro.nombre;
    const prevUnidad = registro.unidad;
    registro.nombre = input.nombre;
    registro.unidad = registro.tipo === "NUMERO" ? input.unidad : undefined;
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      registro.nombre = prevNombre;
      registro.unidad = prevUnidad;
      throw new Error(
        "No se pudo guardar la característica. Vuelve a intentarlo.",
      );
    }
    return aDetalle(registro);
  },

  async listarValores(id, signal) {
    signal?.throwIfAborted();
    await esperar(300);
    signal?.throwIfAborted();
    const r = hallar(id);
    if (!r) return null;
    if (MOCK.valores === "error") {
      throw new Error("No se pudieron cargar los valores. Inténtalo de nuevo.");
    }
    if (MOCK.valores === "empty") return [];
    return (r.valores ?? []).map((v) => ({ ...v })) as CharacteristicValue[];
  },

  async renombrarValor(id, valorId, nombre, signal) {
    signal?.throwIfAborted();
    await esperar(300);
    signal?.throwIfAborted();
    const r = hallar(id);
    const v = r?.valores?.find((item) => item.valorId === valorId);
    const nombreLimpio = nombre.trim();
    if (!r || !v) throw new Error("El valor ya no está disponible para renombrar.");
    if (r.estado !== "Activo") {
      throw new Error("La característica está inactiva y sus valores son de solo lectura.");
    }
    if (!nombreLimpio) throw new Error("Ingresa el nombre del valor.");
    const etiquetaNormalizada = normalizarEtiqueta(nombreLimpio);
    if (
      (r.valores ?? []).some(
        (item) =>
          item.valorId !== valorId &&
          normalizarEtiqueta(item.nombre) === etiquetaNormalizada,
      )
    ) {
      throw new Error(
        "Ya existe un valor con ese nombre en esta característica.",
      );
    }
    if (MOCK.formulario === "error") {
      throw new Error("No se pudo renombrar el valor. Inténtalo de nuevo.");
    }
    const prevNombre = v.nombre;
    const prevVersion = v.version;
    v.nombre = nombreLimpio;
    v.version += 1;
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      v.nombre = prevNombre;
      v.version = prevVersion;
      throw new Error("No se pudo renombrar el valor. Vuelve a intentarlo.");
    }
    return { ...v };
  },

  async agregarValor(id, nombre, signal) {
    signal?.throwIfAborted();
    await esperar(300);
    signal?.throwIfAborted();
    const r = hallar(id);
    if (!r) throw new Error("Característica no encontrada.");
    if (r.estado !== "Activo") {
      throw new Error("La característica está inactiva y no admite nuevos valores.");
    }
    if (!nombre.trim()) throw new Error("Ingresa el nombre del valor.");
    // SPEC-009: el límite de valores permitidos se aplica también aquí y no solo como
    // restricción visual del formulario (maxValoresLista sobre valores activos).
    const existentes = r.valores ?? [];
    if (contarActivos(existentes) >= characteristicConfigDefaults.maxValoresLista) {
      throw new Error(
        `Se alcanzó el límite de ${characteristicConfigDefaults.maxValoresLista} valores permitidos para esta característica.`,
      );
    }
    const base =
      nombre
        .trim()
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "val";
    let vid = base;
    let i = 2;
    while (existentes.some((v) => v.valorId === vid)) {
      vid = `${base}-${i}`;
      i += 1;
    }
    const v: RegistroValor = {
      valorId: vid,
      nombre: nombre.trim(),
      estado: "Activo",
      version: 1,
    };
    if (!r.valores) r.valores = [];
    r.valores.push(v);
    r.valoresActivos = contarActivos(r.valores);
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      r.valores.pop();
      r.valoresActivos = contarActivos(r.valores);
      throw new Error("No se pudo agregar el valor. Vuelve a intentarlo.");
    }
    return { ...v };
  },

  async solicitarBajaValor(id, valorId, signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();
    const r = hallar(id);
    const v = r?.valores?.find((x) => x.valorId === valorId);
    if (!r || !v) {
      throw new Error(
        "El valor no existe o ya no está disponible para una baja.",
      );
    }
    if (r.estado !== "Activo") {
      throw new Error("La característica está inactiva y sus valores son de solo lectura.");
    }
    if (v.estado !== "Activo") {
      throw new Error("El valor ya no está activo; no se aplicó ninguna baja.");
    }
    const actual: CharacteristicValue = {
      valorId: v.valorId,
      nombre: v.nombre,
      estado: v.estado,
      version: v.version,
    };
    if (MOCK.baja === "error-solicitud") {
      throw new Error("No se pudo solicitar la comprobación de uso.");
    }
    // La solicitud siempre se admite como pendiente. La comprobación simulada
    // produce el resultado terminal al consultar el estado de la operación.
    const baseOperacionId = `baja-valor-${id}-${valorId}`;
    const existing = Array.from(operacionesBajaValor.values()).find(
      (operation) =>
        operation.caracteristicaId === id &&
        operation.valorId === valorId &&
        operation.estado === "pendiente",
    );
    if (existing) {
      return {
        resultado: "pendiente",
        valor: actual,
        mensaje:
          existing.estado === "pendiente"
            ? "La solicitud de baja ya está pendiente; no se reenvió la operación."
            : "La operación de baja ya fue resuelta.",
        bloqueos: [],
        operacionId: existing.operacionId,
      };
    }
    let operacionId: string;
    do {
      operacionId = `${baseOperacionId}-${++secuenciaOperacionBaja}`;
    } while (operacionesBajaValor.has(operacionId));
    operacionesBajaValor.set(operacionId, {
      operacionId,
      caracteristicaId: id,
      valorId,
      estado: "pendiente",
    });
    if (!persistirOperacionesBaja() && isMockPersistenceAvailable()) {
      operacionesBajaValor.delete(operacionId);
      throw new Error("No se pudo registrar la solicitud de baja. Vuelve a intentarlo.");
    }
    return {
      resultado: "pendiente",
      valor: actual,
      mensaje:
        "Solicitud de baja admitida en revisión. El valor continúa Activo; la desactivación no quedó confirmada.",
      bloqueos: [],
      operacionId,
    };
  },

  async consultarEstadoOperacion(operacionId, signal) {
    signal?.throwIfAborted();
    await esperar(400);
    signal?.throwIfAborted();

    const operacion = operacionesBajaValor.get(operacionId);
    if (!operacion) {
      throw new Error("No se encontró la operación de baja del valor.");
    }
    const r = hallar(operacion.caracteristicaId);
    const v = r?.valores?.find((x) => x.valorId === operacion.valorId);
    if (!r || !v) {
      throw new Error("El valor ya no está disponible.");
    }

    if (MOCK.baja === "error-consulta") {
      throw new Error("No se pudo consultar el resultado de la comprobación.");
    }

    if (
      operacion.estado === "pendiente" &&
      (operacion.valorId === "m" || MOCK.baja === "rechazada-asincrona")
    ) {
      operacion.estado = "rechazada";
      persistirOperacionesBaja();
    } else if (operacion.estado === "pendiente" && MOCK.baja === "no-concluyente") {
      operacion.estado = "no-concluyente";
      persistirOperacionesBaja();
    }

    if (operacion.estado === "rechazada") {
      return {
        operacionId,
        estado: "rechazada",
        mensaje:
          "No se puede dar de baja: el valor está referenciado por el esquema activo o por productos activos.",
        valor: { ...v },
      };
    }

    if (operacion.estado === "no-concluyente") {
      return {
        operacionId,
        estado: "no-concluyente",
        mensaje:
          "No pudimos confirmar que la baja sea segura. No se realizó ningún cambio.",
        valor: { ...v },
      };
    }

    if (operacion.estado === "pendiente" && MOCK.baja === "pendiente-prolongado") {
      return {
        operacionId,
        estado: "pendiente",
        mensaje:
          "La comprobación sigue pendiente. El valor conserva su estado actual.",
        valor: { ...v },
      };
    }

    if (operacion.estado === "pendiente") {
      operacion.estado = "confirmada";
      const prevEstado = v.estado;
      const prevVersion = v.version;
      const prevActivos = r.valoresActivos;
      v.estado = "Inactivo";
      v.version += 1;
      r.valoresActivos = contarActivos(r.valores ?? []);
      const ok = persist();
      if (!ok && isMockPersistenceAvailable()) {
        operacion.estado = "pendiente";
        v.estado = prevEstado;
        v.version = prevVersion;
        r.valoresActivos = prevActivos;
        throw new Error("No se pudo confirmar la baja del valor. Vuelve a intentarlo.");
      }
      persistirOperacionesBaja();
      return {
        operacionId,
        estado: "confirmada",
        mensaje:
          "Verificación concluida: el valor quedó Inactivo sin eliminar el registro.",
        valor: { ...v },
      };
    }

    return {
      operacionId,
      estado: "confirmada",
      mensaje: "La baja del valor ya estaba confirmada.",
      valor: { ...v },
    };
  },

  async cambiarEstado(id, estado, signal) {
    signal?.throwIfAborted();
    await esperar(300);
    signal?.throwIfAborted();
    const r = hallar(id);
    if (!r) return null;
    const prevEstado = r.estado;
    r.estado = estado;
    const ok = persist();
    if (!ok && isMockPersistenceAvailable()) {
      r.estado = prevEstado;
      throw new Error("No se pudo cambiar el estado de la característica. Vuelve a intentarlo.");
    }
    return aDetalle(r);
  },
};
