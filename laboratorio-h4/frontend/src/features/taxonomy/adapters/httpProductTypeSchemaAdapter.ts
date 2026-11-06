import {
  boundedTaxonomyRequest,
  type TaxonomyGatewayTransport,
} from "./httpProductTypeAdapter";
import type { ProductTypeSchema } from "../services/productTypeRepository";

const INVALID_RESPONSE = "Respuesta de esquema de Taxonomía inválida.";
const TIMEOUT_MS = 7500;

export class ProductTypeSchemaHttpError extends Error {
  constructor(readonly status: number) {
    super(`No se pudo cargar el esquema (HTTP ${status}).`);
    this.name = "ProductTypeSchemaHttpError";
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(INVALID_RESPONSE);
  return value as Record<string, unknown>;
}

function state(value: unknown): "ACTIVO" | "INACTIVO" {
  if (value !== "ACTIVO" && value !== "INACTIVO")
    throw new Error(INVALID_RESPONSE);
  return value;
}

function version(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0)
    throw new Error(INVALID_RESPONSE);
  return Number(value);
}

function mapSchema(value: unknown, requestedId: string): ProductTypeSchema {
  const dto = object(value);
  const tipo = object(dto.tipoProducto);
  if (
    tipo.tipoProductoId !== requestedId ||
    typeof tipo.nombre !== "string" || !tipo.nombre.trim() ||
    !Array.isArray(dto.caracteristicas)
  ) throw new Error(INVALID_RESPONSE);

  const caracteristicas = dto.caracteristicas.map((raw) => {
    const row = object(raw);
    if (typeof row.caracteristicaId !== "string" || !row.caracteristicaId.trim() ||
      typeof row.obligatoria !== "boolean") throw new Error(INVALID_RESPONSE);
    let caracteristica: ProductTypeSchema["caracteristicas"][number]["caracteristica"] = null;
    if (row.caracteristica !== undefined && row.caracteristica !== null) {
      const item = object(row.caracteristica);
      if (
        typeof item.caracteristicaId !== "string" ||
        item.caracteristicaId !== row.caracteristicaId ||
        typeof item.nombre !== "string" || !item.nombre.trim() ||
        (item.tipo !== "TEXTO" && item.tipo !== "NUMERO" && item.tipo !== "LISTA") ||
        (item.unidadMedida !== undefined && item.unidadMedida !== null && typeof item.unidadMedida !== "string") ||
        (item.valores !== undefined && !Array.isArray(item.valores))
      ) throw new Error(INVALID_RESPONSE);
      version(item.version);
      const valores = item.valores?.map((value) => {
        const valor = object(value);
        if (
          typeof valor.valorId !== "string" ||
          typeof valor.nombre !== "string"
        ) throw new Error(INVALID_RESPONSE);
        const estado = state(valor.estado);
        version(valor.version);
        return { estado };
      });
      caracteristica = {
        caracteristicaId: item.caracteristicaId,
        nombre: item.nombre,
        tipo: item.tipo,
        unidadMedida: item.unidadMedida as string | null | undefined,
        estado: state(item.estado),
        ...(valores ? { valores } : {}),
      };
    }
    return {
      caracteristicaId: row.caracteristicaId,
      obligatoria: row.obligatoria,
      estado: state(row.estado),
      schemaVersion: version(row.schemaVersion),
      caracteristica,
    };
  });
  return {
    tipoProducto: {
      tipoProductoId: tipo.tipoProductoId,
      nombre: tipo.nombre,
      estado: state(tipo.estado),
      schemaVersion: version(tipo.schemaVersion),
    },
    caracteristicas,
    schemaVersion: version(dto.schemaVersion),
  };
}

export function createHttpProductTypeSchemaAdapter(
  transport: TaxonomyGatewayTransport,
  timeoutMs = TIMEOUT_MS,
): { obtenerEsquema(id: string, signal?: AbortSignal): Promise<ProductTypeSchema> } {
  return {
    async obtenerEsquema(id, signal) {
      if (!id.trim()) throw new Error("El tipo de producto no es válido.");
      const abort = signal ?? new AbortController().signal;
      const response = await boundedTaxonomyRequest(
        transport,
        `/api/v1/tipos-producto/${encodeURIComponent(id)}/caracteristicas`,
        abort,
        timeoutMs,
      );
      if (!response.ok) throw new ProductTypeSchemaHttpError(response.status);
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error(INVALID_RESPONSE);
      }
      return mapSchema(payload, id);
    },
  };
}
