import { useState, type ReactNode } from "react";
import { Stack, Text } from "@mantine/core";
import { EntityTable, StatusBadge, type TableColumn, type TableState } from "../../../components/shared";
import type { BulkDomain, BulkImportRow, BulkRowStatus } from "../types/bulk";

export interface BatchRowsTableProps {
  rows: BulkImportRow[];
  caption?: string;
  state?: TableState;
}

function renderDomainStep(row: BulkImportRow, domain: BulkDomain) {
  const step = row.steps?.find((s) => s.domain === domain);
  const isApplied = row.applied_domains?.includes(domain);
  const isFailed = row.failed_domain === domain;

  let badge: ReactNode;
  if (isFailed || step?.status === "FAILED") {
    badge = (
      <StatusBadge semantic="error">
        <span style={{ whiteSpace: "nowrap" }}>Rechazado</span>
      </StatusBadge>
    );
  } else if (isApplied || step?.status === "COMPLETED") {
    badge = (
      <StatusBadge semantic="success">
        <span style={{ whiteSpace: "nowrap" }}>Aplicado</span>
      </StatusBadge>
    );
  } else if (step?.status === "PROCESSING") {
    badge = (
      <StatusBadge semantic="info">
        <span style={{ whiteSpace: "nowrap" }}>En proceso</span>
      </StatusBadge>
    );
  } else if (step?.status === "PENDING") {
    badge = (
      <StatusBadge semantic="neutral">
        <span style={{ whiteSpace: "nowrap" }}>Pendiente</span>
      </StatusBadge>
    );
  } else {
    return (
      <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        No informado
      </Text>
    );
  }

  return (
    <div style={{ whiteSpace: "nowrap", display: "inline-flex" }}>
      {badge}
    </div>
  );
}

function renderRowStatus(status: BulkRowStatus) {
  let badge: ReactNode;
  switch (status) {
    case "COMPLETED":
      badge = (
        <StatusBadge semantic="success">
          <span style={{ whiteSpace: "nowrap" }}>Completado</span>
        </StatusBadge>
      );
      break;
    case "FAILED":
      badge = (
        <StatusBadge semantic="error">
          <span style={{ whiteSpace: "nowrap" }}>Rechazado</span>
        </StatusBadge>
      );
      break;
    case "PROCESSING":
      badge = (
        <StatusBadge semantic="info">
          <span style={{ whiteSpace: "nowrap" }}>En proceso</span>
        </StatusBadge>
      );
      break;
    case "PENDING":
    default:
      badge = (
        <StatusBadge semantic="neutral">
          <span style={{ whiteSpace: "nowrap" }}>Pendiente</span>
        </StatusBadge>
      );
      break;
  }
  return (
    <div style={{ whiteSpace: "nowrap", display: "inline-flex" }}>
      {badge}
    </div>
  );
}

export function BatchRowsTable({
  rows,
  caption = "Detalle de resultados por fila",
  state = { status: "success" },
}: BatchRowsTableProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const columns: TableColumn<BulkImportRow>[] = [
    {
      key: "row_id",
      header: "Fila",
      width: 70,
      render: (row) => (
        <Text size="sm" fw={600} style={{ fontVariantNumeric: "tabular-nums" }}>
          #{row.row_id}
        </Text>
      ),
    },
    {
      key: "sku",
      header: "SKU / Producto",
      width: 220,
      render: (row) => (
        <Stack gap={2}>
          <Text size="sm" fw={600} style={{ wordBreak: "break-all" }}>
            {row.sku ?? "SKU no asignado"}
          </Text>
          {row.nombre && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {row.nombre}
            </Text>
          )}
        </Stack>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: 140,
      render: (row) => renderRowStatus(row.status),
    },
    {
      key: "catalogo",
      header: "Catálogo",
      width: 125,
      render: (row) => renderDomainStep(row, "CATALOGO"),
    },
    {
      key: "pricing",
      header: "Precios",
      width: 125,
      render: (row) => renderDomainStep(row, "PRICING"),
    },
    {
      key: "inventario",
      header: "Inventario",
      width: 125,
      render: (row) => renderDomainStep(row, "INVENTARIO"),
    },
    {
      key: "reconciliation",
      header: "Reconciliación",
      width: 145,
      render: (row) => (
        <div style={{ whiteSpace: "nowrap", display: "inline-flex" }}>
          {row.needs_reconciliation ? (
            <StatusBadge semantic="warning" size="sm">
              <span style={{ whiteSpace: "nowrap" }}>Reconciliable</span>
            </StatusBadge>
          ) : (
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              No requerida
            </Text>
          )}
        </div>
      ),
    },
    {
      key: "detail",
      header: "Detalle / Motivo",
      width: 320,
      render: (row) => (
        <Stack gap={2} style={{ minWidth: 260 }}>
          {row.code && (
            <Text size="xs" fw={700} c="dimmed" style={{ fontVariantNumeric: "tabular-nums" }}>
              Código: {row.code}
            </Text>
          )}
          <Text size="xs" style={{ wordBreak: "break-word" }}>
            {row.detail ?? "Sin observaciones adicionales"}
          </Text>
        </Stack>
      ),
    },
  ];

  const paginatedRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <EntityTable
      caption={caption}
      columns={columns}
      rows={paginatedRows}
      rowKey={(row) => `row-${row.row_id}`}
      state={state}
      minWidth={1270}
      empty={{
        title: "Sin filas de detalle",
        description:
          "No hay filas de detalle disponibles.",
      }}
      pagination={
        rows.length > pageSize
          ? {
              page: currentPage,
              pageSize,
              total: rows.length,
              onChange: setPage,
            }
          : undefined
      }
    />
  );
}
