import type {
  BrandBajaResult,
  BrandCreateInput,
  BrandDetail,
  BrandListItem,
  BrandUpdateInput,
} from "../types";

export interface BrandListResult {
  items: BrandListItem[];
}

// Contract shaped like a real HTTP API: no simulation parameters. The mock adapter
// decides locally which deterministic state to reproduce for local review.
export interface BrandRepository {
  list(signal?: AbortSignal): Promise<BrandListResult>;
  obtener(id: string, signal?: AbortSignal): Promise<BrandDetail | null>;
  crear(input: BrandCreateInput, signal?: AbortSignal): Promise<BrandDetail>;
  actualizar(
    input: BrandUpdateInput,
    signal?: AbortSignal,
  ): Promise<BrandDetail | null>;
  solicitarBaja(id: string, signal?: AbortSignal): Promise<BrandBajaResult>;
  consultarResultadoBaja(
    operacionId: string,
    signal?: AbortSignal,
  ): Promise<BrandBajaResult>;
}