import type {
  ComboDraft,
  ComboComponent,
  ProductDetail,
  SkuPrice,
  ComponentDraft,
} from "../types/combos";

export type ComparisonResult =
  | { status: "unavailable"; reason: string }
  | {
      status: "ready";
      regularMinor: number;
      publicMinor: number;
      comboMinor: number | null;
      valid: boolean;
      reason: string | null;
    };

export function parseMoneyMinor(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const [units, fraction = ""] = trimmed.split(".");
  const result = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : null;
}

export function formatMoney(minor: number | null, currency = "PEN"): string {
  if (minor === null) return "No disponible";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function resolveProductSkus(product: ProductDetail): string[] {
  if (!product.active) return [];
  if (product.hasVariants) return product.variants.filter((item) => item.active).map((item) => item.sku);
  return product.baseSku ? [product.baseSku] : [];
}

export function effectivePublicMinor(price: SkuPrice): number | null {
  return price.offerMinor ?? price.regularMinor;
}

export function isCurrentGlobalPrice(price: SkuPrice, now = Date.now()): boolean {
  const start = Date.parse(price.validFrom);
  const end = price.validUntil === null ? Number.POSITIVE_INFINITY : Date.parse(price.validUntil);
  return price.channelId === null && Number.isFinite(start) && start <= now &&
    (price.validUntil === null || (Number.isFinite(end) && end > now));
}

export function currentGlobalPricesForSku(sku: string, prices: SkuPrice[], now = Date.now()): SkuPrice[] {
  return prices.filter((price) => price.sku === sku && isCurrentGlobalPrice(price, now));
}

export function validateComposition(draft: Pick<ComboDraft, "components">) {
  const errors: string[] = [];
  if (draft.components.length < 2) errors.push("Agrega al menos dos SKU vendibles.");
  const skus = draft.components.map((item) => item.sku);
  if (new Set(skus).size !== skus.length) errors.push("Cada SKU debe aparecer una sola vez.");
  if (draft.components.some((item) => !item.sku.trim() || !item.productName.trim())) {
    errors.push("Selecciona componentes de catálogo válidos.");
  }
  if (draft.components.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
    errors.push("La cantidad de cada componente debe ser un entero igual o mayor que 1.");
  }
  return errors;
}

export function compareComboPrice(
  components: ComboComponent[],
  proposedPrice: string,
  prices: SkuPrice[],
  now = Date.now(),
): ComparisonResult {
  if (components.length === 0) return { status: "unavailable", reason: "Agrega componentes para consultar sus precios." };
  let regularMinor = 0;
  let publicMinor = 0;
  let currency: string | null = null;
  for (const component of components) {
    const matches = currentGlobalPricesForSku(component.sku, prices, now);
    if (matches.length !== 1) {
      return { status: "unavailable", reason: "No se pudo confirmar una referencia global vigente única para cada componente." };
    }
    const price = matches[0]!;
    const publicMinorForSku = price ? effectivePublicMinor(price) : null;
    if (!price || price.regularMinor === null || publicMinorForSku === null ||
      !Number.isSafeInteger(price.priceVersion) || price.priceVersion < 0 || !price.validityId.trim() ||
      !Number.isSafeInteger(price.regularMinor) || price.regularMinor <= 0 ||
      (price.offerMinor !== null && (!Number.isSafeInteger(price.offerMinor) || price.offerMinor <= 0)) ||
      price.currency !== "PEN" || (currency !== null && price.currency !== currency)) {
      return { status: "unavailable", reason: "No se pudo confirmar el precio vigente de todos los componentes." };
    }
    currency = price.currency;
    regularMinor += price.regularMinor * component.quantity;
    publicMinor += publicMinorForSku * component.quantity;
  }
  const comboMinor = parseMoneyMinor(proposedPrice);
  if (!Number.isSafeInteger(regularMinor) || !Number.isSafeInteger(publicMinor)) {
    return { status: "unavailable", reason: "Los precios exceden el rango que puede compararse con seguridad." };
  }
  const reason = comboMinor === null || comboMinor <= 0
    ? "Ingresa un precio mayor que cero con hasta dos decimales."
    : comboMinor >= regularMinor
      ? "El precio debe ser menor que la suma de precios regulares."
      : comboMinor >= publicMinor
        ? "El precio debe ser menor que la suma de precios públicos vigentes."
        : null;
  return {
    status: "ready",
    regularMinor,
    publicMinor,
    comboMinor,
    valid: reason === null,
    reason,
  };
}

export function toComparisonComponents(draft: ComponentDraft[], prices: SkuPrice[], now = Date.now()): ComboComponent[] {
  return draft.map((item) => {
    const matches = currentGlobalPricesForSku(item.sku, prices, now);
    const price = matches.length === 1 ? matches[0] : undefined;
    return {
      ...item,
      regularUnitMinor: price?.regularMinor ?? null,
      publicUnitMinor: price ? effectivePublicMinor(price) : null,
    };
  });
}
