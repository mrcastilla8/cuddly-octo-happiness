import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  ConfirmDialog,
  FeedbackAlert,
  PageHeader,
  SectionCard,
} from "../../../components/shared";
import { SufijoResaltado } from "../components/SufijoResaltado";
import { useCategoryTree } from "../hooks/useCategoryTree";
import { useCreateCategory } from "../hooks/useCreateCategory";

// MK-008-S02: crear categoría en `/categorias/nueva`.
// MK-008-S02-C: confirmación de slug SEO (mismo flujo; ruta `/categorias/confirmar-slug`).
export function CreateCategoryPage() {
  const navigate = useNavigate();
  const { state: treeState } = useCategoryTree();

  const { phase, slugCheck, slug, error, creado, setSlug, comprobar, confirmar, cerrar } =
    useCreateCategory();

  const [nombre, setNombre] = useState("");
  const [padreId, setPadreId] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [nombreError, setNombreError] = useState<string | null>(null);

  const padres = useMemo(
    () =>
      treeState.status === "success"
        ? treeState.nodos.map((nodo) => ({
            value: nodo.id,
            label: nodo.nombre,
          }))
        : [],
    [treeState],
  );

  const modalAbierto =
    phase === "comprobando" || phase === "confirmando" || phase === "guardando";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) {
      setNombreError("Ingresa el nombre de la categoría.");
      return;
    }
    setNombreError(null);
    comprobar(limpio);
  };

  const handleConfirmar = () => {
    if (
      !slugCheck || phase !== "confirmando"
    ) {
      return;
    }
    confirmar({
      nombre: nombre.trim(),
      slug: slug.trim(),
      padreId: padreId ?? undefined,
      descripcion: descripcion.trim() || undefined,
    });
  };

  const reiniciar = () => {
    setNombre("");
    setPadreId(null);
    setDescripcion("");
    setNombreError(null);
    cerrar();
  };

  return (
    <>
      <PageHeader
        title="Crear categoría"
        description="Registra una nueva categoría o subcategoría en la taxonomía de productos."
        breadcrumbs={[
          { label: "Categorías", to: "/categorias" },
          { label: "Crear" },
        ]}
      />
      <Stack gap="lg">
        {creado ? (
          <FeedbackAlert
            semantic="success"
            title="Categoría creada"
            actions={
              <Group gap="sm">
                <Button onClick={() => navigate(`/categorias/${creado.id}`)}>
                  Ver categoría
                </Button>
                <Button variant="outline" onClick={() => navigate("/categorias")}>
                  Volver al árbol de categorías
                </Button>
                <Button variant="subtle" onClick={reiniciar}>
                  Crear otra categoría
                </Button>
              </Group>
            }
          >
            {`Se creó «${creado.nombre}» con el slug «${creado.slug}».`}
          </FeedbackAlert>
        ) : (
          <>
            <SectionCard
              title="Datos de la categoría"
              description="El slug de la URL se propone a partir del nombre y se confirma en el siguiente paso."
            >
              <form onSubmit={handleSubmit} noValidate>
                <Stack gap="md">
                  <TextInput
                    label="Nombre"
                    withAsterisk
                    value={nombre}
                    error={nombreError}
                    placeholder="Ej. Calzado urbano"
                    disabled={phase === "comprobando"}
                    onChange={(event) => setNombre(event.currentTarget.value)}
                  />
                  <Select
                    label="Categoría padre (opcional)"
                    placeholder="Categoría raíz"
                    data={padres}
                    value={padreId}
                    clearable
                    searchable
                    nothingFoundMessage="Sin categorías disponibles"
                    disabled={phase === "comprobando"}
                    onChange={(value) => setPadreId(value)}
                  />
                  <Textarea
                    label="Descripción (opcional)"
                    value={descripcion}
                    autosize
                    minRows={3}
                    disabled={phase === "comprobando"}
                    onChange={(event) => setDescripcion(event.currentTarget.value)}
                  />
                  <Group justify="flex-end" gap="sm">
                    <Button
                      variant="outline"
                      disabled={phase === "comprobando"}
                      onClick={() => navigate("/categorias")}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" loading={phase === "comprobando"}>
                      Crear categoría
                    </Button>
                  </Group>
                </Stack>
              </form>
            </SectionCard>
          </>
        )}
      </Stack>

      <ConfirmDialog
        opened={modalAbierto}
        title="Confirmar slug SEO"
        confirmLabel="Crear categoría"
        submitting={phase === "guardando"}
        confirmDisabled={phase !== "confirmando" || !slugCheck}
        onCancel={cerrar}
        onConfirm={handleConfirmar}
        error={
          error ? (
            <FeedbackAlert semantic="error" title="No se pudo crear la categoría">
              {error}
            </FeedbackAlert>
          ) : undefined
        }
      >
        <Stack gap="md">
          {phase === "comprobando" ? (
            <Text size="sm" role="status">
              Verificando disponibilidad del slug…
            </Text>
          ) : (
            <>
              <Text size="sm" c="dimmed">
                El slug define la URL pública de la categoría. Confírmalo antes
                de crear.
              </Text>
              {slugCheck && !slugCheck.disponible && (
                <FeedbackAlert
                  semantic="warning"
                  title="El slug ya está en uso"
                  actions={
                    slugCheck.alternativo ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (slugCheck.alternativo) setSlug(slugCheck.alternativo);
                        }}
                      >
                        Usar alternativa
                      </Button>
                    ) : undefined
                  }
                >
                  <Text size="sm" component="span">
                    Sugerencia:{" "}
                  </Text>
                  {slugCheck.alternativo ? (
                    <SufijoResaltado
                      base={slugCheck.slug}
                      completo={slugCheck.alternativo}
                    />
                  ) : null}
                </FeedbackAlert>
              )}
              <TextInput
                label="Slug (URL)"
                value={slug}
                disabled={phase === "guardando"}
                onChange={(event) => setSlug(event.currentTarget.value)}
              />
            </>
          )}
        </Stack>
      </ConfirmDialog>
    </>
  );
}
