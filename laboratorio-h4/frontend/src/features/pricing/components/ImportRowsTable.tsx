import {
  EntityTable,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import type { ImportRow } from "../services/pricingModels";

const labels = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  COMPLETED: "Confirmada",
  FAILED: "Rechazada",
};
const columns: TableColumn<ImportRow>[] = [
  { key: "id", header: "Fila", width: 80, render: (row) => row.id },
  {
    key: "sku",
    header: "SKU",
    width: 200,
    render: (row) => row.sku ?? "SKU no disponible",
  },
  {
    key: "status",
    header: "Resultado",
    width: 160,
    render: (row) => (
      <StatusBadge
        semantic={
          row.status === "FAILED"
            ? "error"
            : row.status === "COMPLETED"
              ? "success"
              : "info"
        }
      >
        {labels[row.status]}
      </StatusBadge>
    ),
  },
  {
    key: "code",
    header: "Código",
    width: 192,
    render: (row) => row.code ?? "Sin error reportado",
  },
  {
    key: "detail",
    header: "Detalle",
    render: (row) => row.detail ?? "Sin detalle adicional",
  },
];
export function ImportRowsTable({
  rows,
  caption,
}: {
  rows: ImportRow[];
  caption: string;
}) {
  return (
    <EntityTable
      caption={caption}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      state={{ status: "success" }}
      empty={{
        title: "Sin errores reportados",
        description:
          "La respuesta no contiene errores por fila. La admisión requiere una revisión independiente.",
      }}
    />
  );
}
