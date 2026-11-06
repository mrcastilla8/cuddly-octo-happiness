import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconListDetails,
  IconPencil,
  IconSettings,
} from "@tabler/icons-react";
import {
  EntityTable,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { CampoDato } from "../components/CampoDato";
import { useCharacteristicDetail } from "../hooks/useCharacteristicDetail";
import {
  characteristicConfigDefaults,
} from "../services/characteristicRepository";
import {
  describirReglaCaracteristica,
  etiquetaTipoCaracteristica,
} from "../services/characteristicPresentation";
import { estadoCaracteristicaSemantic } from "../services/estadoSemantic";
import type { CharacteristicValue } from "../types";

const columnasValores: TableColumn<CharacteristicValue>[] = [
  {
    key: "identificador",
    header: "Identificador",
    width: 220,
    render: (valor) => valor.valorId,
  },
  {
    key: "nombre",
    header: "Valor permitido",
    render: (valor) => valor.nombre,
  },
  {
    key: "estado",
    header: "Estado",
    width: 140,
    render: (valor) => (
      <StatusBadge semantic={estadoCaracteristicaSemantic[valor.estado]}>
        {valor.estado}
      </StatusBadge>
    ),
  },
];

export function CharacteristicDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Característica no encontrada">
        La dirección no incluye una característica para visualizar.
      </FeedbackAlert>
    );
  }
  return <CharacteristicDetailLoader key={id} id={id} />;
}

function CharacteristicDetailLoader({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state, reload } = useCharacteristicDetail(id);

  if (state.status === "loading") {
    return (
      <Group gap="sm" role="status">
        <Loader size="sm" />
        <Text size="sm">Cargando característica…</Text>
      </Group>
    );
  }
  if (state.status === "error") {
    return (
      <FeedbackAlert
        semantic="error"
        title="No se pudo cargar la característica"
        actions={
          <Group gap="sm">
            <Button variant="outline" onClick={reload}>Reintentar consulta</Button>
            <Button variant="outline" onClick={() => navigate("/caracteristicas")}>
              Volver al listado
            </Button>
          </Group>
        }
      >
        {state.message}
      </FeedbackAlert>
    );
  }
  if (state.status === "not-found") {
    return (
      <FeedbackAlert
        semantic="error"
        title="Característica no encontrada"
        actions={
          <Button variant="outline" onClick={() => navigate("/caracteristicas")}>
            Volver al listado
          </Button>
        }
      >
        No existe una característica con ese identificador.
      </FeedbackAlert>
    );
  }

  const detalle = state.detalle;
  const esLista = detalle.tipo === "LISTA";
  const esNumero = detalle.tipo === "NUMERO";
  const config = characteristicConfigDefaults;

  const regla = describirReglaCaracteristica(detalle, config);

  return (
    <>
      <PageHeader
        title={detalle.nombre}
        description="Detalle de la característica registrada para el catálogo de productos."
        breadcrumbs={[
          { label: "Taxonomía" },
          { label: "Características", to: "/caracteristicas" },
          { label: "Detalle" },
        ]}
        actions={
          <Group gap="sm" wrap="nowrap">
            <Button
              leftSection={<IconPencil size={16} stroke={2} aria-hidden="true" />}
              onClick={() => navigate(`/caracteristicas/${detalle.id}/editar`)}
            >
              Editar
            </Button>
            {esLista && (
              <Button
                variant="outline"
                leftSection={<IconListDetails size={16} stroke={2} aria-hidden="true" />}
                onClick={() => navigate(`/caracteristicas/${detalle.id}/valores`)}
              >
                Gestionar valores
              </Button>
            )}
            <Button
              leftSection={<IconSettings size={16} stroke={2} aria-hidden="true" />}
              onClick={() => navigate(`/caracteristicas/${detalle.id}/estado`)}
            >
              Cambiar estado
            </Button>
          </Group>
        }
      />
      <Stack gap="lg">
        <SectionCard title="Datos generales">
          <Stack gap="sm">
            <CampoDato etiqueta="Nombre">{detalle.nombre}</CampoDato>
            <CampoDato etiqueta="Identificador de característica">
              {detalle.id}
            </CampoDato>
            <CampoDato etiqueta="Tipo">
              {etiquetaTipoCaracteristica[detalle.tipo]}
            </CampoDato>
            <CampoDato etiqueta="Regla">{regla}</CampoDato>
            <CampoDato etiqueta="Estado">
              <StatusBadge semantic={estadoCaracteristicaSemantic[detalle.estado]}>
                {detalle.estado}
              </StatusBadge>
            </CampoDato>
            {esNumero && detalle.unidad && (
              <CampoDato etiqueta="Unidad">{detalle.unidad}</CampoDato>
            )}
            {esLista && (
              <CampoDato etiqueta="Valores activos">
                {detalle.valoresActivos}
              </CampoDato>
            )}
          </Stack>
        </SectionCard>
        {esLista && (
          <SectionCard
            title="Valores permitidos"
            description="La etiqueta puede cambiar sin alterar el identificador estable de cada valor."
          >
            <EntityTable
              caption="Valores permitidos e identificadores"
              columns={columnasValores}
              rows={detalle.valores ?? []}
              rowKey={(valor) => valor.valorId}
              state={{ status: "success" }}
              minWidth={620}
              empty={{
                title: "Sin valores permitidos",
                description: "Esta característica LISTA aún no tiene valores definidos.",
              }}
            />
          </SectionCard>
        )}
        <Group justify="flex-end">
          <Button variant="outline" onClick={() => navigate("/caracteristicas")}>
            Volver al listado
          </Button>
        </Group>
      </Stack>
    </>
  );
}
