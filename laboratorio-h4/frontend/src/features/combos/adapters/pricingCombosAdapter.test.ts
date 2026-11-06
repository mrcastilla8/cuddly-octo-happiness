import { describe, expect, it } from "vitest";

import { createMockPricingRepository } from "../../pricing/adapters/mockPricingRepository";
import { demoNow } from "../../pricing/mocks/prices";
import type {
  PriceTarget,
  PriceView,
  PricingRepository,
} from "../../pricing/services/pricingRepository";
import { PricingCombosAdapter, parseMinorAmount } from "./pricingCombosAdapter";

// Combos and MK-013 share the exact same Pricing mock repository, so both features
// must resolve the identical economic reference for a SKU.
const fixedClock = { now: () => demoNow };

function makeAdapter(pricing: PricingRepository) {
  return new PricingCombosAdapter({ pricing });
}

function productTarget(id: string, referenceSku?: string): PriceTarget {
  return { id, label: id, productId: "fixture-product", kind: "product", referenceSku };
}

function variantTarget(id: string, sku: string): PriceTarget {
  return { id, label: id, productId: "fixture-product", kind: "variant", sku, productTargetId: "base" };
}

function priceView(overrides: Partial<PriceView> = {}): PriceView {
  return {
    id: "base",
    name: "Referencia",
    regular: "10.00",
    offer: null,
    currency: "PEN",
    version: 1,
    origin: "product",
    channel: "global",
    validFrom: "2020-01-01T00:00:00Z",
    validUntil: null,
    inherited: false,
    ...overrides,
  };
}

// Minimal stub for edge cases the shared mock repository never produces
// (duplicate targets, incompatible currency, invalid amounts).
function stubPricing(input: {
  targets: PriceTarget[];
  prices?: Record<string, PriceView | null>;
}): PricingRepository {
  return {
    listTargets: async () => input.targets,
    read: async (query: { targetId: string }) => {
      const price = input.prices?.[query.targetId];
      return price ? { price, breakdown: [price] } : null;
    },
  } as unknown as PricingRepository;
}

describe("parseMinorAmount", () => {
  it("convierte importes con hasta dos decimales a unidades menores", () => {
    expect(parseMinorAmount("179.00")).toBe(17900);
    expect(parseMinorAmount("179")).toBe(17900);
    expect(parseMinorAmount("0.5")).toBe(50);
    expect(parseMinorAmount("12.34")).toBe(1234);
  });

  it("rechaza importes inválidos o no seguros sin redondear", () => {
    expect(parseMinorAmount("1.999")).toBeNull();
    expect(parseMinorAmount("abc")).toBeNull();
    expect(parseMinorAmount("")).toBeNull();
    expect(parseMinorAmount("-1.00")).toBeNull();
    expect(parseMinorAmount(null)).toBeNull();
    expect(parseMinorAmount(undefined)).toBeNull();
  });
});

describe("PricingCombosAdapter · referencias compartidas de Pricing", () => {
  it("resuelve el SKU de producto por referenceSku publicado", async () => {
    const prices = await makeAdapter(createMockPricingRepository(fixedClock)).readCurrent(["CAS-COR-001"]);
    expect(prices).toHaveLength(1);
    expect(prices[0]).toMatchObject({
      sku: "CAS-COR-001",
      regularMinor: 17900,
      offerMinor: 15900,
      currency: "PEN",
      channelId: null,
      priceVersion: 1,
    });
  });

  it("hereda la referencia base de la variante y respeta una variante con override", async () => {
    const adapter = makeAdapter(createMockPricingRepository(fixedClock));
    const inherited = await adapter.readCurrent(["CAM-RUN-BLA-M"]);
    expect(inherited[0]).toMatchObject({ regularMinor: 13990, offerMinor: 12990, sku: "CAM-RUN-BLA-M" });

    const override = await adapter.readCurrent(["CAM-RUN-AZU-L"]);
    expect(override[0]).toMatchObject({ regularMinor: 14990, offerMinor: null, sku: "CAM-RUN-AZU-L" });
  });

  it("resuelve varios SKU y omite los que no tienen referencia publicada", async () => {
    const adapter = makeAdapter(createMockPricingRepository(fixedClock));
    const resolved = await adapter.readCurrent(["CAS-COR-001", "CAM-RUN-BLA-M", "CAM-RUN-AZU-L"]);
    expect(resolved.map((price) => price.sku)).toEqual(["CAS-COR-001", "CAM-RUN-BLA-M", "CAM-RUN-AZU-L"]);

    await expect(adapter.readCurrent(["SKU-SIN-PRECIO"])).resolves.toEqual([]);
  });

  it("expone la misma identidad económica que Pricing (fuente única)", async () => {
    const pricing = createMockPricingRepository(fixedClock);
    const signal = new AbortController().signal;
    const snapshot = await pricing.read({ targetId: "combo-casaca", channel: "global" }, signal);
    const [price] = await makeAdapter(pricing).readCurrent(["CAS-COR-001"]);

    expect(snapshot?.price.regular).toBe("179.00");
    expect(price?.regularMinor).toBe(parseMinorAmount(snapshot!.price.regular));
    expect(price?.offerMinor).toBe(parseMinorAmount(snapshot!.price.offer));
    expect(price?.priceVersion).toBe(snapshot!.price.version);
    expect(price?.validFrom).toBe(snapshot!.price.validFrom);
  });

  it("relee el estado vigente en cada llamada y no sirve caché obsoleta", async () => {
    let regular = "10.00";
    const adapter = makeAdapter({
      listTargets: async () => [productTarget("combo-x", "SKU-X")],
      read: async () => ({ price: priceView({ regular }), breakdown: [] }),
    } as unknown as PricingRepository);

    expect((await adapter.readCurrent(["SKU-X"]))[0]?.regularMinor).toBe(1000);
    regular = "12.50";
    expect((await adapter.readCurrent(["SKU-X"]))[0]?.regularMinor).toBe(1250);
  });

  it("refleja en Combos una edición confirmada en el mismo repositorio mock", async () => {
    const pricing = createMockPricingRepository(fixedClock);
    const adapter = makeAdapter(pricing);
    const signal = new AbortController().signal;
    const target = { targetId: "combo-run-bla-m", channel: "global" as const };
    const before = await pricing.readEditable(target, signal);
    expect(before).not.toBeNull();

    await pricing.update({
      target,
      version: before!.version,
      draft: {
        regular: "159.90",
        offer: "149.90",
        offerAction: "ESTABLECER",
        currency: "PEN",
        reason: "Ajuste de demostración",
      },
    }, signal);

    await expect(adapter.readCurrent(["CAM-RUN-BLA-M"]))
      .resolves.toMatchObject([{ regularMinor: 15990, offerMinor: 14990, priceVersion: before!.version + 1 }]);
  });

  it("falla explícitamente ante referencias ambiguas o importes/moneda inválidos", async () => {
    const ambiguous = makeAdapter(stubPricing({
      targets: [productTarget("producto", "SKU-X"), variantTarget("variante", "SKU-X")],
      prices: { producto: priceView(), variante: priceView() },
    }));
    await expect(ambiguous.readCurrent(["SKU-X"])).rejects.toMatchObject({ kind: "pricing_unavailable" });

    const foreignCurrency = makeAdapter(stubPricing({
      targets: [productTarget("combo-x", "SKU-X")],
      prices: { "combo-x": priceView({ currency: "USD" }) },
    }));
    await expect(foreignCurrency.readCurrent(["SKU-X"])).rejects.toMatchObject({ kind: "pricing_unavailable" });

    const invalidRegular = makeAdapter(stubPricing({
      targets: [productTarget("combo-x", "SKU-X")],
      prices: { "combo-x": priceView({ regular: "abc" }) },
    }));
    await expect(invalidRegular.readCurrent(["SKU-X"])).rejects.toMatchObject({ kind: "pricing_unavailable" });

    const invalidOffer = makeAdapter(stubPricing({
      targets: [productTarget("combo-x", "SKU-X")],
      prices: { "combo-x": priceView({ offer: "abc" }) },
    }));
    await expect(invalidOffer.readCurrent(["SKU-X"])).rejects.toMatchObject({ kind: "pricing_unavailable" });

    const invalidVersion = makeAdapter(stubPricing({
      targets: [productTarget("combo-x", "SKU-X")],
      prices: { "combo-x": priceView({ version: -1 }) },
    }));
    await expect(invalidVersion.readCurrent(["SKU-X"])).rejects.toMatchObject({ kind: "pricing_unavailable" });

    const invalidValidity = makeAdapter(stubPricing({
      targets: [productTarget("combo-x", "SKU-X")],
      prices: { "combo-x": priceView({ validFrom: "" }) },
    }));
    await expect(invalidValidity.readCurrent(["SKU-X"])).rejects.toMatchObject({ kind: "pricing_unavailable" });
  });

  it("omite una referencia sin precio vigente y respeta la cancelación", async () => {
    const noEffectivePrice = makeAdapter(stubPricing({
      targets: [productTarget("combo-x", "SKU-X")],
      prices: { "combo-x": null },
    }));
    await expect(noEffectivePrice.readCurrent(["SKU-X"])).resolves.toEqual([]);

    const controller = new AbortController();
    controller.abort();
    await expect(makeAdapter(createMockPricingRepository(fixedClock)).readCurrent(["CAS-COR-001"], controller.signal))
      .rejects.toMatchObject({ name: "AbortError" });
  });
});
