import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import {
  IconAdjustments,
  IconChartBar,
  IconEye,
  IconTruckDelivery,
} from "@tabler/icons-react";
import {
  EntityTable,
  PageHeader,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { StockFilters } from "../components/StockFilters";
import { StockDetailDrawer } from "../components/StockDetailDrawer";
import { DevScenarioSelector } from "../dev/DevScenarioSelector";
import { useInventoryStock } from "../hooks/useInventoryStock";
import { useInventoryFilterOptions } from "../hooks/useInventoryFilterOptions";
import type { StockFiltersQuery, StockItem } from "../services/inventoryTypes";

export function StockControlPage() {
  const [params, setParams] = useSearchParams();

  const filters: StockFiltersQuery = useMemo(
    () => ({
      search: params.get("search") ?? params.get("sku") ?? "",
      locationId: params.get("locationId") ?? "all",
      status: params.get("status") ?? "all",
    }),
    [params],
  );

  const { items, loading, error, refetch } = useInventoryStock(filters);
  const { locations, loading: catalogLoading } = useInventoryFilterOptions();
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const isRevisionMode =
    import.meta.env.DEV && params.get("modoRevision") === "1";

  const handleFiltersChange = (next: StockFiltersQuery) => {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (next.search) nextParams.set("search", next.search);
      else {
        nextParams.delete("search");
        nextParams.delete("sku");
      }
      if (next.locationId && next.locationId !== "all") {
        nextParams.set("locationId", next.locationId);
      } else {
        nextParams.delete("locationId");
      }
      if (next.status && next.status !== "all") {
        nextParams.set("status", next.status);
      } else {
        nextParams.delete("status");
      }
      return nextParams;
    });
  };

  const handleResetFilters = () => {
    setParams(new URLSearchParams());
  };

  const columns: TableColumn<StockItem>[] = [
    {
      key: "sku",
      header: "SKU",
      width: 160,
      render: (row) => (
        <Text size="sm" fw={600}>
          {row.sku}
        </Text>
      ),
    },
    {
      key: "productName",
      header: "Producto",
      width: 240,
      render: (row) => (
        <div>
          <Text size="sm" fw={500}>
            {row.productName}
          </Text>
          <Text size="xs" c="dimmed">
            {row.categoryName} • {row.brandName}
          </Text>
        </div>
      ),
    },
    {
      key: "locationName",
      header: "Ubicación",
      width: 200,
      render: (row) => (
        <div>
          <Text size="sm">{row.locationName}</Text>
          <Text size="xs" c="dimmed">
            {row.locationId}
          </Text>
        </div>
      ),
    },
    {
      key: "onHand",
      header: "Físico",
      width: 90,
      align: "right",
      render: (row) => (
        <Text size="sm" fw={600}>
          {row.onHand}
        </Text>
      ),
    },
    {
      key: "reserved",
      header: "Reservado",
      width: 100,
      align: "right",
      render: (row) => <Text size="sm">{row.reserved}</Text>,
    },
    {
      key: "blocked",
      header: "Bloqueado",
      width: 100,
      align: "right",
      render: (row) => <Text size="sm">{row.blocked}</Text>,
    },
    {
      key: "available",
      header: "Disponible",
      width: 110,
      align: "right",
      render: (row) => (
        <Text size="sm" fw={700}>
          {row.available}
        </Text>
      ),
    },
    {
      key: "threshold",
      header: "Umbral",
      width: 80,
      align: "right",
      render: (row) => (
        <Text size="sm" c="dimmed">
          {row.threshold}
        </Text>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: 130,
      render: (row) => {
        const semantic =
          row.status === "DISPONIBLE"
            ? "success"
            : row.status === "STOCK_BAJO"
              ? "warning"
              : "error";
        return (
          <StatusBadge semantic={semantic} size="sm">
            {row.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "actions",
      header: "Acción",
      width: 80,
      align: "right",
      render: (row) => (
        <ActionIcon
          variant="subtle"
          size={32}
          aria-label="Ver detalle"
          title={`Ver detalle de ${row.sku} en ${row.locationName}`}
          onClick={() => setSelectedItem(row)}
        >
          <IconEye size={16} />
        </ActionIcon>
      ),
    },
  ];

  const tableState = loading
    ? { status: "loading" as const }
    : error
      ? {
          status: "error" as const,
          message: error,
          action: (
            <Button
              size="xs"
              variant="outline"
              onClick={refetch}
            >
              Reintentar consulta
            </Button>
          ),
        }
      : { status: "success" as const };

  return (
    <>
      <PageHeader
        title="Control de stock y disponibilidad"
        description="Consulta saldos por SKU y ubicación, unidades disponibles y reservas."
        breadcrumbs={[{ label: "Inventario" }, { label: "Control de stock" }]}
        actions={
          <Group gap="xs">
            <Button
              component={Link}
              to="/inventario/umbrales"
              variant="outline"
              leftSection={<IconAdjustments size={16} />}
            >
              Umbrales
            </Button>
            <Button
              component={Link}
              to="/inventario/traslados"
              variant="outline"
              leftSection={<IconTruckDelivery size={16} />}
            >
              Traslados
            </Button>
            <Button
              component={Link}
              to="/inventario/dashboard"
              leftSection={<IconChartBar size={16} />}
            >
              Dashboard analítico
            </Button>
          </Group>
        }
      />

      <Stack gap="lg">
        {isRevisionMode && <DevScenarioSelector />}


        <StockFilters
          filters={filters}
          locations={locations}
          loading={catalogLoading}
          onChange={handleFiltersChange}
          onReset={handleResetFilters}
        />

        <EntityTable
          caption="Tabla de inventario por SKU y ubicación física"
          columns={columns}
          rows={items}
          rowKey={(row) => `${row.sku}:${row.locationId}`}
          state={tableState}
          empty={{
            title: "No se encontraron saldos de stock",
            description:
              "No hay artículos que coincidan con los filtros de búsqueda o ubicación aplicados.",
            action: (
              <Button variant="outline" size="xs" onClick={handleResetFilters}>
                Limpiar filtros
              </Button>
            ),
          }}
        />
      </Stack>

      <StockDetailDrawer
        item={selectedItem}
        opened={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
