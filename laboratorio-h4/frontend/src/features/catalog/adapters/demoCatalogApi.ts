import { createCatalogFetchTransport } from "./catalogHttp";

export interface DemoCategory {
  id: string;
  name: string;
  parentId: string | null;
}
export interface DemoProduct {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  categoryId: string;
  images: string[];
}
export interface DemoPrice {
  regular: number;
  offer: number | null;
  currency: "PEN";
}
export interface DemoPage {
  items: DemoProduct[];
  page: number;
  pageSize: number;
  total: number;
}
export class DemoApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly correlationId?: string,
  ) {
    super(
      `No se pudo completar la consulta (${status}, ${code}).${correlationId ? ` Referencia: ${correlationId}.` : ""}`,
    );
  }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Respuesta de API inválida.");
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value)
    throw new Error("Respuesta de API incompleta.");
  return value;
}
function integer(value: unknown, minimum = 0): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  )
    throw new Error("Paginación de API inválida.");
  return value;
}
function imageUrl(value: unknown): string {
  const url = new URL(text(value));
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("URL de imagen inválida.");
  return url.href;
}
function product(value: unknown): DemoProduct {
  const row = record(value);
  if (!Array.isArray(row.images)) throw new Error("Galería de API inválida.");
  return {
    id: text(row.product_id),
    name: text(row.name),
    sku: row.sku_base == null ? null : text(row.sku_base),
    description: row.description == null ? "" : text(row.description),
    categoryId: text(row.categoria_id),
    images: row.images.map(imageUrl),
  };
}

/** Existing G6 operationIds only. Explicit Gateway origin in deployed builds;
 * no browser credentials, Supabase access, automatic retries or mock fallback. */
export function createDemoCatalogApi(fetcher: typeof fetch = fetch, origin = "") {
  // Reuse the origin validator. Relative URLs remain useful for injected tests.
  const transport = origin ? createCatalogFetchTransport(origin, fetcher) : null;
  let activePrices = 0;
  const waiting: (() => void)[] = [];
  function priceSlot(signal?: AbortSignal): Promise<() => void> {
    return new Promise((resolve, reject) => {
      const abort = () => {
        const index = waiting.indexOf(start);
        if (index >= 0) waiting.splice(index, 1);
        reject(signal?.reason ?? new DOMException("Consulta cancelada", "AbortError"));
      };
      const start = () => {
        signal?.removeEventListener("abort", abort);
        if (signal?.aborted) { abort(); return; }
        activePrices++;
        resolve(() => { activePrices--; waiting.shift()?.(); });
      };
      if (signal?.aborted) { abort(); return; }
      if (activePrices < 3) start();
      else { waiting.push(start); signal?.addEventListener("abort", abort, { once: true }); }
    });
  }
  async function get(path: string, signal?: AbortSignal): Promise<unknown> {
    const correlation = crypto.randomUUID();
    const timeout = AbortSignal.timeout(15000);
    const options = {
      method: "GET" as const,
      credentials: "omit" as const,
      redirect: "error" as const,
      headers: { accept: "application/json", "x-correlation-id": correlation },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    };
    const response = transport
      ? await transport.request("/api/v1" + path, options)
      : await fetcher("/api/v1" + path, options);
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      let code = "SERVICIO_NO_DISPONIBLE";
      if (type.includes("application/problem+json")) {
        const problem = record(await response.json());
        if (
          typeof problem.code === "string" &&
          /^[A-Z_0-9]+$/.test(problem.code)
        )
          code = problem.code;
      } else await response.body?.cancel();
      throw new DemoApiError(
        response.status,
        code,
        response.headers.get("x-correlation-id") ?? correlation,
      );
    }
    if (!type.includes("application/json"))
      throw new Error("El Gateway no devolvió JSON de la API.");
    return response.json();
  }
  return {
    async categories(signal?: AbortSignal): Promise<DemoCategory[]> {
      const body = record(await get("/categorias", signal));
      if (!Array.isArray(body.categories))
        throw new Error("Categorías de API inválidas.");
      return body.categories.map((value) => {
        const row = record(value);
        return {
          id: text(row.categoria_id),
          name: text(row.name),
          parentId: row.parent_id == null ? null : text(row.parent_id),
        };
      });
    },
    async list(
      input: {
        page: number;
        q?: string;
        categoryId?: string;
        state: "BORRADOR" | "ACTIVO" | "INACTIVO";
      },
      signal?: AbortSignal,
    ): Promise<DemoPage> {
      // The channel is a compatibility parameter of the existing operation;
      // the enabled backend demo is an internal read, not channel eligibility.
      const query = new URLSearchParams({
        canal: "MARKETPLACE",
        estado: input.state,
        pagina: String(input.page),
        tamanio: "20",
        orden: "NOMBRE_ASC",
      });
      if (input.q) query.set("q", input.q);
      if (input.categoryId) query.set("categoriaId", input.categoryId);
      const body = record(await get("/productos?" + query, signal));
      if (!Array.isArray(body.items))
        throw new Error("Productos de API inválidos.");
      return {
        items: body.items.map(product),
        page: integer(body.pagina, 1),
        pageSize: integer(body.tamanio, 1),
        total: integer(body.total),
      };
    },
    async detail(id: string, signal?: AbortSignal): Promise<DemoProduct> {
      return product(
        await get(
          `/productos/${encodeURIComponent(id)}?canal=MARKETPLACE`,
          signal,
        ),
      );
    },
    async price(id: string, signal?: AbortSignal): Promise<DemoPrice> {
      const release = await priceSlot(signal);
      try {
        const row = record(
          await get(`/precios/productos/${encodeURIComponent(id)}`, signal),
        );
        if (
          row.product_id !== id ||
          row.currency !== "PEN" ||
          typeof row.precio_regular !== "number" ||
          !Number.isFinite(row.precio_regular) ||
          row.precio_regular <= 0 ||
          (row.precio_oferta !== null &&
            row.precio_oferta !== undefined &&
            (typeof row.precio_oferta !== "number" ||
              !Number.isFinite(row.precio_oferta) ||
              row.precio_oferta <= 0 ||
              row.precio_oferta > row.precio_regular))
        )
          throw new Error(
            "Pricing no devolvió un precio válido y positivo en PEN.",
          );
        return {
          regular: row.precio_regular,
          offer: typeof row.precio_oferta === "number" ? row.precio_oferta : null,
          currency: "PEN",
        };
      } finally { release(); }
    },
  };
}
export const demoCatalogApi = createDemoCatalogApi(fetch, import.meta.env?.VITE_GATEWAY_ORIGIN ?? "");
