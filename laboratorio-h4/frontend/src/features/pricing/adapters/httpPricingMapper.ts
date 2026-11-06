import {
  PricingFailure,
  type BatchView,
  type ImportRow,
  type ScheduleView,
} from "../services/pricingModels";
import type {
  PriceChannel,
  PriceTarget,
  PriceView,
} from "../services/pricingRepository";

export interface PricingChannelIds {
  retail?: string;
}

function invalidResponse(): never {
  throw new PricingFailure(
    "error",
    "Pricing devolvió una respuesta incompatible con el contrato vigente.",
  );
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : invalidResponse();
}

function requiredString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== "string" || !value.trim()) return invalidResponse();
  return value;
}

function requiredDate(source: Record<string, unknown>, key: string): string {
  const value = requiredString(source, key);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value.slice(0, 10) + "T00:00:00Z").toISOString().slice(0, 10) !==
      value.slice(0, 10)
  )
    return invalidResponse();
  return value;
}

function requiredNullableString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  if (!Object.hasOwn(source, key)) return invalidResponse();
  const value = source[key];
  if (value !== null && (typeof value !== "string" || !value.trim()))
    return invalidResponse();
  return value as string | null;
}

function optionalNullableString(
  source: Record<string, unknown>,
  key: string,
): string | null {
  return Object.hasOwn(source, key) ? requiredNullableString(source, key) : null;
}

function optionalNullableNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  if (!Object.hasOwn(source, key)) return null;
  const value = source[key];
  if (value !== null && typeof value !== "number") return invalidResponse();
  return value as number | null;
}

function optionalNullableDate(
  source: Record<string, unknown>,
  key: string,
): string | null {
  const value = optionalNullableString(source, key);
  if (
    value !== null &&
    (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
      !Number.isFinite(Date.parse(value)))
  )
    return invalidResponse();
  return value;
}

function version(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    return invalidResponse();
  return value;
}

function decimalCents(value: string): bigint {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function requestMoney(value: string): number {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) {
    throw new PricingFailure(
      "error",
      "El contrato de Pricing admite importes positivos con hasta dos decimales y diez dígitos enteros.",
    );
  }
  const numeric = Number(value);
  if (
    !Number.isFinite(numeric) ||
    numeric <= 0 ||
    decimalCents(numeric.toString()) !== decimalCents(value)
  ) {
    throw new PricingFailure(
      "error",
      "El importe no se puede representar exactamente en el contrato HTTP de Pricing.",
    );
  }
  return numeric;
}

function responseMoney(value: unknown): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value <= 0 ||
    !/^\d{1,10}(?:\.\d{1,2})?$/.test(value.toString())
  )
    return invalidResponse();
  return value.toString();
}

function priceChannel(
  value: string | null,
  channelIds: PricingChannelIds,
): PriceChannel {
  if (value === null) return "global";
  if (value === "RETAIL" || (channelIds.retail && value === channelIds.retail))
    return "retail";
  return invalidResponse();
}

export function validatePriceTargets(value: unknown): PriceTarget[] {
  if (!Array.isArray(value)) return invalidResponse();
  const ids = new Set<string>();
  return value.map((item) => {
    const target = record(item);
    const id = requiredString(target, "id");
    const label = requiredString(target, "label");
    const productId = requiredString(target, "productId");
    if (ids.has(id)) return invalidResponse();
    ids.add(id);
    if (target.kind === "product") {
      const referenceSku = target.referenceSku;
      if (
        referenceSku !== undefined &&
        (typeof referenceSku !== "string" || !referenceSku.trim())
      )
        return invalidResponse();
      return {
        id,
        label,
        productId,
        kind: "product",
        ...(referenceSku === undefined ? {} : { referenceSku }),
      };
    }
    if (
      target.kind === "variant" &&
      typeof target.sku === "string" &&
      target.sku.trim() &&
      typeof target.productTargetId === "string" &&
      target.productTargetId.trim()
    ) {
      return {
        id,
        label,
        productId,
        kind: "variant",
        sku: target.sku,
        productTargetId: target.productTargetId,
      };
    }
    return invalidResponse();
  });
}

export function mapPriceDto(
  value: unknown,
  target: PriceTarget,
  channelIds: PricingChannelIds = {},
  responseSku?: string,
): PriceView {
  const dto = record(value);
  const productResponse =
    target.kind === "product" && responseSku === undefined;
  const sku =
    responseSku ?? (target.kind === "variant" ? target.sku : undefined);
  if (productResponse ? dto.product_id !== target.productId : dto.sku !== sku)
    return invalidResponse();

  const channelId = productResponse
    ? optionalNullableString(dto, "channel_id")
    : requiredNullableString(dto, "channel_id");
  const origin = productResponse
    ? "product"
    : dto.origen === "PRODUCTO"
      ? "product"
      : dto.origen === "SKU_OVERRIDE"
        ? "sku"
        : invalidResponse();
  const offer = optionalNullableNumber(dto, "precio_oferta");
  const regular = responseMoney(dto.precio_regular);
  const priceOffer = offer === null ? null : responseMoney(offer);
  const currency = requiredString(dto, "currency");
  if (
    currency.length !== 3 ||
    currency.trim().length !== 3 ||
    (priceOffer !== null && requestMoney(priceOffer) >= requestMoney(regular))
  )
    return invalidResponse();

  const validityId = productResponse
    ? undefined
    : requiredString(dto, "vigencia_id");
  const displaySku =
    sku ?? (target.kind === "product" ? target.referenceSku : undefined);
  const validFrom = requiredDate(dto, "valid_from");
  const validUntil = optionalNullableDate(dto, "valid_until");
  if (validUntil !== null && Date.parse(validUntil) <= Date.parse(validFrom))
    return invalidResponse();
  if (productResponse && channelId !== null) return invalidResponse();

  return {
    id: target.id,
    name: target.label,
    ...(displaySku ? { sku: displaySku } : {}),
    regular,
    offer: priceOffer,
    currency,
    version: version(dto, "price_version"),
    origin,
    channel: priceChannel(channelId, channelIds),
    validFrom,
    validUntil,
    inherited: target.kind === "variant" && origin === "product",
    ...(validityId ? { validityId } : {}),
  };
}

export function mapScheduleDto(
  value: unknown,
  target: PriceTarget,
  channelIds: PricingChannelIds = {},
): ScheduleView {
  const dto = record(value);
  if (
    target.kind === "product"
      ? dto.product_id !== target.productId
      : dto.sku !== target.sku
  )
    return invalidResponse();
  const kind = dto.tipoPrecio;
  const status = dto.estado;
  if (kind !== "REGULAR" && kind !== "OFERTA") return invalidResponse();
  if (
    status !== "SCHEDULED" &&
    status !== "ACTIVE" &&
    status !== "HISTORICAL" &&
    status !== "CANCELLED"
  )
    return invalidResponse();
  const channelId = optionalNullableString(dto, "channelId");
  const validUntil = optionalNullableDate(dto, "validUntil");
  const validFrom = requiredDate(dto, "validFrom");
  if (validUntil !== null && Date.parse(validUntil) <= Date.parse(validFrom))
    return invalidResponse();
  const currency = requiredString(dto, "moneda");
  if (currency.length !== 3) return invalidResponse();
  return {
    id: requiredString(dto, "programacionId"),
    targetId: target.id,
    kind,
    amount: responseMoney(dto.importe),
    currency,
    channel: priceChannel(channelId, channelIds),
    start: validFrom,
    end: validUntil,
    status,
    version: version(dto, "priceVersion"),
  };
}

export function mapSchedulePageDto(
  value: unknown,
  target: PriceTarget,
  page: number,
  pageSize: number,
  channelIds: PricingChannelIds = {},
) {
  const dto = record(value);
  if (!Array.isArray(dto.items)) return invalidResponse();
  const meta = record(dto.meta);
  const total = meta.total;
  const totalPages = meta.totalPaginas;
  if (
    meta.pagina !== page ||
    meta.tamanio !== pageSize ||
    typeof total !== "number" ||
    !Number.isSafeInteger(total) ||
    total < 0 ||
    typeof totalPages !== "number" ||
    !Number.isSafeInteger(totalPages) ||
    totalPages !== Math.ceil(total / pageSize) ||
    dto.items.length > pageSize ||
    dto.items.length !==
      Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize))
  )
    return invalidResponse();
  return {
    items: dto.items.map((item) => mapScheduleDto(item, target, channelIds)),
    page,
    pageSize,
    total,
  };
}

export function mapBatchDto(value: unknown): BatchView {
  const dto = record(value);
  const status = dto.status;
  if (
    status !== "QUEUED" &&
    status !== "PROCESSING" &&
    status !== "COMPLETED" &&
    status !== "PARTIAL" &&
    status !== "FAILED"
  )
    return invalidResponse();
  const count = (key: string) => {
    const value = dto[key];
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
      return invalidResponse();
    return value;
  };
  const rows = dto.rows;
  if (rows !== undefined && !Array.isArray(rows)) return invalidResponse();
  const total = count("total_rows");
  const completed = count("completed_rows");
  const failed = count("failed_rows");
  if (completed > total || failed > total - completed) return invalidResponse();
  const rowIds = new Set<string>();
  return {
    id: requiredString(dto, "batch_id"),
    status,
    allowPartial:
      typeof dto.allow_partial === "boolean"
        ? dto.allow_partial
        : invalidResponse(),
    total,
    completed,
    failed,
    ...(rows === undefined
      ? {}
      : {
          rows: rows.map((value): ImportRow => {
            const row = record(value);
            const rowStatus = row.status;
            if (
              rowStatus !== "PENDING" &&
              rowStatus !== "PROCESSING" &&
              rowStatus !== "COMPLETED" &&
              rowStatus !== "FAILED"
            )
              return invalidResponse();
            const sku = row.sku;
            const code = row.code;
            const detail = row.detail;
            if (
              (sku !== undefined && sku !== null && typeof sku !== "string") ||
              (code !== undefined &&
                code !== null &&
                typeof code !== "string") ||
              (detail !== undefined &&
                detail !== null &&
                typeof detail !== "string")
            )
              return invalidResponse();
            const id = requiredString(row, "row_id");
            if (rowIds.has(id)) return invalidResponse();
            rowIds.add(id);
            return {
              id,
              sku: sku ?? null,
              status: rowStatus,
              code: code ?? null,
              detail: detail ?? null,
            };
          }),
        }),
  };
}
