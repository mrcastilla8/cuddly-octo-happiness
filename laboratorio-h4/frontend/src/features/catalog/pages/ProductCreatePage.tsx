import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Group, Stack } from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import {
  ConfirmDialog,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { useProductForm } from "../hooks/useProductForm";
import { ProductFormFields } from "../components/ProductFormFields";
import { readCatalogScenario } from "../services/catalogPresentation";

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scenario = readCatalogScenario(params);
  const [cancelModalOpened, setCancelModalOpened] = useState(false);

  const {
    formData,
    updateField,
    updateAttribute,
    errors,
    generalError,
    submitting,
    isDirty,
    categories,
    brands,
    productTypes,
    attributeSchema,
    schemaLoading,
    schemaError,
    schemaConfirmed,
    loadingMasters,
    retrySchema,
    handleSubmit,
  } = useProductForm({
    scenario,
    onSuccess: (created) => {
      // FLOW-003 §4.1: On 201 BORRADOR success, navigate immediately to S06 preparation!
      navigate(`/productos/${created.id}/preparacion`, {
        state: { justCreated: true },
      });
    },
  });

  const handleCancelClick = () => {
    if (isDirty) {
      setCancelModalOpened(true);
    } else {
      navigate("/productos");
    }
  };

  return (
    <Stack gap="xl">
      <PageHeader
        title="Crear producto"
        description="Ingresa los datos mínimos para guardar el producto en BORRADOR. La preparación de precio e inventario se inicia automáticamente al guardar."
        breadcrumbs={[
          { label: "Inicio", to: "/precios" },
          { label: "Catálogo", to: "/productos" },
          { label: "Productos", to: "/productos" },
          { label: "Crear producto" },
        ]}
      />

      {generalError && (
        <FeedbackAlert semantic="error" title="No se pudo guardar el borrador">
          {generalError}
        </FeedbackAlert>
      )}

      {schemaLoading && <FeedbackAlert semantic="info" title="Cargando esquema">Confirmando las características de Taxonomía…</FeedbackAlert>}
      {schemaError && <FeedbackAlert semantic="error" title="Esquema no disponible">{schemaError}<Button onClick={retrySchema} variant="subtle">Reintentar esquema</Button></FeedbackAlert>}
      <form noValidate onSubmit={handleSubmit}>
        <Stack gap="xl">
          <ProductFormFields
            formData={formData}
            updateField={updateField}
            updateAttribute={updateAttribute}
            errors={errors}
            categories={categories}
            brands={brands}
            productTypes={productTypes}
            attributeSchema={attributeSchema}
            schemaConfirmed={schemaConfirmed}
            isEdit={false}
          />

          <Group justify="flex-start" gap="md" mt="md">
            <Button
              type="submit"
              loading={submitting}
              disabled={!schemaConfirmed || loadingMasters}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={submitting}
              leftSection={<IconX size={16} />}
            >
              Cancelar
            </Button>
          </Group>
        </Stack>
      </form>

      <ConfirmDialog
        opened={cancelModalOpened}
        title="Descartar cambios no guardados"
        confirmLabel="Descartar y salir"
        destructive
        onCancel={() => setCancelModalOpened(false)}
        onConfirm={() => {
          setCancelModalOpened(false);
          navigate("/productos");
        }}
      >
        Tienes cambios en el formulario que aún no has guardado. Si sales ahora, la información ingresada se perderá.
      </ConfirmDialog>
    </Stack>
  );
}
