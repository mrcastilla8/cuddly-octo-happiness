import { Alert, Badge, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ConfirmDialog, FeedbackAlert } from "../../../components/shared";
import type {
  ProductDetailView,
  VariantDetailView,
} from "../services/catalogRepository";
import { formatIdentifyingAttributes } from "../services/catalogPresentation";
import { useVariantStateMutation } from "../hooks/useVariantStateMutation";

interface VariantDeactivationDialogProps {
  product: ProductDetailView;
  variant: VariantDetailView;
  opened: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  scenario?: string;
}

export function VariantDeactivationDialog({
  product,
  variant,
  opened,
  onCancel,
  onSuccess,
  scenario,
}: VariantDeactivationDialogProps) {
  const { loading, error, deactivate, clearError } = useVariantStateMutation();

  // Check if this variant is the only active one in the product's variants list
  const activeVariantsCount = product.variants.filter((v) => v.status === "ACTIVA").length;
  const isLastActive = activeVariantsCount <= 1 && variant.status === "ACTIVA";
  const parentIsActive = product.status === "ACTIVO";

  const handleConfirm = async () => {
    try {
      await deactivate(product.id, variant.variantId, scenario);
      onSuccess();
    } catch {
      // Error is stored in mutation state
    }
  };

  const handleClose = () => {
    clearError();
    onCancel();
  };

  return (
    <ConfirmDialog
      opened={opened}
      title="Desactivar Variante (SKU)"
      confirmLabel="Desactivar Variante"
      destructive
      submitting={loading}
      onCancel={handleClose}
      onConfirm={handleConfirm}
    >
      <Stack gap="md">
        <div>
          <Group justify="space-between" align="baseline">
            <Text size="sm" fw={600}>
              SKU: {variant.sku}
            </Text>
            <Badge size="xs" variant="filled" color="dark">
              {formatIdentifyingAttributes(variant.identifyingAttributes)}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed" mt={2}>
            Producto Padre: <strong>{product.name}</strong> ({product.skuBase ?? "Sin SKU base"})
          </Text>
        </div>

        <Text size="xs" c="dimmed">
          La variante pasará a estado <strong>INACTIVA</strong> y dejará de estar disponible para la venta comercial.
        </Text>

        {isLastActive && parentIsActive ? (
          <Alert icon={<IconAlertTriangle size={18} />} color="orange" variant="light" p="xs">
            <Text size="xs" fw={600} c="orange.9">
              Impacto Crítico en Producto Padre (FLOW-004 §4.4)
            </Text>
            <Text size="xs" mt={2}>
              Esta es la <strong>última variante activa</strong> del producto. Al desactivarla, el producto padre{" "}
              <strong>{product.name}</strong> pasará automáticamente a estado <strong>INACTIVO</strong> en el Catálogo.
            </Text>
          </Alert>
        ) : (
          <Alert icon={<IconAlertTriangle size={16} />} color="gray" variant="light" p="xs">
            <Text size="xs">
              Esta acción es una <strong>baja lógica</strong>: no se eliminan físicamente registros, inventarios ni historiales.
            </Text>
          </Alert>
        )}

        {error && (
          <FeedbackAlert semantic="error" title="No se pudo desactivar la variante">
            {error}
          </FeedbackAlert>
        )}
      </Stack>
    </ConfirmDialog>
  );
}
