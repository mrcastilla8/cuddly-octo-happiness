import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Group, Stack, TextInput } from "@mantine/core";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
} from "../../../components/shared";
import { productTypeService } from "../services/productTypeService";

export function ProductTypeCreatePage() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      setError("Ingresa el nombre del tipo de producto.");
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      const resultado = await productTypeService.crear(
        { nombre: limpio },
        new AbortController().signal,
      );
      setCreado(true);
      navigate(`/tipos-producto/${resultado.tipoProductoId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el tipo de producto.",
      );
      setGuardando(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Nuevo tipo de producto"
        description="Crea un tipo para definir su esquema de atributos."
        breadcrumbs={[
          { label: "Catálogo", to: "/tipos-producto" },
          { label: "Tipos de producto", to: "/tipos-producto" },
          { label: "Nuevo" },
        ]}
      />
      <Stack gap="lg">
        {error && (
          <FeedbackAlert semantic="error" title="No se pudo crear el tipo de producto">
            {error}
          </FeedbackAlert>
        )}
        <SectionCard
          title="Datos del tipo de producto"
          description="El identificador se genera internamente."
        >
          <form onSubmit={handleSubmit} noValidate>
            <Stack gap="md">
              <TextInput
                label="Nombre"
                withAsterisk
                value={nombre}
                error={error}
                placeholder="Ej. Equipamiento outdoor"
                onChange={(event) => setNombre(event.currentTarget.value)}
                disabled={guardando || creado}
              />
              <Group justify="flex-end" gap="sm">
                <Button
                  variant="outline"
                  onClick={() => navigate("/tipos-producto")}
                  disabled={guardando || creado}
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={guardando} disabled={creado}>
                  Crear tipo de producto
                </Button>
              </Group>
            </Stack>
          </form>
        </SectionCard>
      </Stack>
    </>
  );
}
