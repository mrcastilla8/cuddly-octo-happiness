import { ActionIcon, Button, Stack, Text } from "@mantine/core";
import { IconEye } from "@tabler/icons-react";
import { Link } from "react-router-dom";
import {
  EntityTable,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import {
  dateLabel,
  displayAuditId,
  nextValue,
  operationLabel,
  previousValue,
  typeLabel,
  variation,
} from "../services/auditPresentation";
import type { AuditEntry, AuditPage } from "../services/auditRepository";

export function AuditTable({
  result,
  suffix,
  onPage,
  filtered,
  onClear,
}: {
  result: AuditPage;
  suffix: string;
  onPage: (page: number) => void;
  filtered: boolean;
  onClear: () => void;
}) {
  const columns: TableColumn<AuditEntry>[] = [
    {
      key: "at",
      header: "Fecha y hora",
      width: 180,
      render: (entry) => dateLabel(entry.at),
    },
    { key: "sku", header: "SKU", width: 120, render: (entry) => entry.sku },
    {
      key: "operation",
      header: "Operación y tipo",
      width: 220,
      render: (entry) => (
        <Stack gap="xs">
          <StatusBadge>{operationLabel[entry.operation]}</StatusBadge>
          <Text size="sm">{typeLabel[entry.priceType]}</Text>
        </Stack>
      ),
    },
    {
      key: "before",
      header: "Precio anterior",
      align: "right",
      width: 140,
      render: previousValue,
    },
    {
      key: "after",
      header: "Precio nuevo",
      align: "right",
      width: 130,
      render: nextValue,
    },
    {
      key: "variation",
      header: "Variación",
      align: "right",
      width: 130,
      render: variation,
    },
    {
      key: "action",
      header: "Acciones",
      width: 80,
      align: "right",
      render: (entry) => (
        <ActionIcon
          component={Link}
          to={`/precios/auditoria/asientos/${encodeURIComponent(entry.id)}${suffix}`}
          state={{ auditOpener: entry.id }}
          data-audit-id={entry.id}
          aria-label={`Ver detalle de ${displayAuditId(entry.id)}`}
          title="Ver detalle"
        >
          <IconEye size={16} />
        </ActionIcon>
      ),
    },
  ];
  return (
    <EntityTable
      caption="Historial de auditoría de precios"
      columns={columns}
      rows={result.items}
      rowKey={(entry) => entry.id}
      minWidth={1000}
      state={{ status: "success" }}
      empty={{
        title: filtered
          ? "No encontramos cambios con estos filtros"
          : "No hay registros de auditoría disponibles",
        description:
          "La ausencia de resultados no representa un error ni permite crear asientos.",
        action: filtered ? (
          <Button variant="outline" onClick={onClear}>
            Restablecer filtros
          </Button>
        ) : undefined,
      }}
      pagination={{
        page: result.page,
        pageSize: result.size,
        total: result.total,
        onChange: onPage,
      }}
    />
  );
}
