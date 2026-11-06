import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, Button, Group, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";
import { FeedbackAlert, PageHeader } from "../../../components/shared";
import { useVariantForm } from "../hooks/useVariantForm";
import { VariantFormFields } from "../components/VariantFormFields";
import { useCatalogServices } from "../hooks/useCatalogServices";
import type { ProductDetailView } from "../services/catalogRepository";
import { readCatalogScenario } from "../services/catalogPresentation";

export function VariantCreatePage() {
  const { productId } = useParams<{ productId: string }>();
  return <VariantCreateForProduct key={productId} productId={productId} />;
}

function VariantCreateForProduct({ productId }: { productId?: string }) {
  const [searchParams] = useSearchParams();
  const scenario = readCatalogScenario(searchParams);
  const navigate = useNavigate();
  const { catalog: catalogService } = useCatalogServices();

  const [parentProduct, setParentProduct] = useState<ProductDetailView | null>(null);
  const [loading, setLoading] = useState(Boolean(productId));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    catalogService
      .getById(productId, scenario)
      .then((p) => {
        if (!active) return;
        setParentProduct(p);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err.message || "Error al cargar el producto padre.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, scenario, catalogService]);

  const form = useVariantForm({
    parentProduct,
    scenario,
    onSuccess: (created) => {
      // Per SPEC-004 / FLOW-004: Created variant in BORRADOR navigates to S04 preparation
      navigate(`/productos/${productId}/variantes/${created.variantId}/preparacion`);
    },
  });

  if (loading) {
    return (
      <Box p="lg">
        <Text size="sm" c="dimmed">
          Cargando producto padre...
        </Text>
      </Box>
    );
  }

  if (loadError || !parentProduct) {
    return (
      <Box p="lg">
        <FeedbackAlert semantic="error" title="No se pudo cargar el producto padre">
          {loadError || "Producto inexistente."}
        </FeedbackAlert>
        <Button component={Link} to="/productos" mt="md" variant="subtle">
          ← Volver a Productos
        </Button>
      </Box>
    );
  }

  if (!parentProduct.hasVariants) {
    return (
      <Box p="lg">
        <FeedbackAlert
          semantic="warning"
          title="Incompatible con Variantes"
        >
          El producto {parentProduct.name} es un producto simple (tieneVariantes = false) y no
          admite la creación de variantes (SPEC-004 CA-01).
        </FeedbackAlert>
        <Button
          component={Link}
          to={`/productos/${productId}`}
          mt="md"
          variant="subtle"
        >
          ← Volver a Detalle del Producto
        </Button>
      </Box>
    );
  }

  return (
    <Box p="lg">
      <form noValidate onSubmit={form.handleSubmit}>
        <PageHeader
          title="Nueva Variante (SKU)"
          breadcrumbs={[
            { label: "Catálogo", to: "/productos" },
            { label: parentProduct.name, to: `/productos/${productId}` },
            { label: "Variantes", to: `/productos/${productId}/variantes` },
            { label: "Nueva Variante" },
          ]}
          actions={
            <Group gap="xs">
              <Button
                component={Link}
                to={`/productos/${productId}/variantes`}
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
                Guardar Variante
              </Button>
            </Group>
          }
        />

        {form.generalError && (
          <Box mb="md">
            <FeedbackAlert semantic="error" title="No se pudo crear la variante">
              {form.generalError}
            </FeedbackAlert>
          </Box>
        )}

        <Stack gap="lg" mt="md">
          <VariantFormFields form={form} parentProduct={parentProduct} />

          <Group justify="flex-end" gap="xs">
            <Button
              component={Link}
              to={`/productos/${productId}/variantes`}
              variant="subtle"
            >
              Cancelar
            </Button>
            <Button type="submit" loading={form.submitting} disabled={form.schemaLoading || Boolean(form.schemaError)}>
              Guardar Variante
            </Button>
          </Group>
        </Stack>
      </form>
    </Box>
  );
}
