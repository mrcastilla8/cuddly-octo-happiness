import { PromotionApiContext } from "./PromotionApiContext";
import { useContext, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { FeedbackAlert } from "../../components/shared";
import { DataModeContext } from "./DataModeContext";
import { PromotionSessionContext } from "./PromotionSessionContext";
import { lazy, Suspense } from "react";
const SessionGate = lazy(async () => ({
  default: (
    await import("../../features/promotions/components/PromotionSessionGate")
  ).PromotionSessionGate,
}));

export function CommercialModeGate({ children }: { children: ReactNode }) {
  const mode = useContext(DataModeContext);
  const api = useContext(PromotionApiContext);
  const session = useContext(PromotionSessionContext);
  const { pathname } = useLocation();
  if (!mode)
    throw new Error("La aplicación requiere configurar su modo de datos.");
  const mockOnly = ["/cupones", "/promociones", "/recomendaciones"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const pendingModule = ["/inventario", "/combos"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (mode === "api" && (pendingModule || (mockOnly && !api)))
    return (
      <FeedbackAlert semantic="error" title="Función no disponible">
        Esta función no está disponible en el modo actual.
      </FeedbackAlert>
    );
  if (mode === "api" && mockOnly && session && api)
    return (
      <Suspense fallback={<p role="status">Cargando sesión…</p>}>
        <SessionGate session={session}>{children}</SessionGate>
      </Suspense>
    );
  return children;
}
