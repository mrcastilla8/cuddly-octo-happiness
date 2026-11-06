import { Alert, Badge, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { ConfirmDialog, FeedbackAlert } from "../../../components/shared";
import type { ProductDetailView } from "../services/catalogRepository";
import { useProductStateMutation } from "../hooks/useProductStateMutation";

interface ProductDeactivationDialogProps {
  product: ProductDetailView;
  opened: boolean;
  onCancel: () => void;
  onSuccess: (updated: ProductDetailView) => void;
  scenario?: string;
}

export function ProductDeactivationDialog({
  product,
  opened,
  onCancel,
  onSuccess,
  scenario,
}: ProductDeactivationDialogProps) {
  const {
    submitting,
    reconciling,
    error,
    isUnknownError,
    deactivate,
    reconcile,
    clearError,
  } = useProductStateMutation();

  const handleConfirm = async () => {
    if (isUnknownError) {
      const ok = await reconcile(product.id, "INACTIVO");
      if (ok) {
        onSuccess({ ...product, status: "INACTIVO" });
      }
      return;
    }

    const res = await deactivate(product.id, scenario);
    if (res) {
      onSuccess(res);
    }
  };

  const handleClose = () => {
    clearError();
    onCancel();
  };

  return (
    <ConfirmDialog
      opened={opened}
      title="Desactivar Producto"
      confirmLabel={isUnknownError ? "Consultar estado" : "Desactivar Producto"}
      destructive
      submitting={submitting || reconciling}
      onCancel={handleClose}
      onConfirm={handleConfirm}
    >
      <Stack gap="md">
        <div>
          <Text size="sm" fw={600}>
            {product.name}
          </Text>
          <Group gap="xs" mt={2}>
            <Text size="xs" c="dimmed">
              SKU Base: <strong>{product.skuBase ?? "Sin SKU base"}</strong>
            </Text>
            <Badge size="xs" variant="outline" color="gray">
              {product.hasVariants ? "Con variantes" : "Simple"}
            </Badge>
          </Group>
        </div>

        <Text size="xs" c="dimmed">
          El producto pasará a estado <strong>INACTIVO</strong> y dejará de ofrecerse en los canales comerciales.
        </Text>

        <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light" p="xs">
          <Text size="xs">
            Esta acción es una <strong>baja lógica</strong>: no se eliminan físicamente registros, precios ni inventarios históricos.
            {product.hasVariants &&
              " Sus variantes conservan su estado individual, pero dejan de ofrecerse mientras el producto padre permanezca inactivo."}
          </Text>
        </Alert>

        {error && (
          <FeedbackAlert semantic="error" title="No se pudo desactivar el producto">
            {error}
          </FeedbackAlert>
        )}
      </Stack>
    </ConfirmDialog>
  );
}
