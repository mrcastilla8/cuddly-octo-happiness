import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Group, Loader, Radio, Select, Stack, Text } from "@mantine/core";
import { FeedbackAlert, PageHeader, SectionCard } from "../../../components/shared";
import { useAsociarCaracteristica } from "../hooks/useAsociarCaracteristica";
import { useCaracteristicasDisponibles } from "../hooks/useCaracteristicasDisponibles";
import type { CharacteristicType } from "../types";

const tipoLabel: Record<CharacteristicType, string> = {
  LISTA: "Lista",
  NUMERO: "Número",
  TEXTO: "Texto",
};

export function ProductTypeAssociatePage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return (
      <FeedbackAlert semantic="error" title="Tipo de producto no encontrado">
        La dirección no incluye un tipo de producto.
      </FeedbackAlert>
    );
  }
  return <ProductTypeAssociateContent key={id} id={id} />;
}

function ProductTypeAssociateContent({ id }: { id: string }) {
  const navigate = useNavigate();
  const { state: estadoDisponibles } = useCaracteristicasDisponibles(id);
  const asociar = useAsociarCaracteristica(id, () =>
    navigate(`/tipos-producto/${id}`),
  );
  const [caracteristicaId, setCaracteristicaId] = useState<string | null>(null);
  const [condicion, setCondicion] = useState<"obligatoria" | "opcional">(
    "obligatoria",
  );
  const [validacion, setValidacion] = useState<string | null>(null);

  const cargandoDisponibles = estadoDisponibles.status === "loading";
  const errorDisponibles = estadoDisponibles.status === "error";
  const exitosoDisponibles = estadoDisponibles.status === "success";

  const opciones =
    estadoDisponibles.status === "success"
      ? estadoDisponibles.items.map((item) => ({
          value: item.id,
          label: `${item.nombre} — ${tipoLabel[item.tipo]}${
            item.tipo === "NUMERO" && item.unidad ? ` (${item.unidad})` : ""
          }`,
        }))
      : [];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caracteristicaId) {
      setValidacion("Selecciona una característica activa para asociar.");
      return;
    }
    setValidacion(null);
    asociar.enviar(caracteristicaId, condicion === "obligatoria");
  };

  return (
    <>
      <PageHeader
        title="Asociar característica"
        description="Selecciona una característica activa no asociada y define su condición."
        breadcrumbs={[
          { label: "Catálogo", to: "/tipos-producto" },
          { label: "Tipos de producto", to: "/tipos-producto" },
          { label: id, to: `/tipos-producto/${id}` },
          { label: "Asociar" },
        ]}
      />
      <Stack gap="lg">
        {asociar.state.status === "error" && (
          <FeedbackAlert
            semantic="error"
            title="No se pudo asociar la característica"
            actions={
              <Button variant="outline" onClick={asociar.reiniciar}>
                Cerrar
              </Button>
            }
          >
            {asociar.state.message}
          </FeedbackAlert>
        )}

        {cargandoDisponibles && (
          <Group gap="sm" role="status">
            <Loader size="sm" />
            <Text size="sm">Cargando características disponibles…</Text>
          </Group>
        )}

        {errorDisponibles && (
          <FeedbackAlert
            semantic="error"
            title="No se pudieron cargar las características"
            actions={
              <Button
                variant="outline"
                onClick={() => navigate(`/tipos-producto/${id}`)}
              >
                Volver al detalle
              </Button>
            }
          >
            {estadoDisponibles.message}
          </FeedbackAlert>
        )}

        {exitosoDisponibles && estadoDisponibles.items.length === 0 && (
          <FeedbackAlert
            semantic="warning"
            title="Sin características activas disponibles"
            actions={
              <Button
                variant="outline"
                onClick={() => navigate(`/tipos-producto/${id}`)}
              >
                Volver al detalle
              </Button>
            }
          >
            No hay características activas que aún no estén asociadas a este
            tipo de producto.
          </FeedbackAlert>
        )}

        {exitosoDisponibles && estadoDisponibles.items.length > 0 && (
          <SectionCard
            title="Asociar característica al tipo de producto"
            description="Solo se muestran características activas que aún no están asociadas."
          >
            <form onSubmit={handleSubmit} noValidate>
              <Stack gap="md">
                <Select
                  label="Característica activa"
                  placeholder="Selecciona una característica"
                  data={opciones}
                  value={caracteristicaId}
                  onChange={(value) => setCaracteristicaId(value)}
                  error={validacion}
                  withAsterisk
                  disabled={asociar.state.status === "enviando"}
                />
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    Condición
                  </Text>
                  <Radio.Group
                    value={condicion}
                    onChange={(value) =>
                      setCondicion(value as "obligatoria" | "opcional")
                    }
                  >
                    <Stack gap="xs">
                      <Radio
                        value="obligatoria"
                        label="Obligatoria"
                        description="Se exigirá al volver a guardar o activar los productos que correspondan."
                      />
                      <Radio value="opcional" label="Opcional" />
                    </Stack>
                  </Radio.Group>
                </Stack>
                <Group justify="flex-end" gap="sm">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/tipos-producto/${id}`)}
                    disabled={asociar.state.status === "enviando"}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    loading={asociar.state.status === "enviando"}
                  >
                    Asociar
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
