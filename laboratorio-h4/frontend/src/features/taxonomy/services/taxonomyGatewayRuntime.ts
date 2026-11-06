import type { TaxonomyGatewayTransport } from "../adapters/httpProductTypeAdapter";

function secureGatewayOrigin(value: string): string {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  ) {
    throw new Error("Configura una URL HTTPS válida para la integración.");
  }
  return url.href.replace(/\/$/, "");
}

export interface TaxonomySession {
  getAccessToken(signal: AbortSignal): Promise<string | null>;
  refreshAccessToken(rejected: string, signal: AbortSignal): Promise<string | null>;
}

export class TaxonomySessionRequiredError extends Error {
  constructor() {
    super("Inicia sesión en Promociones y vuelve a intentar la consulta de Taxonomía.");
    this.name = "TaxonomySessionRequiredError";
  }
}

export class TaxonomyGatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(`No se pudieron cargar los tipos de producto (HTTP ${status}).`);
    this.name = "TaxonomyGatewayError";
  }
}

export function createAuthenticatedTaxonomyGateway(
  gatewayOrigin: string,
  session: TaxonomySession,
  fetcher: typeof fetch = fetch,
): TaxonomyGatewayTransport {
  const origin = secureGatewayOrigin(gatewayOrigin);
  return {
    async request(path, signal, correlationId) {
      signal.throwIfAborted();
      const token = await session.getAccessToken(signal);
      signal.throwIfAborted();
      if (!token) throw new TaxonomySessionRequiredError();
      const requestId = correlationId ?? crypto.randomUUID();
      const send = (accessToken: string) =>
        fetcher(origin + path, {
          method: "GET",
          signal,
          credentials: "omit",
          redirect: "error",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Correlation-Id": requestId,
          },
        });
      let response = await send(token);
      signal.throwIfAborted();
      if (response.status === 401) {
        let code: unknown;
        try {
          const problem: unknown = await response.json();
          if (problem && typeof problem === "object" && !Array.isArray(problem))
            code = (problem as Record<string, unknown>).code;
        } catch {
          // An unknown 401 must never rotate or replay the request.
        }
        if (code !== "TOKEN_INVALIDO") throw new TaxonomyGatewayError(401);
        const renewed = await session.refreshAccessToken(token, signal);
        signal.throwIfAborted();
        if (!renewed) throw new TaxonomyGatewayError(401, "TOKEN_INVALIDO");
        response = await send(renewed);
        signal.throwIfAborted();
      }
      if (!response.ok) throw new TaxonomyGatewayError(response.status);
      return response;
    },
  };
}
let gateway: TaxonomyGatewayTransport | undefined;
export function configureTaxonomyGateway(
  transport: TaxonomyGatewayTransport | undefined,
): void {
  gateway = transport;
}
export function getTaxonomyGateway(): TaxonomyGatewayTransport | undefined {
  return gateway;
}
export function isTaxonomyGatewayConfigured(): boolean {
  return gateway !== undefined;
}
