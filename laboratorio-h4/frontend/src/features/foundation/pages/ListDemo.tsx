import { useState } from "react";
import {
  ActionIcon,
  Button,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { IconEye, IconRefresh } from "@tabler/icons-react";
import {
  EntityTable,
  FilterBar,
  PageHeader,
  SearchField,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import type {
  DemoItem,
  DemoQuery,
  DemoScenario,
} from "../services/demoRepository";
import { useDemoList } from "../hooks/useDemoList";
import { LongTableExample } from "../components/LongTableExample";

const scenarios: { value: DemoScenario; label: string }[] = [
  { value: "default", label: "Con datos" },
  { value: "loading", label: "Cargando" },
  { value: "empty", label: "Sin registros" },
  { value: "error", label: "Error de consulta" },
];
export function ListDemo() {
  const [query, setQuery] = useState<DemoQuery>({
    search: "",
    status: "all",
    page: 1,
    pageSize: 3,
  });
  const [scenario, setScenario] = useState<DemoScenario>("default");
  const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState<DemoItem | null>(null);
  const [showLongTable, setShowLongTable] = useState(false);
  const state = useDemoList(query, scenario, retry);
  const columns: TableColumn<DemoItem>[] = [
    {
      key: "name",
      header: "Nombre y referencia",
      render: (row) => (
        <>
          <Text size="sm" fw={600}>
            {row.name}
          </Text>
          <Text size="xs" c="dimmed">
            {row.reference}
          </Text>
        </>
      ),
    },
    {
      key: "kind",
      header: "Tipo de ejemplo",
      width: 220,
      render: (row) => row.kind,
    },
    {
      key: "status",
      header: "Estado visual",
      width: 180,
      render: (row) => (
        <StatusBadge>
          {row.status === "active" ? "Activo" : "Inactivo"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: 100,
      render: (row) => (
        <ActionIcon
          aria-label={`Ver detalle de ${row.name}`}
          onClick={() => setDetail(row)}
        >
          <IconEye size={16} stroke={2} aria-hidden="true" />
        </ActionIcon>
      ),
    },
  ];
  const clear = () =>
    setQuery({ ...query, search: "", status: "all", page: 1 });
  return (
    <>
      <PageHeader
        title="Listados y filtros"
        description="Patrones de consulta, búsqueda y paginación para las próximas funcionalidades."
        breadcrumbs={[
          { label: "Componentes" },
          { label: "Listados y filtros" },
        ]}
        actions={
          <Button
            variant="outline"
            leftSection={
              <IconRefresh size={20} stroke={2} aria-hidden="true" />
            }
            onClick={() => setRetry((value) => value + 1)}
          >
            Actualizar
          </Button>
        }
      />
      <Stack gap="lg">
        <FilterBar
          summary={
            state.status === "success"
              ? `${state.result.total} ejemplos encontrados`
              : "Consulta de ejemplos"
          }
        >
          <div style={{ flex: "1 1 280px" }}>
            <SearchField
              label="Buscar ejemplos"
              placeholder="Nombre o referencia…"
              value={query.search}
              onChange={(search) => setQuery({ ...query, search, page: 1 })}
            />
          </div>
          <Select
            label="Estado visual"
            value={query.status}
            data={[
              { value: "all", label: "Todos" },
              { value: "active", label: "Activo" },
              { value: "inactive", label: "Inactivo" },
            ]}
            onChange={(value) => {
              if (value === "all" || value === "active" || value === "inactive")
                setQuery({ ...query, status: value, page: 1 });
            }}
          />
          <Select
            label="Escenario de revisión"
            value={scenario}
            data={scenarios}
            onChange={(value) => {
              const match = scenarios.find((item) => item.value === value);
              if (match) {
                setScenario(match.value);
                setQuery({ ...query, page: 1 });
              }
            }}
          />
          <Button
            variant="subtle"
            onClick={clear}
            disabled={!query.search && query.status === "all"}
          >
            Limpiar filtros
          </Button>
        </FilterBar>
        <EntityTable
          caption="Ejemplos de componentes de listado"
          columns={columns}
          rowKey={(row) => row.id}
          rows={state.status === "success" ? state.result.items : []}
          state={
            state.status === "error"
              ? {
                  ...state,
                  action: (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScenario("default");
                        setRetry((value) => value + 1);
                      }}
                    >
                      Volver a consultar
                    </Button>
                  ),
                }
              : { status: state.status }
          }
          empty={{
            title:
              query.search || query.status !== "all"
                ? "Sin coincidencias"
                : "Sin registros",
            description:
              query.search || query.status !== "all"
                ? "No hay ejemplos con estos filtros."
                : "Este escenario de demostración no contiene registros.",
            action:
              query.search || query.status !== "all" ? (
                <Button variant="outline" onClick={clear}>
                  Restablecer filtros
                </Button>
              ) : undefined,
          }}
          pagination={
            state.status === "success"
              ? {
                  ...query,
                  total: state.result.total,
                  onChange: (page) => setQuery({ ...query, page }),
                }
              : undefined
          }
        />
        <Button
          variant="outline"
          onClick={() => setShowLongTable((value) => !value)}
        >
          {showLongTable ? "Ocultar tabla extensa" : "Ver tabla extensa"}
        </Button>
        {showLongTable && <LongTableExample />}
      </Stack>
      <Drawer
        opened={detail !== null}
        onClose={() => setDetail(null)}
        title="Detalle del ejemplo"
      >
        {detail && (
          <Stack gap="md">
            <Text fw={600}>{detail.name}</Text>
            <Text size="sm">Referencia: {detail.reference}</Text>
            <Text size="sm">{detail.kind}</Text>
            <Group>
              <StatusBadge>
                {detail.status === "active" ? "Activo" : "Inactivo"}
              </StatusBadge>
            </Group>
            <Text size="sm" c="dimmed">
              Solo lectura. Al cerrar se conservan los filtros y la página.
            </Text>
          </Stack>
        )}
      </Drawer>
    </>
  );
}
