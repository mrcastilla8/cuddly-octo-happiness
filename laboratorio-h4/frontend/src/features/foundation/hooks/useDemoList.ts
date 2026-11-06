import { useEffect, useState } from "react";
import { demoService } from "../services/demoService";
import type {
  DemoQuery,
  DemoResult,
  DemoScenario,
} from "../services/demoRepository";

type ListState =
  | { status: "loading" }
  | { status: "success"; result: DemoResult }
  | { status: "error"; message: string };
export function useDemoList(
  query: DemoQuery,
  scenario: DemoScenario,
  retry: number,
) {
  const [response, setResponse] = useState<{ key: string; state: ListState }>();
  const { search, status, page, pageSize } = query;
  const requestKey = JSON.stringify([
    search,
    status,
    page,
    pageSize,
    scenario,
    retry,
  ]);
  useEffect(() => {
    const controller = new AbortController();
    void demoService
      .list({ search, status, page, pageSize }, scenario, controller.signal)
      .then(
        (result) => {
          if (!controller.signal.aborted)
            setResponse({
              key: requestKey,
              state: { status: "success", result },
            });
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
  }, [search, status, page, pageSize, scenario, retry, requestKey]);
  return response?.key === requestKey
    ? response.state
    : ({ status: "loading" } as const);
}
