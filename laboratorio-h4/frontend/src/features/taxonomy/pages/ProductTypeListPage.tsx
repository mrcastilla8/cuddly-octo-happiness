import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionIcon, Box, Button, Stack, Text } from "@mantine/core";
import { IconEye, IconPlus } from "@tabler/icons-react";
import {
  EntityTable,
  FilterBar,
  PageHeader,
  SearchField,
  StatusBadge,
  type TableColumn,
  type TableState,
} from "../../../components/shared";
import { useProductTypeList } from "../hooks/useProductTypeList";
import { estadoCaracteristicaSemantic } from "../services/estadoSemantic";
import type { ProductTypeListItem } from "../types";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

export function ProductTypeListPage() {
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const mockRevision = useMockStateRevision(["taxonomy", "taxonomy-product-types"]);
  const [busqueda, setBusqueda] = useState("");
  const { state } = useProductTypeList(revision + mockRevision);

  const resultado = state.status === "success" ? state.result : undefined;
  const tipos = useMemo(() => resultado?.items ?? [], [resultado]);
  const termino = busqueda.trim().toLocaleLowerCase("es");

  const filas = useMemo(
    () =>
      tipos.filter(
        (item) =>
          termino === "" ||
          item.nombre.toLocaleLowerCase("es").includes(termino),
      ),
    [tipos, termino],
  );

  const columnas: TableColumn<ProductTypeListItem>[] = [
    {
      key: "nombre",
      header: "Tipo de producto",
      render: (item) => (
        <Text size="sm" fw={600}>
          {item.nombre}
        </Text>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      width: 140,
      render: (item) => (
        <StatusBadge semantic={estadoCaracteristicaSemantic[item.estado]}>
          {item.estado}
        </StatusBadge>
      ),
    },
    {
      key: "contador",
      header: "Características",
      width: 160,
      render: (item) => (
        <Text size="sm">
          {item.caracteristicasAsignadas} de {item.limiteCaracteristicas}
        </Text>
      ),
    },
    {
      key: "schemaVersion",
      header: "Versión del esquema",
      width: 140,
      align: "right",
      render: (item) => <Text size="sm">{item.schemaVersion}</Text>,
    },
    {
      key: "acciones",
      header: "Acciones",
      width: 80,
      align: "right",
      render: (item) => (
        <ActionIcon
          aria-label={`Ver detalle de ${item.nombre}`}
          title="Ver detalle"
          onClick={() => navigate(`/tipos-producto/${item.tipoProductoId}`)}
        >
          <IconEye size={16} stroke={2} aria-hidden="true" />
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
              <Button
                variant="outline"
                onClick={() => setRevision((value) => value + 1)}
              >
                Volver a intentar
              </Button>
            ),
          }
        : { status: "success" };

  const vacio =
    tipos.length === 0
      ? {
          title: "Sin tipos de producto",
          description:
            "Todavía no hay tipos de producto registrados para definir esquemas de atributos.",
          action: (
            <Button
              leftSection={
                <IconPlus size={16} stroke={2} aria-hidden="true" />
              }
              onClick={() => navigate("/tipos-producto/nuevo")}
            >
              Crear tipo de producto
            </Button>
          ),
        }
      : {
          title: "Sin resultados",
          description:
            "Ningún tipo de producto coincide con la búsqueda. Ajusta el término e inténtalo de nuevo.",
        };

  return (
    <>
      <PageHeader
        title="Tipos de producto"
        description="Define el esquema de atributos de cada tipo de producto."
        breadcrumbs={[{ label: "Catálogo" }, { label: "Tipos de producto" }]}
        actions={
          <Button
            leftSection={<IconPlus size={16} stroke={2} aria-hidden="true" />}
            onClick={() => navigate("/tipos-producto/nuevo")}
          >
            Nuevo tipo de producto
          </Button>
        }
      />
      <Stack gap="lg">
        <FilterBar summary={`${filas.length} tipos de producto visibles`}>
          <Box w={320}>
            <SearchField
              label="Buscar tipo de producto"
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Nombre del tipo de producto"
            />
          </Box>
        </FilterBar>
        <EntityTable
          caption="Listado de tipos de producto"
          columns={columnas}
          rows={filas}
          rowKey={(item) => item.tipoProductoId}
          state={tablaState}
          minWidth={700}
          empty={vacio}
        />
      </Stack>
    </>
  );
}
