import { useCallback } from "react";
import {
  usePricingRevision,
  usePricingRuntime,
} from "../services/PricingContext";
import type { PriceQuery } from "../services/pricingRepository";
import { usePricingRead } from "./usePricingRequest";

export function useHistoricalPrice(
  query: PriceQuery,
  at: string | null,
  revision: number,
) {
  const { service } = usePricingRuntime();
  const update = usePricingRevision("readHistorical");
  const { targetId, channel } = query;
  const read = useCallback(
    (signal: AbortSignal) =>
      at
        ? service.readHistorical({ targetId, channel }, at, signal)
        : Promise.resolve(null),
    [service, targetId, channel, at],
  );
  return usePricingRead(
    `${targetId}:${channel}:${at}:${revision}:${update}`,
    read,
  );
}
