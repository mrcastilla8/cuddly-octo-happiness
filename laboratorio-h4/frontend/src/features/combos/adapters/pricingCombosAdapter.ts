import type {
  PriceSnapshot,
  PriceTarget,
  PricingRepository,
} from "../../pricing/services/pricingRepository";
import { ComboError, type CombosPricingPort, type SkuPrice } from "../types/combos";

// Combos reads the SAME Pricing references published by MK-013 (single source of
// economic truth). This adapter never invents a `/skus` endpoint nor matches a
// price by product name: it resolves the exact target by the published SKU
// (`PriceTarget.referenceSku` for a product, `PriceTarget.sku` for a variant).
const DOMAIN_CURRENCY = "PEN";

export interface PricingCombosAdapterOptions {
  pricing: PricingRepository;
}

function targetMatchesSku(target: PriceTarget, sku: string): boolean {
  return target.kind === "product" ? target.referenceSku === sku : target.sku === sku;
}

// "179.00" -> 17900 minor units. Rejects anything that is not a safe amount with
// up to two decimals; never rounds silently.
export function parseMinorAmount(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const [units, fraction = ""] = trimmed.split(".");
  const minor = Number(units) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

export class PricingCombosAdapter implements CombosPricingPort {
  private readonly pricing: PricingRepository;

  constructor(options: PricingCombosAdapterOptions) {
    this.pricing = options.pricing;
  }

  // Live read: targets and effective prices are resolved on every call against
  // the shared repository, so a price change in Pricing is reflected immediately
  // and never served from a stale combos snapshot.
  async readCurrent(skus: string[], signal?: AbortSignal): Promise<SkuPrice[]> {
    if (signal?.aborted) throw new DOMException("La consulta fue cancelada.", "AbortError");
    const activeSignal = signal ?? new AbortController().signal;
    const targets = await this.pricing.listTargets(activeSignal);
    const result = await Promise.all(skus.map(async sku => {
      const matches = targets.filter((target) => targetMatchesSku(target, sku));
      if (matches.length === 0) return null;
      if (matches.length > 1) {
        throw new ComboError(
          "pricing_unavailable",
          `Hay más de una referencia de Pricing publicada para el SKU ${sku}.`,
        );
      }
      const target = matches[0]!;
      const snapshot = await this.pricing.read({ targetId: target.id, channel: "global" }, activeSignal);
      // A target without an effective price at the demo clock is omitted, never
      // invented as zero: consumers detect the gap by the missing SKU.
      if (!snapshot) return null;
      return this.toSkuPrice(target, sku, snapshot);
    }));
    return result.filter((price): price is SkuPrice => price !== null);
  }

  private toSkuPrice(target: PriceTarget, sku: string, snapshot: PriceSnapshot): SkuPrice {
    const price = snapshot.price;
    if (price.currency !== DOMAIN_CURRENCY) {
      throw new ComboError(
        "pricing_unavailable",
        `La referencia de Pricing de ${sku} no está publicada en ${DOMAIN_CURRENCY}.`,
      );
    }
    const regularMinor = parseMinorAmount(price.regular);
    if (regularMinor === null || regularMinor <= 0) {
      throw new ComboError("pricing_unavailable", `El precio regular de ${sku} no es un importe válido.`);
    }
    const offerMinor = price.offer === null ? null : parseMinorAmount(price.offer);
    if (price.offer !== null && (offerMinor === null || offerMinor <= 0)) {
      throw new ComboError("pricing_unavailable", `La oferta de Pricing de ${sku} no es un importe válido.`);
    }
    if (!Number.isSafeInteger(price.version) || price.version < 0) {
      throw new ComboError("pricing_unavailable", `La versión de precio de ${sku} no es válida.`);
    }
    if (!price.validFrom || !Number.isFinite(Date.parse(price.validFrom))) {
      throw new ComboError("pricing_unavailable", `La vigencia de ${sku} no es válida.`);
    }
    return {
      sku,
      regularMinor,
      offerMinor,
      currency: price.currency,
      channelId: null,
      priceVersion: price.version,
      validityId: `vigencia-${target.id}-${price.version}`,
      validFrom: price.validFrom,
      validUntil: price.validUntil,
    };
  }
}
