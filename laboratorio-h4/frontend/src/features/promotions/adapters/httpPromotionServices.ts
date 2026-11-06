import {
  AdministrationError,
  localDateValid,
} from "../services/administration";
import type { AdministrationQuery } from "../services/administration";
import type {
  CampaignDraft,
  CampaignView,
} from "../services/campaignRepository";
import {
  CouponReadError,
  CouponWriteError,
} from "../services/couponRepository";
import type {
  CouponInput,
  CouponView,
  CouponQuery,
} from "../services/couponRepository";
import type {
  RecommendationDraft,
  RecommendationView,
  SuperiorityCriterion,
} from "../services/recommendationRepository";
import type { PromotionCatalogRepository } from "../services/catalogRepository";
import type { PromotionServices } from "../services/promotionServices";

import { createHttpPromotionCatalog } from "./httpPromotionCatalog";

export interface PromotionHttpOptions {
  gatewayOrigin: string;
  getAccessToken(signal: AbortSignal): Promise<string | null>;
  refreshAccessToken?(
    rejectedToken: string,
    signal: AbortSignal,
  ): Promise<string | null>;
  invalidateAccessToken?(rejectedToken: string): void;
  catalog?: PromotionCatalogRepository;
}
class HttpFailure extends Error {
  constructor(readonly status: number) {
    super("PROMOTIONS_HTTP_FAILED");
  }
}
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("INVALID_RESPONSE");
  return v as Record<string, unknown>;
};
const text = (v: unknown): string => {
  if (typeof v !== "string") throw new Error("INVALID_RESPONSE");
  return v;
};
const number = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isFinite(v))
    throw new Error("INVALID_RESPONSE");
  return v;
};
const integer = (v: unknown): number => {
  const n = number(v);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error("INVALID_RESPONSE");
  return n;
};
const boolean = (v: unknown): boolean => {
  if (typeof v !== "boolean") throw new Error("INVALID_RESPONSE");
  return v;
};
const array = (v: unknown): unknown[] => {
  if (!Array.isArray(v)) throw new Error("INVALID_RESPONSE");
  return v;
};
function choice<T extends string>(v: unknown, choices: Record<string, T>): T {
  const key = text(v);
  if (!Object.hasOwn(choices, key)) throw new Error("INVALID_ENUM");
  return choices[key]!;
}
const states = { ACTIVO: "active", INACTIVO: "inactive" } as const;
const toState = (v: unknown) =>
  choice(v, { active: "ACTIVO", inactive: "INACTIVO" });
const channels = {
  MARKETPLACE: "marketplace",
  CHATBOT: "chatbot",
  RETAIL: "retail",
  VENTAS: "sales",
} as const;
const channelDto = {
  marketplace: "MARKETPLACE",
  chatbot: "CHATBOT",
  retail: "RETAIL",
  sales: "VENTAS",
} as const;
function localDate(v: unknown): string {
  const instant = new Date(text(v));
  if (!Number.isFinite(instant.getTime())) throw new Error("INVALID_RESPONSE");
  return new Date(instant.getTime() - 5 * 3600000).toISOString().slice(0, 16);
}
function instant(v: string): string {
  if (!localDateValid(v)) throw new Error("INVALID_DATE");
  return new Date(v + ":00-05:00").toISOString();
}
function numeric(v: string): number {
  if (!/^\d+(\.\d+)?$/.test(v)) throw new Error("INVALID_NUMBER");
  return number(Number(v));
}
function campaign(v: unknown): CampaignView {
  const r = record(v),
    scope = record(r.alcance),
    policy = record(r.politicaCombinacion);
  return {
    id: text(r.promotionId),
    name: text(r.nombre),
    status: choice(r.estado, states),
    canChangeMode: boolean(r.puedeCambiarModalidad),
    configuration: {
      name: text(r.nombre),
      status: choice(r.estado, states),
      mode: choice(r.modalidad, { AUTOMATICA: "automatic", CUPON: "coupon" }),
      discountType: choice(r.tipoDescuento, {
        PORCENTAJE: "percentage",
        MONTO_FIJO: "amount",
      }),
      benefit: String(number(r.valor)),
      priority: String(integer(r.prioridad)),
      validFrom: localDate(r.validFrom),
      validUntil: localDate(r.validUntil),
      productIds: array(scope.productIds).map(text),
      skus: array(scope.skus).map(text),
      channels: array(r.canalesHabilitados).map((c) => choice(c, channels)),
      combination: {
        pricing: boolean(policy.ofertaPricing),
        automatic: boolean(policy.promocionAutomatica),
        coupon: boolean(policy.cupon),
      },
    },
  };
}
function campaignDto(d: CampaignDraft): Record<string, unknown> {
  return {
    nombre: d.name,
    modalidad: choice(d.mode, { automatic: "AUTOMATICA", coupon: "CUPON" }),
    estado: toState(d.status),
    tipoDescuento: choice(d.discountType, {
      percentage: "PORCENTAJE",
      amount: "MONTO_FIJO",
    }),
    valor: numeric(d.benefit),
    prioridad: numeric(d.priority),
    validFrom: instant(d.validFrom),
    validUntil: instant(d.validUntil),
    alcance: { productIds: d.productIds, skus: d.skus },
    canalesHabilitados: d.channels.map((c) => choice(c, channelDto)),
    politicaCombinacion: {
      ofertaPricing: d.combination.pricing,
      promocionAutomatica: d.combination.automatic,
      cupon: d.combination.coupon,
    },
  };
}
function recommendation(v: unknown): RecommendationView {
  const r = record(v),
    origin = record(r.origen);
  return {
    id: text(r.reglaId),
    name: text(r.nombre),
    status: choice(r.estado, states),
    configuration: {
      name: text(r.nombre),
      kind: choice(r.tipo, { CROSS_SELL: "cross-sell", UPSELL: "upsell" }),
      originType: choice(origin.tipo, {
        PRODUCTO: "product",
        CATEGORIA: "category",
      }),
      originId: text(origin.id),
      priority: String(integer(r.prioridad)),
      status: choice(r.estado, states),
      validFrom: localDate(r.validFrom),
      validUntil: localDate(r.validUntil),
      candidates: array(r.recomendados).map((v) => {
        const i = record(v);
        return {
          productId: text(i.productId),
          order: String(integer(i.orden)),
          criterion:
            i.criterioSuperioridad === null ||
            i.criterioSuperioridad === undefined
              ? ""
              : choice<SuperiorityCriterion>(i.criterioSuperioridad, {
                  MAYOR_RENDIMIENTO: "MAYOR_RENDIMIENTO",
                  MEJOR_MATERIAL: "MEJOR_MATERIAL",
                  MAYOR_CAPACIDAD: "MAYOR_CAPACIDAD",
                  FUNCIONALIDAD_ADICIONAL: "FUNCIONALIDAD_ADICIONAL",
                }),
          justification:
            i.justificacionComercial === null ||
            i.justificacionComercial === undefined
              ? ""
              : text(i.justificacionComercial),
        };
      }),
    },
  };
}
function recommendationDto(d: RecommendationDraft): Record<string, unknown> {
  return {
    nombre: d.name,
    tipo: choice(d.kind, { "cross-sell": "CROSS_SELL", upsell: "UPSELL" }),
    origen: {
      tipo: choice(d.originType, {
        product: "PRODUCTO",
        category: "CATEGORIA",
      }),
      id: d.originId,
    },
    prioridad: numeric(d.priority),
    estado: toState(d.status),
    validFrom: instant(d.validFrom),
    validUntil: instant(d.validUntil),
    recomendados: d.candidates.map((c) => ({
      productId: c.productId,
      orden: numeric(c.order),
      criterioSuperioridad: c.criterion || null,
      justificacionComercial: c.justification || null,
    })),
  };
}
function couponDto(d: Omit<CouponInput, "status"> & { status?: string }) {
  return {
    codigo: d.code.trim().toUpperCase(),
    promocionId: d.promotionId,
    ...(d.status ? { estado: toState(d.status) } : {}),
    maxUsosGlobal: d.globalLimit,
    maxUsosPorCliente: d.customerLimit,
    montoMinimo: d.minimumAmount === null ? null : numeric(d.minimumAmount),
    politicaCancelacion: choice(d.cancellationPolicy, {
      restore: "RESTAURAR_EN_CANCELACION",
      keep: "NO_RESTAURAR",
    }),
  };
}
function changes(
  next: Record<string, unknown>,
  previous: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(next).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(previous[key]),
    ),
  );
}
function query(
  q: CouponQuery | AdministrationQuery,
  kindField?: "modalidad" | "tipo",
) {
  const p = new URLSearchParams({
    pagina: String(q.page),
    tamanio: String(q.pageSize),
  });
  if (q.status !== "all") p.set("estado", toState(q.status));
  if (kindField && "kind" in q && q.kind !== "all")
    p.set(
      kindField,
      choice(
        q.kind,
        kindField === "modalidad"
          ? { coupon: "CUPON", automatic: "AUTOMATICA" }
          : { "cross-sell": "CROSS_SELL", upsell: "UPSELL" },
      ),
    );
  return p.toString();
}
function page<T>(v: unknown, map: (v: unknown) => T) {
  const r = record(v),
    meta = record(r.meta);
  const current = integer(meta.pagina),
    total = integer(meta.total);
  if (current < 1) throw new Error("INVALID_PAGE");
  return { items: array(r.items).map(map), total, page: current };
}

export function createHttpPromotionServices(
  options: PromotionHttpOptions,
): PromotionServices {
  const url = new URL(options.gatewayOrigin);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ))
  )
    throw new Error("Configura un origen Gateway HTTPS válido.");
  const origin = url.origin;
  async function request(
    path: string,
    signal: AbortSignal,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    signal.throwIfAborted();
    const bounded = AbortSignal.any([signal, AbortSignal.timeout(7500)]);
    async function sessionToken(work: () => Promise<string | null>) {
      let abort = () => {};
      try {
        return await Promise.race([
          Promise.resolve().then(work),
          new Promise<never>((_resolve, reject) => {
            abort = () =>
              reject(new DOMException("Consulta cancelada", "AbortError"));
            bounded.addEventListener("abort", abort, { once: true });
            if (bounded.aborted) abort();
          }),
        ]);
      } finally {
        bounded.removeEventListener("abort", abort);
      }
    }
    const token = await sessionToken(() => options.getAccessToken(bounded));
    bounded.throwIfAborted();
    if (!token || /[\r\n]/.test(token)) throw new HttpFailure(401);
    const send = (accessToken: string) =>
      fetch(origin + "/api/v1" + path, {
        method,
        signal: bounded,
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
        headers: {
          Authorization: "Bearer " + accessToken,
          "X-Correlation-Id": crypto.randomUUID(),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    let response = await send(token);
    if (response.status === 401 && options.refreshAccessToken) {
      let code: unknown;
      try {
        const problem: unknown = await response.json();
        code = record(problem).code;
      } catch {
        /* An unknown 401 never triggers refresh or replay. */
      }
      if (code === "TOKEN_INVALIDO") {
        if (method === "GET") {
          const refresh = options.refreshAccessToken;
          const renewed = await sessionToken(() => refresh(token, bounded));
          bounded.throwIfAborted();
          if (renewed && !/[\r\n]/.test(renewed)) {
            response = await send(renewed);
            if (response.status === 401)
              options.invalidateAccessToken?.(renewed);
          }
        } else {
          // Preserve the existing no-retry rule for writes; the UI reports the
          // failed action and requires a new explicit authenticated attempt.
          options.invalidateAccessToken?.(token);
        }
      }
    }
    if (!response.ok) throw new HttpFailure(response.status);
    return response.json();
  }
  async function read<T>(
    work: () => Promise<T>,
    missing = false,
  ): Promise<T | null> {
    try {
      return await work();
    } catch (e) {
      if (e instanceof CouponReadError) throw e;
      if (e instanceof HttpFailure && missing && e.status === 404) return null;
      throw new CouponReadError(
        e instanceof HttpFailure && e.status === 401
          ? "session"
          : e instanceof HttpFailure && e.status === 403
            ? "forbidden"
            : "unavailable",
        e instanceof HttpFailure && e.status === 401
          ? "Tu sesión no está disponible. Vuelve a identificarte."
          : e instanceof HttpFailure && e.status === 403
            ? "No tienes permiso para consultar estos datos."
            : "No se pudo consultar la información. Conservamos el contexto; vuelve a consultar.",
      );
    }
  }
  async function write<T>(work: () => Promise<T>, coupon = false): Promise<T> {
    try {
      return await work();
    } catch (e) {
      const status = e instanceof HttpFailure ? e.status : 0;
      const kind =
        status === 401 || status === 403
          ? "access"
          : status === 409
            ? "conflict"
            : status === 400 || status === 422
              ? "validation"
              : status === 404
                ? "rejected"
                : "unknown";
      const message =
        kind === "access"
          ? "Tu sesión o permiso no permite guardar."
          : kind === "conflict"
            ? "El registro ya existe o cambió. Consulta su estado actual."
            : kind === "validation"
              ? "Revisa los datos de la propuesta; no se guardaron."
              : kind === "rejected"
                ? "El registro ya no está disponible."
                : "No pudimos confirmar el resultado. Consulta el registro antes de volver a guardar.";
      throw coupon
        ? new CouponWriteError(kind, message)
        : new AdministrationError(kind, message);
    }
  }
  const campaignSnapshots = new Map<string, CampaignDraft>(),
    ruleSnapshots = new Map<string, RecommendationDraft>();
  function mapCampaign(v: unknown) {
    const r = campaign(v);
    campaignSnapshots.set(r.id, structuredClone(r.configuration));
    return r;
  }
  function mapRule(v: unknown) {
    const r = recommendation(v);
    ruleSnapshots.set(r.id, structuredClone(r.configuration));
    return r;
  }
  const campaigns: PromotionServices["campaigns"] = {
    list: (q, s) =>
      read(() =>
        request("/promociones/administracion?" + query(q, "modalidad"), s).then(
          (r) => page(r, mapCampaign),
        ),
      ).then((r) => r!),
    read: (id, s) =>
      read(
        () =>
          request("/promociones/" + encodeURIComponent(id), s).then(
            mapCampaign,
          ),
        true,
      ),
    save: (id, d, s) =>
      write(async () => {
        const body = campaignDto(d);
        if (id) {
          const previous = campaignSnapshots.get(id);
          if (!previous) throw new HttpFailure(409);
          return mapCampaign(
            await request(
              "/promociones/" + encodeURIComponent(id),
              s,
              "PATCH",
              changes(body, campaignDto(previous)),
            ),
          );
        }
        return mapCampaign(await request("/promociones", s, "POST", body));
      }),
    changeStatus: (id, status, s) =>
      write(() =>
        request(
          "/promociones/" +
            encodeURIComponent(id) +
            (status === "active" ? "/activar" : "/desactivar"),
          s,
          "POST",
        ).then(mapCampaign),
      ),
  };
  const recommendations: PromotionServices["recommendations"] = {
    list: (q, s) =>
      read(() =>
        request("/recomendaciones/reglas?" + query(q, "tipo"), s).then((r) =>
          page(r, mapRule),
        ),
      ).then((r) => r!),
    read: (id, s) =>
      read(
        () =>
          request("/recomendaciones/reglas/" + encodeURIComponent(id), s).then(
            mapRule,
          ),
        true,
      ),
    save: (id, d, s) =>
      write(async () => {
        const body = recommendationDto(d);
        if (id) {
          const previous = ruleSnapshots.get(id);
          if (!previous) throw new HttpFailure(409);
          return mapRule(
            await request(
              "/recomendaciones/reglas/" + encodeURIComponent(id),
              s,
              "PATCH",
              changes(body, recommendationDto(previous)),
            ),
          );
        }
        return mapRule(
          await request("/recomendaciones/reglas", s, "POST", body),
        );
      }),
    changeStatus: (id, status, s) =>
      write(() =>
        request(
          "/recomendaciones/reglas/" +
            encodeURIComponent(id) +
            (status === "active" ? "/activar" : "/desactivar"),
          s,
          "POST",
        ).then(mapRule),
      ),
  };
  function coupon(v: unknown): CouponView {
    const r = record(v);
    // Validate the administrative response before confirming any write. Parent
    // data is a separate read and cannot revoke this confirmation.
    localDate(r.createdAt);
    localDate(r.updatedAt);
    const limit = (v: unknown, minimum: number) => {
      if (v === undefined || v === null) return v;
      const n = integer(v);
      if (n < minimum) throw new Error("INVALID_RESPONSE");
      return n;
    };
    const minimumAmount = r.montoMinimo;
    if (
      minimumAmount !== undefined &&
      minimumAmount !== null &&
      number(minimumAmount) <= 0
    )
      throw new Error("INVALID_RESPONSE");
    return {
      id: text(r.cuponId),
      promotionId: text(r.promocionId),
      code: text(r.codigo),
      status: choice(r.estado, states),
      promotion: null,
      globalLimit: limit(r.maxUsosGlobal, 1),
      customerLimit: limit(r.maxUsosPorCliente, 1),
      consumedUses: integer(r.usosGlobalesConsumidos),
      remainingUses: limit(r.usosDisponibles, 0),
      minimumAmount:
        r.montoMinimo === undefined
          ? undefined
          : r.montoMinimo === null
            ? null
            : String(number(r.montoMinimo)),
      cancellationPolicy: choice(r.politicaCancelacion, {
        RESTAURAR_EN_CANCELACION: "restore",
        NO_RESTAURAR: "keep",
      }),
    };
  }
  async function readCouponPromotion(id: string, signal: AbortSignal) {
    return (await read(async () => {
      const source = record(
        await request("/promociones/" + encodeURIComponent(id), signal),
      );
      const parent = campaign(source);
      if (parent.id !== id) throw new Error("INVALID_RESPONSE");
      return {
        name: parent.name,
        validFrom: text(source.validFrom),
        validUntil: text(source.validUntil),
      };
    }))!;
  }
  async function enrichCoupon(
    result: CouponView,
    signal: AbortSignal,
  ): Promise<CouponView> {
    return {
      ...result,
      promotion: await readCouponPromotion(result.promotionId, signal),
    };
  }
  async function writeCoupon(
    path: string,
    signal: AbortSignal,
    method: string,
    body?: unknown,
  ): Promise<CouponView> {
    const confirmed = await write(
      async () => coupon(await request(path, signal, method, body)),
      true,
    );
    try {
      return await enrichCoupon(confirmed, signal);
    } catch {
      return { ...confirmed, relatedDataUnavailable: true };
    }
  }
  const coupons: PromotionServices["coupons"] = {
    list: (q, s) =>
      read(async () => {
        const r = record(await request("/cupones?" + query(q), s)),
          meta = record(r.meta);
        const rows = array(r.items).map(coupon);
        const total = integer(meta.total), current = integer(meta.pagina);
        if (current < 1) throw new Error("INVALID_PAGE");
        // This cache and queue belong only to this list operation. Duplicate
        // IDs share the same promise, including its failure; nothing survives
        // a later read or another user's session.
        const parents = new Map<string, ReturnType<typeof readCouponPromotion>>();
        const waiting: (() => void)[] = [];
        let active = 0;
        const parentFor = (id: string) => {
          let pending = parents.get(id);
          if (!pending) {
            pending = (async () => {
              if (active >= 4)
                await new Promise<void>((done) => waiting.push(done));
              else active++;
              try {
                s.throwIfAborted();
                return await readCouponPromotion(id, s);
              } finally {
                const next = waiting.shift();
                if (next) next();
                else active--;
              }
            })();
            parents.set(id, pending);
          }
          return pending;
        };
        return {
          items: await Promise.all(
            rows.map(async (row): Promise<CouponView> => {
              try {
                return { ...row, promotion: await parentFor(row.promotionId) };
              } catch (error) {
                s.throwIfAborted();
                if (error instanceof CouponReadError && error.kind === "unavailable")
                  return { ...row, relatedDataUnavailable: true };
                throw error;
              }
            }),
          ),
          total,
          page: current,
        };
      }).then((r) => r!),
    read: (id, s) =>
      read(
        () =>
          request("/cupones/" + encodeURIComponent(id), s).then((v) =>
            enrichCoupon(coupon(v), s),
          ),
        true,
      ),
    create: (d, s) => writeCoupon("/cupones", s, "POST", couponDto(d)),
    update: (id, d, s) =>
      writeCoupon(
        "/cupones/" + encodeURIComponent(id),
        s,
        "PATCH",
        couponDto(d),
      ),
    changeStatus: (id, status, s) =>
      writeCoupon(
        "/cupones/" +
          encodeURIComponent(id) +
          (status === "active" ? "/activar" : "/desactivar"),
        s,
        "POST",
      ),
    promotions: (s) =>
      read(async () => {
        const result = [];
        for (let current = 1; ; current++) {
          const p = await campaigns.list(
            { status: "all", kind: "coupon", page: current, pageSize: 100 },
            s,
          );
          result.push(
            ...p.items.map((r) => ({
              id: r.id,
              name: r.name,
              mode: r.configuration.mode as "coupon" | "automatic",
              validFrom: r.configuration.validFrom + ":00-05:00",
              validUntil: r.configuration.validUntil + ":00-05:00",
            })),
          );
          if (p.page * 100 >= p.total || !p.items.length) return result;
          if (current >= 1000) throw new Error("PAGE_LIMIT_EXCEEDED");
        }
      }).then((r) => r!),
  };
  const httpCatalog = createHttpPromotionCatalog(request);
  return {
    campaigns,
    coupons,
    recommendations,
    catalog: options.catalog ?? {
      products: (signal, retain) =>
        read(() => httpCatalog.products(signal, retain)).then((r) => r!),
      categories: (signal) =>
        read(() => httpCatalog.categories(signal)).then((r) => r!),
    },
  };
}
