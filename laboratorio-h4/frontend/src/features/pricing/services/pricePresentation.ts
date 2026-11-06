import type { PriceView } from "./pricingRepository";

export function priceOriginLabel(price: PriceView) {
  return price.inherited
    ? "Hereda precio del producto"
    : price.origin === "sku"
      ? "Precio específico del SKU"
      : "Precio del producto";
}
export function formatMoney(amount: string, currency: string) {
  const [integer, decimals = ""] = amount.split(".");
  return `${currency === "PEN" ? "S/" : currency} ${integer}.${decimals.padEnd(2, "0")}`;
}
