import { useSearchParams } from "react-router-dom";
import { usePricingCatalog } from "../services/PricingContext";
import type { PriceQuery } from "../services/pricingRepository";

export function usePricingContext(skuLookup = false) {
  const [params, setParams] = useSearchParams();
  const catalog = usePricingCatalog();
  const targets = catalog.status === "success" ? catalog.result : [];
  const raw = params.get("target");
  // Default only to an available product. Never select a variant or fabricate an ID.
  const target = raw
    ? targets.find((row) => row.id === raw)
    : targets.find((row) => row.kind === "product");
  const query: PriceQuery = {
    targetId: target?.id ?? "",
    channel:
      (skuLookup || target?.kind === "variant") &&
      params.get("channel") === "retail"
        ? "retail"
        : "global",
  };
  return {
    params,
    setParams,
    catalog,
    targets,
    target,
    query,
    suffix: `?${params.toString()}`,
    invalid: catalog.status === "success" && !target,
  };
}
