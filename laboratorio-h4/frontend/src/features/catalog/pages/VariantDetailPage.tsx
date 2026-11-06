import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Grid,
  Group,
  Image,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconCoins,
  IconEdit,
  IconListCheck,
  IconPhotoOff,
  IconPower,
  IconRefresh,
} from "@tabler/icons-react";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { useVariantDetail } from "../hooks/useVariantDetail";
import { VariantDeactivationDialog } from "../components/VariantDeactivationDialog";
import { VariantReactivationDialog } from "../components/VariantReactivationDialog";
import { VariantActivationDialog } from "../components/VariantActivationDialog";

export function VariantDetailPage() {
  const { productId, variantId } = useParams<{ productId: string; variantId: string }>();
  const { product, variant, loading, error, reload } = useVariantDetail(productId, variantId);

  const [deactivateOpened, setDeactivateOpened] = useState(false);
  const [reactivateOpened, setReactivateOpened] = useState(false);
  const [activateOpened, setActivateOpened] = useState(false);

  const handleDialogSuccess = () => {
    setDeactivateOpened(false);
    setReactivateOpened(false);
    setActivateOpened(false);
    reload();
  };

  if (loading) {
    return (
      <Box p="lg">
        <Text size="sm" c="dimmed">
          Cargando detalle de la variante...
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
          ← Volver a Lista de Variantes
        </Button>
      </Box>
    );
  }

  const prepSemantic =
    variant.inventoryStatus === "COMPLETED"
      ? "success"
      : variant.inventoryStatus === "REJECTED"
        ? "error"
        : "warning";

  const volume =
    variant.physicalProfile?.largoCm &&
    variant.physicalProfile?.anchoCm &&
    variant.physicalProfile?.altoCm
      ? Number(
          (
            variant.physicalProfile.largoCm *
            variant.physicalProfile.anchoCm *
            variant.physicalProfile.altoCm
          ).toFixed(2),
        )
      : null;

  return (
    <Box p="lg">
      <PageHeader
        title={`Variante: ${variant.sku}`}
        breadcrumbs={[
          { label: "Catálogo", to: "/productos" },
          { label: product.name, to: `/productos/${productId}` },
          { label: "Variantes", to: `/productos/${productId}/variantes` },
          { label: variant.sku },
        ]}
        actions={
          <Group gap="xs">
            <Button
              component={Link}
              to={`/productos/${productId}/variantes`}
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
            >
              Volver
            </Button>
            <Button
              component={Link}
              to={`/productos/${productId}/variantes/${variantId}/preparacion`}
              variant="outline"
              size="sm"
              leftSection={<IconListCheck size={16} />}
            >
              Preparación SKU
            </Button>
            <Button
              component={Link}
              to={`/productos/${productId}/variantes/${variantId}/editar`}
              variant="outline"
              size="sm"
              leftSection={<IconEdit size={16} />}
            >
              Editar
            </Button>
            {variant.status === "BORRADOR" && (
              <Button
                size="sm"
                leftSection={<IconCheck size={16} />}
                onClick={() => setActivateOpened(true)}
              >
                Activar Variante
              </Button>
            )}
            {variant.status === "ACTIVA" && (
              <Button
                color="danger"
                variant="outline"
                size="sm"
                leftSection={<IconPower size={16} />}
                onClick={() => setDeactivateOpened(true)}
              >
                Desactivar
              </Button>
            )}
            {variant.status === "INACTIVA" && (
              <Button
                variant="outline"
                size="sm"
                leftSection={<IconRefresh size={16} />}
                onClick={() => setReactivateOpened(true)}
              >
                Reactivar
              </Button>
            )}
          </Group>
        }
      />

      <Stack gap="lg" mt="md">
        {/* Context Header Card */}
        <Paper p="lg" withBorder>
          <Group justify="space-between" align="center">
            <div>
              <Group gap="xs" align="center">
                <Text size="lg" fw={700} ff="monospace">
                  {variant.sku}
                </Text>
                <StatusBadge>
                  {variant.status}
                </StatusBadge>
                <StatusBadge semantic={prepSemantic}>
                  Inventario: {variant.inventoryStatus}
                </StatusBadge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                ID Sistema: <code>{variant.variantId}</code> | Versión: {variant.catalogVersion ?? 1}
              </Text>
            </div>
            <Paper p="xs" withBorder bg="var(--po-subtle)">
              <Text size="xs" c="dimmed">
                Pertenece al producto padre:
              </Text>
              <Button
                component={Link}
                to={`/productos/${productId}`}
                variant="subtle"
                size="xs"
                p={0}
                fw={600}
              >
                {product.name} ({product.skuBase ?? "Sin SKU base"})
              </Button>
            </Paper>
          </Group>
        </Paper>

        <Grid gap="lg">
          {/* Left Column: Attributes and Physical Profile */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="lg">
              {/* Identifying & Non-identifying attributes */}
              <SectionCard
                title="Atributos de la Variante"
                description="Combinación identificadora inmutable y atributos complementarios."
              >
                <Stack gap="md">
                  <div>
                    <Text size="xs" fw={600} c="dimmed" mb="xs">
                      ATRIBUTOS IDENTIFICADORES (INMUTABLES)
                    </Text>
                    <Group gap="xs">
                      {variant.identifyingAttributes.map((attr, idx) => (
                        <Badge key={idx} size="md" variant="filled" color="dark">
                          {attr.nombre}: {attr.valor}
                        </Badge>
                      ))}
                    </Group>
                  </div>

                  {variant.nonIdentifyingAttributes.length > 0 && (
                    <div>
                      <Text size="xs" fw={600} c="dimmed" mb="xs">
                        ATRIBUTOS COMPLEMENTARIOS
                      </Text>
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                        {variant.nonIdentifyingAttributes.map((attr, idx) => (
                          <Paper key={idx} p="xs" withBorder>
                            <Text size="xs" c="dimmed">
                              {attr.nombre}
                            </Text>
                            <Text size="sm" fw={500}>
                              {attr.valor}
                            </Text>
                          </Paper>
                        ))}
                      </SimpleGrid>
                    </div>
                  )}
                </Stack>
              </SectionCard>

              {/* Physical Profile */}
              <SectionCard
                title="Perfil Físico de la Variante"
                description="Dimensiones y peso en kg y cm para inventario y logística."
              >
                {variant.physicalProfile ? (
                  <Stack gap="sm">
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                      <div>
                        <Text size="xs" c="dimmed">
                          Peso
                        </Text>
                        <Text size="sm" fw={600}>
                          {variant.physicalProfile.pesoKg ?? "—"} kg
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Largo
                        </Text>
                        <Text size="sm" fw={600}>
                          {variant.physicalProfile.largoCm ?? "—"} cm
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Ancho
                        </Text>
                        <Text size="sm" fw={600}>
                          {variant.physicalProfile.anchoCm ?? "—"} cm
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Alto
                        </Text>
                        <Text size="sm" fw={600}>
                          {variant.physicalProfile.altoCm ?? "—"} cm
                        </Text>
                      </div>
                    </SimpleGrid>
                    {volume !== null && (
                      <Text size="xs" c="dimmed">
                        Volumen calculado: <strong>{volume.toLocaleString()} cm³</strong>
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    Sin medidas físicas registradas en esta variante.
                  </Text>
                )}
              </SectionCard>
            </Stack>
          </Grid.Col>

          {/* Right Column: Image, Preparation Status & Price Alert */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              {/* Variant Image */}
              <SectionCard title="Imagen de la Variante">
                {variant.imageUrl ? (
                  <Box ta="center">
                    <Image
                      src={variant.imageUrl}
                      alt={variant.sku}
                      radius="md"
                      mah={240}
                      fit="contain"
                    />
                  </Box>
                ) : (
                  <Group justify="center" p="xl" bg="var(--po-subtle)">
                    <Stack align="center" gap="xs">
                      <IconPhotoOff size={32} color="gray" />
                      <Text size="xs" c="dimmed">
                        Sin imagen específica configurada.
                      </Text>
                    </Stack>
                  </Group>
                )}
              </SectionCard>

              {/* Inventory Tracking Card */}
              <SectionCard
                title="Preparación de Inventario"
                actions={
                  <Button
                    component={Link}
                    to={`/productos/${productId}/variantes/${variantId}/preparacion`}
                    size="xs"
                    variant="subtle"
                  >
                    Ver detalles →
                  </Button>
                }
              >
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      Estado en Inventario:
                    </Text>
                    <StatusBadge semantic={prepSemantic}>{variant.inventoryStatus}</StatusBadge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {variant.inventoryStatus === "COMPLETED"
                      ? "El SKU fue provisionado correctamente en el sistema de inventario."
                      : variant.inventoryStatus === "PENDING"
                        ? "La preparación del SKU está en proceso de inicialización en Inventario."
                        : "Hubo un error en la preparación del SKU. Puede reintentar desde la vista de preparación."}
                  </Text>
                </Stack>
              </SectionCard>

              {/* Price Inheritance Card */}
              <Alert
                icon={<IconCoins size={18} />}
                title="Precio inicial de Catálogo"
                color="blue"
                variant="light"
              >
                <Text size="xs">
                  Precio inicial registrado del padre:{" "}
                  <strong>{product.priceInitial === undefined ? "No disponible" : `S/. ${product.priceInitial.toFixed(2)}`}</strong>
                </Text>
                <Text size="xs" c="dimmed" mt={2}>
                  El precio vigente y los overrides por SKU pertenecen a Pricing. El importe inicial de Catálogo no acredita el precio actual.
                </Text>
              </Alert>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>

      {/* Confirmation Dialogs */}
      <VariantDeactivationDialog
        product={product}
        variant={variant}
        opened={deactivateOpened}
        onCancel={() => setDeactivateOpened(false)}
        onSuccess={handleDialogSuccess}
      />
      <VariantReactivationDialog
        product={product}
        variant={variant}
        opened={reactivateOpened}
        onCancel={() => setReactivateOpened(false)}
        onSuccess={handleDialogSuccess}
      />
      <VariantActivationDialog
        product={product}
        variant={variant}
        opened={activateOpened}
        onCancel={() => setActivateOpened(false)}
        onSuccess={handleDialogSuccess}
      />
    </Box>
  );
}
