import { Link, useNavigate, useParams } from "react-router-dom";
import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { FeedbackAlert, PageHeader } from "../../../components/shared";
import { useVariantDetail } from "../hooks/useVariantDetail";
import { useVariantForm } from "../hooks/useVariantForm";
import { VariantFormFields } from "../components/VariantFormFields";

export function VariantEditPage() {
  const { productId, variantId } = useParams<{ productId: string; variantId: string }>();
  const navigate = useNavigate();

  const { product, variant, loading, error } = useVariantDetail(productId, variantId);

  if (loading) {
    return (
      <Box p="lg">
        <Text size="sm" c="dimmed">
          Cargando variante para edición...
        </Text>
      </Box>
    );
  }

  if (error || !product || !variant) {
    return (
      <Box p="lg">
        <FeedbackAlert semantic="error" title="No se pudo cargar la variante">
          {error || "Variante o producto inexistente."}
        </FeedbackAlert>
        <Button
          component={Link}
          to={`/productos/${productId}/variantes`}
          mt="md"
          variant="subtle"
        >
          ← Volver a Variantes
        </Button>
      </Box>
    );
  }

  return (
    <VariantEditContent
      productId={productId!}
      variantId={variantId!}
      product={product}
      variant={variant}
      onNavigateBack={() => navigate(`/productos/${productId}/variantes/${variantId}`)}
    />
  );
}

interface VariantEditContentProps {
  productId: string;
  variantId: string;
  product: NonNullable<ReturnType<typeof useVariantDetail>["product"]>;
  variant: NonNullable<ReturnType<typeof useVariantDetail>["variant"]>;
  onNavigateBack: () => void;
}

function VariantEditContent({
  productId,
  variantId,
  product,
  variant,
  onNavigateBack,
}: VariantEditContentProps) {
  const form = useVariantForm({
    parentProduct: product,
    initialVariant: variant,
    onSuccess: onNavigateBack,
  });

  return (
    <Box p="lg">
      <form onSubmit={form.handleSubmit}>
        <PageHeader
          title={`Editar Variante: ${variant.sku}`}
          breadcrumbs={[
            { label: "Catálogo", to: "/productos" },
            { label: product.name, to: `/productos/${productId}` },
            { label: "Variantes", to: `/productos/${productId}/variantes` },
            { label: variant.sku, to: `/productos/${productId}/variantes/${variantId}` },
            { label: "Editar" },
          ]}
          actions={
            <Group gap="xs">
              <Button
                component={Link}
                to={`/productos/${productId}/variantes/${variantId}`}
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={form.submitting}
                disabled={form.schemaLoading || Boolean(form.schemaError)}
                leftSection={<IconCheck size={16} />}
              >
                Guardar Cambios
              </Button>
            </Group>
          }
        />

        {form.generalError && (
          <Box mb="md">
            <FeedbackAlert semantic="error" title="No se pudo actualizar la variante">
              {form.generalError}
            </FeedbackAlert>
          </Box>
        )}

        <Stack gap="lg" mt="md">
          <VariantFormFields form={form} parentProduct={product} />

          <Group justify="flex-end" gap="xs">
            <Button
              component={Link}
              to={`/productos/${productId}/variantes/${variantId}`}
              variant="subtle"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={form.submitting}>
              Guardar Cambios
            </Button>
          </Group>
        </Stack>
      </form>
    </Box>
  );
}
