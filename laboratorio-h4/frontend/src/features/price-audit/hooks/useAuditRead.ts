import { useEffect, useState } from "react";
import { AuditFailure } from "../services/auditRepository";

export type AuditReadState<T> =
  | { status: "loading" }
  | { status: "success"; result: T }
  | { status: "error"; error: AuditFailure };
export function useAuditRead<T>(
  key: string,
  read: (signal: AbortSignal) => Promise<T>,
  revision = 0,
) {
  const [response, setResponse] = useState<{
    key: string;
    revision: number;
    reader: typeof read;
    state: AuditReadState<T>;
  }>();
  const [previous, setPrevious] = useState<{
    key: string;
    reader: typeof read;
    result: T;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    void read(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) {
          setPrevious({ key, reader: read, result });
          setResponse({
            key,
            revision,
            reader: read,
            state: { status: "success", result },
          });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          const normalized =
            error instanceof AuditFailure
              ? error
              : new AuditFailure(
                  "unavailable",
                  "No se pudo consultar la información. Vuelve a consultar.",
                );
          if (["session", "forbidden"].includes(normalized.kind))
            setPrevious(undefined);
          setResponse({
            key,
            revision,
            reader: read,
            state: {
              status: "error",
              error: normalized,
            },
          });
        }
      },
    );
    return () => controller.abort();
  }, [key, read, revision]);
  const state =
    response?.key === key &&
    response.revision === revision &&
    response.reader === read
      ? response.state
      : ({ status: "loading" } as const);
  const denied =
    state.status === "error" &&
    ["session", "forbidden"].includes(state.error.kind);
  return {
    ...state,
    previous:
      !denied && previous?.key === key && previous.reader === read
        ? previous.result
        : undefined,
  };
}
