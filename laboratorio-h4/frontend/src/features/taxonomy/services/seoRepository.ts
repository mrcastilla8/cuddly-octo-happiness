import type { HistorialSlugItem, SeoCategory, SlugPropuesta } from "../types";

export interface SeoListResult {
  items: SeoCategory[];
}

export interface GuardarSeoInput {
  id: string;
  slug: string;
  metaTitulo: string;
  metaDescripcion: string;
}

export class SeoConflictError extends Error {
  readonly codigo = "SLUG_DUPLICADO" as const;
  readonly status = 409 as const;

  constructor(slug: string) {
    super(`409 SLUG_DUPLICADO: el slug «${slug}» ya está en uso por otra categoría.`);
    this.name = "SeoConflictError";
  }
}

// Contract shaped like a real HTTP API: no simulation parameters. The mock adapter
// decides locally which deterministic state to reproduce for local review.
export interface SeoRepository {
  list(signal?: AbortSignal): Promise<SeoListResult>;
  obtener(id: string, signal?: AbortSignal): Promise<SeoCategory | null>;
  proponerSlug(nombre: string, signal?: AbortSignal): Promise<SlugPropuesta>;
  guardar(
    input: GuardarSeoInput,
    signal?: AbortSignal,
  ): Promise<SeoCategory | null>;
  historial(id: string, signal?: AbortSignal): Promise<HistorialSlugItem[]>;
}