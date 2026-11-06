import { Text } from "@mantine/core";
import {
  EntityTable,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import type { PriceView } from "../services/pricingRepository";
import { priceOriginLabel, formatMoney } from "../services/pricePresentation";
import { displayInstant } from "../services/pricingValidation";

const columns: TableColumn<PriceView>[] = [
  {
    key: "target",
    header: "Objetivo",
    render: (row) => (
      <>
        <Text size="sm" fw={600}>
          {row.name}
        </Text>
        {row.sku && (
          <Text size="sm" c="dimmed">
            {row.sku}
          </Text>
        )}
      </>
    ),
  },
  {
    key: "regular",
    header: "Regular / moneda",
    width: 120,
    align: "right",
    render: (row) => formatMoney(row.regular, row.currency),
  },
  {
    key: "offer",
    header: "Oferta / moneda",
    width: 120,
    align: "right",
    render: (row) =>
      row.offer === null ? "Sin oferta" : formatMoney(row.offer, row.currency),
  },
  {
    key: "origin",
    header: "Origen",
    width: 200,
    render: (row) => <StatusBadge>{priceOriginLabel(row)}</StatusBadge>,
  },
  {
    key: "channel",
    header: "Alcance efectivo",
    width: 140,
    render: (row) => (row.channel === "global" ? "Global" : "Retail"),
  },
  {
    key: "validUntil",
    header: "Vigencia hasta",
    width: 200,
    render: (row) =>
      row.validUntil ? displayInstant(row.validUntil) : "Sin fin especificado",
  },
];
export function PriceBreakdown({ rows }: { rows: PriceView[] }) {
  return (
    <EntityTable
      caption="Precios por producto y variante"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      state={{ status: "success" }}
      empty={{
        title: "Sin lecturas",
        description: "No hay lecturas disponibles para este contexto.",
      }}
    />
  );
}
