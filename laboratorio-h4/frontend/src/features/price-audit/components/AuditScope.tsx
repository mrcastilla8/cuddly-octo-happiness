import { Stack, Text } from "@mantine/core";
import { SectionCard } from "../../../components/shared";
import { dateLabel, filterLabels } from "../services/auditPresentation";
import type { AuditFilters } from "../services/auditRepository";

export function AuditScope({
  filters,
  total,
}: {
  filters: AuditFilters;
  total?: number;
}) {
  return (
    <SectionCard
      title="Filtros aplicados"
      description={
        total === undefined
          ? "Cantidad no disponible."
          : `${total.toLocaleString("es-PE")} registros encontrados.`
      }
    >
      <Stack gap="xs">
        {(Object.keys(filterLabels) as (keyof AuditFilters)[]).map((key) => (
          <Text key={key} size="sm">
            {filterLabels[key]}:{" "}
            {filters[key]
              ? key === "desde" || key === "hasta"
                ? dateLabel(filters[key])
                : filters[key]
              : "Sin filtro"}
          </Text>
        ))}
      </Stack>
    </SectionCard>
  );
}
