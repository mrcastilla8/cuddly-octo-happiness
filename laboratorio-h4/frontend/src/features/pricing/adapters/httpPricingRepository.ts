import {
  PricingFailure,
  type BatchView,
  type PriceChange,
  type ScheduleDraft,
  type SchedulePage,
  type ScheduleView,
  type WriteTarget,
} from "../services/pricingModels";
import { localInstant } from "../services/pricingValidation";
import type {
  PriceChannel,
  ImportInput,
  PriceQuery,
  PriceTarget,
  PriceView,
  PricingRepository,
  ReportFile,
} from "../services/pricingRepository";
import {
  mapBatchDto,
  mapPriceDto,
  mapScheduleDto,
  mapSchedulePageDto,
  requestMoney,
  validatePriceTargets,
  type PricingChannelIds,
} from "./httpPricingMapper";

export interface PricingHttpRequest {
  method: "GET" | "PATCH" | "POST";
  signal: AbortSignal;
  headers?: Readonly<Record<string, string>>;
  body?: string;
}

// Castilla adapts the shared API client to this narrow transport boundary.
export interface PricingHttpTransport {
  request(path: string, request: PricingHttpRequest): Promise<Response>;
}

export interface HttpPricingRepositoryDependencies {
  transport: PricingHttpTransport;
  listCatalogTargets?: (signal: AbortSignal) => Promise<PriceTarget[]>;
  channelIds?: PricingChannelIds;
  onUpdated?: (
    target: PriceTarget,
    before: PriceView,
    after: PriceView,
    reason: string,
  ) => void | Promise<void>;
}

const pageSize = 20;

type UpdateConfirmation = Pick<
  PriceView,
  "version" | "regular" | "offer" | "currency" | "channel" | "origin"
> & { productId: string };

function confirmsUpdate(price: PriceView, expected: UpdateConfirmation): boolean {
  return (
    price.version > expected.version &&
    price.regular === expected.regular &&
    price.offer === expected.offer &&
    price.currency === expected.currency &&
    price.channel === expected.channel &&
    price.origin === expected.origin
  );
}

function blocked(message: string): PricingFailure {
  return new PricingFailure("blocked_contract", message);
}

function encoded(value: string): string {
  if (!value.trim()) {
    throw new PricingFailure(
      "error",
      "Pricing requiere un identificador válido.",
    );
  }
  return encodeURIComponent(value);
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function problemCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.clone().json();
    if (
      body !== null &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      typeof (body as Record<string, unknown>).code === "string"
    )
      return (body as Record<string, string>).code;
  } catch {
    // The HTTP status still classifies the failure when the body is not a Problem document.
  }
  return undefined;
}

export function createHttpPricingRepository(
  dependencies: HttpPricingRepositoryDependencies,
): PricingRepository {
  const { transport } = dependencies;
  const channelIds = dependencies.channelIds ?? {};
  const editableReads = new Map<string, { productId: string; price: PriceView }>();
  const uncertainUpdates = new Map<string, UpdateConfirmation>();
  const uncertainSchedules = new Set<string>();
  const pendingWrites = new Set<string>();

  function scopeKey(target: PriceTarget, channel: PriceChannel): string {
    return `${targetPath(target)}:${channel}`;
  }

  async function catalogTargets(signal: AbortSignal): Promise<PriceTarget[]> {
    signal.throwIfAborted();
    if (!dependencies.listCatalogTargets) {
      throw blocked(
        "La selección de Pricing requiere objetivos y elegibilidad publicados por el provider de Catálogo. Esa integración aún no está configurada.",
      );
    }
    try {
      return validatePriceTargets(
        await dependencies.listCatalogTargets(signal),
      );
    } catch (error) {
      if (signal.aborted || isAbort(error) || error instanceof PricingFailure)
        throw error;
      throw new PricingFailure(
        "error",
        "No se pudo verificar la selección autoritativa de Catálogo.",
      );
    }
  }

  async function targetById(
    targetId: string,
    signal: AbortSignal,
  ): Promise<PriceTarget> {
    const targets = await catalogTargets(signal);
    const target = targets.find((item) => item.id === targetId);
    if (!target) {
      throw new PricingFailure(
        "error",
        "El objetivo ya no está disponible en Catálogo. Vuelve a consultar la selección.",
      );
    }
    return target;
  }

  function targetPath(target: PriceTarget, suffix = ""): string {
    return target.kind === "product"
      ? `/api/v1/precios/productos/${encoded(target.productId)}${suffix}`
      : `/api/v1/precios/skus/${encoded(target.sku)}${suffix}`;
  }

  function channelIdFor(channel: PriceChannel): string | null {
    if (channel === "global") return null;
    if (channelIds.retail) return channelIds.retail;
    throw blocked(
      "El contrato de escritura requiere el channelId canónico de Retail; Catálogo/Integración todavía no lo proporciona.",
    );
  }

  async function send(
    path: string,
    request: PricingHttpRequest,
    write: boolean,
    absentCodes: readonly string[] = [],
  ): Promise<Response | null> {
    request.signal.throwIfAborted();
    let response: Response;
    try {
      response = await transport.request(path, request);
    } catch (error) {
      if (!write && (request.signal.aborted || isAbort(error))) throw error;
      if (!write && error instanceof PricingFailure) throw error;
      throw new PricingFailure(
        write ? "unknown" : "error",
        write
          ? "No se confirmó el resultado de Pricing. Consulta el estado antes de intentar otra vez."
          : "Pricing no respondió a la consulta.",
      );
    }
    if (response.ok) {
      const expected = request.method === "POST" ? 201 : 200;
      if (response.status !== expected) {
        throw new PricingFailure(
          write ? "unknown" : "error",
          "Pricing no devolvió la confirmación HTTP prevista por el contrato.",
        );
      }
      return response;
    }

    const code = await problemCode(response);
    if (response.status === 404 && code && absentCodes.includes(code))
      return null;
    const kind =
      response.status === 401
        ? "unauthorized"
        : response.status === 403
          ? "forbidden"
          : response.status === 409
            ? code === "VIGENCIA_SUPERPUESTA"
              ? "overlap"
              : "conflict"
            : write && response.status >= 500
              ? "unknown"
              : "error";
    const message =
      response.status === 401
        ? "Pricing rechazó la autorización."
        : response.status === 403
          ? "Tu rol no permite esta operación de Pricing."
          : response.status === 409
            ? code === "VIGENCIA_SUPERPUESTA"
              ? "La vigencia se superpone con otra del mismo objetivo y canal."
              : "El precio cambió desde la lectura. Conserva la propuesta y vuelve a consultar."
            : write && response.status >= 500
              ? "Pricing no confirmó el resultado. Consulta el estado antes de intentar otra vez."
              : response.status === 400 || response.status === 422
                ? "Pricing rechazó los datos enviados. Revisa el formulario."
                : "Pricing no pudo completar la operación.";
    throw new PricingFailure(kind, message);
  }

  async function json(
    path: string,
    request: PricingHttpRequest,
    write: boolean,
    absentCodes: readonly string[] = [],
  ): Promise<unknown | null> {
    const response = await send(path, request, write, absentCodes);
    if (!response) return null;
    try {
      const body: unknown = await response.json();
      if (body === null) throw new Error("Respuesta sin DTO");
      return body;
    } catch {
      throw new PricingFailure(
        write ? "unknown" : "error",
        write
          ? "Pricing pudo confirmar el cambio, pero la respuesta no se pudo validar. Consulta el precio antes de reintentar."
          : "Pricing devolvió una respuesta ilegible.",
      );
    }
  }

  async function readTarget(
    target: PriceTarget,
    channel: PriceChannel,
    signal: AbortSignal,
  ): Promise<PriceView | null> {
    if (target.kind === "product" && channel === "retail") {
      throw blocked(
        "El GET administrativo de producto no resuelve canal Retail. Se requiere un SKU legítimo o una operación contractual que confirme ese alcance.",
      );
    }
    const suffix =
      target.kind === "variant" && channel === "retail" ? "?canal=RETAIL" : "";
    const response = await json(
      targetPath(target, suffix),
      { method: "GET", signal },
      false,
      ["PRECIO_NO_ENCONTRADO"],
    );
    if (response === null) return null;
    const price = mapPriceDto(response, target, channelIds);
    if (channel === "global" && price.channel !== "global") {
      throw new PricingFailure(
        "error",
        "Pricing devolvió un precio de otro canal.",
      );
    }
    return price;
  }

  return {
    async listTargets(signal) {
      return catalogTargets(signal);
    },

    async read(query: PriceQuery, signal) {
      const target = await targetById(query.targetId, signal);
      const price = await readTarget(target, query.channel, signal);
      return price ? { price, breakdown: [] } : null;
    },

    async readEditable(writeTarget: WriteTarget, signal) {
      const target = await targetById(writeTarget.targetId, signal);
      const key = scopeKey(target, writeTarget.channel);
      if (pendingWrites.has("update:" + key)) {
        throw new PricingFailure(
          "unknown",
          "Hay un cambio pendiente de confirmación. Espera su resultado antes de volver a leer para editar.",
        );
      }
      editableReads.delete(key);
      if (target.kind === "product" && writeTarget.channel === "retail") {
        throw blocked(
          "GET de precio de producto no admite canal. No es posible leer la versión exacta de un precio Retail para editarlo.",
        );
      }
      const price = await readTarget(target, writeTarget.channel, signal);
      if (
        target.kind === "variant" &&
        price &&
        (price.inherited ||
          price.origin !== "sku" ||
          price.channel !== writeTarget.channel)
      ) {
        throw blocked(
          "El precio consultado es heredado o corresponde a otro canal. Pricing no confirmó una definición propia para editar este alcance.",
        );
      }
      const uncertain = uncertainUpdates.get(key);
      if (uncertain) {
        if (
          !price ||
          uncertain.productId !== target.productId ||
          !confirmsUpdate(price, uncertain)
        ) {
          throw new PricingFailure(
            "unknown",
            "El cambio sigue pendiente de verificación. La lectura no confirma una versión superior con los valores solicitados; no se permite reenviarlo.",
          );
        }
        uncertainUpdates.delete(key);
      }
      if (price) {
        editableReads.set(key, { productId: target.productId, price });
      }
      return price;
    },

    async update(change: PriceChange, signal) {
      const target = await targetById(change.target.targetId, signal);
      const key = scopeKey(target, change.target.channel);
      if (uncertainUpdates.has(key)) {
        throw new PricingFailure(
          "unknown",
          "El resultado anterior sigue pendiente de verificación. Releer solo desbloquea este alcance si Pricing confirma una versión superior con los valores solicitados.",
        );
      }
      const snapshot = editableReads.get(key);
      const before =
        snapshot?.productId === target.productId ? snapshot.price : undefined;
      if (!before || before.version !== change.version) {
        throw new PricingFailure(
          "conflict",
          "Vuelve a leer el precio exacto de este objetivo y canal antes de guardar.",
        );
      }
      if (target.kind === "product" && change.target.channel === "retail") {
        throw blocked(
          "No existe una lectura contractual de precio de producto por canal para verificar la versión antes de editar Retail.",
        );
      }
      if (!Number.isSafeInteger(change.version) || change.version < 1) {
        throw new PricingFailure("error", "La versión de precio no es válida.");
      }
      const body: {
        precioRegular: number;
        precioOferta?: number | null;
        accionPrecioOferta: PriceChange["draft"]["offerAction"];
        moneda: string;
        motivoCambio: string;
        priceVersion: number;
        channelId: string | null;
      } = {
        precioRegular: requestMoney(change.draft.regular),
        accionPrecioOferta: change.draft.offerAction,
        moneda: change.draft.currency,
        motivoCambio: change.draft.reason,
        priceVersion: change.version,
        channelId: channelIdFor(change.target.channel),
      };
      if (change.draft.offerAction === "ESTABLECER")
        body.precioOferta = requestMoney(change.draft.offer);
      if (change.draft.offerAction === "ELIMINAR") body.precioOferta = null;
      const expected: UpdateConfirmation = {
        productId: target.productId,
        version: before.version,
        regular: String(body.precioRegular),
        offer:
          change.draft.offerAction === "CONSERVAR"
            ? before.offer
            : change.draft.offerAction === "ELIMINAR"
              ? null
              : String(body.precioOferta),
        currency: body.moneda,
        channel: change.target.channel,
        origin: target.kind === "variant" ? "sku" : "product",
      };
      const pendingKey = "update:" + key;
      if (pendingWrites.has(pendingKey)) {
        throw new PricingFailure(
          "unknown",
          "Hay un cambio pendiente de confirmación para este objetivo y canal.",
        );
      }
      pendingWrites.add(pendingKey);
      try {
        const response = await json(
          targetPath(target),
          {
            method: "PATCH",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
          true,
        );
        let after: PriceView;
        try {
          after = mapPriceDto(response, target, channelIds);
          if (!confirmsUpdate(after, expected)) {
            throw new Error("Confirmación incompatible");
          }
        } catch {
          throw new PricingFailure(
            "unknown",
            "La respuesta no confirma el cambio solicitado. Consulta el precio antes de reintentar.",
          );
        }
        editableReads.set(key, { productId: target.productId, price: after });
        try {
          await dependencies.onUpdated?.(
            target,
            before,
            after,
            change.draft.reason,
          );
        } catch {
          console.warn(
            "No se registró la auditoría de demostración tras confirmar el precio.",
          );
        }
        return after;
      } catch (error) {
        if (error instanceof PricingFailure && error.kind === "unknown")
          uncertainUpdates.set(key, expected);
        throw error;
      } finally {
        pendingWrites.delete(pendingKey);
      }
    },

    async listSchedules(targetId, page, signal): Promise<SchedulePage> {
      if (!Number.isSafeInteger(page) || page < 1) {
        throw new PricingFailure("error", "La página solicitada no es válida.");
      }
      const target = await targetById(targetId, signal);
      const suffix = `/programaciones?pagina=${page}&tamanio=${pageSize}`;
      const response = await json(
        targetPath(target, suffix),
        { method: "GET", signal },
        false,
      );
      if (response === null) {
        throw new PricingFailure(
          "error",
          "Pricing no devolvió las programaciones.",
        );
      }
      return mapSchedulePageDto(response, target, page, pageSize, channelIds);
    },

    async schedule(
      targetId,
      draft: ScheduleDraft,
      signal,
    ): Promise<ScheduleView> {
      const target = await targetById(targetId, signal);
      const validFrom = localInstant(draft.start);
      const validUntil = draft.end ? localInstant(draft.end) : null;
      if (!validFrom || (draft.end && !validUntil)) {
        throw new PricingFailure(
          "error",
          "La vigencia no contiene una fecha válida.",
        );
      }
      const body = {
        tipoPrecio: draft.kind,
        importe: requestMoney(draft.amount),
        moneda: draft.currency,
        channelId: channelIdFor(draft.channel),
        validFrom,
        validUntil,
        motivoCambio: draft.reason,
      };
      const key = scopeKey(target, draft.channel);
      const pendingKey = "schedule:" + key;
      if (uncertainSchedules.has(key) || pendingWrites.has(pendingKey)) {
        throw new PricingFailure(
          "unknown",
          "Hay una programación pendiente de verificación. Consulta las programaciones antes de realizar otra escritura.",
        );
      }
      pendingWrites.add(pendingKey);
      try {
        const response = await json(
          targetPath(target, "/programaciones"),
          {
            method: "POST",
            signal,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
          true,
        );
        try {
          const created = mapScheduleDto(response, target, channelIds);
          if (
            created.channel !== draft.channel ||
            created.currency !== draft.currency ||
            created.kind !== draft.kind ||
            created.amount !== String(body.importe) ||
            Date.parse(created.start) !== Date.parse(body.validFrom) ||
            (created.end === null ? null : Date.parse(created.end)) !==
              (validUntil === null ? null : Date.parse(validUntil))
          ) {
            throw new Error("Confirmación incompatible");
          }
          return created;
        } catch {
          throw new PricingFailure(
            "unknown",
            "La respuesta no confirma la programación. Consulta su estado antes de reintentar.",
          );
        }
      } catch (error) {
        if (error instanceof PricingFailure && error.kind === "unknown")
          uncertainSchedules.add(key);
        throw error;
      } finally {
        pendingWrites.delete(pendingKey);
      }
    },

    async readHistorical(query, at, signal) {
      const target = await targetById(query.targetId, signal);
      const sku = target.kind === "variant" ? target.sku : target.referenceSku;
      if (!sku) {
        throw blocked(
          "El histórico requiere un SKU vendible resuelto por Catálogo para este objetivo.",
        );
      }
      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          at,
        ) ||
        !Number.isFinite(Date.parse(at))
      ) {
        throw new PricingFailure(
          "error",
          "El instante histórico no es válido.",
        );
      }
      const params = new URLSearchParams({ at });
      if (query.channel === "retail") params.set("canal", "RETAIL");
      const response = await json(
        `/api/v1/precios/skus/${encoded(sku)}?${params.toString()}`,
        { method: "GET", signal },
        false,
        ["PRECIO_NO_ENCONTRADO"],
      );
      if (response === null) return null;
      const price = mapPriceDto(response, target, channelIds, sku);
      const instant = Date.parse(at);
      if (
        (query.channel === "global" && price.channel !== "global") ||
        instant < Date.parse(price.validFrom) ||
        (price.validUntil !== null && instant >= Date.parse(price.validUntil))
      ) {
        throw new PricingFailure(
          "error",
          "Pricing devolvió una vigencia o canal que no corresponde a la consulta histórica.",
        );
      }
      if (!price.validityId) {
        throw new PricingFailure(
          "error",
          "Pricing no devolvió el identificador de la vigencia histórica.",
        );
      }
      return { price, validityId: price.validityId };
    },

    async prevalidate(input: ImportInput, signal) {
      void input;
      signal.throwIfAborted();
      throw blocked(
        "La prevalidación real de importaciones permanece bloqueada por P-PRI-01. No se envió ni se simuló el análisis del archivo.",
      );
    },

    async readBatch(id, signal): Promise<BatchView | null> {
      const response = await json(
        `/api/v1/precios/importaciones/${encoded(id)}`,
        { method: "GET", signal },
        false,
        ["LOTE_NO_ENCONTRADO"],
      );
      if (response === null) return null;
      const batch = mapBatchDto(response);
      if (batch.id !== id)
        throw new PricingFailure(
          "error",
          "Pricing devolvió un lote distinto del solicitado.",
        );
      return batch;
    },

    async report(id, signal): Promise<ReportFile> {
      const response = await send(
        `/api/v1/precios/importaciones/${encoded(id)}/reporte`,
        { method: "GET", signal },
        false,
      );
      if (!response) {
        throw new PricingFailure(
          "error",
          "Pricing no devolvió el reporte solicitado.",
        );
      }
      if (
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .startsWith("text/csv")
      ) {
        throw new PricingFailure(
          "error",
          "Pricing devolvió un formato de reporte distinto al CSV publicado.",
        );
      }
      try {
        return { data: await response.blob(), filename: "reporte-precios.csv" };
      } catch {
        throw new PricingFailure(
          "error",
          "No se pudo leer el reporte de Pricing.",
        );
      }
    },
  };
}
