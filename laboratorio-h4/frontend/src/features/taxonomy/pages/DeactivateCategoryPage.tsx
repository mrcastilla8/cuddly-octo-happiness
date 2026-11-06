import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import {
  ConfirmDialog,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { CampoDato } from "../components/CampoDato";
import { ListaBloqueos } from "../components/ListaBloqueos";
import { useCategoryDetail } from "../hooks/useCategoryDetail";
import { useSolicitarBaja } from "../hooks/useSolicitarBaja";
import { estadoSemantic } from "../services/estadoSemantic";
import type { CategoryDetail } from "../types";

// MK-008-S04 / S04-P / S04-B: solicitud de baja y resultado de verificación
// en `/categorias/:id/desactivar`.
export function DeactivateCategoryPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Categoría no encontrada">
        La dirección no incluye una categoría para desactivar.
      </FeedbackAlert>
    );
  }
  return <DeactivateCategoryLoader key={id} id={id} />;
}

function DeactivateCategoryLoader({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state } = useCategoryDetail(id);

  const contenido =
    state.status === "loading" ? (
      <Group gap="sm" role="status">
        <Loader size="sm" />
        <Text size="sm">Cargando categoría…</Text>
      </Group>
    ) : state.status === "error" ? (
      <FeedbackAlert semantic="error" title="No se pudo cargar la categoría">
        {state.message}
      </FeedbackAlert>
    ) : state.status === "not-found" ? (
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
    ) : (
      <DeactivateCategoryContent detalle={state.detalle} />
    );

  return (
    <>
      <PageHeader
        title="Desactivar categoría"
        description="Solicita la baja de una categoría de la taxonomía de productos."
        breadcrumbs={[
          { label: "Categorías", to: "/categorias" },
          { label: "Desactivar" },
        ]}
      />
      <Stack gap="lg">{contenido}</Stack>
    </>
  );
}

function DeactivateCategoryContent({ detalle }: { detalle: CategoryDetail }) {
  const navigate = useNavigate();
  const { state, seguimiento, solicitar, consultarEstado, reiniciar } =
    useSolicitarBaja(detalle.id);
  const [confirmar, setConfirmar] = useState(false);

  const cerrarDialogo = () => {
    setConfirmar(false);
    reiniciar();
  };

  const resultado = state.status === "success" ? state.result : null;

  return (
    <>
      {resultado === null ? (
        <>
          <FeedbackAlert semantic="warning" title="Confirmación requerida">
            Antes de aplicar la baja, el sistema verifica que la categoría no
            tenga subcategorías ni productos activos.
          </FeedbackAlert>
          <SectionCard
            title="Categoría a desactivar"
            description="Revisa los datos antes de solicitar la baja."
            actions={
              <StatusBadge semantic={estadoSemantic[detalle.estado]}>
                {detalle.estado}
              </StatusBadge>
            }
          >
            <Stack gap="sm">
              <CampoDato etiqueta="Nombre">{detalle.nombre}</CampoDato>
              <CampoDato etiqueta="Slug">{detalle.slug}</CampoDato>
              <CampoDato etiqueta="Nivel">{detalle.nivel}</CampoDato>
              <CampoDato etiqueta="Subcategorías">{detalle.hijas.length}</CampoDato>
            </Stack>
          </SectionCard>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="outline"
              onClick={() => navigate(`/categorias/${detalle.id}`)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              disabled={detalle.estado !== "Activo"}
              onClick={() => setConfirmar(true)}
            >
              Solicitar desactivación
            </Button>
          </Group>
        </>
      ) : resultado.resultado === "verificando" ? (
        <Stack gap="lg">
          <FeedbackAlert
            semantic="warning"
            title="Verificando baja"
            actions={
              <Group gap="sm">
                {resultado.operacionId && (
                  <Button
                    loading={seguimiento.status === "consultando"}
                    onClick={() =>
                      consultarEstado(resultado.operacionId as string)
                    }
                  >
                    Consultar estado
                  </Button>
                )}
                <Button onClick={() => navigate(`/categorias/${detalle.id}`)}>
                  Ver categoría
                </Button>
                <Button variant="outline" onClick={() => navigate("/categorias")}>
                  Volver al árbol
                </Button>
              </Group>
            }
          >
            <Stack gap="sm">
              <Text size="sm">{resultado.mensaje}</Text>
              <StatusBadge semantic={estadoSemantic[resultado.categoria.estado]}>
                {resultado.categoria.estado}
              </StatusBadge>
            </Stack>
          </FeedbackAlert>
          {seguimiento.status === "success" &&
            seguimiento.result.estado === "confirmada" && (
              <FeedbackAlert semantic="success" title="Baja confirmada">
                <Stack gap="sm">
                  <Text size="sm">{seguimiento.result.mensaje}</Text>
                  {seguimiento.result.categoria && (
                    <StatusBadge
                      semantic={estadoSemantic[seguimiento.result.categoria.estado]}
                    >
                      {seguimiento.result.categoria.estado}
                    </StatusBadge>
                  )}
                </Stack>
              </FeedbackAlert>
            )}
          {seguimiento.status === "success" &&
            seguimiento.result.estado === "pendiente" && (
              <FeedbackAlert semantic="warning" title="Baja aún en verificación">
                <Stack gap="sm">
                  <Text size="sm">{seguimiento.result.mensaje}</Text>
                  {seguimiento.result.categoria && (
                    <StatusBadge
                      semantic={estadoSemantic[seguimiento.result.categoria.estado]}
                    >
                      {seguimiento.result.categoria.estado}
                    </StatusBadge>
                  )}
                </Stack>
              </FeedbackAlert>
            )}
          {seguimiento.status === "success" &&
            seguimiento.result.estado === "rechazada" && (
              <FeedbackAlert semantic="error" title="Baja rechazada">
                <Stack gap="sm">
                  <Text size="sm">{seguimiento.result.mensaje}</Text>
                  {seguimiento.result.categoria && (
                    <StatusBadge
                      semantic={estadoSemantic[seguimiento.result.categoria.estado]}
                    >
                      {seguimiento.result.categoria.estado}
                    </StatusBadge>
                  )}
                </Stack>
              </FeedbackAlert>
            )}
          {seguimiento.status === "success" &&
            seguimiento.result.estado === "no-concluyente" && (
              <FeedbackAlert
                semantic="warning"
                title="Verificación no concluyente"
              >
                <Stack gap="sm">
                  <Text size="sm">{seguimiento.result.mensaje}</Text>
                  {seguimiento.result.categoria && (
                    <StatusBadge
                      semantic={estadoSemantic[seguimiento.result.categoria.estado]}
                    >
                      {seguimiento.result.categoria.estado}
                    </StatusBadge>
                  )}
                </Stack>
              </FeedbackAlert>
            )}
          {seguimiento.status === "error" && (
            <FeedbackAlert
              semantic="error"
              title="No se pudo consultar el estado"
            >
              {seguimiento.message}
            </FeedbackAlert>
          )}
        </Stack>
      ) : (
        <FeedbackAlert
          semantic="error"
          title="Baja rechazada"
          actions={
            <Group gap="sm">
              <Button onClick={() => navigate(`/categorias/${detalle.id}`)}>
                Ver categoría
              </Button>
              <Button variant="outline" onClick={() => navigate("/categorias")}>
                Volver al árbol
              </Button>
            </Group>
          }
        >
          <Stack gap="sm">
            <Text size="sm">{resultado.mensaje}</Text>
            <ListaBloqueos bloqueos={resultado.bloqueos} />
          </Stack>
        </FeedbackAlert>
      )}

      <ConfirmDialog
        opened={confirmar && resultado === null}
        title="Confirmar solicitud de baja"
        confirmLabel="Solicitar baja"
        destructive
        submitting={state.status === "enviando"}
        onCancel={cerrarDialogo}
        onConfirm={solicitar}
        error={
          state.status === "error" ? (
            <FeedbackAlert semantic="error" title="No se pudo verificar la baja">
              {state.message}
            </FeedbackAlert>
          ) : undefined
        }
      >
        <Stack gap="md">
          <Text size="sm">
            {`¿Confirmas que deseas solicitar la desactivación de «${detalle.nombre}»?`}
          </Text>
          <Text size="sm" c="dimmed">
            La categoría quedará marcada como «Verificando baja» hasta completar
            la verificación de dependencias.
          </Text>
        </Stack>
      </ConfirmDialog>
    </>
  );
}