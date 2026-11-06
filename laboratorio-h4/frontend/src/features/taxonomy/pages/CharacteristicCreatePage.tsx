import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Group, Select, Stack, TextInput } from "@mantine/core";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
} from "../../../components/shared";
import { useCreateCharacteristic } from "../hooks/useCreateCharacteristic";
import { characteristicConfigDefaults } from "../services/characteristicRepository";
import {
  describirReglaTipo,
  etiquetaTipoCaracteristica,
} from "../services/characteristicPresentation";
import type {
  CharacteristicStatus,
  CharacteristicType,
} from "../types";

const tipos: { value: CharacteristicType; label: string }[] = [
  { value: "TEXTO", label: "Texto" },
  { value: "NUMERO", label: "Número" },
  { value: "LISTA", label: "Lista" },
];

const estados: { value: CharacteristicStatus; label: string }[] = [
  { value: "Activo", label: "Activo" },
  { value: "Inactivo", label: "Inactivo" },
];

export function CharacteristicCreatePage() {
  const navigate = useNavigate();

  const { phase, error, creado, crear, reiniciar } = useCreateCharacteristic();

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<CharacteristicType>("TEXTO");
  const [unidad, setUnidad] = useState("");
  const [estado, setEstado] = useState<CharacteristicStatus>("Activo");
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [unidadError, setUnidadError] = useState<string | null>(null);

  const reiniciarFormulario = () => {
    setNombre("");
    setTipo("TEXTO");
    setUnidad("");
    setEstado("Activo");
    setNombreError(null);
    setUnidadError(null);
    reiniciar();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nombreLimpio = nombre.trim();
    const unidadLimpia = unidad.trim();
    const nombreValido = nombreLimpio !== "";
    const unidadValida = tipo !== "NUMERO" || unidadLimpia !== "";

    setNombreError(
      nombreValido ? null : "Ingresa el nombre de la característica.",
    );
    setUnidadError(
      unidadValida ? null : "Ingresa la unidad (por ejemplo kg o cm).",
    );

    if (!nombreValido || !unidadValida) return;

    crear({
      nombre: nombreLimpio,
      tipo,
      estado,
      unidad: tipo === "NUMERO" ? unidadLimpia : undefined,
    });
  };

  const guardando = phase === "guardando";

  return (
    <>
      <PageHeader
        title="Crear característica"
        description="Registra un atributo tipado para los esquemas definidos por tipo de producto."
        breadcrumbs={[
          { label: "Características", to: "/caracteristicas" },
          { label: "Crear" },
        ]}
      />
      <Stack gap="lg">
        {creado ? (
          <FeedbackAlert
            semantic="success"
            title="Característica creada"
            actions={
              <Group gap="sm">
                <Button onClick={() => navigate("/caracteristicas")}>
                  Volver al listado
                </Button>
                <Button variant="outline" onClick={reiniciarFormulario}>
                  Crear otra característica
                </Button>
              </Group>
            }
          >
            {`Se creó «${creado.nombre}» de tipo ${etiquetaTipoCaracteristica[creado.tipo]}.`}
          </FeedbackAlert>
        ) : (
          <>
            <SectionCard
              title="Datos de la característica"
              description="El tipo se define al crear la característica y no puede cambiarse después."
            >
              <form onSubmit={handleSubmit} noValidate>
                <Stack gap="md">
                  <TextInput
                    label="Nombre"
                    withAsterisk
                    value={nombre}
                    error={nombreError}
                    placeholder="Ej. Talla"
                    disabled={guardando}
                    onChange={(event) =>
                      setNombre(event.currentTarget.value)
                    }
                  />
                  <Select
                    label="Tipo"
                    withAsterisk
                    data={tipos}
                    value={tipo}
                    allowDeselect={false}
                    disabled={guardando}
                    onChange={(value) => {
                      const opcion = tipos.find((item) => item.value === value);
                      if (!opcion) return;
                      setTipo(opcion.value);
                      setUnidad("");
                      setUnidadError(null);
                    }}
                  />
                  {tipo === "NUMERO" && (
                    <TextInput
                      label="Unidad"
                      withAsterisk
                      value={unidad}
                      error={unidadError}
                      placeholder="Ej. kg, cm"
                      disabled={guardando}
                      onChange={(event) =>
                        setUnidad(event.currentTarget.value)
                      }
                    />
                  )}
                  <Select
                    label="Estado inicial"
                    data={estados}
                    value={estado}
                    allowDeselect={false}
                    disabled={guardando}
                    onChange={(value) => {
                      const opcion = estados.find(
                        (item) => item.value === value,
                      );
                      if (!opcion) return;
                      setEstado(opcion.value);
                    }}
                  />
                  <FeedbackAlert
                    semantic="info"
                    title="Regla del tipo seleccionado"
                  >
                    {describirReglaTipo(tipo, characteristicConfigDefaults)}
                  </FeedbackAlert>
                  {error && (
                    <FeedbackAlert
                      semantic="error"
                      title="No se pudo crear la característica"
                    >
                      {error}
                    </FeedbackAlert>
                  )}
                  <Group justify="flex-end" gap="sm">
                    <Button
                      variant="outline"
                      disabled={guardando}
                      onClick={() => navigate("/caracteristicas")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" loading={guardando}>
                      Crear característica
                    </Button>
                  </Group>
                </Stack>
              </form>
            </SectionCard>
          </>
        )}
      </Stack>
    </>
  );
}
