import { useEffect, useState } from "react";

export type DemoRead<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };
export function useDemoRead<T>(
  load: (signal: AbortSignal) => Promise<T>,
): DemoRead<T> {
  const [result, setResult] = useState<{
    load: typeof load;
    state: DemoRead<T>;
  }>();
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ load, state: { status: "success", data } });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            load,
            state: {
              status: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "No se pudo completar la consulta.",
            },
          });
      });
    return () => controller.abort();
  }, [load]);
  return result?.load === load ? result.state : { status: "loading" };
}
