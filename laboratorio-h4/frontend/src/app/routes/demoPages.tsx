import { lazy } from "react";
export const ListDemo = lazy(() =>
  import("../../features/foundation/pages/ListDemo").then((module) => ({
    default: module.ListDemo,
  })),
);
export const FormDemo = lazy(() =>
  import("../../features/foundation/pages/FormDemo").then((module) => ({
    default: module.FormDemo,
  })),
);
export const FeedbackDemo = lazy(() =>
  import("../../features/foundation/pages/FeedbackDemo").then((module) => ({
    default: module.FeedbackDemo,
  })),
);
export const PricingPatternsPage = lazy(() =>
  import("../../features/pricing/pages/PricingPatternsPage").then((module) => ({
    default: module.PricingPatternsPage,
  })),
);
