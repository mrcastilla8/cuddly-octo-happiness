import { Button, Group, Select, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";
import { FilterBar } from "../../../components/shared";
import type { StockFiltersQuery } from "../services/inventoryTypes";
import type { InventoryLocationOption } from "../services/inventoryCatalogRepository";

interface StockFiltersProps {
  filters: StockFiltersQuery;
  locations?: InventoryLocationOption[];
  loading?: boolean;
  onChange: (next: StockFiltersQuery) => void;
  onReset: () => void;
}

export function StockFilters({
  filters,
  locations = [],
  loading = false,
  onChange,
  onReset,
}: StockFiltersProps) {
  const locationData = [
    { value: "all", label: "Todas las ubicaciones" },
    ...locations.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })),
  ];

  return (
    <FilterBar>
      <TextInput
        placeholder="Buscar SKU o producto..."
        leftSection={<IconSearch size={16} />}
        value={filters.search ?? ""}
        onChange={(e) =>
          onChange({ ...filters, search: e.currentTarget.value })
        }
        style={{ flex: 1, minWidth: 240 }}
        aria-label="Buscar SKU o producto"
      />
      <Select
        placeholder="Ubicación"
        value={filters.locationId ?? "all"}
        data={locationData}
        disabled={loading}
        onChange={(val) =>
          onChange({ ...filters, locationId: val ?? "all" })
        }
        style={{ minWidth: 200 }}
        aria-label="Filtrar por ubicación"
      />
      <Select
        placeholder="Estado de stock"
        value={filters.status ?? "all"}
        data={[
          { value: "all", label: "Todos los estados" },
          { value: "DISPONIBLE", label: "Disponible" },
          { value: "STOCK_BAJO", label: "Stock bajo" },
          { value: "AGOTADO", label: "Agotado" },
        ]}
        onChange={(val) =>
          onChange({ ...filters, status: val ?? "all" })
        }
        style={{ minWidth: 160 }}
        aria-label="Filtrar por estado"
      />
      <Group gap="xs">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconX size={16} />}
          onClick={onReset}
        >
          Limpiar
        </Button>
      </Group>
    </FilterBar>
  );
}
