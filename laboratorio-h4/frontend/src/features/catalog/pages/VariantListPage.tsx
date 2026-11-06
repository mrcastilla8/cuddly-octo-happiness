import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  Pagination,
  Paper,
  Select,
  Table,
  Text,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconEye,
  IconListCheck,
  IconPlus,
  IconPower,
  IconRefresh,
} from "@tabler/icons-react";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
  StatusBadge,
} from "../../../components/shared";
import { useVariantList } from "../hooks/useVariantList";
import { formatIdentifyingAttributes } from "../services/catalogPresentation";
import type { VariantDetailView, VariantStatus } from "../services/catalogRepository";
import { VariantDeactivationDialog } from "../components/VariantDeactivationDialog";
import { VariantReactivationDialog } from "../components/VariantReactivationDialog";
import { VariantActivationDialog } from "../components/VariantActivationDialog";

export function VariantListPage() {
  const { productId } = useParams<{ productId: string }>();
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const {
    product,
    variants,
    total,
    loading,
    error,
    isSimpleProduct,
    reload,
  } = useVariantList({
    productId,
    query: {
      status: statusFilter === "TODOS" ? undefined : (statusFilter as VariantStatus),
      page: currentPage,
      pageSize,
    },
  });

  // Action dialog states
  const [selectedVariant, setSelectedVariant] = useState<VariantDetailView | null>(null);
  const [deactivateOpened, setDeactivateOpened] = useState(false);
  const [reactivateOpened, setReactivateOpened] = useState(false);
  const [activateOpened, setActivateOpened] = useState(false);

  const handleDeactivateClick = (v: VariantDetailView) => {
    setSelectedVariant(v);
    setDeactivateOpened(true);
  };

  const handleReactivateClick = (v: VariantDetailView) => {
    setSelectedVariant(v);
    setReactivateOpened(true);
  };

  const handleActivateClick = (v: VariantDetailView) => {
    setSelectedVariant(v);
    setActivateOpened(true);
  };

  const handleDialogSuccess = () => {
    setDeactivateOpened(false);
    setReactivateOpened(false);
    setActivateOpened(false);
    setSelectedVariant(null);
    reload();
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  if (loading && !product) {
    return (
      <Box p="lg">
        <Text size="sm" c="dimmed">
          Cargando catálogo de variantes...
        </Text>
      </Box>
    );
  }

  if (error && !product) {
    return (
      <Box p="lg">
        <FeedbackAlert semantic="error" title="No se pudo cargar el producto o sus variantes">
          {error}
        </FeedbackAlert>
        <Button component={Link} to="/productos" mt="md" variant="subtle">
          ← Volver a Productos
        </Button>
      </Box>
    );
  }

  if (isSimpleProduct || (product && !product.hasVariants)) {
    return (
      <Box p="lg">
        <PageHeader
          title="Gestión de Variantes"
          breadcrumbs={[
            { label: "Catálogo", to: "/productos" },
            { label: product?.name || "Producto", to: `/productos/${productId}` },
            { label: "Variantes" },
          ]}
        />
        <Alert
          icon={<IconAlertCircle size={20} />}
          title="Incompatible: Producto Simple"
          color="yellow"
          variant="light"
          mt="md"
        >
          <Text size="sm">
            El producto <strong>{product?.name}</strong> está configurado como producto simple (
            <code>tieneVariantes = false</code>). Los productos simples gestionan su inventario y
            perfil físico directamente en la ficha del producto y no admiten variantes (SPEC-004 CA-01).
          </Text>
          <Button
            component={Link}
            to={`/productos/${productId}`}
            mt="md"
            size="xs"
            variant="outline"
          >
            ← Volver a Detalle del Producto
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p="lg">
      <PageHeader
        title={`Variantes de ${product?.name ?? "Producto"}`}
        breadcrumbs={[
          { label: "Catálogo", to: "/productos" },
          { label: product?.name || "Producto", to: `/productos/${productId}` },
          { label: "Variantes" },
        ]}
        actions={
          <Group gap="xs">
            <Button
              variant="outline"
              size="sm"
              leftSection={<IconRefresh size={16} />}
              onClick={() => reload()}
            >
              Actualizar
            </Button>
            <Button
              component={Link}
              to={`/productos/${productId}/variantes/nueva`}
              size="sm"
              leftSection={<IconPlus size={16} />}
            >
              Nueva Variante
            </Button>
          </Group>
        }
      />

      {/* Context banner */}
      <Paper p="sm" withBorder mb="md" bg="var(--po-subtle)">
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" c="dimmed">
              Producto Padre
            </Text>
            <Text size="sm" fw={600}>
              {product?.name}
            </Text>
          </div>
          <Group gap="md">
            <Text size="xs" c="dimmed">
              SKU Base: <strong>{product?.skuBase ?? "Sin SKU base"}</strong>
            </Text>
            <Text size="xs" c="dimmed">
              Precio inicial de Catálogo: <strong>{product?.priceInitial === undefined ? "No disponible" : `S/. ${product.priceInitial.toFixed(2)}`}</strong>. Precio vigente: consultar Pricing.
            </Text>
            <StatusBadge semantic="neutral">
              Padre: {product?.status}
            </StatusBadge>
          </Group>
        </Group>
      </Paper>

      {/* Filter bar */}
      <Paper p="sm" withBorder mb="md">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Text size="xs" fw={500}>
              Estado:
            </Text>
            <Select
              aria-label="Filtrar por estado"
              size="xs"
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val || "TODOS");
                setCurrentPage(1);
              }}
              data={[
                { value: "TODOS", label: "Todos los estados" },
                { value: "ACTIVA", label: "Solo Activas" },
                { value: "BORRADOR", label: "Solo Borradores" },
                { value: "INACTIVA", label: "Solo Inactivas" },
              ]}
              w={180}
            />
          </Group>
          <Text size="xs" c="dimmed">
            Mostrando {variants.length} de {total} variantes
          </Text>
        </Group>
      </Paper>

      {error && (
        <Box mb="md">
          <FeedbackAlert semantic="error" title="Error al consultar variantes">
            {error}
          </FeedbackAlert>
        </Box>
      )}

      {/* Main Table or Empty States */}
      {variants.length === 0 ? (
        statusFilter === "TODOS" ? (
          <EmptyState
            title="Aún no hay variantes creadas"
            description="Este producto admite variantes pero aún no tiene ningún SKU configurado."
            action={
              <Button
                component={Link}
                to={`/productos/${productId}/variantes/nueva`}
                size="xs"
              >
                Crear Primera Variante
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Sin resultados para el filtro"
            description={`No se encontraron variantes con estado ${statusFilter}.`}
            action={
              <Button
                size="xs"
                variant="outline"
                onClick={() => setStatusFilter("TODOS")}
              >
                Ver todas las variantes
              </Button>
            }
          />
        )
      ) : (
        <Paper withBorder>
          <Table highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>SKU Comercial</Table.Th>
                <Table.Th>Atributos Identificadores</Table.Th>
                <Table.Th>Perfil Físico</Table.Th>
                <Table.Th>Preparación Inventario</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th style={{ textAlign: "right", width: 120 }}>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {variants.map((v) => {
                const prepSemantic =
                  v.inventoryStatus === "COMPLETED"
                    ? "success"
                    : v.inventoryStatus === "REJECTED"
                      ? "error"
                      : "warning";

                return (
                  <Table.Tr key={v.variantId}>
                    <Table.Td>
                      <Button
                        component={Link}
                        to={`/productos/${productId}/variantes/${v.variantId}`}
                        variant="subtle"
                        size="xs"
                        p={0}
                        ff="monospace"
                        fw={700}
                      >
                        {v.sku}
                      </Button>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" variant="filled" color="dark">
                        {formatIdentifyingAttributes(v.identifyingAttributes)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {v.physicalProfile?.pesoKg ? (
                        <Text size="xs">
                          {v.physicalProfile.pesoKg} kg ({v.physicalProfile.largoCm}×
                          {v.physicalProfile.anchoCm}×{v.physicalProfile.altoCm} cm)
                        </Text>
                      ) : (
                        <Text size="xs" c="dimmed">
                          Sin medidas
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge semantic={prepSemantic}>
                        {v.inventoryStatus}
                      </StatusBadge>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge>
                        {v.status}
                      </StatusBadge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: "right" }}>
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <ActionIcon
                          component={Link}
                          to={`/productos/${productId}/variantes/${v.variantId}`}
                          aria-label={`Ver detalle de ${v.sku}`}
                          title="Ver detalle"
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                        <Menu position="bottom-end" shadow="md">
                          <Menu.Target>
                            <ActionIcon
                              aria-label={`Más acciones de ${v.sku}`}
                              title="Más acciones"
                            >
                              <IconDotsVertical size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              component={Link}
                              to={`/productos/${productId}/variantes/${v.variantId}/editar`}
                              leftSection={<IconEdit size={16} />}
                            >
                              Editar
                            </Menu.Item>
                            <Menu.Item
                              component={Link}
                              to={`/productos/${productId}/variantes/${v.variantId}/preparacion`}
                              leftSection={<IconListCheck size={16} />}
                            >
                              Consultar Preparación
                            </Menu.Item>
                            {v.status === "BORRADOR" && (
                              <Menu.Item
                                leftSection={<IconCheck size={16} />}
                                onClick={() => handleActivateClick(v)}
                              >
                                Activar Variante
                              </Menu.Item>
                            )}
                            {v.status === "ACTIVA" && (
                              <Menu.Item
                                color="danger"
                                leftSection={<IconPower size={16} />}
                                onClick={() => handleDeactivateClick(v)}
                              >
                                Desactivar Variante
                              </Menu.Item>
                            )}
                            {v.status === "INACTIVA" && (
                              <Menu.Item
                                leftSection={<IconRefresh size={16} />}
                                onClick={() => handleReactivateClick(v)}
                              >
                                Reactivar Variante
                              </Menu.Item>
                            )}
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {totalPages > 1 && (
            <Group justify="center" p="sm">
              <Pagination
                value={currentPage}
                onChange={setCurrentPage}
                total={totalPages}
                size="sm"
              />
            </Group>
          )}
        </Paper>
      )}

      {/* Confirmation Dialogs */}
      {selectedVariant && product && (
        <>
          <VariantDeactivationDialog
            product={product}
            variant={selectedVariant}
            opened={deactivateOpened}
            onCancel={() => setDeactivateOpened(false)}
            onSuccess={handleDialogSuccess}
          />
          <VariantReactivationDialog
            product={product}
            variant={selectedVariant}
            opened={reactivateOpened}
            onCancel={() => setReactivateOpened(false)}
            onSuccess={handleDialogSuccess}
          />
          <VariantActivationDialog
            product={product}
            variant={selectedVariant}
            opened={activateOpened}
            onCancel={() => setActivateOpened(false)}
            onSuccess={handleDialogSuccess}
          />
        </>
      )}
    </Box>
  );
}
