import type {
  BajaCategoriaSeguimiento,
  BajaSolicitudResult,
  CategoryCreateInput,
  CategoryCreateResult,
  CategoryDetail,
  CategoryNode,
  CategoryUpdateInput,
  ReactivacionResult,
  SlugCheckResult,
} from "../types";

// Typed UI models for Taxonomy. These are not provider DTOs or a new HTTP contract.
export interface CategoryListResult {
  nodos: CategoryNode[];
  colapsadosPorId?: string[];
}

// Contract shaped like a real HTTP API: no simulation parameters. The mock adapter
// decides locally which deterministic state to reproduce for local review.
export interface CategoryRepository {
  list(signal?: AbortSignal): Promise<CategoryListResult>;
  obtener(id: string, signal?: AbortSignal): Promise<CategoryDetail | null>;
  comprobarSlug(slug: string, signal?: AbortSignal): Promise<SlugCheckResult>;
  crear(
    input: CategoryCreateInput,
    signal?: AbortSignal,
  ): Promise<CategoryCreateResult>;
  actualizar(
    input: CategoryUpdateInput,
    signal?: AbortSignal,
  ): Promise<CategoryDetail>;
  solicitarBaja(
    id: string,
    signal?: AbortSignal,
  ): Promise<BajaSolicitudResult>;
  reactivar(id: string, signal?: AbortSignal): Promise<ReactivacionResult>;
  // BLOCKED_CONTRACT: sondeo del resultado de la operación asíncrona de baja (202).
  // No hay endpoint OpenAPI confirmado; la simulación vive en el adapter mock.
  consultarEstadoOperacion(
    operacionId: string,
    signal?: AbortSignal,
  ): Promise<BajaCategoriaSeguimiento>;
}