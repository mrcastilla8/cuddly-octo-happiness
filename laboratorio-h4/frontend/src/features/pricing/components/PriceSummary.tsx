import { Group, SimpleGrid, Text } from "@mantine/core";
import {
  MetricCard,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import type { PriceView } from "../services/pricingRepository";
import { priceOriginLabel, formatMoney } from "../services/pricePresentation";
import { displayInstant, priceTimeZone } from "../services/pricingValidation";
export function PriceSummary({
  price,
  historical = false,
}: {
  price: PriceView;
  historical?: boolean;
}) {
  return (
    <SectionCard
      title={price.name}
      actions={
        <Group gap="sm">
          <StatusBadge>{priceOriginLabel(price)}</StatusBadge>
          <StatusBadge>
            {price.channel === "global" ? "Global efectivo" : "Retail efectivo"}
          </StatusBadge>
          <StatusBadge>Versión {price.version}</StatusBadge>
        </Group>
      }
    >
      {price.sku && <Text size="sm">SKU: {price.sku}</Text>}
      <SimpleGrid cols={3} spacing="lg">
        <MetricCard
          label={
            historical ? "Precio regular en fecha" : "Precio regular vigente"
          }
          value={formatMoney(price.regular, price.currency)}
          description={price.currency}
        />
        <MetricCard
          label={historical ? "Oferta en fecha" : "Precio de oferta actual"}
          value={
            price.offer === null
              ? "Sin oferta"
              : formatMoney(price.offer, price.currency)
          }
          description={
            price.offer
              ? "Importe de la consulta de Pricing"
              : "No hay oferta registrada para este objetivo"
          }
        />
        <MetricCard
          label="Moneda"
          value={price.currency}
          description="Moneda del precio mostrado"
        />
      </SimpleGrid>
      <Text size="sm">
        Vigencia de la lectura: {displayInstant(price.validFrom)} —{" "}
        {price.validUntil
          ? displayInstant(price.validUntil)
          : "Sin fin especificado"}{" "}
        · {priceTimeZone}
      </Text>
    </SectionCard>
  );
}
