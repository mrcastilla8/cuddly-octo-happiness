import { useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Group,
  List,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconEdit,
  IconExternalLink,
  IconInfoCircle,
  IconRefresh,
} from "@tabler/icons-react";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { useProductDetail } from "../hooks/useProductDetail";
import { CatalogReadError } from "../components/CatalogReadError";
import { useProductPreparation } from "../hooks/useProductPreparation";
import {
  preparationStatusLabel,
  readCatalogScenario,
} from "../services/catalogPresentation";
import { ProductActivationDialog } from "../components/ProductActivationDialog";

export function ProductPreparationPage() {
  const { productId } = useParams<{ productId: string }>();
  const [params] = useSearchParams();
  const location = useLocation();
  const scenario = readCatalogScenario(params);
  const justCreated = location.state?.justCreated;

  const [revision, setRevision] = useState(0);
  const [activateOpened, setActivateOpened] = useState(false);

  const detailState = useProductDetail(productId || "", scenario, revision);
  const prepState = useProductPreparation(productId || "", scenario, revision);

  if (detailState.status === "loading" || prepState.status === "loading") {
    return (
      <Stack align="center" justify="center" py={80}>
        <Loader size="lg" />
        <Text size="sm" c="dimmed">
          Consultando estado de preparación...
        </Text>
      </Stack>
    );
  }

  if (["error", "forbidden", "session"].includes(detailState.status)) {
    const prep = prepState.status === "success" && prepState.data?.productId === productId ? prepState.data : undefined;
    const dependencies = prep ? [
      { name: "Pricing", key: "PRICING" as const, state: prep.pricing },
      ...(prep.inventario ? [{ name: "Inventario", key: "INVENTARIO" as const, state: prep.inventario }] : []),
    ] : [];
    return <CatalogReadError error={detailState.error}>
      {prep ? <SectionCard title="Estado de preparación informado por Catálogo">
        <Stack gap="md">
          <Text size="sm">El detalle administrativo no está disponible. Estos estados provienen de la consulta independiente de preparación.</Text>
          {dependencies.map(({ name, key, state }) => <Stack gap="xs" key={key}>
            <Text>{name}: {preparationStatusLabel(state.status)}</Text>
            {state.code && <Text size="sm">Causa: {state.code}</Text>}
            {state.manualRetryAllowed && state.status !== "COMPLETED" && <Button loading={prepState.retrying} onClick={() => prepState.retry(key)}>Reintentar preparación de {name}</Button>}
          </Stack>)}
          {prep.hasVariants && <Text size="sm">El producto padre no tiene preparación física propia.</Text>}
          {prep.variantes.map(v => <Text key={v.variantId}>{v.sku}: {preparationStatusLabel(v.inventario.status)}{v.inventario.code ? ` · ${v.inventario.code}` : ""}</Text>)}
          {prepState.retryError && <FeedbackAlert semantic="error" title="No se pudo solicitar el reintento">{prepState.retryError}</FeedbackAlert>}
          {prepState.retrySuccess && <FeedbackAlert semantic="info" title="Solicitud recibida">{prepState.retrySuccess}</FeedbackAlert>}
          <Button variant="outline" onClick={() => setRevision(r => r + 1)}>Consultar nuevamente</Button>
        </Stack>
      </SectionCard> : <FeedbackAlert semantic="error" title="Preparación no disponible">{prepState.error}</FeedbackAlert>}
    </CatalogReadError>;
  }

  if (detailState.status === "not_found" || !detailState.product) {
    return (
      <Stack gap="xl">
        <PageHeader
          title="Producto no encontrado"
          breadcrumbs={[
            { label: "Inicio", to: "/precios" },
            { label: "Catálogo", to: "/productos" },
            { label: "Productos", to: "/productos" },
            { label: "No encontrado" },
          ]}
        />
        <FeedbackAlert semantic="error" title="404 - Producto inexistente">
          El producto solicitado no fue encontrado.
        </FeedbackAlert>
        <Button component={Link} to="/productos" variant="outline" w="fit-content">
          Volver a la lista
        </Button>
      </Stack>
    );
  }

  const p = detailState.product;
  const prep = prepState.status === "success" && prepState.data?.productId === p.id ? prepState.data : p.preparation;

  const isPricingReady = prep.pricing.status === "COMPLETED";
  const isInventoryReady = p.hasVariants
    ? p.variants.some((v) => v.status === "ACTIVA" && v.preparationStatus === "COMPLETED")
    : prep.inventario?.status === "COMPLETED";

  return (
    <Stack gap="xl">
      <PageHeader
        title="Preparación del producto"
        description="Verifica el estado de inicialización independiente en Pricing e Inventario. El producto permanece en borrador hasta que confirmes su activación."
        breadcrumbs={[
          { label: "Inicio", to: "/precios" },
          { label: "Catálogo", to: "/productos" },
          { label: "Productos", to: "/productos" },
          { label: p.name, to: `/productos/${p.id}` },
          { label: "Preparación" },
        ]}
        actions={
          <Group gap="sm">
            <Button
              component={Link}
              to={`/productos/${p.id}`}
              variant="outline"
              leftSection={<IconArrowLeft size={16} />}
            >
              Ver detalle
            </Button>

            {p.status !== "INACTIVO" && (
              <Button
                component={Link}
                to={`/productos/${p.id}/editar`}
                variant="outline"
                leftSection={<IconEdit size={16} />}
              >
                Editar producto
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
          </Group>
        }
      />

      {justCreated && (
        <Alert icon={<IconCheck size={16} />} color="green" variant="light">
          <strong>Borrador guardado.</strong> El producto permanecerá en BORRADOR hasta que completes los requisitos y confirmes su activación.
        </Alert>
      )}

      {prepState.retrySuccess && (
        <FeedbackAlert semantic="info" title="Reintento solicitado">
          {prepState.retrySuccess}
        </FeedbackAlert>
      )}

      {prepState.retryError && (
        <FeedbackAlert semantic="error" title="Reintento no admitido">
          {prepState.retryError}
        </FeedbackAlert>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        {/* Pricing Card */}
        <Card withBorder radius="md" p="lg" h="100%">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <Text fw={700} size="md">
                  Preparación en Pricing
                </Text>
              </Group>
              <StatusBadge
                semantic={
                  prep.pricing.status === "COMPLETED"
                    ? "success"
                    : prep.pricing.status === "REJECTED"
                      ? "error"
                      : "warning"
                }
              >
                {preparationStatusLabel(prep.pricing.status)}
              </StatusBadge>
            </Group>

            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Inicialización del precio base regular.
              </Text>

              {prep.pricing.status === "COMPLETED" && (
                <Alert icon={<IconCheck size={16} />} color="green" variant="light" p="xs">
                  <Text size="xs">
                    Precio regular base inicializado correctamente en Pricing. Estado terminal confirmado.
                  </Text>
                </Alert>
              )}

              {prep.pricing.status === "PENDING" && (
                <Alert icon={<IconClock size={16} />} color="yellow" variant="light" p="xs">
                  <Text size="xs">
                    Inicialización de precio en curso. El sistema realiza recuperación automática si fuera necesario. No requiere intervención humana ordinaria.
                  </Text>
                </Alert>
              )}

              {prep.pricing.status === "REJECTED" && (
                <Stack gap="xs">
                  <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light" p="xs">
                    <Text size="xs">
                      Rechazo de inicialización en Pricing. Causa informada:{" "}
                      <strong>{prep.pricing.code || "RECHAZO_FUNCIONAL"}</strong>. El borrador se conserva intacto.
                    </Text>
                  </Alert>

                  {prep.pricing.manualRetryAllowed && (
                    <Button
                      size="xs"
                      variant="outline"
                      loading={prepState.retrying}
                      onClick={() => prepState.retry("PRICING")}
                      leftSection={<IconRefresh size={14} />}
                    >
                      Reintentar preparación de Pricing
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

        {/* Inventory Card */}
        <Card withBorder radius="md" p="lg" h="100%">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <Text fw={700} size="md">
                  Preparación en Inventario
                </Text>
              </Group>
              {!p.hasVariants && prep.inventario && (
                <StatusBadge
                  semantic={
                    prep.inventario.status === "COMPLETED"
                      ? "success"
                      : prep.inventario.status === "REJECTED"
                        ? "error"
                        : "warning"
                  }
                >
                  {preparationStatusLabel(prep.inventario.status)}
                </StatusBadge>
              )}
              {p.hasVariants && (
                <StatusBadge>Por variante</StatusBadge>
              )}
            </Group>

            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Inicialización del stock disponible.
              </Text>

              {!p.hasVariants && prep.inventario ? (
                <>
                  {prep.inventario.status === "COMPLETED" && (
                    <Alert icon={<IconCheck size={16} />} color="green" variant="light" p="xs">
                      <Text size="xs">
                        SKU simple inicializado correctamente.
                      </Text>
                    </Alert>
                  )}

                  {prep.inventario.status === "PENDING" && (
                    <Alert icon={<IconClock size={16} />} color="yellow" variant="light" p="xs">
                      <Text size="xs">
                        Inicialización de SKU simple en curso. No se requiere reintento manual habitual mientras esté pendiente.
                      </Text>
                    </Alert>
                  )}

                  {prep.inventario.status === "REJECTED" && (
                    <Stack gap="xs">
                      <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light" p="xs">
                        <Text size="xs">
                          Rechazo en Inventario para SKU base. Causa:{" "}
                          <strong>{prep.inventario.code || "INV_SKU_REJECTED"}</strong>.
                        </Text>
                      </Alert>

                      {prep.inventario.manualRetryAllowed && (
                        <Button
                          size="xs"
                          variant="outline"
                          loading={prepState.retrying}
                          onClick={() => prepState.retry("INVENTARIO")}
                          leftSection={<IconRefresh size={14} />}
                        >
                          Reintentar preparación de Inventario
                        </Button>
                      )}
                    </Stack>
                  )}
                </>
              ) : (
                <Stack gap="xs">
                  <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" p="xs">
                    <Text size="xs">
                      El producto padre con variantes no tiene stock físico directo ni reintento global de inventario. La inicialización y reintentos se gestionan individualmente en cada variante vendible.
                    </Text>
                  </Alert>

                  <Button
                    component={Link}
                    to={`/productos/${productId}/variantes`}
                    size="xs"
                    variant="outline"
                    rightSection={<IconExternalLink size={14} />}
                  >
                    Gestionar inventario de variantes
                  </Button>
                </Stack>
              )}
            </Stack>
          </Card>
      </SimpleGrid>

      {/* Checklist section */}
      <SectionCard title="Checklist para Activación Comercial">
        <List size="sm" spacing="sm">
          <List.Item
            icon={
              <ThemeIcon color="green" size={20} radius="xl">
                <IconCheck size={14} />
              </ThemeIcon>
            }
          >
            Borrador guardado con identidad, nombre, descripción y clasificación confirmadas
          </List.Item>

          <List.Item
            icon={
              <ThemeIcon color={isPricingReady ? "green" : "yellow"} size={20} radius="xl">
                {isPricingReady ? <IconCheck size={14} /> : <IconClock size={14} />}
              </ThemeIcon>
            }
          >
            Pricing: preparación completada ({isPricingReady ? "Listo" : "Pendiente"})
          </List.Item>

          <List.Item
            icon={
              <ThemeIcon color={isInventoryReady ? "green" : "yellow"} size={20} radius="xl">
                {isInventoryReady ? <IconCheck size={14} /> : <IconClock size={14} />}
              </ThemeIcon>
            }
          >
            Inventario: {p.hasVariants ? "Al menos una variante activa preparada" : "SKU simple preparado"} (
            {isInventoryReady ? "Listo" : "Pendiente"})
          </List.Item>
        </List>
      </SectionCard>

      {/* S05 Activation Dialog */}
      <ProductActivationDialog
        product={p}
        opened={activateOpened}
        onCancel={() => setActivateOpened(false)}
        onSuccess={() => {
          setActivateOpened(false);
          setRevision((v) => v + 1);
        }}
        scenario={scenario}
      />
    </Stack>
  );
}
