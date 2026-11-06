import { useEffect, useRef, useState } from "react";

// Shared by actual administration commands; UI success requires a returned snapshot.
export function usePromotionCommand<T>() {
  const active = useRef<AbortController | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();
  useEffect(() => () => active.current?.abort(), []);
  const run = async (
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T | null> => {
    if (active.current) return null;
    const controller = new AbortController();
    active.current = controller;
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await operation(controller.signal);
      return controller.signal.aborted ? null : result;
    } catch (cause: unknown) {
      if (!controller.signal.aborted) setError(cause);
      return null;
    } finally {
      if (!controller.signal.aborted) setSubmitting(false);
      if (active.current === controller) active.current = null;
    }
  };
  return { run, submitting, error, clearError: () => setError(undefined) };
}
