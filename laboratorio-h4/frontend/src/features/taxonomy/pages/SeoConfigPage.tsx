import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconWand } from "@tabler/icons-react";
import { FeedbackAlert, PageHeader, SectionCard } from "../../../components/shared";
import { CampoDato } from "../components/CampoDato";
import { useGuardarSeo } from "../hooks/useGuardarSeo";
import { useHistorialSlug } from "../hooks/useHistorialSlug";
import { useSeoDetail } from "../hooks/useSeoDetail";
import { seoService } from "../services/seoService";
import type { SeoCategory, SlugPropuesta } from "../types";

const formatearFecha = (fecha: string) =>
  new Date(fecha).toLocaleString("es-AR");

export function SeoConfigPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Elemento no encontrado">
        No se indicó el elemento a configurar.
      </FeedbackAlert>
    );
  }
  return <SeoConfigLoader key={id} id={id} />;
}

function SeoConfigLoader({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state } = useSeoDetail(id);

  return (
    <>
      <PageHeader
        title="Configurar SEO y metadatos"
        description="Edita slug y metadatos (no bloquea guardado por longitud)."
        breadcrumbs={[
          { label: "SEO", to: "/seo" },
          { label: "Configurar" },
        ]}
      />
      <Stack gap="lg">
        {state.status === "loading" && (
          <Group gap="sm" role="status">
            <Loader size="sm" />
            <Text size="sm">Cargando metadatos…</Text>
          </Group>
        )}
        {state.status === "error" && (
          <FeedbackAlert semantic="error" title="No se pudieron cargar los metadatos">
            {state.message}
          </FeedbackAlert>
        )}
        {state.status === "not-found" && (
          <FeedbackAlert
            semantic="warning"
            title="Categoría no encontrada"
            actions={
              <Button variant="outline" onClick={() => navigate("/seo")}>
                Volver al listado
              </Button>
            }
          >
            La categoría solicitada no existe o ya no está disponible.
          </FeedbackAlert>
        )}
        {state.status === "success" && (
          <SeoConfigContent detalle={state.detalle} />
        )}
      </Stack>
    </>
  );
}

function SeoConfigContent({ detalle }: { detalle: SeoCategory }) {
  const navigate = useNavigate();
  const [detalleActual, setDetalleActual] = useState(detalle);
  const [slug, setSlug] = useState(detalle.slug);
  const [metaTitulo, setMetaTitulo] = useState(detalle.metaTitulo ?? "");
  const [metaDescripcion, setMetaDescripcion] = useState(
    detalle.metaDescripcion ?? "",
  );
  const [guardadoS, setGuardadoS] = useState(false);
  const [propuesta, setPropuesta] = useState<SlugPropuesta | null>(null);
  const [proponiendo, setProponiendo] = useState(false);
  const [errorPropuesta, setErrorPropuesta] = useState<string | null>(null);
  const propuestaControllerRef = useRef<AbortController | null>(null);
  const historial = useHistorialSlug(detalle.id);
  const guardarS = useGuardarSeo((guardado) => {
    setDetalleActual(guardado);
    setGuardadoS(true);
    setPropuesta(null);
    historial.reload();
  });

  useEffect(() => () => propuestaControllerRef.current?.abort(), []);

  const guardando = guardarS.state.status === "enviando";

  const proponer = () => {
    propuestaControllerRef.current?.abort();
    const controller = new AbortController();
    propuestaControllerRef.current = controller;
    setProponiendo(true);
    setErrorPropuesta(null);
    guardarS.reiniciar();
    void seoService.proponerSlug(detalleActual.nombre, controller.signal).then(
      (p) => {
        if (controller.signal.aborted) return;
        setPropuesta(p);
        setSlug(p.slug);
        setProponiendo(false);
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setProponiendo(false);
        setErrorPropuesta(
          error instanceof Error
            ? error.message
            : "No se pudo generar la propuesta.",
        );
      },
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (slug.trim() === "") return;
    setGuardadoS(false);
    guardarS.reiniciar();
    guardarS.guardar({
      id: detalleActual.id,
      slug: slug.trim(),
      metaTitulo: metaTitulo.trim(),
      metaDescripcion: metaDescripcion.trim(),
    });
  };

  const warnTitulo = metaTitulo.length > 70;
  const warnDesc = metaDescripcion.length > 160;

  return (
    <>
      <SectionCard
        title="Slug (propuesta / actual)"
        description="El slug resuelto es público. Marketplace ejecuta la redirección permanente (301); la UI no la simula."
      >
        <Stack gap="sm">
          <CampoDato etiqueta="Slug actual">{detalleActual.slug}</CampoDato>
          <CampoDato etiqueta="Colisión resuelta">
            {detalleActual.colisionResuelta ? "Sí" : "No"}
          </CampoDato>
          {detalleActual.slugAnterior && (
            <CampoDato etiqueta="Slug anterior">{detalleActual.slugAnterior}</CampoDato>
          )}
          <TextInput
            label="Slug (editable)"
            value={slug}
            onChange={(e) => setSlug(e.currentTarget.value)}
            disabled={guardando}
          />
          <Group gap="sm">
            <Button
              variant="outline"
              leftSection={<IconWand size={16} stroke={2} aria-hidden="true" />}
              onClick={proponer}
              loading={proponiendo}
              disabled={guardando}
            >
              Generar propuesta desde el nombre
            </Button>
            {propuesta && (
              <Text size="sm" c="dimmed">
                {propuesta.colisionResuelta
                  ? `Colisión detectada; se propone el slug libre «${propuesta.slug}».`
                  : `Propuesta generada desde el nombre: «${propuesta.slug}».`}
              </Text>
            )}
          </Group>
          {errorPropuesta && (
            <FeedbackAlert semantic="error" title="No se pudo generar la propuesta">
              {errorPropuesta}
            </FeedbackAlert>
          )}
        </Stack>
      </SectionCard>

      <SectionCard title="Metadatos SEO">
        <Stack gap="md">
          {guardadoS && (
            <FeedbackAlert
              semantic="success"
              title="Metadatos y slug guardados"
              actions={
                <Button variant="outline" onClick={() => setGuardadoS(false)}>
                  Entendido
                </Button>
              }
            >
              Los cambios se reflejaron correctamente para esta categoría.
            </FeedbackAlert>
          )}
          {guardarS.state.status === "conflicto" && (
            <FeedbackAlert
              semantic="error"
              title="Conflicto de slug (409 SLUG_DUPLICADO)"
              actions={
                <Group gap="sm">
                  <Button onClick={proponer} loading={proponiendo}>
                    Generar nueva propuesta
                  </Button>
                  <Button variant="outline" onClick={guardarS.reiniciar}>
                    Cerrar
                  </Button>
                </Group>
              }
            >
              {guardarS.state.message} El formulario conserva los datos que
              ingresaste; no se borró nada.
            </FeedbackAlert>
          )}
          {guardarS.state.status === "error" && (
            <FeedbackAlert
              semantic="error"
              title="No se pudieron guardar los metadatos"
              actions={
                <Button variant="outline" onClick={guardarS.reiniciar}>
                  Entendido
                </Button>
              }
            >
              {guardarS.state.message}
            </FeedbackAlert>
          )}
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Meta-título"
                value={metaTitulo}
                onChange={(e) => setMetaTitulo(e.currentTarget.value)}
                disabled={guardando}
              />
              {warnTitulo && (
                <Text size="sm" c="var(--po-warningText)">
                  {`Advertencia: supera 70 caracteres (${metaTitulo.length})`}
                </Text>
              )}
              <Textarea
                label="Meta-descripción"
                value={metaDescripcion}
                onChange={(e) => setMetaDescripcion(e.currentTarget.value)}
                autosize
                minRows={2}
                disabled={guardando}
              />
              {warnDesc && (
                <Text size="sm" c="var(--po-warningText)">
                  {`Advertencia: supera 160 caracteres (${metaDescripcion.length})`}
                </Text>
              )}
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="outline"
                  onClick={() => navigate("/seo")}
                  disabled={guardando}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={guardando}>
                  Guardar
                </Button>
              </Group>
            </Stack>
          </form>
        </Stack>
      </SectionCard>

      <SectionCard
        title="Historial de slugs"
        description="Resoluciones de slug registradas para esta categoría."
      >
        {historial.state.status === "loading" && (
          <Group gap="sm" role="status">
            <Loader size="sm" />
            <Text size="sm">Consultando historial…</Text>
          </Group>
        )}
        {historial.state.status === "error" && (
          <FeedbackAlert
            semantic="warning"
            title="No se pudo consultar el historial"
            actions={
              <Button variant="outline" onClick={historial.reload}>
                Reintentar
              </Button>
            }
          >
            {historial.state.message}
          </FeedbackAlert>
        )}
        {historial.state.status === "success" &&
          historial.state.items.length === 0 && (
            <Text size="sm" c="dimmed">
              Sin historial de resoluciones para esta categoría.
            </Text>
          )}
        {historial.state.status === "success" &&
          historial.state.items.length > 0 && (
            <Stack gap="xs">
              {historial.state.items.map((item) => (
                <Text key={`${item.slugAnterior}-${item.slugActual}`} size="sm">
                  {`${item.slugAnterior} → ${item.slugActual} (${formatearFecha(item.fecha)})`}
                </Text>
              ))}
            </Stack>
          )}
      </SectionCard>
    </>
  );
}
