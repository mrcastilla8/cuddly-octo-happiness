import { useCallback, useState } from "react";
import {
  usePricingRevision,
  usePricingRuntime,
} from "../services/PricingContext";
import type { ReportFile } from "../services/pricingRepository";
import { usePricingAction, usePricingRead } from "./usePricingRequest";

export function usePriceBatch(id: string) {
  const { service, downloader } = usePricingRuntime();
  const update = usePricingRevision("readBatch");
  const [revision, setRevision] = useState(0);
  const read = useCallback(
    (signal: AbortSignal) => service.readBatch(id, signal),
    [service, id],
  );
  const response = usePricingRead(`${id}:${revision}:${update}`, read, id);
  const report = usePricingAction<ReportFile>();
  return {
    ...response,
    report,
    refresh: () => {
      report.clear();
      setRevision((value) => value + 1);
    },
    download: () =>
      report.run(async (signal) => {
        const file = await service.report(id, signal);
        signal.throwIfAborted();
        downloader.save(file);
        return file;
      }),
  };
}
