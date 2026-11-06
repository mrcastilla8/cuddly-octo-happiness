import { Alert, Badge, Group, List, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import { ConfirmDialog, FeedbackAlert } from "../../../components/shared";
import type {
  ProductDetailView,
  VariantDetailView,
} from "../services/catalogRepository";
import { formatIdentifyingAttributes } from "../services/catalogPresentation";
import { useVariantStateMutation } from "../hooks/useVariantStateMutation";

interface VariantActivationDialogProps {
  product: ProductDetailView;
  variant: VariantDetailView;
  opened: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  scenario?: string;
}

export function VariantActivationDialog({
  product,
  variant,
  opened,
  onCancel,
  onSuccess,
  scenario,
}: VariantActivationDialogProps) {
  const { loading, error, activate, clearError } = useVariantStateMutation();

  const handleConfirm = async () => {
    try {
      await activate(product.id, variant.variantId, scenario);
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
  const hasImage = Boolean(variant.imageUrl && variant.imageUrl.trim());
  const allConditionsMet = hasCompletePhysical && inventoryCompleted && hasImage;

  return (
    <ConfirmDialog
      opened={opened}
      title="Activar Variante (SKU)"
      confirmLabel="Activar Variante"
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
          La variante pasará de <strong>BORRADOR</strong> a <strong>ACTIVA</strong>.
        </Text>

        <div>
          <Text size="xs" fw={600} mb="xs">
            Requisitos para activar:
          </Text>
          <List size="xs" spacing="xs">
            <List.Item
              icon={
                <ThemeIcon color="teal" size={18} radius="xl">
                  <IconCheck size={12} />
                </ThemeIcon>
              }
            >
              Atributos identificadores válidos definidos.
            </List.Item>
            <List.Item
              icon={
                hasImage ? (
                  <ThemeIcon color="teal" size={18} radius="xl">
                    <IconCheck size={12} />
                  </ThemeIcon>
                ) : (
                  <ThemeIcon color="red" size={18} radius="xl">
                    <IconX size={12} />
                  </ThemeIcon>
                )
              }
            >
              Imagen asignada:{" "}
              {hasImage ? (
                <Text span c="teal" fw={600}>
                  Configurada
                </Text>
              ) : (
                <Text span c="red" fw={600}>
                  Pendiente
                </Text>
              )}
            </List.Item>
            <List.Item
              icon={
                hasCompletePhysical ? (
                  <ThemeIcon color="teal" size={18} radius="xl">
                    <IconCheck size={12} />
                  </ThemeIcon>
                ) : (
                  <ThemeIcon color="red" size={18} radius="xl">
                    <IconX size={12} />
                  </ThemeIcon>
                )
              }
            >
              Perfil físico completo (peso, largo, ancho, alto):{" "}
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
            <List.Item
              icon={
                inventoryCompleted ? (
                  <ThemeIcon color="teal" size={18} radius="xl">
                    <IconCheck size={12} />
                  </ThemeIcon>
                ) : (
                  <ThemeIcon color="red" size={18} radius="xl">
                    <IconX size={12} />
                  </ThemeIcon>
                )
              }
            >
              Preparación de Inventario:{" "}
              {inventoryCompleted ? (
                <Text span c="teal" fw={600}>
                  COMPLETED
                </Text>
              ) : (
                <Text span c="orange" fw={600}>
                  {variant.inventoryStatus} (Se requiere COMPLETED)
                </Text>
              )}
            </List.Item>
          </List>
        </div>

        {!allConditionsMet && (
          <Alert color="orange" variant="light" p="xs">
            <Text size="xs">
              Algunos requisitos no están completos. Si intenta activar, el Catálogo rechazará la
              operación hasta que complete los campos pendientes y la preparación de inventario finalice.
            </Text>
          </Alert>
        )}

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" p="xs">
          <Text size="xs">
            <strong>Disponibilidad Comercial:</strong> Una variante puede estar administrativamente{" "}
            <strong>ACTIVA</strong>, pero solo se venderá comercialmente en canales cuando el producto
            padre también se encuentre en estado <strong>ACTIVO</strong>.
          </Text>
        </Alert>

        {error && (
          <FeedbackAlert semantic="error" title="No se pudo activar la variante">
            {error}
          </FeedbackAlert>
        )}
      </Stack>
    </ConfirmDialog>
  );
}
