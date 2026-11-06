import type {
  ProductTypeAssociarInput,
  ProductTypeCreateInput,
  ProductTypeCreateResult,
  ProductTypeDesasociarResult,
  ProductTypeDesactivarResult,
  ProductTypeDetail,
  ProductTypeListItem,
  ProductTypeAssociationCharacteristic,
  ProductTypeObligatoriedadInput,
  ProductTypeSeguimiento,
} from "../types";

export const PRODUCT_TYPE_ATTRIBUTE_LIMIT = 20;

export interface ProductTypeListResult {
  items: ProductTypeListItem[];
  limite: number;
}

// Contract shaped like a real HTTP API: no simulation parameters. The mock adapter
// decides locally which deterministic state to reproduce for local review.
export interface ProductTypeRepository {
  list(signal?: AbortSignal): Promise<ProductTypeListResult>;
  crear(
    input: ProductTypeCreateInput,
    signal?: AbortSignal,
  ): Promise<ProductTypeCreateResult>;
  obtener(id: string, signal?: AbortSignal): Promise<ProductTypeDetail | null>;
  listarCaracteristicasDisponibles(
    id: string,
    signal?: AbortSignal,
  ): Promise<ProductTypeAssociationCharacteristic[]>;
  asociarCaracteristica(
    input: ProductTypeAssociarInput,
    signal?: AbortSignal,
  ): Promise<ProductTypeDetail | null>;
  // Contrato: PATCH /tipos-producto/{tipoProductoId}/caracteristicas/{caracteristicaId}.
  // El incremento de schemaVersion ocurre solo cuando la condición cambia.
  actualizarObligatoriedad(
    input: ProductTypeObligatoriedadInput,
    signal?: AbortSignal,
  ): Promise<ProductTypeDetail | null>;
  desasociarCaracteristica(
    id: string,
    caracteristicaId: string,
    signal?: AbortSignal,
  ): Promise<ProductTypeDesasociarResult>;
  desactivar(
    id: string,
    signal?: AbortSignal,
  ): Promise<ProductTypeDesactivarResult>;
  // Contrato: POST /tipos-producto/{tipoProductoId}/reactivar. Conserva el
  // tipoProductoId, sus asociaciones y su schemaVersion; no crea otro tipo.
  reactivar(id: string, signal?: AbortSignal): Promise<ProductTypeDetail | null>;
  // Contrato: GET /taxonomia/operaciones/{operationId}. El mock reproduce de forma
  // determinista el resultado (CLEAR / uso activo / no concluyente); este PR no
  // implementa la integración HTTP real.
  consultarEstadoOperacion(
    operacionId: string,
    signal?: AbortSignal,
  ): Promise<ProductTypeSeguimiento>;
}