import { Alert, Badge, Group, List, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";
import { ConfirmDialog, FeedbackAlert } from "../../../components/shared";
import type { ProductDetailView } from "../services/catalogRepository";
import { useProductStateMutation } from "../hooks/useProductStateMutation";

interface ProductActivationDialogProps {
  product: ProductDetailView;
  opened: boolean;
  onCancel: () => void;
  onSuccess: (updated: ProductDetailView) => void;
  scenario?: string;
}

export function ProductActivationDialog({
  product,
  opened,
  onCancel,
  onSuccess,
  scenario,
}: ProductActivationDialogProps) {
  const isReactivation = product.status === "INACTIVO";
  const actionTitle = isReactivation ? "Reactivar producto" : "Activar producto";

  const {
    submitting,
    reconciling,
    error,
    isUnknownError,
    activate,
    reactivate,
    reconcile,
    clearError,
  } = useProductStateMutation();

  // Evaluate requirements locally for checklist preview
  const hasImage = Boolean(product.images && product.images.length > 0);
  const pricingCompleted = product.preparation.pricing.status === "COMPLETED";

  const simpleInventoryCompleted = !product.hasVariants
    ? product.preparation.inventario?.status === "COMPLETED"
    : true;

  const simplePhysicalComplete = !product.hasVariants
    ? Boolean(
        product.physicalProfile &&
          product.physicalProfile.pesoKg &&
          product.physicalProfile.largoCm &&
          product.physicalProfile.anchoCm &&
          product.physicalProfile.altoCm,
      )
    : true;

  const activeVariants = product.variants.filter((v) => v.status === "ACTIVA");
  const parentVariantsReady = product.hasVariants
    ? activeVariants.length > 0 &&
      activeVariants.every((v) => v.preparationStatus === "COMPLETED")
    : true;

  const handleConfirm = async () => {
    if (isUnknownError) {
      const ok = await reconcile(product.id, "ACTIVO");
      if (ok) {
        onSuccess({ ...product, status: "ACTIVO" });
      }
      return;
    }

    const res = isReactivation
      ? await reactivate(product.id, scenario)
      : await activate(product.id, scenario);

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
      title={actionTitle}
      confirmLabel={isUnknownError ? "Consultar estado" : actionTitle}
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
            <Badge size="xs" color="gray">
              Estado: {product.status}
            </Badge>
          </Group>
        </div>

        <Text size="xs" c="dimmed">
          Antes de publicar, el servidor verificará el cumplimiento estricto de todos los requisitos de publicación comercial:
        </Text>

        <List size="xs" spacing="xs">
          <List.Item
            icon={
              <ThemeIcon color="green" size={18} radius="xl">
                <IconCheck size={12} />
              </ThemeIcon>
            }
          >
            Datos generales mínimos y maestros válidos
          </List.Item>

          <List.Item
            icon={
              <ThemeIcon color={hasImage ? "green" : "red"} size={18} radius="xl">
                {hasImage ? <IconCheck size={12} /> : <IconX size={12} />}
              </ThemeIcon>
            }
          >
            Imagen de publicación ({hasImage ? "Registrada" : "Pendiente"})
          </List.Item>

          <List.Item
            icon={
              <ThemeIcon
                color={pricingCompleted ? "green" : "red"}
                size={18}
                radius="xl"
              >
                {pricingCompleted ? <IconCheck size={12} /> : <IconX size={12} />}
              </ThemeIcon>
            }
          >
            Preparación en Pricing ({pricingCompleted ? "Completada" : "Pendiente"})
          </List.Item>

          {!product.hasVariants ? (
            <>
              <List.Item
                icon={
                  <ThemeIcon
                    color={simpleInventoryCompleted ? "green" : "red"}
                    size={18}
                    radius="xl"
                  >
                    {simpleInventoryCompleted ? (
                      <IconCheck size={12} />
                    ) : (
                      <IconX size={12} />
                    )}
                  </ThemeIcon>
                }
              >
                Inventario del SKU simple (
                {simpleInventoryCompleted ? "Completado" : "Pendiente"})
              </List.Item>
              <List.Item
                icon={
                  <ThemeIcon
                    color={simplePhysicalComplete ? "green" : "red"}
                    size={18}
                    radius="xl"
                  >
                    {simplePhysicalComplete ? (
                      <IconCheck size={12} />
                    ) : (
                      <IconX size={12} />
                    )}
                  </ThemeIcon>
                }
              >
                Perfil físico completo (peso, largo, ancho, alto) (
                {simplePhysicalComplete ? "Completo" : "Incompleto"})
              </List.Item>
            </>
          ) : (
            <List.Item
              icon={
                <ThemeIcon
                  color={parentVariantsReady ? "green" : "red"}
                  size={18}
                  radius="xl"
                >
                  {parentVariantsReady ? <IconCheck size={12} /> : <IconX size={12} />}
                </ThemeIcon>
              }
            >
              Variantes activas (
              {parentVariantsReady
                ? `${activeVariants.length} variante(s) activa(s) preparadas`
                : "Requiere al menos 1 variante activa preparada"}
              )
            </List.Item>
          )}
        </List>

        {product.hasVariants && (
          <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light" p="xs">
            <Text size="xs">
              {isReactivation
                ? "Esta acción reactiva la oferta del producto padre, pero NO reactiva automáticamente las variantes inactivas. Cada variante conserva su propio estado."
                : "Las variantes inactivas o en borrador no se ofrecerán comercialmente ni bloquearán la activación del padre."}
            </Text>
          </Alert>
        )}

        {error && (
          <FeedbackAlert semantic="error" title="No se pudo activar el producto">
            {error}
          </FeedbackAlert>
        )}
      </Stack>
    </ConfirmDialog>
  );
}
