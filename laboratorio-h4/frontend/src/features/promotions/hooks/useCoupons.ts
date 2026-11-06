import { useCallback, useEffect, useState } from "react";
import {
  CouponReadError,
  type CouponQuery,
  type CouponReadFailure,
  type CouponRepository,
} from "../services/couponRepository";

type ReadState<T> =
  | { status: "loading" }
  | { status: "success"; result: T }
  | { status: "error"; kind: CouponReadFailure; message: string };

function useCouponRead<T>(
  key: string,
  read: (signal: AbortSignal) => Promise<T>,
) {
  const [response, setResponse] = useState<{
    key: string;
    read: typeof read;
    state: ReadState<T>;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    void read(controller.signal).then(
      (result) => {
        if (!controller.signal.aborted)
          setResponse({ key, read, state: { status: "success", result } });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResponse({
            key,
            read,
            state: {
              status: "error",
              kind:
                error instanceof CouponReadError ? error.kind : "unavailable",
              message:
                error instanceof Error
                  ? error.message
                  : "No se pudo consultar la información.",
            },
          });
      },
    );
    return () => controller.abort();
  }, [key, read]);
  return response?.key === key && response.read === read
    ? response.state
    : ({ status: "loading" } as const);
}

export function useCouponList(
  query: CouponQuery,
  repository: CouponRepository,
  revision: number,
) {
  const { status, page, pageSize } = query;
  const key = JSON.stringify([status, page, pageSize, revision]);
  const read = useCallback(
    (signal: AbortSignal) =>
      repository.list({ status, page, pageSize }, signal),
    [status, page, pageSize, repository],
  );
  return useCouponRead(key, read);
}
export function useCoupon(
  id: string | undefined,
  repository: CouponRepository,
  revision: number,
) {
  const key = JSON.stringify([id, revision]);
  const read = useCallback(
    (signal: AbortSignal) =>
      id ? repository.read(id, signal) : Promise.resolve(null),
    [id, repository],
  );
  return useCouponRead(key, read);
}
