import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import { PricingContext } from "../services/PricingContext";
import type { PricingRuntime } from "../services/pricingRuntime";
import { usePricingRead } from "../hooks/usePricingRequest";

export function PricingProvider({
  runtime,
  children,
}: {
  runtime: PricingRuntime;
  children: ReactNode;
}) {
  const [catalogRevision, setCatalogRevision] = useState(0);
  const readRevision = useCallback(() => runtime.updates.version("listTargets"), [runtime]);
  const sourceRevision = useSyncExternalStore(runtime.updates.subscribe, readRevision, readRevision);
  const retryCatalog = useCallback(
    () => setCatalogRevision((value) => value + 1),
    [],
  );
  const read = useCallback(
    (signal: AbortSignal) => runtime.service.listTargets(signal),
    [runtime],
  );
  const { state } = usePricingRead(`catalog:${catalogRevision}:${sourceRevision}`, read);
  return (
    <PricingContext.Provider value={{ runtime, catalog: state, retryCatalog }}>
      {children}
    </PricingContext.Provider>
  );
}
