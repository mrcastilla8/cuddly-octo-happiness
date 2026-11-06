import type { ProductTypeRepository } from "../services/productTypeRepository";
import type { ProductTypeListItem } from "../types";

/** Frontera para el cliente Gateway compartido; no proporciona credenciales propias. */
export interface TaxonomyGatewayTransport {
  request(
    path: string,
    signal: AbortSignal,
    correlationId?: string,
  ): Promise<Response>;
}

const unavailable = async (): Promise<never> => {
  throw new Error(
    "Esta operación de Taxonomía aún no está disponible en modo API.",
  );
};
const INVALID_RESPONSE = "Respuesta de Taxonomía inválida.";
const PAGE_SIZE = 200;
const PAGE_TIMEOUT_MS = 7500;

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(INVALID_RESPONSE);
  return value as Record<string, unknown>;
}

export async function boundedTaxonomyRequest(
  transport: TaxonomyGatewayTransport,
  path: string,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<Response> {
  signal.throwIfAborted();
  const bounded = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
  let stop = () => {};
  try {
    return await Promise.race([
      transport.request(path, bounded),
      new Promise<never>((_resolve, reject) => {
        stop = () => reject(bounded.reason);
        bounded.addEventListener("abort", stop, { once: true });
        if (bounded.aborted) stop();
      }),
    ]);
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (bounded.reason instanceof DOMException && bounded.reason.name === "TimeoutError")
      throw new Error("La consulta de Taxonomía excedió el tiempo permitido.", { cause: error });
    throw error;
  } finally {
    bounded.removeEventListener("abort", stop);
  }
}

function validatePage(
  payload: unknown,
  requestedPage: number,
): { items: unknown[]; total: number; totalPages: number } {
  const dto = object(payload);
  const meta = object(dto.meta);
  if (!Array.isArray(dto.items)) throw new Error(INVALID_RESPONSE);
  const { pagina, tamanio, total, totalPaginas } = meta;
  if (
    !Number.isSafeInteger(pagina) ||
    pagina !== requestedPage ||
    !Number.isSafeInteger(tamanio) ||
    tamanio !== PAGE_SIZE ||
    !Number.isSafeInteger(total) ||
    Number(total) < 0 ||
    !Number.isSafeInteger(totalPaginas) ||
    Number(totalPaginas) < 0 ||
    Number(totalPaginas) !== Math.ceil(Number(total) / PAGE_SIZE) ||
    dto.items.length > PAGE_SIZE
  )
    throw new Error(INVALID_RESPONSE);

  const expectedLength = Math.max(
    0,
    Math.min(PAGE_SIZE, Number(total) - (requestedPage - 1) * PAGE_SIZE),
  );
  if (dto.items.length !== expectedLength) throw new Error(INVALID_RESPONSE);
  return {
    items: dto.items,
    total: Number(total),
    totalPages: Number(totalPaginas),
  };
}

function mapItem(raw: unknown): ProductTypeListItem {
  const row = object(raw);
  if (
    typeof row.tipoProductoId !== "string" ||
    !row.tipoProductoId.trim() ||
    typeof row.nombre !== "string" ||
    !row.nombre.trim() ||
    !Number.isSafeInteger(row.schemaVersion) ||
    Number(row.schemaVersion) <= 0 ||
    (row.estado !== "ACTIVO" && row.estado !== "INACTIVO")
  )
    throw new Error(INVALID_RESPONSE);
  return {
    tipoProductoId: row.tipoProductoId,
    nombre: row.nombre,
    schemaVersion: Number(row.schemaVersion),
    estado: row.estado === "ACTIVO" ? "Activo" : "Inactivo",
    caracteristicasAsignadas: null,
    limiteCaracteristicas: null,
  };
}

export function createHttpProductTypeAdapter(
  transport: TaxonomyGatewayTransport,
  timeoutMs = PAGE_TIMEOUT_MS,
): ProductTypeRepository {
  return {
    async list(signal) {
      const abort = signal ?? new AbortController().signal;
      const items: ProductTypeListItem[] = [];
      const identities = new Set<string>();
      let page = 1;
      let expectedTotal: number | undefined;
      let hasNextPage = true;
      while (hasNextPage) {
        abort.throwIfAborted();
        const response = await boundedTaxonomyRequest(
          transport,
          `/api/v1/tipos-producto?pagina=${page}&tamanio=${PAGE_SIZE}`,
          abort,
          timeoutMs,
        );
        if (!response.ok)
          throw new Error(
            `No se pudieron cargar los tipos de producto (HTTP ${response.status}).`,
          );
        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          throw new Error(INVALID_RESPONSE);
        }
        const validated = validatePage(payload, page);
        if (expectedTotal !== undefined && expectedTotal !== validated.total)
          throw new Error(INVALID_RESPONSE);
        expectedTotal = validated.total;
        hasNextPage = page < validated.totalPages;
        for (const raw of validated.items) {
          const item = mapItem(raw);
          if (identities.has(item.tipoProductoId)) throw new Error(INVALID_RESPONSE);
          identities.add(item.tipoProductoId);
          items.push(item);
        }
        page += 1;
      }
      return { items, limite: null };
    },
    crear: unavailable,
    obtener: unavailable,
    listarCaracteristicasDisponibles: unavailable,
    asociarCaracteristica: unavailable,
    actualizarObligatoriedad: unavailable,
    desasociarCaracteristica: unavailable,
    desactivar: unavailable,
    reactivar: unavailable,
    consultarEstadoOperacion: unavailable,
  };
}
