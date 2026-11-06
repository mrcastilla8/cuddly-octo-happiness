import { Text } from "@mantine/core";
import { useContext } from "react";
import { DataModeContext } from "../../../app/config/DataModeContext";

/** Promotions remains mock-only until the provider contract is available. */
export function PromotionDataNotice({ kind }: { kind: string }) {
  const mode = useContext(DataModeContext);
  if (mode !== "mock") return null;
  if (kind === "coupons" || kind === "coupon-form")
    return (
      <Text size="sm" c="dimmed">
        Entorno de prueba: la información presentada es de referencia. Consultar
        un cupón no aplica descuentos ni registra consumo o restitución de usos.
      </Text>
    );
  if (
    kind === "campaigns" ||
    kind === "campaign-form" ||
    kind === "campaign-detail" ||
    kind === "campaign-scope" ||
    kind === "recommendations" ||
    kind === "recommendation-form" ||
    kind === "recommendation-detail" ||
    kind === "recommendation-selector"
  )
    return (
      <Text size="sm" c="dimmed">
        Entorno de prueba: la información presentada es de referencia y no
        confirma una aplicación comercial.
      </Text>
    );
  return null;
}
