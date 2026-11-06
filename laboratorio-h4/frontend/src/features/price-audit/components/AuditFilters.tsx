import { useState } from "react";
import { Button, TextInput } from "@mantine/core";
import { FilterBar } from "../../../components/shared";
import {
  appliedFilters,
  filterLabels,
  fromLocal,
  toLocal,
  validateAuditFilters,
} from "../services/auditPresentation";
import type {
  AuditFilters as Filters,
  AuditQuery,
} from "../services/auditRepository";

export function AuditFilters({
  query,
  onApply,
  onClear,
}: {
  query: AuditQuery;
  onApply: (filters: Filters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState(appliedFilters(query));
  const [error, setError] = useState<string>();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const message = validateAuditFilters(draft);
        setError(message);
        if (!message) onApply(draft);
      }}
    >
      <FilterBar align="flex-start">
        {(Object.keys(filterLabels) as (keyof Filters)[]).map((field) => {
          const date = field === "desde" || field === "hasta";
          return (
            <TextInput
              key={field}
              label={filterLabels[field]}
              style={{ flex: "1 1 280px", minWidth: 0 }}
              type={date ? "datetime-local" : "text"}
              description={date ? "America/Bogota (UTC−5)" : undefined}
              value={date ? toLocal(draft[field]) : draft[field]}
              error={field === "desde" ? error : undefined}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setDraft((previous) => ({
                  ...previous,
                  [field]: date ? fromLocal(value) : value,
                }));
              }}
            />
          );
        })}
        <Button type="submit">Aplicar filtros</Button>
        <Button variant="outline" onClick={onClear}>
          Limpiar filtros
        </Button>
      </FilterBar>
    </form>
  );
}
