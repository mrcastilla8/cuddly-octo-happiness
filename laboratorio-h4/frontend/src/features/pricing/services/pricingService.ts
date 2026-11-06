import { browserReportDownloader } from "./browserReportDownloader";
import {
  noUpdates,
  systemClock,
  type Clock,
  type PricingRuntime,
  type ReportDownloader,
} from "./pricingRuntime";
import type { PricingRepository } from "./pricingRepository";
import { createUnavailableApiPricingRepository } from "../adapters/unavailableApiPricingRepository";

export interface PricingRuntimeDependencies {
  api?: () => Promise<PricingRepository>;
  clock?: Clock;
  downloader?: ReportDownloader;
}
// The only environment selection point. Errors from API propagate; there is no catch-to-mock.
export async function createPricingRuntime(
  mode: string,
  dependencies: PricingRuntimeDependencies = {},
): Promise<PricingRuntime> {
  const downloader = dependencies.downloader ?? browserReportDownloader;
  if (mode === "mock") {
    const { createDemoPricingRuntime } =
      await import("../mocks/createDemoPricingRuntime");
    return createDemoPricingRuntime(downloader);
  }
  if (mode !== "api") throw new Error("VITE_DATA_MODE debe ser mock o api.");
  return {
    service: dependencies.api
      ? await dependencies.api()
      : createUnavailableApiPricingRepository(),
    clock: dependencies.clock ?? systemClock,
    downloader,
    updates: noUpdates,
  };
}
