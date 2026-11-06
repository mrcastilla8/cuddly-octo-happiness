import { Button, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";
import {
  EntityTable,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { longTableRow } from "../mocks/tableCases";
type Row = typeof longTableRow;
export function LongTableExample() {
  const [opened, setOpened] = useState(false);
  const columns: TableColumn<Row>[] = [
    {
      key: "sku",
      header: "Identificador operativo extenso",
      width: 260,
      render: (row) => row.sku,
    },
    {
      key: "name",
      header: "Descripción del ejemplo",
      width: 280,
      render: (row) => row.name,
    },
    {
      key: "location",
      header: "Ubicación de referencia",
      width: 260,
      render: (row) => row.location,
    },
    {
      key: "amount",
      header: "Importe mostrado (PEN)",
      width: 220,
      align: "right",
      render: (row) => row.amount,
    },
    {
      key: "status",
      header: "Estado textual",
      width: 240,
      render: (row) => <StatusBadge>{row.status}</StatusBadge>,
    },
    {
      key: "detail",
      header: "Detalle conservado",
      width: 280,
      render: (row) => row.detail,
    },
    {
      key: "action",
      header: "Acción de consulta",
      width: 200,
      render: () => (
        <Button variant="outline" onClick={() => setOpened(true)}>
          Ver descripción completa
        </Button>
      ),
    },
  ];
  return (
    <>
      <EntityTable
        caption="Prueba de composición con columnas extensas"
        columns={columns}
        rows={[longTableRow]}
        rowKey={(row) => row.id}
        state={{ status: "success" }}
        empty={{
          title: "Sin ejemplos",
          description: "No hay filas de revisión.",
        }}
      />
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Detalle de tabla extensa"
      >
        <Stack gap="md">
          <Text size="sm" style={{ overflowWrap: "anywhere" }}>
            {longTableRow.sku}
          </Text>
          <Text size="sm">{longTableRow.detail}</Text>
        </Stack>
      </Modal>
    </>
  );
}
