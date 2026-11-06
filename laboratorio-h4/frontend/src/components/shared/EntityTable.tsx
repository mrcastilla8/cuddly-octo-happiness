import type { ReactNode } from "react";
import {
  Group,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { EmptyState } from "./EmptyState";
import { FeedbackAlert } from "./FeedbackAlert";
import classes from "./EntityTable.module.css";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  width?: number | string;
  align?: "left" | "right";
}
export type TableState =
  | { status: "loading" }
  | { status: "error"; message: string; action?: ReactNode }
  | { status: "success" };
export interface EntityTableProps<T> {
  caption: string;
  columns: readonly TableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  state: TableState;
  minWidth?: number;
  empty: { title: string; description: string; action?: ReactNode };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onChange: (page: number) => void;
  };
}
export function EntityTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  state,
  empty,
  pagination,
  minWidth,
}: EntityTableProps<T>) {
  const tableMinWidth =
    minWidth ??
    columns.reduce(
      (width, column) =>
        width + (typeof column.width === "number" ? column.width : 160),
      0,
    );
  const content =
    state.status === "loading" ? (
      <Stack
        p="lg"
        gap="md"
        role="status"
        aria-label={`Cargando ${caption.toLocaleLowerCase("es")}`}
      >
        <Text size="sm">Cargando…</Text>
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} height={24} radius="xs" />
        ))}
      </Stack>
    ) : state.status === "error" ? (
      <div style={{ padding: 24 }}>
        <FeedbackAlert
          semantic="error"
          title="No se pudo cargar el listado"
          actions={state.action}
        >
          {state.message}
        </FeedbackAlert>
      </div>
    ) : rows.length === 0 ? (
      <EmptyState {...empty} />
    ) : (
      <div
        className={classes.scrollRegion}
        role="region"
        aria-label={`Tabla: ${caption}`}
        tabIndex={0}
      >
        <Table style={{ minWidth: tableMinWidth }}>
          <Table.Caption
            style={{
              textAlign: "left",
              padding: 16,
              color: "var(--po-secondary)",
              captionSide: "top",
            }}
          >
            {caption}
          </Table.Caption>
          <Table.Thead>
            <Table.Tr>
              {columns.map((column) => (
                <Table.Th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width, textAlign: column.align }}
                >
                  {column.header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={rowKey(row)}>
                {columns.map((column) => (
                  <Table.Td
                    key={column.key}
                    style={{
                      textAlign: column.align,
                      fontVariantNumeric:
                        column.align === "right" ? "tabular-nums" : undefined,
                    }}
                  >
                    <div className={classes.cellContent}>
                      {column.render(row)}
                    </div>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </div>
    );
  return (
    <Paper
      style={{ overflow: "hidden" }}
      aria-busy={state.status === "loading"}
    >
      {content}
      {state.status === "success" && pagination && pagination.total > 0 && (
        <Group
          justify="space-between"
          p="md"
          style={{ borderTop: "1px solid var(--po-border)" }}
        >
          <Text size="sm" c="dimmed">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1} a{" "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)}{" "}
            de {pagination.total}
          </Text>
          <Pagination
            total={Math.ceil(pagination.total / pagination.pageSize)}
            value={pagination.page}
            onChange={pagination.onChange}
            getControlProps={(control) => ({
              "aria-label":
                control === "previous"
                  ? "Página anterior"
                  : control === "next"
                    ? "Página siguiente"
                    : control === "first"
                      ? "Primera página"
                      : "Última página",
            })}
          />
        </Group>
      )}
    </Paper>
  );
}
