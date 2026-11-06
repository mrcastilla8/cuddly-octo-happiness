import { currentGlobalPricesForSku } from "../services/comboRules";
import { ComboError, type CombosPricingPort, type SkuPrice } from "../types/combos";
import { priceFixtures } from "./comboFixtures";

export interface MockCombosPricingOptions {
  prices?: SkuPrice[];
  now?: () => number;
  fail?: boolean;
}

// Read-only Pricing port for Combos. It returns the current global references
// (channelId === null) that are valid "now". A SKU without exactly one current
// reference is simply omitted so consumers can detect the gap; it never invents
// a price.
export class MockCombosPricingAdapter implements CombosPricingPort {
  private readonly prices: SkuPrice[];
  private readonly now: () => number;
  private fail: boolean;

  constructor(options: MockCombosPricingOptions = {}) {
    this.prices = structuredClone(options.prices ?? priceFixtures);
    this.now = options.now ?? (() => Date.now());
    this.fail = options.fail ?? false;
  }

  setFailing(failing: boolean): void {
    this.fail = failing;
  }

  async readCurrent(skus: string[], signal?: AbortSignal): Promise<SkuPrice[]> {
    if (signal?.aborted) throw new DOMException("La consulta fue cancelada.", "AbortError");
    if (this.fail) {
      throw new ComboError("pricing_unavailable", "Pricing no está disponible para consultar las referencias vigentes.");
    }
    const now = this.now();
    return structuredClone(skus.flatMap((sku) => currentGlobalPricesForSku(sku, this.prices, now)));
  }
}
