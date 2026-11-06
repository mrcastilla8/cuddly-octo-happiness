import { createContext } from "react";
import type { PromotionServices } from "../../features/promotions/services/promotionServices";

// The session owner supplies HTTP services at the composition boundary.
// This context never selects mock data or acquires a service identity.
export const PromotionApiContext = createContext<PromotionServices | null>(
  null,
);
