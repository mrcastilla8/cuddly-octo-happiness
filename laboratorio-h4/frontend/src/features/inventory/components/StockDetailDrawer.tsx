import {
  Button,
  Divider,
  Drawer,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBox,
  IconCheck,
  IconClock,
  IconLock,
} from "@tabler/icons-react";

import { Link } from "react-router-dom";
import {
  FeedbackAlert,
  StatusBadge,
} from "../../../components/shared";
import type { StockItem } from "../services/inventoryTypes";

interface StockDetailDrawerProps {
  item: StockItem | null;
  opened: boolean;
  onClose: () => void;
}

export function StockDetailDrawer({
  item,
  opened,
  onClose,
}: StockDetailDrawerProps) {
  if (!item) return null;

  const statusSemantic =
    item.status === "DISPONIBLE"
      ? "success"
      : item.status === "STOCK_BAJO"
        ? "warning"
        : "error";

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Detalle de saldo"
      position="right"
      size={640}
      padding="lg"
      aria-label="Detalle de saldo del SKU"
    >
      <Stack gap="lg">
        <div>
          <Group justify="space-between" align="flex-start" mb="xs">
            <div>
              <Text size="xl" fw={700} c="dark">
                {item.productName}
              </Text>
              <Text size="sm" c="dimmed">
                SKU: <Text span fw={600}>{item.sku}</Text>
              </Text>
            </div>
            <StatusBadge semantic={statusSemantic} size="md">
              {item.status}
            </StatusBadge>
          </Group>
          <Text size="xs" c="dimmed">
            Ubicación: <Text span fw={500}>{item.locationName} ({item.locationId})</Text> · Categoría: {item.categoryName} · Marca: {item.brandName}
          </Text>
        </div>

        <Divider />

        <div>
          <Text size="sm" fw={600} mb="xs">
            Detalle de magnitudes
          </Text>
          <SimpleGrid cols={2} spacing="sm">
            <Paper p="lg" withBorder radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Unidades físicas
                  </Text>
                  <Text size="xl" fw={700}>
                    {item.onHand}
                  </Text>
                </div>
                <ThemeIcon variant="light" color="gray" size="lg">
                  <IconBox size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Físicamente en almacén
              </Text>
            </Paper>

            <Paper p="lg" withBorder radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Unidades reservadas
                  </Text>
                  <Text size="xl" fw={700}>
                    {item.reserved}
                  </Text>
                </div>
                <ThemeIcon variant="light" color="gray" size="lg">
                  <IconClock size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Comprometidas por ventas
              </Text>
            </Paper>

            <Paper p="lg" withBorder radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Unidades bloqueadas
                  </Text>
                  <Text size="xl" fw={700}>
                    {item.blocked}
                  </Text>
                </div>
                <ThemeIcon variant="light" color="gray" size="lg">
                  <IconLock size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                En cuarentena / incidencia
              </Text>
            </Paper>

            <Paper p="lg" withBorder radius="md">
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed">
                    Saldo disponible
                  </Text>
                  <Text size="xl" fw={700}>
                    {item.available}
                  </Text>
                </div>
                <ThemeIcon variant="light" color="gray" size="lg">
                  <IconCheck size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>
                Apto para venta comercial
              </Text>
            </Paper>
          </SimpleGrid>
        </div>

        <Paper p="lg" withBorder radius="md">
          <Text size="sm" fw={600} mb="xs">
            Umbral y trazabilidad
          </Text>
          <Grid>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">
                Umbral de stock bajo resuelto:
              </Text>
              <Text size="sm" fw={600}>
                {item.threshold} unidades
              </Text>
            </Grid.Col>
            <Grid.Col span={6}>
              <Text size="xs" c="dimmed">
                Versión de stock:
              </Text>
              <Text size="sm" fw={600}>
                v{item.stockVersion}
              </Text>
            </Grid.Col>
          </Grid>
        </Paper>

        <FeedbackAlert semantic="info" title="Trazabilidad y navegación contextual">
          Este desglose es de lectura autoritativa. Para evaluar tendencias y alertas de stock de este SKU y ubicación, puedes consultar el dashboard analítico.
        </FeedbackAlert>

        <Group justify="space-between" mt="md">
          <Button variant="outline" onClick={onClose}>
            Cerrar detalle
          </Button>
          <Button
            component={Link}
            to={`/inventario/dashboard?search=${encodeURIComponent(item.sku)}`}
            rightSection={<IconArrowRight size={16} />}
          >
            Ver en Dashboard
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
