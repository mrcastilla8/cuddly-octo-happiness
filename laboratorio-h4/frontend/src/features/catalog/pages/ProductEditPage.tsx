import { useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { Button, Group, Loader, Stack, Text } from "@mantine/core";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import {
  ConfirmDialog,
  FeedbackAlert,
  PageHeader,
} from "../../../components/shared";
import { useProductDetail } from "../hooks/useProductDetail";
import { CatalogReadError } from "../components/CatalogReadError";
import { useProductForm } from "../hooks/useProductForm";
import { ProductFormFields } from "../components/ProductFormFields";
import { readCatalogScenario } from "../services/catalogPresentation";

export function ProductEditPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scenario = readCatalogScenario(params);

  const detailState = useProductDetail(productId || "", scenario);

  if (detailState.status === "loading") {
    return (
      <Stack align="center" justify="center" py={80}>
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Cargando datos del producto...
        </Text>
      </Stack>
    );
  }

  if (["error", "forbidden", "session"].includes(detailState.status)) return <CatalogReadError error={detailState.error} />;

  if (detailState.status === "not_found" || !detailState.product) {
    return (
      <Stack gap="xl">
        <PageHeader
          title="Producto no encontrado"
          breadcrumbs={[
            { label: "Inicio", to: "/precios" },
            { label: "Catálogo", to: "/productos" },
            { label: "Productos", to: "/productos" },
            { label: "No encontrado" },
          ]}
        />
        <FeedbackAlert semantic="error" title="404 - Producto inexistente">
          El producto solicitado no existe o fue dado de baja.
        </FeedbackAlert>
        <Button component={Link} to="/productos" variant="outline" w="fit-content">
          Volver al listado de productos
        </Button>
      </Stack>
    );
  }

  return (
    <ProductEditFormContent
      product={detailState.product}
      scenario={scenario}
      onNavigateBack={() => navigate(`/productos/${detailState.product?.id}`)}
    />
  );
}

function ProductEditFormContent({
  product,
  scenario,
  onNavigateBack,
}: {
  product: NonNullable<ReturnType<typeof useProductDetail>["product"]>;
  scenario?: string;
  onNavigateBack: () => void;
}) {
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
    initialProduct: product,
    scenario,
    onSuccess: () => {
      onNavigateBack();
    },
  });

  const handleCancelClick = () => {
    if (isDirty) {
      setCancelModalOpened(true);
    } else {
      onNavigateBack();
    }
  };

  return (
    <Stack gap="xl">
      <PageHeader
        title={`Editar: ${product.name}`}
        description="Modifica los campos descriptivos y características autorizadas. El SKU base y modelo de venta permanecen inmutables."
        breadcrumbs={[
          { label: "Inicio", to: "/precios" },
          { label: "Catálogo", to: "/productos" },
          { label: "Productos", to: "/productos" },
          { label: product.name, to: `/productos/${product.id}` },
          { label: "Editar producto" },
        ]}
      />

      {generalError && (
        <FeedbackAlert semantic="error" title="No se pudieron guardar los cambios">
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
            isEdit={true}
            initialProduct={product}
          />

          <Group justify="flex-start" gap="md" mt="md">
            <Button
              type="submit"
              loading={submitting}
              disabled={!schemaConfirmed || loadingMasters}
              leftSection={<IconDeviceFloppy size={16} />}
            >
              Guardar cambios
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
        confirmLabel="Descartar y volver"
        destructive
        onCancel={() => setCancelModalOpened(false)}
        onConfirm={() => {
          setCancelModalOpened(false);
          onNavigateBack();
        }}
      >
        Tienes modificaciones pendientes que no han sido guardadas. Si continúas, se descartarán todos los cambios.
      </ConfirmDialog>
    </Stack>
  );
}
