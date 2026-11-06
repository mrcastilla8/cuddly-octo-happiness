import { Link, useNavigate, useParams } from "react-router-dom";
import { ActionIcon, Anchor, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconEye, IconPencil, IconPower, IconRefresh } from "@tabler/icons-react";
import {
  EntityTable,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { CampoDato } from "../components/CampoDato";
import { ListaBloqueos } from "../components/ListaBloqueos";
import { useCategoryDetail } from "../hooks/useCategoryDetail";
import { useReactivarCategoria } from "../hooks/useReactivarCategoria";
import { estadoSemantic } from "../services/estadoSemantic";
import type { CategoryDetail, CategoryNode } from "../types";

const columnasHijas: TableColumn<CategoryNode>[] = [
  {
    key: "nombre",
    header: "Nombre",
    render: (nodo) => (
      <Text size="sm" fw={nodo.nivel === 0 ? 600 : 400}>
        {nodo.nombre}
      </Text>
    ),
  },
  {
    key: "nivel",
    header: "Nivel",
    width: 80,
    align: "right",
    render: (nodo) => nodo.nivel,
  },
  {
    key: "estado",
    header: "Estado",
    width: 180,
    render: (nodo) => (
      <StatusBadge semantic={estadoSemantic[nodo.estado]}>
        {nodo.estado}
      </StatusBadge>
    ),
  },
  {
    key: "acciones",
    header: "Acciones",
    width: 80,
    align: "right",
    render: (nodo) => (
      <ActionIcon
        component={Link}
        to={`/categorias/${nodo.id}`}
        aria-label={`Ver detalle de ${nodo.nombre}`}
        title="Ver detalle"
      >
        <IconEye size={16} stroke={2} aria-hidden="true" />
      </ActionIcon>
    ),
  },
];

// MK-008-S05: detalle de categoría en `/categorias/:id`.
// MK-008-S05-R: reactivación de categoría (misma pantalla; ruta `/categorias/:id/reactivar`
// disponible para deep-link; el botón Reactivar aparece según el estado).
export function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Categoría no encontrada">
        La dirección no incluye una categoría para consultar.
      </FeedbackAlert>
    );
  }
  return <CategoryDetailLoader key={id} id={id} />;
}

function CategoryDetailLoader({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state, reload } = useCategoryDetail(id);

  const titulo =
    state.status === "success" ? state.detalle.nombre : "Detalle de categoría";

  return (
    <>
      <PageHeader
        title={titulo}
        description="Consulta los datos de la categoría y sus subcategorías."
        breadcrumbs={[
          { label: "Categorías", to: "/categorias" },
          ...(state.status === "success" &&
          state.detalle.padreId &&
          state.detalle.padreNombre
            ? [
                {
                  label: state.detalle.padreNombre,
                  to: `/categorias/${state.detalle.padreId}`,
                },
              ]
            : []),
          {
            label: state.status === "success" ? state.detalle.nombre : "Detalle",
          },
        ]}
      />
      <Stack gap="lg">
        {state.status === "loading" && (
          <Group gap="sm" role="status">
            <Loader size="sm" />
            <Text size="sm">Cargando categoría…</Text>
          </Group>
        )}
        {state.status === "error" && (
          <FeedbackAlert semantic="error" title="No se pudo cargar la categoría">
            {state.message}
          </FeedbackAlert>
        )}
        {state.status === "not-found" && (
          <FeedbackAlert
            semantic="warning"
            title="Categoría no encontrada"
            actions={
              <Button variant="outline" onClick={() => navigate("/categorias")}>
                Volver al árbol de categorías
              </Button>
            }
          >
            La categoría solicitada no existe o ya no está disponible.
          </FeedbackAlert>
        )}
        {state.status === "success" && (
          <CategoryDetailContent detalle={state.detalle} onReload={reload} />
        )}
      </Stack>
    </>
  );
}

function CategoryDetailContent({
  detalle,
  onReload,
}: {
  detalle: CategoryDetail;
  onReload: () => void;
}) {
  const navigate = useNavigate();
  const { state, reactivar, reiniciar } = useReactivarCategoria();

  const esActivo = detalle.estado === "Activo";

  return (
    <>
      {state.status === "reactivada" && (
        <FeedbackAlert
          semantic="success"
          title="Categoría reactivada"
          actions={
            <Group gap="sm">
              <Button
                onClick={() => {
                  onReload();
                  reiniciar();
                }}
              >
                Actualizar estado
              </Button>
              <Button variant="outline" onClick={() => navigate("/categorias")}>
                Volver al árbol
              </Button>
            </Group>
          }
        >
          {state.result.mensaje}
        </FeedbackAlert>
      )}

      {state.status === "bloqueada" && (
        <FeedbackAlert
          semantic="error"
          title="Reactivación bloqueada"
          actions={
            <Group gap="sm">
              <Button variant="outline" onClick={reiniciar}>
                Entendido
              </Button>
              <Button variant="outline" onClick={() => navigate("/categorias")}>
                Volver al árbol
              </Button>
            </Group>
          }
        >
          <Stack gap="sm">
            <Text size="sm">{state.result.mensaje}</Text>
            <ListaBloqueos bloqueos={state.result.bloqueos} />
          </Stack>
        </FeedbackAlert>
      )}

      {state.status === "error" && (
        <FeedbackAlert
          semantic="error"
          title="No se pudo reactivar la categoría"
          actions={
            <Button variant="outline" onClick={reiniciar}>
              Entendido
            </Button>
          }
        >
          {state.message}
        </FeedbackAlert>
      )}

      <SectionCard
        title="Información general"
        description="Datos de la categoría en la taxonomía."
        actions={
          <Group gap="sm">
            <Button
              leftSection={<IconPencil size={16} stroke={2} aria-hidden="true" />}
              onClick={() => navigate(`/categorias/${detalle.id}/editar`)}
            >
              Editar
            </Button>
            {esActivo ? (
              <Button
                variant="outline"
                leftSection={<IconPower size={16} stroke={2} aria-hidden="true" />}
                onClick={() => navigate(`/categorias/${detalle.id}/desactivar`)}
              >
                Desactivar
              </Button>
            ) : (
              <Button
                variant="outline"
                leftSection={<IconRefresh size={16} stroke={2} aria-hidden="true" />}
                loading={state.status === "enviando"}
                onClick={() => reactivar(detalle.id)}
              >
                Reactivar
              </Button>
            )}
          </Group>
        }
      >
        <Stack gap="sm">
          <CampoDato etiqueta="Nombre">{detalle.nombre}</CampoDato>
          <CampoDato etiqueta="Slug">{detalle.slug}</CampoDato>
          <CampoDato etiqueta="Nivel">{detalle.nivel}</CampoDato>
          <CampoDato etiqueta="Orden">{detalle.orden}</CampoDato>
          <CampoDato etiqueta="Estado">
            <StatusBadge semantic={estadoSemantic[detalle.estado]}>
              {detalle.estado}
            </StatusBadge>
          </CampoDato>
          <CampoDato etiqueta="Categoría padre">
            {detalle.padreId && detalle.padreNombre ? (
              <Anchor
                component={Link}
                to={`/categorias/${detalle.padreId}`}
                size="sm"
              >
                {detalle.padreNombre}
              </Anchor>
            ) : (
              <Text size="sm" c="dimmed">
                Categoría raíz
              </Text>
            )}
          </CampoDato>
          <CampoDato etiqueta="Descripción">
            {detalle.descripcion ? (
              detalle.descripcion
            ) : (
              <Text size="sm" c="dimmed">
                Sin descripción
              </Text>
            )}
          </CampoDato>
        </Stack>
      </SectionCard>

      <SectionCard
        title="Subcategorías"
        description="Categorías hijas directas de esta categoría."
      >
        <EntityTable
          caption="Subcategorías"
          columns={columnasHijas}
          rows={detalle.hijas}
          rowKey={(nodo) => nodo.id}
          state={{ status: "success" }}
          minWidth={520}
          empty={{
            title: "Sin subcategorías",
            description: "Esta categoría no tiene subcategorías registradas.",
          }}
        />
      </SectionCard>
    </>
  );
}