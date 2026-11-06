import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import {
  ConfirmDialog,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { CampoDato } from "../components/CampoDato";
import { ListaBloqueos } from "../components/ListaBloqueos";
import { useBrandDetail } from "../hooks/useBrandDetail";
import {
  useSolicitarBajaMarca,
} from "../hooks/useSolicitarBajaMarca";
import { estadoSemantic } from "../services/estadoSemantic";
import type { BrandBajaResult, BrandDetail } from "../types";

export function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Marca no encontrada">
        La dirección no incluye una marca para consultar.
      </FeedbackAlert>
    );
  }
  return <BrandDetailLoader key={id} id={id} />;
}

function BrandDetailLoader({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state, reload } = useBrandDetail(id);
  const baja = useSolicitarBajaMarca(id, (result) => {
    if (result.resultado === "exito") reload();
  });

  return (
    <>
      <PageHeader
        title={
          state.status === "success" ? state.detalle.nombre : "Detalle de marca"
        }
        description="Consulta la información de la marca y gestiona su baja lógica."
        breadcrumbs={[
          { label: "Marcas", to: "/marcas" },
          {
            label: state.status === "success" ? state.detalle.nombre : "Detalle",
          },
        ]}
      />
      <Stack gap="lg">
        {state.status === "loading" && (
          <Group gap="sm" role="status">
            <Loader size="sm" />
            <Text size="sm">Cargando marca…</Text>
          </Group>
        )}
        {state.status === "error" && (
          <FeedbackAlert semantic="error" title="No se pudo cargar la marca">
            {state.message}
          </FeedbackAlert>
        )}
        {state.status === "not-found" && (
          <FeedbackAlert
            semantic="warning"
            title="Marca no encontrada"
            actions={
              <Button variant="outline" onClick={() => navigate("/marcas")}>
                Volver al listado
              </Button>
            }
          >
            La marca solicitada no existe o ya no está disponible.
          </FeedbackAlert>
        )}
        {state.status === "success" && (
          <BrandDetailContent detalle={state.detalle} baja={baja} />
        )}
      </Stack>
    </>
  );
}

function BrandDetailContent({
  detalle,
  baja,
}: {
  detalle: BrandDetail;
  baja: ReturnType<typeof useSolicitarBajaMarca>;
}) {
  const navigate = useNavigate();
  const [confirmar, setConfirmar] = useState(false);
  const resultado = baja.state.status === "success" ? baja.state.result : null;

  const cerrar = () => {
    setConfirmar(false);
    baja.reiniciar();
  };

  return (
    <>
      <SectionCard
        title="Información general"
        actions={
          <Group gap="sm" justify="flex-end">
            <Button
              leftSection={<IconPencil size={16} stroke={2} aria-hidden="true" />}
              onClick={() => navigate(`/marcas/${detalle.marcaId}/editar`)}
            >
              Editar
            </Button>
            {detalle.estado === "Activo" && baja.state.status === "idle" && (
              <Button variant="outline" onClick={() => setConfirmar(true)}>
                Solicitar desactivación
              </Button>
            )}
          </Group>
        }
      >
        <Stack gap="sm">
          <Group gap="md" align="center">
            <Avatar
              src={detalle.logoUrl ?? undefined}
              alt={`Logo de ${detalle.nombre}`}
              size={60}
              color="gray"
            >
              {detalle.nombre.slice(0, 2)}
            </Avatar>
            <Stack gap={0}>
              <Text size="md" fw={600}>
                {detalle.nombre}
              </Text>
              <Text size="sm" c="dimmed">
                ID: {detalle.marcaId}
              </Text>
            </Stack>
          </Group>
          <CampoDato etiqueta="Estado">
            <StatusBadge semantic={estadoSemantic[detalle.estado]}>
              {detalle.estado}
            </StatusBadge>
          </CampoDato>
          <CampoDato etiqueta="País de origen (ISO 3166-1)">
            {detalle.paisOrigenIso ?? "—"}
          </CampoDato>
          <CampoDato etiqueta="Descripción">
            {detalle.descripcion ?? "—"}
          </CampoDato>
          <CampoDato etiqueta="Versión">{detalle.version}</CampoDato>
          <CampoDato etiqueta="Logo URL">{detalle.logoUrl ?? "—"}</CampoDato>
        </Stack>
      </SectionCard>

      {baja.state.status === "enviando" && (
        <FeedbackAlert
          semantic="info"
          title={
            baja.state.fase === "verificacion"
              ? "Verificando dependencias con Catálogo…"
              : "Enviando solicitud de baja…"
          }
        >
          La marca permanece Activa hasta que la verificación concluya.
        </FeedbackAlert>
      )}
      {baja.state.status === "error" && (
        <FeedbackAlert
          semantic="error"
          title="No se pudo solicitar la baja"
          actions={
            <Button onClick={cerrar}>Entendido</Button>
          }
        >
          {baja.state.message}
        </FeedbackAlert>
      )}
      {resultado !== null && (
        <AlertaResultadoBaja
          result={resultado}
          onConsultar={baja.consultar}
          onCerrar={cerrar}
        />
      )}

      <ConfirmDialog
        opened={confirmar && baja.state.status === "idle"}
        title="Confirmar solicitud de baja"
        confirmLabel="Solicitar desactivación"
        destructive
        submitting={baja.state.status === "enviando"}
        onCancel={cerrar}
        onConfirm={baja.solicitar}
        error={
          baja.state.status === "error" ? (
            <FeedbackAlert semantic="error" title="No se pudo solicitar la baja">
              {baja.state.message}
            </FeedbackAlert>
          ) : undefined
        }
      >
        <Stack gap="md">
          <Text size="sm">
            {`¿Confirmas que deseas solicitar la desactivación de «${detalle.nombre}»?`}
          </Text>
          <Text size="sm" c="dimmed">
            La marca permanecerá Activa mientras se verifican dependencias con
            Catálogo. Solo una confirmación vigente completa la baja.
          </Text>
        </Stack>
      </ConfirmDialog>
    </>
  );
}

function AlertaResultadoBaja({
  result,
  onConsultar,
  onCerrar,
}: {
  result: BrandBajaResult;
  onConsultar: () => void;
  onCerrar: () => void;
}) {
  if (result.resultado === "exito") {
    return (
      <FeedbackAlert
        semantic="success"
        title="Baja confirmada"
        actions={<Button onClick={onCerrar}>Entendido</Button>}
      >
        {result.mensaje}
      </FeedbackAlert>
    );
  }

  if (result.resultado === "pendiente") {
    return (
      <FeedbackAlert
        semantic="warning"
        title="Solicitud admitida (202 Accepted)"
        actions={
          <Button onClick={onConsultar}>
            Consultar resultado de la verificación
          </Button>
        }
      >
        <Stack gap="sm">
          <Text size="sm">{result.mensaje}</Text>
          <Text size="sm" c="dimmed">
            Solo la confirmación de Catálogo completa la baja. La marca
            permanece Activa mientras se verifica.
          </Text>
        </Stack>
      </FeedbackAlert>
    );
  }

  if (result.resultado === "rechazada") {
    return (
      <FeedbackAlert
        semantic="error"
        title="Baja rechazada"
        actions={<Button onClick={onCerrar}>Entendido</Button>}
      >
        <Stack gap="sm">
          <Text size="sm">{result.mensaje}</Text>
          {result.bloqueos && <ListaBloqueos bloqueos={result.bloqueos} />}
          <Text size="sm" c="dimmed">
            La marca conserva su estado activo y sigue disponible.
          </Text>
        </Stack>
      </FeedbackAlert>
    );
  }

  return (
    <FeedbackAlert
      semantic="warning"
      title="Verificación no concluyente"
      actions={<Button onClick={onCerrar}>Entendido</Button>}
    >
      <Stack gap="sm">
        <Text size="sm">{result.mensaje}</Text>
        <Text size="sm" c="dimmed">
          Sin confirmación vigente no se autoriza la baja. La marca conserva su
          estado actual.
        </Text>
      </Stack>
    </FeedbackAlert>
  );
}
