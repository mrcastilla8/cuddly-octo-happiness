import { Stack, Text } from "@mantine/core";
import type { CampaignDraft } from "../services/campaignRepository";
import type { CatalogProductChoice } from "../services/catalogRepository";
export function CampaignScope({
  configuration,
  products,
}: {
  configuration: Pick<CampaignDraft, "productIds" | "skus">;
  products: CatalogProductChoice[];
}) {
  return (
    <Stack gap="sm">
      {!configuration.productIds.length && !configuration.skus.length && (
        <Text size="sm">Sin alcance seleccionado</Text>
      )}
      {configuration.productIds.map((id) => (
        <Text size="sm" key={`product:${id}`}>
          <strong>Producto completo:</strong>{" "}
          {products.find((item) => item.id === id)?.name ??
            "Referencia no disponible"}
          . Incluye variantes elegibles presentes y futuras.
        </Text>
      ))}
      {configuration.skus.map((sku) => (
        <Text size="sm" key={`sku:${sku}`}>
          <strong>SKU específico:</strong> {sku} ·{" "}
          {products.find((item) => item.skus.some((row) => row.sku === sku))
            ?.name ?? "Referencia no disponible"}
        </Text>
      ))}
    </Stack>
  );
}
