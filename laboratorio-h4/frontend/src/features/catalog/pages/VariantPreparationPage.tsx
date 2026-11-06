import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  List,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconEye,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { FeedbackAlert, PageHeader, SectionCard, StatusBadge } from "../../../components/shared";
import { useVariantPreparation } from "../hooks/useVariantPreparation";
import { formatIdentifyingAttributes, isPhysicalProfileComplete } from "../services/catalogPresentation";

export function VariantPreparationPage() {
  const { productId, variantId } = useParams<{ productId: string; variantId: string }>();

  const {
    product,
    variant,
    preparation,
    loading,
    retrying,
    error,
    retryMessage,
    canRetry,
    reload,
    retry,
  } = useVariantPreparation(productId, variantId);

  if (loading && (!product || !variant)) {
    return (
      <Box p="lg">
        <Text size="sm" c="dimmed">
          Cargando estado de preparación del SKU...
        </Text>
      </Box>
    );
  }

  if (error && (!product || !variant)) {
    return (
      <Box p="lg">
        <FeedbackAlert semantic="error" title="No se pudo cargar la preparación">
          {error}
        </FeedbackAlert>
        <Button
          component={Link}
          to={`/productos/${productId}/variantes`}
          mt="md"
          variant="subtle"
        >
          ← Volver a Lista de Variantes
        </Button>
      </Box>
    );
  }

  const inventoryStatus =
    preparation?.inventario?.status ??
    preparation?.inventoryStatus ??
    variant?.inventoryStatus ??
    variant?.inventoryPreparationStatus ??
    "PENDING";
  const prepSemantic =
    inventoryStatus === "COMPLETED"
      ? "success"
      : inventoryStatus === "REJECTED"
        ? "error"
        : "warning";

  const hasCompletePhysical = isPhysicalProfileComplete(variant?.physicalProfile);

  return (
    <Box p="lg">
      <PageHeader
        title={`Preparación de Inventario: ${variant?.sku ?? ""}`}
        breadcrumbs={[
          { label: "Catálogo", to: "/productos" },
          { label: product?.name || "Producto", to: `/productos/${productId}` },
          { label: "Variantes", to: `/productos/${productId}/variantes` },
          {
            label: variant?.sku || "SKU",
            to: `/productos/${productId}/variantes/${variantId}`,
          },
          { label: "Preparación Inventario" },
        ]}
        actions={
          <Group gap="xs">
            <Button
              component={Link}
              to={`/productos/${productId}/variantes/${variantId}`}
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
            >
              Ficha del SKU
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftSection={<IconRefresh size={16} />}
              onClick={() => reload()}
            >
              Actualizar
            </Button>
            {canRetry && (
              <Button
                size="sm"
                loading={retrying}
                leftSection={<IconRefresh size={16} />}
                onClick={() => retry()}
              >
                Reintentar Preparación
              </Button>
            )}
          </Group>
        }
      />

      <Stack gap="lg" mt="md">
        {retryMessage && (
          <Alert icon={<IconCheck size={18} />} color="teal" variant="light">
            <Text size="sm">{retryMessage}</Text>
          </Alert>
        )}

        {error && (
          <FeedbackAlert semantic="error" title="Aviso de Preparación">
            {error}
          </FeedbackAlert>
        )}

        {/* Identity & Status Card */}
        <Paper p="lg" withBorder>
          <Group justify="space-between" align="center">
            <div>
              <Text size="xs" c="dimmed">
                SKU / Unidad Vendible
              </Text>
              <Text size="lg" fw={700} ff="monospace">
                {variant?.sku}
              </Text>
              <Group gap="xs" mt={4}>
                <Badge size="xs" variant="filled" color="dark">
                  {variant && formatIdentifyingAttributes(variant.identifyingAttributes)}
                </Badge>
                <StatusBadge semantic={prepSemantic}>
                  Inventario: {inventoryStatus}
                </StatusBadge>
                <StatusBadge>
                  Variante: {variant?.status}
                </StatusBadge>
              </Group>
            </div>
            <Paper p="xs" withBorder bg="var(--po-subtle)">
              <Text size="xs" c="dimmed">
                Producto Padre:
              </Text>
              <Text size="sm" fw={600}>
                {product?.name} ({product?.skuBase ?? "Sin SKU base"})
              </Text>
            </Paper>
          </Group>
        </Paper>

        <Grid gap="lg">
          {/* Main Status & Retry Section */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <SectionCard
              title="Estado de preparación"
              description="Seguimiento de la inicialización de stock y perfil de embalaje."
            >
              <Stack gap="md">
                {inventoryStatus === "COMPLETED" && (
                  <Alert icon={<IconCheck size={20} />} color="teal" variant="light">
                    <Text size="sm" fw={600}>
                      Preparación completada
                    </Text>
                    <Text size="xs" mt={2}>
                      La preparación del SKU fue completada.
                    </Text>
                  </Alert>
                )}

                {inventoryStatus === "PENDING" && (
                  <Alert icon={<IconClock size={20} />} color="yellow" variant="light">
                    <Text size="sm" fw={600}>
                      Preparación en proceso
                    </Text>
                    <Text size="xs" mt={2}>
                      La preparación del SKU está en curso. La variante permanecerá en este estado hasta su confirmación.
                    </Text>
                  </Alert>
                )}

                {inventoryStatus === "REJECTED" && (
                  <Alert icon={<IconAlertTriangle size={20} />} color="red" variant="light">
                    <Text size="sm" fw={600}>
                      Preparación pendiente
                    </Text>
                    <Text size="xs" mt={2}>
                      No se pudo inicializar el SKU. Puede solicitar un reintento
                      manual para reevaluar la preparación si las condiciones están corregidas.
                    </Text>
                    {canRetry && (
                      <Button
                        variant="outline"
                        size="xs"
                        mt="xs"
                        loading={retrying}
                        onClick={() => retry()}
                      >
                        Reintentar ahora
                      </Button>
                    )}
                  </Alert>
                )}

                {preparation?.lastCheckedAt && (
                  <Text size="xs" c="dimmed">
                    Última verificación de sincronización:{" "}
                    <strong>{new Date(preparation.lastCheckedAt).toLocaleString()}</strong>
                  </Text>
                )}
              </Stack>
            </SectionCard>
          </Grid.Col>

          {/* Requirements Checklist Column */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <SectionCard title="Requisitos de Activación del SKU">
              <Stack gap="sm">
                <List size="xs" spacing="xs">
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={18} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    SKU único asignado ({variant?.sku})
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={18} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Atributos identificadores válidos
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
                    Perfil físico completo (kg / cm):{" "}
                    {hasCompletePhysical ? (
                      <Text span c="teal" fw={600}>
                        Completo
                      </Text>
                    ) : (
                      <Text span c="red" fw={600}>
                        Pendiente
                      </Text>
                    )}
                  </List.Item>
                  <List.Item
                    icon={
                      inventoryStatus === "COMPLETED" ? (
                        <ThemeIcon color="teal" size={18} radius="xl">
                          <IconCheck size={12} />
                        </ThemeIcon>
                      ) : (
                        <ThemeIcon color="orange" size={18} radius="xl">
                          <IconClock size={12} />
                        </ThemeIcon>
                      )
                    }
                  >
                    Inventario COMPLETED:{" "}
                    {inventoryStatus === "COMPLETED" ? (
                      <Text span c="teal" fw={600}>
                        Completado
                      </Text>
                    ) : (
                      <Text span c="orange" fw={600}>
                        {inventoryStatus}
                      </Text>
                    )}
                  </List.Item>
                </List>

                <Group justify="flex-end" mt="md">
                  <Button
                    component={Link}
                    to={`/productos/${productId}/variantes/${variantId}`}
                    size="xs"
                    variant="outline"
                    leftSection={<IconEye size={14} />}
                  >
                    Ver Ficha de la Variante
                  </Button>
                </Group>
              </Stack>
            </SectionCard>
          </Grid.Col>
        </Grid>
      </Stack>
    </Box>
  );
}
