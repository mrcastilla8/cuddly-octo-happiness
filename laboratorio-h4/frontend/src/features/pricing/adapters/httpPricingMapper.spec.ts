import { describe, expect, it } from "vitest";
import { mapPriceDto, mapScheduleDto } from "./httpPricingMapper";
import type { PriceTarget } from "../services/pricingRepository";

const product: PriceTarget = {
  kind: "product", id: "product", label: "Producto", productId: "product-1",
};
const variant: PriceTarget = {
  kind: "variant", id: "variant", label: "Variante", productId: "product-1",
  sku: "SKU-1", productTargetId: product.id,
};
const price = {
  precio_regular: 14, precio_oferta: null, currency: "PEN", channel_id: null,
  valid_from: "2026-10-01T00:00:00Z", valid_until: null, price_version: 2,
};
const schedule = {
  programacionId: "schedule-1", tipoPrecio: "REGULAR", importe: 14,
  moneda: "PEN", channelId: null, validFrom: "2030-01-01T00:00:00Z",
  validUntil: null, estado: "SCHEDULED", priceVersion: 2,
};
const schemas = [
  {
    name: "PrecioProducto", target: product,
    dto: { ...price, product_id: product.productId },
    optional: ["precio_oferta", "channel_id", "valid_until"],
    required: ["product_id", "precio_regular", "currency", "valid_from", "price_version"],
    map: mapPriceDto, normalized: { offer: null, channel: "global", validUntil: null },
  },
  {
    name: "Precio", target: variant,
    dto: { ...price, sku: variant.sku, origen: "SKU_OVERRIDE", vigencia_id: "validity-1" },
    optional: ["precio_oferta", "valid_until"],
    required: ["sku", "precio_regular", "currency", "channel_id", "valid_from", "price_version", "vigencia_id", "origen"],
    map: mapPriceDto, normalized: { offer: null, channel: "global", validUntil: null },
  },
  {
    name: "ProgramacionPrecioProducto", target: product,
    dto: { ...schedule, product_id: product.productId },
    optional: ["channelId", "validUntil"],
    required: ["programacionId", "product_id", "tipoPrecio", "importe", "moneda", "validFrom", "estado", "priceVersion"],
    map: mapScheduleDto, normalized: { channel: "global", end: null },
  },
  {
    name: "ProgramacionPrecio", target: variant,
    dto: { ...schedule, sku: variant.sku },
    optional: ["channelId", "validUntil"],
    required: ["programacionId", "sku", "tipoPrecio", "importe", "moneda", "validFrom", "estado", "priceVersion"],
    map: mapScheduleDto, normalized: { channel: "global", end: null },
  },
];

for (const schema of schemas) {
  describe(`Opcionales de OpenAPI: ${schema.name}`, () => {
    const combinations = Array.from({ length: (1 << schema.optional.length) - 1 }, (_, index) =>
      schema.optional.filter((_, bit) => (index + 1) & (1 << bit)),
    );
    it.each(combinations.map((fields) => ({ fields })))(
      "normaliza a null la ausencia de $fields", ({ fields }) => {
        const dto: Record<string, unknown> = { ...schema.dto };
        for (const field of fields) delete dto[field];
        expect(schema.map(dto, schema.target)).toMatchObject(schema.normalized);
      },
    );

    it.each(schema.optional.flatMap((field) =>
      [false, {}, [], "", undefined].map((value) => ({ field, value })),
    ))("rechaza $field presente con tipo inválido: $value", ({ field, value }) => {
      expect(() => schema.map({ ...schema.dto, [field]: value }, schema.target)).toThrow();
    });

    it.each(schema.required)("conserva obligatorio %s", (field) => {
      const dto: Record<string, unknown> = { ...schema.dto };
      delete dto[field];
      expect(() => schema.map(dto, schema.target)).toThrow();
    });
  });
}
