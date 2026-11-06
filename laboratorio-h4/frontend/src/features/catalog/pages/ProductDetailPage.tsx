import { useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconEdit,
  IconExternalLink,
  IconInfoCircle,
  IconPower,
} from "@tabler/icons-react";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { useProductDetail } from "../hooks/useProductDetail";
import { CatalogReadError } from "../components/CatalogReadError";
import {
  calculateVolumeCm3,
  productStatusLabel,
  readCatalogScenario,
} from "../services/catalogPresentation";
import { ProductActivationDialog } from "../components/ProductActivationDialog";
import { ProductDeactivationDialog } from "../components/ProductDeactivationDialog";
import { useMockStateRevision } from "../../shared/useMockStateRevision";

interface ProductDetailPageProps {
  initialDialog?: "activar" | "desactivar";
}

export function ProductDetailPage({ initialDialog }: ProductDetailPageProps) {
  const { productId } = useParams<{ productId: string }>();
  const [params] = useSearchParams();
  const location = useLocation();
  const scenario = readCatalogScenario(params);
  const [revision, setRevision] = useState(0);
  const mockRevision = useMockStateRevision([
    "catalog",
    "taxonomy",
    "pricing",
    "inventory",
  ]);

  const detailState = useProductDetail(productId || "", scenario, revision + mockRevision);

  // Dialog states
  const dialogParam = params.get("dialog");
  const [activateOpened, setActivateOpened] = useState(
    initialDialog === "activar" || dialogParam === "activar",
  );
  const [deactivateOpened, setDeactivateOpened] = useState(
    initialDialog === "desactivar" || dialogParam === "desactivar",
  );

  if (detailState.status === "loading") {
    return (
      <Stack align="center" justify="center" py={80}>
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Cargando detalle del producto...
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
            { label: "Productos", to: `/productos${location.search}` },
            { label: "No encontrado" },
          ]}
        />
        <FeedbackAlert semantic="error" title="404 - Producto inexistente">
          El producto solicitado no fue encontrado en el catálogo.
        </FeedbackAlert>
        <Button
          component={Link}
          to={{ pathname: "/productos", search: location.search }}
          variant="outline"
          w="fit-content"
        >
          Volver al listado
        </Button>
      </Stack>
    );
  }

  const p = detailState.product;
  const volume = calculateVolumeCm3(
    p.physicalProfile?.largoCm,
    p.physicalProfile?.anchoCm,
    p.physicalProfile?.altoCm,
  );

  const handleStateSuccess = () => {
    setActivateOpened(false);
    setDeactivateOpened(false);
    setRevision((v) => v + 1);
  };

  return (
    <Stack gap="xl">
      <PageHeader
        title={p.name}
        description={`SKU Base: ${p.skuBase ?? "Sin SKU base"} · Modelo: ${p.hasVariants ? "Con variantes" : "Simple"}`}
        breadcrumbs={[
          { label: "Inicio", to: "/precios" },
          { label: "Catálogo", to: "/productos" },
          { label: "Productos", to: `/productos${location.search}` },
          { label: p.name },
        ]}
        actions={
          <Group gap="sm">
            <Button
              component={Link}
              to={{ pathname: "/productos", search: location.search }}
              variant="outline"
              leftSection={<IconArrowLeft size={16} />}
            >
              Volver a la lista
            </Button>

            <Button
              component={Link}
              to={`/productos/${p.id}/preparacion`}
              variant="outline"
              leftSection={<IconClock size={16} />}
            >
              Ver preparación
            </Button>

            {p.status !== "INACTIVO" && (
              <Button
                component={Link}
                to={`/productos/${p.id}/editar`}
                variant="outline"
                leftSection={<IconEdit size={16} />}
              >
                Editar
              </Button>
            )}

            {p.status === "BORRADOR" && (
              <Button
                onClick={() => setActivateOpened(true)}
                leftSection={<IconCheck size={16} />}
              >
                Activar producto
              </Button>
            )}

            {p.status === "INACTIVO" && (
              <Button
                onClick={() => setActivateOpened(true)}
                leftSection={<IconCheck size={16} />}
              >
                Reactivar producto
              </Button>
            )}

            {p.status === "ACTIVO" && (
              <Button
                color="danger"
                variant="outline"
                onClick={() => setDeactivateOpened(true)}
                leftSection={<IconPower size={16} />}
              >
                Desactivar
              </Button>
            )}
          </Group>
        }
      />

      <Group align="flex-start" gap="xl" wrap="wrap">
        {/* Main Column */}
        <Box style={{ flex: "1 1 600px", minWidth: 320 }}>
          <Stack gap="xl">
            {/* Identity and general info */}
            <SectionCard title="Identidad y Clasificación">
              <Stack gap="md">
                <Text size="sm">{p.description}</Text>

                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                  <div>
                    <Text size="xs" c="dimmed">
                      Categoría
                    </Text>
                    <Text size="sm" fw={600}>
                      {p.categoryName}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Tipo de producto
                    </Text>
                    <Text size="sm" fw={600}>
                      {p.typeName}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Marca
                    </Text>
                    <Text size="sm" fw={600}>
                      {p.brandName}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      SKU Base
                    </Text>
                    <Text size="sm" ff="monospace" fw={600}>
                      {p.skuBase ?? "Sin SKU base"}
                    </Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Estado
                    </Text>
                    <StatusBadge semantic="neutral" size="sm">
                      {productStatusLabel(p.status)}
                    </StatusBadge>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      Versión de catálogo
                    </Text>
                    <Text size="sm" fw={600}>
                      v{p.catalogVersion}
                    </Text>
                  </div>
                </SimpleGrid>
              </Stack>
            </SectionCard>

            {/* Physical Profile (Simple) or Variants Summary */}
            {!p.hasVariants ? (
              <SectionCard
                title="Perfil Físico del SKU Simple"
                description="Dimensiones y peso utilizados para cálculo logístico y empaque."
              >
                {p.physicalProfile ? (
                  <Stack gap="sm">
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                      <div>
                        <Text size="xs" c="dimmed">
                          Peso
                        </Text>
                        <Text size="sm" fw={600}>
                          {p.physicalProfile.pesoKg ?? "—"} kg
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Largo
                        </Text>
                        <Text size="sm" fw={600}>
                          {p.physicalProfile.largoCm ?? "—"} cm
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Ancho
                        </Text>
                        <Text size="sm" fw={600}>
                          {p.physicalProfile.anchoCm ?? "—"} cm
                        </Text>
                      </div>
                      <div>
                        <Text size="xs" c="dimmed">
                          Alto
                        </Text>
                        <Text size="sm" fw={600}>
                          {p.physicalProfile.altoCm ?? "—"} cm
                        </Text>
                      </div>
                    </SimpleGrid>
                    {volume !== null && (
                      <Text size="xs" c="dimmed">
                        Volumen estimado: <strong>{volume.toLocaleString()} cm³</strong>
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Text size="sm" c="dimmed">
                    Sin medidas físicas registradas aún.
                  </Text>
                )}
              </SectionCard>
            ) : (
              <SectionCard
                title="Variantes y SKUs Vendibles"
                description="Cada variante define su propio inventario y atributos específicos."
                actions={
                  <Button
                    component={Link}
                    to={`/productos/${p.id}/variantes`}
                    size="xs"
                    variant="outline"
                    rightSection={<IconExternalLink size={14} />}
                  >
                    Gestionar variantes
                  </Button>
                }
              >
                <Stack gap="md">
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" p="xs">
                    <Text size="xs">
                      El producto padre no posee stock ni perfil físico propio. La comercialización se realiza a través de las variantes activas.
                    </Text>
                  </Alert>

                  {p.variants.length === 0 ? (
                    <Text size="sm" c="dimmed">
                      Aún no se han configurado variantes para este producto padre.
                    </Text>
                  ) : (
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>SKU Vendible</Table.Th>
                          <Table.Th>Atributos</Table.Th>
                          <Table.Th>Estado</Table.Th>
                          <Table.Th>Preparación</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {p.variants.map((v) => (
                          <Table.Tr key={v.variantId}>
                            <Table.Td ff="monospace" fw={600}>
                              <Button
                                component={Link}
                                to={`/productos/${p.id}/variantes/${v.variantId}`}
                                variant="subtle"
                                size="xs"
                                p={0}
                                ff="monospace"
                              >
                                {v.sku}
                              </Button>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs">{v.attributesSummary}</Text>
                            </Table.Td>
                            <Table.Td>
                              <StatusBadge>{v.status}</StatusBadge>
                            </Table.Td>
                            <Table.Td>
                              <StatusBadge
                                semantic={
                                  v.preparationStatus === "COMPLETED"
                                    ? "success"
                                    : v.preparationStatus === "REJECTED"
                                      ? "error"
                                      : "warning"
                                }
                              >
                                {v.preparationStatus}
                              </StatusBadge>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </SectionCard>
            )}

            {/* Technical Attributes */}
            <SectionCard title="Características Técnicas">
              {p.attributes.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No hay características técnicas especificadas.
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  {p.attributes.map((attr) => (
                    <div key={attr.caracteristicaId}>
                      <Text size="xs" c="dimmed">
                        {attr.nombre}
                      </Text>
                      <Text size="sm" fw={600}>
                        {attr.valor} {attr.unidad ? `(${attr.unidad})` : ""}
                      </Text>
                    </div>
                  ))}
                </SimpleGrid>
              )}
            </SectionCard>
          </Stack>
        </Box>

        {/* Sidebar Column */}
        <Box style={{ flex: "0 0 320px", width: 320, maxWidth: "100%" }}>
          <Stack gap="xl">
            {/* Image Preview Card */}
            <Card withBorder radius="md" p="lg">
              <Text size="sm" fw={600} mb="xs">
                Imagen de publicación
              </Text>
              {p.imageUrl ? (
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  radius="sm"
                  h={240}
                  fit="contain"
                />
              ) : (
                <Stack align="center" justify="center" h={180} bg="var(--po-subtle)" style={{ borderRadius: 8 }}>
                  <Text size="xs" c="dimmed">
                    Sin imagen registrada
                  </Text>
                </Stack>
              )}
            </Card>

            {/* Quick Preparation Status Card */}
            <Card withBorder radius="md" p="lg">
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={600}>
                  Estado de preparación
                </Text>
                <Button
                  component={Link}
                  to={`/productos/${p.id}/preparacion`}
                  size="sm"
                  variant="subtle"
                >
                  Detalle
                </Button>
              </Group>

              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="xs">Pricing:</Text>
                  <StatusBadge
                    semantic={
                      p.preparation.pricing.status === "COMPLETED"
                        ? "success"
                        : p.preparation.pricing.status === "REJECTED"
                          ? "error"
                          : "warning"
                    }
                  >
                    {p.preparation.pricing.status}
                  </StatusBadge>
                </Group>

                {!p.hasVariants ? (
                  <Group justify="space-between">
                    <Text size="xs">Inventario SKU:</Text>
                    <StatusBadge
                      semantic={
                        p.preparation.inventario?.status === "COMPLETED"
                          ? "success"
                          : p.preparation.inventario?.status === "REJECTED"
                            ? "error"
                            : "warning"
                      }
                    >
                      {p.preparation.inventario?.status || "PENDING"}
                    </StatusBadge>
                  </Group>
                ) : (
                  <Group justify="space-between">
                    <Text size="xs">Inventario:</Text>
                    <StatusBadge>Por variante</StatusBadge>
                  </Group>
                )}
              </Stack>
            </Card>
          </Stack>
        </Box>
      </Group>

      {/* S05 Activation Dialog */}
      <ProductActivationDialog
        product={p}
        opened={activateOpened}
        onCancel={() => setActivateOpened(false)}
        onSuccess={handleStateSuccess}
        scenario={scenario}
      />

      {/* S07 Deactivation Dialog */}
      <ProductDeactivationDialog
        product={p}
        opened={deactivateOpened}
        onCancel={() => setDeactivateOpened(false)}
        onSuccess={handleStateSuccess}
        scenario={scenario}
      />
    </Stack>
  );
}
