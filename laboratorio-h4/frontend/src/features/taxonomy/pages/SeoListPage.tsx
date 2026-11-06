import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionIcon, Box, Button, Stack, Text } from "@mantine/core";
import { IconPlus, IconSettings } from "@tabler/icons-react";
import {
  EntityTable,
  FilterBar,
  PageHeader,
  SearchField,
  type TableColumn,
  type TableState,
} from "../../../components/shared";
import { useSeoList } from "../hooks/useSeoList";
import type { SeoCategory } from "../types";

export function SeoListPage() {
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const { state } = useSeoList(revision);

  const resultado = state.status === "success" ? state.result : undefined;
  const items = useMemo(() => resultado?.items ?? [], [resultado]);
  const termino = busqueda.trim().toLocaleLowerCase("es");
  const filas = useMemo(
    () => items.filter((x) => termino === "" || x.nombre.toLocaleLowerCase("es").includes(termino) || x.slug.toLocaleLowerCase("es").includes(termino)),
    [items, termino],
  );

  const columnas: TableColumn<SeoCategory>[] = [
    { key: "nombre", header: "Categoría", render: (i) => <Text size="sm" fw={600}>{i.nombre}</Text> },
    { key: "slug", header: "Slug", render: (i) => <Text size="sm">/{i.slug}</Text> },
    { key: "metaTitulo", header: "Meta-título", render: (i) => <Text size="sm" truncate>{i.metaTitulo || "—"}</Text> },
    { key: "metaDesc", header: "Meta-descripción", render: (i) => <Text size="sm" truncate>{i.metaDescripcion || "—"}</Text> },
    {
      key: "acciones",
      header: "Acciones",
      width: 80,
      align: "right",
      render: (i) => (
        <ActionIcon
          aria-label={`Configurar SEO de ${i.nombre}`}
          title="Configurar SEO"
          onClick={() => navigate(`/seo/${i.id}`)}
        >
          <IconSettings size={16} stroke={2} aria-hidden="true" />
        </ActionIcon>
      ),
    },
  ];

  const tablaState: TableState =
    state.status === "loading"
      ? { status: "loading" }
      : state.status === "error"
        ? {
            status: "error",
            message: state.message,
            action: (
              <Button variant="outline" onClick={() => setRevision((v) => v + 1)}>
                Volver a intentar
              </Button>
            ),
          }
        : { status: "success" };

  const vacio = items.length === 0
    ? { title: "Sin SEO configurado", description: "Aún no hay metadatos SEO registrados." }
    : { title: "Sin resultados", description: "Ningún elemento coincide con la búsqueda." };

  return (
    <>
      <PageHeader title="SEO y metadatos" description="Gestiona slug y metadatos SEO de categorías." breadcrumbs={[{ label: "Taxonomía" }, { label: "SEO" }]} actions={<Button leftSection={<IconPlus size={16} stroke={2} aria-hidden="true" />} disabled>Nueva configuración</Button>} />
      <Stack gap="lg">
        <FilterBar summary={`${filas.length} elementos visibles`}>
          <Box w={320}>
            <SearchField label="Buscar" value={busqueda} onChange={setBusqueda} placeholder="Categoría o slug" />
          </Box>
        </FilterBar>
        <EntityTable caption="Listado de SEO y metadatos" columns={columnas} rows={filas} rowKey={(i) => i.id} state={tablaState} minWidth={720} empty={vacio} />
      </Stack>
    </>
  );
}
