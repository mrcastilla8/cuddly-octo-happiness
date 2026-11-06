import type {
  CharacteristicCatalogConfig,
  CharacteristicCreateInput,
  CharacteristicCreateResult,
  CharacteristicDetail,
  CharacteristicListItem,
  CharacteristicStatus,
  CharacteristicUpdateInput,
  CharacteristicValue,
  ValorBajaResult,
  ValorBajaSeguimiento,
} from "../types";

// SPEC-009 documented defaults for the configurable limits. The provider owns the
// authoritative values; these are only used by the local mock and rule helpers.
export const characteristicConfigDefaults: CharacteristicCatalogConfig = {
  maxTexto: 100,
  maxValoresLista: 50,
};

export interface CharacteristicListResult {
  caracteristicas: CharacteristicListItem[];
  config: CharacteristicCatalogConfig;
}

// Contract shaped like a real HTTP API: no simulation parameters. The mock adapter
// decides locally which deterministic state to reproduce for local review.
export interface CharacteristicRepository {
  list(signal?: AbortSignal): Promise<CharacteristicListResult>;
  obtener(
    id: string,
    signal?: AbortSignal,
  ): Promise<CharacteristicDetail | null>;
  crear(
    input: CharacteristicCreateInput,
    signal?: AbortSignal,
  ): Promise<CharacteristicCreateResult>;
  actualizar(
    input: CharacteristicUpdateInput,
    signal?: AbortSignal,
  ): Promise<CharacteristicDetail | null>;
  listarValores(
    id: string,
    signal?: AbortSignal,
  ): Promise<CharacteristicValue[] | null>;
  renombrarValor(
    id: string,
    valorId: string,
    nombre: string,
    signal?: AbortSignal,
  ): Promise<CharacteristicValue>;
  agregarValor(
    id: string,
    nombre: string,
    signal?: AbortSignal,
  ): Promise<CharacteristicValue>;
  solicitarBajaValor(
    id: string,
    valorId: string,
    signal?: AbortSignal,
  ): Promise<ValorBajaResult>;
  cambiarEstado(
    id: string,
    estado: CharacteristicStatus,
    signal?: AbortSignal,
  ): Promise<CharacteristicDetail | null>;
  // BLOCKED_CONTRACT: sondeo del resultado de la baja asíncrona de un valor (202).
  // No hay endpoint OpenAPI confirmado; la simulación vive en el adapter mock.
  consultarEstadoOperacion(
    operacionId: string,
    signal?: AbortSignal,
  ): Promise<ValorBajaSeguimiento>;
}
