import { Button, Select, Text } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { FilterBar } from "../../../components/shared";
import type { PriceQuery, PriceTarget } from "../services/pricingRepository";

export function PriceFilters({
  targets,
  draft,
  applied,
  onChange,
  onConsult,
}: {
  targets: readonly PriceTarget[];
  draft: PriceQuery;
  applied: PriceQuery;
  onChange: (query: PriceQuery) => void;
  onConsult: () => void;
}) {
  const product =
    targets.find((target) => target.id === draft.targetId)?.kind === "product";
  const appliedName = targets.find(
    (target) => target.id === applied.targetId,
  )?.label;
  return (
    <FilterBar
      align="flex-start"
      summary={`Consulta aplicada: ${appliedName} · ${applied.channel === "retail" ? "Retail solicitado" : "Global"}`}
    >
      <Select
        label="Producto o SKU"
        value={draft.targetId}
        data={targets.map((item) => ({
          value: item.id,
          label: item.label,
        }))}
        searchable
        allowDeselect={false}
        style={{ flex: "1 1 440px" }}
        onChange={(value) => {
          const target = targets.find((item) => item.id === value);
          if (target)
            onChange({
              targetId: target.id,
              channel: target.kind === "product" ? "global" : draft.channel,
            });
        }}
      />
      <Select
        label="Canal de consulta"
        value={draft.channel}
        data={[
          { value: "global", label: "Global" },
          { value: "retail", label: "Retail" },
        ]}
        disabled={product}
        description={
          product
            ? "La lectura base del producto no admite filtro de canal."
            : "El precio efectivo puede resolver al alcance global."
        }
        allowDeselect={false}
        style={{ flex: "1 1 240px" }}
        onChange={(value) => {
          if (value === "global" || value === "retail")
            onChange({ ...draft, channel: value });
        }}
      />
      <Button
        mt="lg"
        leftSection={<IconSearch size={20} stroke={2} aria-hidden="true" />}
        onClick={onConsult}
      >
        Consultar
      </Button>
      {(draft.targetId !== applied.targetId ||
        draft.channel !== applied.channel) && (
        <Text size="sm">
          Selección pendiente: pulsa Consultar para aplicar los cambios.
        </Text>
      )}
    </FilterBar>
  );
}
