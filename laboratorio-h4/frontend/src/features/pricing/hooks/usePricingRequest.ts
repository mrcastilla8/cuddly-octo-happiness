import { useEffect, useRef, useState } from "react";
import { PricingFailure } from "../services/pricingModels";

const readCache = new Map<string, unknown>();

export type RequestState<T> =
  | { status: "loading" }
  | { status: "success"; result: T }
  | { status: "error"; message: string };
export function usePricingRead<T>(
  requestKey: string,
  read: (signal: AbortSignal) => Promise<T>,
  identity = requestKey,
) {
  const [response, setResponse] = useState<{
    key: string;
    state: RequestState<T>;
  }>();
  const [previous, setPrevious] = useState<{ key: string; result: T } | undefined>(
    () => {
      const cached = readCache.get(identity) as T | undefined;
      return cached !== undefined ? { key: identity, result: cached } : undefined;
    },
  );
  useEffect(() => {
    const controller = new AbortController();
    void read(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        readCache.set(identity, result);
        setPrevious({ key: identity, result });
        setResponse({ key: requestKey, state: { status: "success", result } });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResponse({
            key: requestKey,
            state: {
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "Consulta no disponible.",
            },
          });
      },
    );
    return () => controller.abort();
  }, [read, requestKey, identity]);
  return {
    state:
      response?.key === requestKey
        ? response.state
        : ({ status: "loading" } as const),
    previous: previous?.key === identity ? previous.result : undefined,
  };
}
export function usePricingAction<T>() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PricingFailure>();
  const [result, setResult] = useState<T>();
  const active = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  async function run(action: (signal: AbortSignal) => Promise<T>) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const value = await action(controller.signal);
      if (!controller.signal.aborted) {
        setResult(value);
        return value;
      }
    } catch (failure: unknown) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof PricingFailure
            ? failure
            : new PricingFailure(
                "error",
                failure instanceof Error
                  ? failure.message
                  : "No se pudo confirmar el resultado.",
              ),
        );
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return {
    busy,
    error,
    result,
    run,
    clear: () => {
      setError(undefined);
      setResult(undefined);
    },
  };
}
