import { Alert, Badge, Group, List, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconInfoCircle } from "@tabler/icons-react";
import { ConfirmDialog, FeedbackAlert } from "../../../components/shared";
import type {
  ProductDetailView,
  VariantDetailView,
} from "../services/catalogRepository";
import { formatIdentifyingAttributes } from "../services/catalogPresentation";
import { useVariantStateMutation } from "../hooks/useVariantStateMutation";

interface VariantReactivationDialogProps {
  product: ProductDetailView;
  variant: VariantDetailView;
  opened: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  scenario?: string;
}

export function VariantReactivationDialog({
  product,
  variant,
  opened,
  onCancel,
  onSuccess,
  scenario,
}: VariantReactivationDialogProps) {
  const { loading, error, reactivate, clearError } = useVariantStateMutation();

  const handleConfirm = async () => {
    try {
      await reactivate(product.id, variant.variantId, scenario);
      onSuccess();
    } catch {
      // Error handled in hook state
    }
  };

  const handleClose = () => {
    clearError();
    onCancel();
  };

  const hasCompletePhysical = Boolean(
    variant.physicalProfile?.pesoKg &&
      variant.physicalProfile?.largoCm &&
      variant.physicalProfile?.anchoCm &&
      variant.physicalProfile?.altoCm,
  );
  const inventoryCompleted = variant.inventoryStatus === "COMPLETED";

  return (
    <ConfirmDialog
      opened={opened}
      title="Reactivar Variante (SKU)"
      confirmLabel="Reactivar Variante"
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
          La variante pasará a estado <strong>ACTIVA</strong> conservando su SKU, variantId e historial.
        </Text>

        <div>
          <Text size="xs" fw={600} mb="xs">
            Validación de Requisitos de Reactivación:
          </Text>
          <List
            size="xs"
            spacing="xs"
            icon={
              <ThemeIcon color="teal" size={18} radius="xl">
                <IconCheck size={12} />
              </ThemeIcon>
            }
          >
            <List.Item>Identidad y combinación de atributos válidas e inmutables.</List.Item>
            <List.Item>
              Perfil físico completo en kg/cm:{" "}
              {hasCompletePhysical ? (
                <Text span c="teal" fw={600}>
                  Completo
                </Text>
              ) : (
                <Text span c="red" fw={600}>
                  Incompleto
                </Text>
              )}
            </List.Item>
            <List.Item>
              Preparación de Inventario:{" "}
              {inventoryCompleted ? (
                <Text span c="teal" fw={600}>
                  COMPLETED
                </Text>
              ) : (
                <Text span c="orange" fw={600}>
                  {variant.inventoryStatus}
                </Text>
              )}
            </List.Item>
          </List>
        </div>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" p="xs">
          <Text size="xs">
            <strong>Independencia del Padre:</strong> Reactivar esta variante <strong>no reactiva</strong>{" "}
            automáticamente al producto padre si este se encuentra INACTIVO o BORRADOR. El padre debe activarse
            por separado cuando cumpla sus condiciones.
          </Text>
        </Alert>

        {error && (
          <FeedbackAlert semantic="error" title="No se pudo reactivar la variante">
            {error}
          </FeedbackAlert>
        )}
      </Stack>
    </ConfirmDialog>
  );
}
