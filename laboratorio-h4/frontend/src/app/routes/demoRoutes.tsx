import type { RouteObject } from "react-router-dom";
import {
  ListDemo,
  FormDemo,
  FeedbackDemo,
  PricingPatternsPage,
} from "./demoPages";
export const demoRoutes: RouteObject[] = [
  { path: "/foundation/listados", element: <ListDemo /> },
  { path: "/foundation/formularios", element: <FormDemo /> },
  { path: "/foundation/estados", element: <FeedbackDemo /> },
  { path: "/foundation/pricing", element: <PricingPatternsPage /> },
];
