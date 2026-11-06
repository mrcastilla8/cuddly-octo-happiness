import { Text } from "@mantine/core";
import {
  EntityTable,
  StatusBadge,
  type TableColumn,
  type TableState,
} from "../../../components/shared";
import type { SchedulePage, ScheduleView } from "../services/pricingModels";
import { displayInstant, priceTimeZone } from "../services/pricingValidation";

const labels = {
  SCHEDULED: "Programado",
  ACTIVE: "Vigente",
  HISTORICAL: "Histórico",
  CANCELLED: "Cancelado",
};
const columns: TableColumn<ScheduleView>[] = [
  {
    key: "type",
    header: "Tipo",
    width: 112,
    render: (row) => (row.kind === "REGULAR" ? "Regular" : "Oferta"),
  },
  {
    key: "amount",
    header: "Importe",
    width: 144,
    align: "right",
    render: (row) => `${row.amount} ${row.currency}`,
  },
  {
    key: "channel",
    header: "Canal",
    width: 112,
    render: (row) => (row.channel === "retail" ? "Retail" : "Global"),
  },
  {
    key: "start",
    header: "Inicio",
    render: (row) => displayInstant(row.start),
  },
  {
    key: "end",
    header: "Fin",
    render: (row) => (row.end ? displayInstant(row.end) : "Sin fin"),
  },
  {
    key: "status",
    header: "Estado",
    width: 160,
    render: (row) => (
      <StatusBadge semantic="neutral">{labels[row.status]}</StatusBadge>
    ),
  },
];
export function SchedulesTable({
  result,
  state,
  page,
  onPage,
}: {
  result?: SchedulePage;
  state: TableState;
  page: number;
  onPage: (value: number) => void;
}) {
  return (
    <>
      <Text size="sm">
        Fechas en {priceTimeZone}. La lista incluye los canales publicados; no
        se filtra por el canal de consulta.
      </Text>
      <EntityTable
        caption="Programaciones del objetivo seleccionado"
        columns={columns}
        rows={result?.items ?? []}
        rowKey={(row) => row.id}
        state={state}
        pagination={
          result
            ? {
                page,
                pageSize: result.pageSize,
                total: result.total,
                onChange: onPage,
              }
            : undefined
        }
        empty={{
          title: "Sin programaciones",
          description: "La consulta no contiene vigencias programadas.",
        }}
      />
    </>
  );
}
