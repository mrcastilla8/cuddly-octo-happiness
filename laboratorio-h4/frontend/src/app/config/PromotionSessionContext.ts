import { createContext } from "react";
import type { G7Session } from "../../features/promotions/adapters/g7Session";

export const PromotionSessionContext = createContext<G7Session | null>(null);
