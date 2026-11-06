import { createElement, lazy } from "react";
import type {
  PricingRuntime,
  ReportDownloader,
} from "../services/pricingRuntime";
import { createMockPricingRepository } from "../adapters/mockPricingRepository";
import { DemoControl } from "./demoControl";
import { decorateDemoRepository } from "./demoPricingDecorator";
import { demoNow } from "./prices";
import { mockPricingAudit } from "../../price-audit/mocks/pricingChanges";
import { mockCatalogRepository } from "../../catalog/adapters/mockCatalogRepository";

export function createDemoPricingRuntime(
  downloader: ReportDownloader,
  options: { reviewTools?: boolean } = {},
): PricingRuntime {
  const clock = { now: () => demoNow };
  const control = new DemoControl();
  const Panel = (options.reviewTools ?? true) && import.meta.env.DEV
    ? lazy(() =>
        import("./PricingDemoPanel").then((module) => ({
          default: module.PricingDemoPanel,
        })),
      )
    : undefined;
  return {
    service: decorateDemoRepository(
      createMockPricingRepository(clock, mockPricingAudit.record, { persist: true }),
      control,
    ),
    clock,
    downloader,
    updates: {
      subscribe(listener) {
        const unsubscribeControl = control.subscribe(listener);
        const unsubscribeCatalog = mockCatalogRepository.subscribe(listener);
        return () => { unsubscribeControl(); unsubscribeCatalog(); };
      },
      version: operation => control.version(operation) +
        (operation === "listTargets" ? mockCatalogRepository.revision() : 0),
    },
    ReviewTools: Panel ? () => createElement(Panel, { control }) : undefined,
  };
}
