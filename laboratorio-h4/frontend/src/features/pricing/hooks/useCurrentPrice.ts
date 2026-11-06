import { useCallback } from "react";
import {
  usePricingRevision,
  usePricingRuntime,
} from "../services/PricingContext";
import type { PriceQuery } from "../services/pricingRepository";
import { usePricingRead } from "./usePricingRequest";

export function useCurrentPrice(query: PriceQuery, revision: number) {
  const { service } = usePricingRuntime();
  const update = usePricingRevision("read");
  const { targetId, channel } = query;
  const read = useCallback(
    (signal: AbortSignal) => service.read({ targetId, channel }, signal),
    [service, targetId, channel],
  );
  return usePricingRead(
    `${targetId}:${channel}:${revision}:${update}`,
    read,
    `${targetId}:${channel}`,
  );
}
