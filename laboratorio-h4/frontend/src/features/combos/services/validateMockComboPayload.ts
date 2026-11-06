import { currentGlobalPricesForSku, effectivePublicMinor } from "./comboRules";
import {
  ComboError,
  type ComboPayload,
  type CombosCatalogPort,
  type CombosPricingPort,
} from "../types/combos";

const DEMO_CURRENCY = "PEN";

export interface ComboPayloadValidationContext {
  // Authoritative source of SKU identities. The selector and the save-time
  // validation must consult this same port so a SKU never validates against one
  // catalog and saves against another.
  catalog: CombosCatalogPort;
  pricing: CombosPricingPort;
  existingComboIds?: ReadonlySet<string>;
  now?: number;
}

function isValidDate(value: string): boolean {
  return value.length > 0 && Number.isFinite(Date.parse(value));
}

// Validates a combo payload against the shared Catalog identities and the
// current Pricing references. It does not trust the components sent by the
// form: every SKU is re-resolved against Catalog.
export async function validateMockComboPayload(
  payload: ComboPayload,
  context: ComboPayloadValidationContext,
): Promise<void> {
  if (!payload.name.trim()) {
    throw new ComboError("invalid_components", "Ingresa el nombre del combo.");
  }
  if (payload.components.length < 2) {
    throw new ComboError("invalid_components", "Un combo requiere al menos dos SKU vendibles directos.");
  }

  const skus = payload.components.map((component) => component.sku);
  if (context.existingComboIds && skus.some((sku) => context.existingComboIds!.has(sku))) {
    throw new ComboError("nested_combo", "No se permite agregar un combo como componente.");
  }
  if (new Set(skus).size !== skus.length) {
    throw new ComboError("duplicate_sku", "Cada SKU debe aparecer una sola vez en el combo.");
  }
  if (payload.components.some(({ quantity }) => !Number.isSafeInteger(quantity) || quantity < 1)) {
    throw new ComboError("invalid_quantity", "La cantidad de cada componente debe ser un entero positivo.");
  }

  const resolved = await context.catalog.resolveSkus(skus);
  const bySku = new Map(resolved.map((entry) => [entry.sku, entry]));
  for (const { sku } of payload.components) {
    const entry = bySku.get(sku);
    if (!entry) {
      throw new ComboError("sku_not_found", `El SKU ${sku} no existe en el catálogo compartido.`);
    }
    if (entry.isCombo) {
      throw new ComboError("nested_combo", `El SKU ${sku} corresponde a un combo y no puede ser componente.`);
    }
    if (entry.isVariantParentSku) {
      throw new ComboError("sku_invalid", `El SKU ${sku} es el padre con variantes; selecciona una variante activa.`);
    }
    if (!entry.sellable) {
      throw new ComboError("sku_invalid", `El SKU ${sku} no pertenece a un producto y una variante activos del catálogo.`);
    }
  }

  if (!Number.isSafeInteger(payload.priceMinor) || payload.priceMinor <= 0) {
    throw new ComboError("price_invalid", "El precio del combo debe ser mayor que cero.");
  }

  const now = context.now ?? Date.now();
  const prices = await context.pricing.readCurrent(skus);
  const references = payload.components.map(({ sku }) => {
    const matches = currentGlobalPricesForSku(sku, prices, now);
    return matches.length === 1 ? matches[0]! : null;
  });
  if (references.some((reference) => reference === null)) {
    throw new ComboError("pricing_unavailable", "No se pudo confirmar una referencia global vigente única de Pricing para cada SKU.");
  }

  const validReferences = references as NonNullable<(typeof references)[number]>[];
  const referenceCurrency = validReferences[0]?.currency;
  if (!referenceCurrency || referenceCurrency !== DEMO_CURRENCY || validReferences.some((price) =>
    price.currency !== referenceCurrency ||
    !Number.isSafeInteger(price.priceVersion) || price.priceVersion < 0 ||
    !price.validityId.trim() || !isValidDate(price.validFrom) ||
    price.regularMinor === null || !Number.isSafeInteger(price.regularMinor) || price.regularMinor <= 0 ||
    (price.offerMinor !== null && (!Number.isSafeInteger(price.offerMinor) || price.offerMinor <= 0)),
  )) {
    throw new ComboError("pricing_unavailable", "Las referencias de Pricing no son vigentes, globales o compatibles en moneda.");
  }

  let regularTotal = 0;
  let publicTotal = 0;
  payload.components.forEach((component, index) => {
    const reference = validReferences[index]!;
    const effectivePublic = effectivePublicMinor(reference);
    if (effectivePublic === null) {
      throw new ComboError("pricing_unavailable", "No se pudo determinar el precio público vigente de todos los SKU.");
    }
    regularTotal += reference.regularMinor! * component.quantity;
    publicTotal += effectivePublic * component.quantity;
  });

  if (!Number.isSafeInteger(regularTotal) || !Number.isSafeInteger(publicTotal)) {
    throw new ComboError("pricing_unavailable", "Las sumas de referencia exceden el rango seguro de comparación.");
  }
  if (payload.priceMinor >= regularTotal || payload.priceMinor >= publicTotal) {
    throw new ComboError("price_invalid", "El precio del combo debe ser menor que la suma regular y la suma pública vigente.");
  }
}
