import { useState } from "react";
import {
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  EntityTable,
  SectionCard,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { sampleSchedules } from "../mocks/prices";

type ScheduleRow = (typeof sampleSchedules)[number];
const columns: TableColumn<ScheduleRow>[] = [
  { key: "type", header: "Tipo", width: 112, render: (row) => row.kind },
  {
    key: "amount",
    header: "Importe",
    width: 144,
    align: "right",
    render: (row) => row.amount,
  },
  { key: "start", header: "Inicio (America/Lima)", render: (row) => row.start },
  { key: "end", header: "Fin (America/Lima)", render: (row) => row.end },
  {
    key: "status",
    header: "Estado",
    width: 160,
    render: (row) => <StatusBadge semantic="info">{row.status}</StatusBadge>,
  },
];
export function ScheduleExample() {
  const [start, setStart] = useState("2026-12-15T00:00");
  const [end, setEnd] = useState("2026-12-25T23:59");
  return (
    <Stack gap="lg">
      <EntityTable
        caption="Vigencias programadas de ejemplo"
        columns={columns}
        rows={sampleSchedules}
        rowKey={(row) => row.id}
        state={{ status: "success" }}
        empty={{
          title: "Sin programaciones",
          description: "No hay programaciones disponibles.",
        }}
      />
      <div style={{ maxWidth: 880 }}>
        <SectionCard
          title="Nueva vigencia programada"
          description="Define el tipo, importe y vigencia del precio."
        >
          <SimpleGrid cols={2} spacing="lg">
            <Select
              label="Tipo de precio"
              data={["Regular", "Oferta"]}
              defaultValue="Oferta"
            />
            <NumberInput
              label="Importe (PEN)"
              defaultValue="199.90"
              hideControls
            />
          </SimpleGrid>
          <SimpleGrid cols={2} spacing="lg">
            <TextInput
              type="datetime-local"
              label="Fecha y hora de inicio"
              value={start}
              onChange={(event) => setStart(event.currentTarget.value)}
              description="Hora local de America/Lima (UTC−5)."
            />
            <TextInput
              type="datetime-local"
              label="Fecha y hora de fin (opcional)"
              value={end}
              onChange={(event) => setEnd(event.currentTarget.value)}
              description="Sin fecha de fin no se inventa una caducidad."
            />
          </SimpleGrid>
          <Textarea label="Motivo de la programación" />
        </SectionCard>
      </div>
    </Stack>
  );
}
