import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
} from "../../../components/shared";
import { brandService } from "../services/brandService";
import type { BrandDetail } from "../types";

const PAISES = [
  { value: "US", label: "Estados Unidos (US)" },
  { value: "DE", label: "Alemania (DE)" },
  { value: "FR", label: "Francia (FR)" },
  { value: "IT", label: "Italia (IT)" },
  { value: "ES", label: "España (ES)" },
  { value: "AR", label: "Argentina (AR)" },
  { value: "CL", label: "Chile (CL)" },
  { value: "CO", label: "Colombia (CO)" },
  { value: "MX", label: "México (MX)" },
  { value: "BR", label: "Brasil (BR)" },
];

type FaseCarga =
  | { status: "listo" }
  | { status: "cargando" }
  | { status: "no-encontrada" }
  | { status: "error"; message: string };

export function BrandFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const esEdicion = Boolean(id);
  const [detalle, setDetalle] = useState<BrandDetail | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [paisOrigenIso, setPaisOrigenIso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fase, setFase] = useState<FaseCarga>(
    esEdicion ? { status: "cargando" } : { status: "listo" },
  );
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void brandService.obtener(id, controller.signal).then(
      (res) => {
        if (controller.signal.aborted) return;
        if (!res) {
          setFase({ status: "no-encontrada" });
          return;
        }
        setDetalle(res);
        setNombre(res.nombre);
        setDescripcion(res.descripcion ?? "");
        setPaisOrigenIso(res.paisOrigenIso ?? null);
        setFase({ status: "listo" });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setFase({
          status: "error",
          message:
            err instanceof Error ? err.message : "No se pudo cargar la marca.",
        });
      },
    );
    return () => controller.abort();
  }, [id, reloadToken]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (guardando) return;
    const limpio = nombre.trim();
    if (!limpio) {
      setError("Ingresa el nombre de la marca.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      if (esEdicion && id) {
        const actualizado = await brandService.actualizar(
          {
            marcaId: id,
            nombre: limpio,
            descripcion: descripcion.trim() || null,
            paisOrigenIso: paisOrigenIso,
          },
          new AbortController().signal,
        );
        if (!actualizado) {
          setError(
            "No se pudo guardar la marca: el recurso no existe o ya no está disponible (404). Los datos ingresados se conservan.",
          );
          setGuardando(false);
          return;
        }
        navigate(`/marcas/${id}`);
      } else {
        const creado = await brandService.crear(
          {
            nombre: limpio,
            descripcion: descripcion.trim() || null,
            paisOrigenIso: paisOrigenIso,
          },
          new AbortController().signal,
        );
        if (!creado) {
          setError(
            "No se pudo crear la marca. Los datos ingresados se conservan.",
          );
          setGuardando(false);
          return;
        }
        navigate(`/marcas/${creado.marcaId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la marca.",
      );
      setGuardando(false);
    }
  };

  const cargando = fase.status === "cargando";
  const puedeEditar = fase.status === "listo";

  return (
    <>
      <PageHeader
        title={esEdicion ? "Editar marca" : "Nueva marca"}
        description={
          esEdicion
            ? "Actualiza los datos de la marca."
            : "Registra una nueva marca."
        }
        breadcrumbs={[
          { label: "Taxonomía", to: "/marcas" },
          { label: "Marcas", to: "/marcas" },
          { label: esEdicion ? "Editar" : "Nueva" },
        ]}
      />
      <Stack gap="lg">
        {cargando && (
          <Group gap="sm" role="status">
            <Loader size="sm" />
            <Text size="sm">Cargando marca…</Text>
          </Group>
        )}

        {fase.status === "error" && (
          <FeedbackAlert
            semantic="error"
            title="No se pudo cargar la marca"
            actions={
              <Group gap="sm">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFase({ status: "cargando" });
                    setReloadToken((token) => token + 1);
                  }}
                >
                  Reintentar
                </Button>
                <Button variant="outline" onClick={() => navigate("/marcas")}>
                  Volver al listado
                </Button>
              </Group>
            }
          >
            {fase.message}
          </FeedbackAlert>
        )}

        {fase.status === "no-encontrada" && (
          <FeedbackAlert
            semantic="warning"
            title="Marca no encontrada (404)"
            actions={
              <Button variant="outline" onClick={() => navigate("/marcas")}>
                Volver al listado
              </Button>
            }
          >
            La marca solicitada no existe o ya no está disponible para editar.
          </FeedbackAlert>
        )}

        {error && (
          <FeedbackAlert semantic="error" title="No se pudo guardar la marca">
            {error}
          </FeedbackAlert>
        )}

        {puedeEditar && (
          <SectionCard title="Datos de la marca">
            <form onSubmit={handleSubmit} noValidate>
              <Stack gap="md">
                <TextInput
                  label="Nombre"
                  withAsterisk
                  value={nombre}
                  onChange={(e) => setNombre(e.currentTarget.value)}
                  disabled={guardando}
                />
                <Textarea
                  label="Descripción (opcional)"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.currentTarget.value)}
                  autosize
                  minRows={3}
                  disabled={guardando}
                />
                <Select
                  label="País de origen (ISO 3166-1, opcional)"
                  placeholder="Selecciona un país"
                  data={PAISES}
                  value={paisOrigenIso}
                  clearable
                  onChange={(v) => setPaisOrigenIso(v)}
                  disabled={guardando}
                />
                <TextInput
                  label="Logo (URL, opcional)"
                  value={detalle?.logoUrl ?? ""}
                  disabled
                />
                <Group justify="flex-end" gap="sm">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/marcas")}
                    disabled={guardando}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" loading={guardando}>
                    {esEdicion ? "Guardar cambios" : "Crear marca"}
                  </Button>
                </Group>
              </Stack>
            </form>
          </SectionCard>
        )}
      </Stack>
    </>
  );
}
