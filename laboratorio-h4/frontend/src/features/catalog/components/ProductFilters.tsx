import { Button, Group, Select, SimpleGrid } from "@mantine/core";
import { FilterBar, SearchField } from "../../../components/shared";
import type { CatalogQuery } from "../services/catalogRepository";
import type {
  TaxonomyCategory,
  TaxonomyProductType,
} from "../services/taxonomyRepository";

interface ProductFiltersProps {
  loading?: boolean;
  query: CatalogQuery;
  categories: TaxonomyCategory[];
  productTypes: TaxonomyProductType[];
  total: number;
  shownCount: number;
  onChange: (patch: Partial<CatalogQuery>) => void;
  onClear: () => void;
}

export function ProductFilters({
  loading,
  query,
  categories,
  productTypes,
  total,
  shownCount,
  onChange,
  onClear,
}: ProductFiltersProps) {
  const categoryOptions = [
    { value: "all", label: "Todas las categorías" },
    ...categories.map((c) => ({ value: c.id, label: c.nombre })),
  ];

  const typeOptions = [
    { value: "all", label: "Todos los tipos" },
    ...productTypes.map((t) => ({ value: t.id, label: t.nombre })),
  ];

  const modelOptions = [
    { value: "all", label: "Modelo: Todos" },
    { value: "simple", label: "Simple" },
    { value: "variants", label: "Con variantes" },
  ];

  const statusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "ACTIVO", label: "Activo" },
    { value: "BORRADOR", label: "Borrador" },
    { value: "INACTIVO", label: "Inactivo" },
  ];

  const hasActiveFilters = Boolean(
    (query.q && query.q.trim()) ||
      (query.categoryId && query.categoryId !== "all") ||
      (query.typeId && query.typeId !== "all") ||
      (query.saleModel && query.saleModel !== "all") ||
      (query.status && query.status !== "all"),
  );

  return (
    <FilterBar
      summary={`Mostrando ${shownCount} de ${total} productos`}
      applied={
        hasActiveFilters ? (
          <Button
            variant="subtle"
            size="sm"
            onClick={onClear}
          >
            Limpiar filtros
          </Button>
        ) : undefined
      }
    >
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="sm" w="100%">
        <div style={{ gridColumn: "span 2" }}>
          <SearchField
            label="Búsqueda"
            placeholder="Buscar por nombre, SKU base o descripción..."
            value={query.q || ""}
            onChange={(val) => onChange({ q: val, page: 1 })}
          />
        </div>

        <Select
          disabled={loading}
          label="Categoría"
          data={categoryOptions}
          value={query.categoryId || "all"}
          onChange={(val) => onChange({ categoryId: val || "all", page: 1 })}
        />

        <Select
          label="Tipo"
          disabled={loading}
          data={typeOptions}
          value={query.typeId || "all"}
          onChange={(val) => onChange({ typeId: val || "all", page: 1 })}
        />

        <Select
          label="Modelo"
          data={modelOptions}
          value={query.saleModel || "all"}
          onChange={(val) =>
            onChange({
              saleModel: (val as "all" | "simple" | "variants") || "all",
              page: 1,
            })
          }
        />
      </SimpleGrid>

      <Group justify="space-between" mt="xs" w="100%">
        <Group gap="sm">
          <Select
            size="xs"
            w={220}
            aria-label="Estado del producto"
            data={statusOptions}
            value={query.status || "all"}
            onChange={(val) =>
              onChange({
                status: (val as CatalogQuery["status"]) || "all",
                page: 1,
              })
            }
          />
        </Group>
      </Group>
    </FilterBar>
  );
}
