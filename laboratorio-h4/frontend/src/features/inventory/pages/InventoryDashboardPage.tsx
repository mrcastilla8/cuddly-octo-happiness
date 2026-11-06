import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ActionIcon,
  Button,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconBox,
  IconEye,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  EntityTable,
  FeedbackAlert,
  FilterBar,
  PageHeader,
  SectionCard,
  StatusBadge,
  type TableColumn,
} from "../../../components/shared";
import { DashboardAlerts } from "../components/DashboardAlerts";
import { DashboardKpiGrid } from "../components/DashboardKpiGrid";
import { LocationDistributionTable } from "../components/LocationDistributionTable";
import { StockDetailDrawer } from "../components/StockDetailDrawer";
import { DevScenarioSelector } from "../dev/DevScenarioSelector";
import { useInventoryDashboard } from "../hooks/useInventoryDashboard";
import { useInventoryFilterOptions } from "../hooks/useInventoryFilterOptions";
import type {
  DashboardFiltersQuery,
  StockItem,
} from "../services/inventoryTypes";

export function InventoryDashboardPage() {
  const [params, setParams] = useSearchParams();

  const filters: DashboardFiltersQuery = useMemo(
    () => ({
      search: params.get("search") ?? "",
      category: params.get("category") ?? "all",
      brand: params.get("brand") ?? "all",
      locationId: params.get("locationId") ?? "all",
      status: params.get("status") ?? "all",
    }),
    [params],
  );

  const {
    kpis,
    generatedAt,
    alerts,
    distribution,
    stockItems,
    loading,
    sections,
    refetch,
  } = useInventoryDashboard(filters);

  const {
    categories,
    brands,
    locations,
    loading: catalogLoading,
    errors: catalogErrors,
    reload: reloadCatalogOptions,
  } = useInventoryFilterOptions();

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const isRevisionMode =
    import.meta.env.DEV && params.get("modoRevision") === "1";

  const handleFilterChange = (key: keyof DashboardFiltersQuery, val: string | null) => {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (val && val !== "all") nextParams.set(key, val);
      else nextParams.delete(key);
      return nextParams;
    });
  };

  const handleResetFilters = () => {
    setParams(new URLSearchParams());
  };

  const categoryOptions = [
    { value: "all", label: "Todas las categorías" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const brandOptions = [
    { value: "all", label: "Todas las marcas" },
    ...brands.map((b) => ({ value: b.id, label: b.name })),
  ];

  const locationOptions = [
    { value: "all", label: "Todas las ubicaciones" },
    ...locations.map((l) => ({ value: l.id, label: l.name })),
  ];

  const columns: TableColumn<StockItem>[] = [
    {
      key: "sku",
      header: "SKU",
      width: 150,
      render: (row) => (
        <Text size="sm" fw={600}>
          {row.sku}
        </Text>
      ),
    },
    {
      key: "productName",
      header: "Producto",
      width: 220,
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
      width: 190,
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
      width: 90,
      align: "right",
      render: (row) => <Text size="sm">{row.reserved}</Text>,
    },
    {
      key: "blocked",
      header: "Bloqueado",
      width: 90,
      align: "right",
      render: (row) => <Text size="sm">{row.blocked}</Text>,
    },
    {
      key: "available",
      header: "Disponible",
      width: 100,
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
      width: 120,
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
    : sections.stockItems.error
      ? {
          status: "error" as const,
          message: sections.stockItems.error,
          action: (
            <Button
              size="xs"
              variant="outline"
              onClick={refetch}
            >
              Reintentar
            </Button>
          ),
        }
      : { status: "success" as const };

  return (
    <>
      <PageHeader
        title="Dashboard analítico y alertas de stock"
        description="Monitorea disponibilidad, bloqueos y traslados por ubicación sin modificar los saldos."
        breadcrumbs={[
          { label: "Inventario" },
          { label: "Dashboard analítico" },
        ]}
        actions={
          <Button
            component={Link}
            to="/inventario"
            variant="outline"
            leftSection={<IconBox size={16} />}
          >
            Ir a Control de stock
          </Button>
        }
      />

      <Stack gap="xl">
        <Text
          size="sm"
          style={{
            color: "var(--po-secondary)",
            fontSize: 14,
            lineHeight: "20px",
          }}
          fw={600}
        >
          Panel de solo lectura
        </Text>

        {isRevisionMode && <DevScenarioSelector />}


        {(catalogErrors.categories ||
          catalogErrors.brands ||
          catalogErrors.locations) && (
          <FeedbackAlert
            semantic="warning"
            title="No se pudieron cargar algunas opciones de filtro"
            actions={
              <Button
                size="xs"
                variant="outline"
                onClick={reloadCatalogOptions}
              >
                Reintentar filtros
              </Button>
            }
          >
            {catalogErrors.categories && (
              <Text size="sm">Categorías: {catalogErrors.categories}</Text>
            )}
            {catalogErrors.brands && (
              <Text size="sm">Marcas: {catalogErrors.brands}</Text>
            )}
            {catalogErrors.locations && (
              <Text size="sm">Ubicaciones: {catalogErrors.locations}</Text>
            )}
            <Text size="sm" mt={4}>
              Los filtros que sí cargaron siguen operativos.
            </Text>
          </FeedbackAlert>
        )}

        {/* Zona 2: Alertas activas */}
        <div>
          <Title order={2} size="h3" mb="sm">
            Alertas operativas de inventario
          </Title>
          <DashboardAlerts
            alerts={alerts}
            loading={loading}
            error={sections.alerts.error}
            blockedReason={sections.alerts.blockedReason}
            onRetry={refetch}
          />
        </div>

        {/* Zona 3: 12 KPIs normativos */}
        <div>
          <Group justify="space-between" align="baseline" mb="sm">
            <Title order={2} size="h3">
              Resumen de indicadores clave
            </Title>
            {generatedAt && (
              <Text size="xs" c="dimmed">
                Fecha/hora de generación: {generatedAt}
              </Text>
            )}
          </Group>
          <DashboardKpiGrid
            kpis={kpis}
            loading={loading}
            error={sections.kpis.error}
            blockedReason={sections.kpis.blockedReason}
            onRetry={refetch}
          />
        </div>

        {/* Zona 4: Distribución por ubicación */}
        <LocationDistributionTable
          distribution={distribution}
          loading={loading}
          error={sections.distribution.error}
          blockedReason={sections.distribution.blockedReason}
          onRetry={refetch}
        />

        {/* Zona 5: Tabla analítica de inventario */}
        <SectionCard
          title="Inventario analítico por SKU"
          description="Consulta detallada de disponibilidad por SKU y ubicación."
        >
          <Stack gap="md">
            <FilterBar>
              <TextInput
                placeholder="Buscar SKU o producto..."
                leftSection={<IconSearch size={16} />}
                value={filters.search ?? ""}
                onChange={(e) => handleFilterChange("search", e.currentTarget.value)}
                style={{ flex: 1, minWidth: 220 }}
                aria-label="Buscar en inventario"
              />
              <Select
                placeholder="Categoría"
                value={filters.category ?? "all"}
                data={categoryOptions}
                disabled={catalogLoading}
                onChange={(val) => handleFilterChange("category", val)}
                style={{ minWidth: 160 }}
                aria-label="Filtrar por categoría"
              />
              <Select
                placeholder="Marca"
                value={filters.brand ?? "all"}
                data={brandOptions}
                disabled={catalogLoading}
                onChange={(val) => handleFilterChange("brand", val)}
                style={{ minWidth: 160 }}
                aria-label="Filtrar por marca"
              />
              <Select
                placeholder="Ubicación"
                value={filters.locationId ?? "all"}
                data={locationOptions}
                disabled={catalogLoading}
                onChange={(val) => handleFilterChange("locationId", val)}
                style={{ minWidth: 180 }}
                aria-label="Filtrar por ubicación"
              />
              <Select
                placeholder="Estado"
                value={filters.status ?? "all"}
                data={[
                  { value: "all", label: "Todos los estados" },
                  { value: "DISPONIBLE", label: "Disponible" },
                  { value: "STOCK_BAJO", label: "Stock bajo" },
                  { value: "AGOTADO", label: "Agotado" },
                ]}
                onChange={(val) => handleFilterChange("status", val)}
                style={{ minWidth: 150 }}
                aria-label="Filtrar por estado"
              />
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconX size={16} />}
                onClick={handleResetFilters}
              >
                Limpiar
              </Button>
            </FilterBar>

            {sections.stockItems.blockedReason ? (
              <FeedbackAlert
                semantic="warning"
                title="Existencias por SKU no verificables con el contrato vigente"
              >
                {sections.stockItems.blockedReason}
              </FeedbackAlert>
            ) : (
              <EntityTable
                caption="Existencias detalladas filtrables en almacenes y tiendas"
                columns={columns}
                rows={stockItems}
                rowKey={(row) => `${row.sku}:${row.locationId}`}
                state={tableState}
                empty={{
                  title: "No se encontraron saldos de stock",
                  description:
                    "No se encontraron SKUs para los criterios seleccionados.",
                  action: (
                    <Button variant="outline" size="xs" onClick={handleResetFilters}>
                      Limpiar filtros
                    </Button>
                  ),
                }}
              />
            )}
          </Stack>
        </SectionCard>
      </Stack>

      <StockDetailDrawer
        item={selectedItem}
        opened={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
