import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Button, Checkbox, Group, Stack, Text } from "@mantine/core";
import {
  EmptyState,
  FeedbackAlert,
  PageHeader,
  SearchField,
  SectionCard,
} from "../../../components/shared";
import type { RecommendationEditorContext } from "./RecommendationEditorLayout";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
export function RecommendationSelectorPage() {
  const { form, products, catalogLoading, catalogError, root, suffix } =
    useOutletContext<RecommendationEditorContext>();
  const [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState<string>();
  const navigate = useNavigate();
  const existing = new Set(form.draft.candidates.map((item) => item.productId));
  const options = products.filter(
    (item) =>
      item.active && !existing.has(item.id) &&
      !(
        form.draft.originType === "product" && item.id === form.draft.originId
      ) &&
      item.name
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  return (
    <>
      <PageHeader
        title="Seleccionar productos recomendados"
        description="El origen específico, los productos inactivos y los ya añadidos se excluyen. La selección es a nivel producto."
      />
      <Stack gap="lg">
        <PromotionDataNotice kind="recommendation-selector" />
        <SearchField
          label="Buscar productos"
          value={search}
          onChange={setSearch}
        />
        {catalogLoading && <Text role="status">Consultando productos…</Text>}
        {catalogError && (
          <FeedbackAlert semantic="error" title="Productos no disponibles">
            {catalogError} Los candidatos anteriores se conservan.
          </FeedbackAlert>
        )}
        {!catalogLoading && !catalogError && !options.length && (
          <EmptyState
            title="Sin candidatos elegibles"
            description="No hay productos activos disponibles con esta consulta."
            action={
              <Button variant="outline" onClick={() => setSearch("")}>
                Limpiar búsqueda
              </Button>
            }
          />
        )}
        <SectionCard title="Candidatos activos">
          {options.map((item) => (
            <Checkbox
              key={item.id}
              label={item.name}
              checked={selected.includes(item.id)}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setSelected((current) =>
                  checked
                    ? [...current, item.id]
                    : current.filter((id) => id !== item.id),
                );
              }}
            />
          ))}
        </SectionCard>
        <Text size="sm">
          {selected.length} productos seleccionados para añadir.{" "}
          {form.draft.candidates.length} candidatos anteriores conservados.
        </Text>
        {error && (
          <FeedbackAlert semantic="error" title="Selección incompleta">
            {error}
          </FeedbackAlert>
        )}
        <Group justify="flex-end" gap="sm">
          <Button component={Link} variant="outline" to={`${root}${suffix}`}>
            Cancelar selección
          </Button>
          <Button
            disabled={catalogLoading || !!catalogError}
            onClick={() => {
              if (!selected.length) {
                setError("Selecciona al menos un producto para añadir.");
                return;
              }
              const maxOrder = form.draft.candidates.reduce(
                (max, item) =>
                  Math.max(
                    max,
                    Number.isSafeInteger(Number(item.order))
                      ? Number(item.order)
                      : 0,
                  ),
                0,
              );
              form.update({
                ...form.draft,
                candidates: [
                  ...form.draft.candidates,
                  ...selected.map((id, index) => ({
                    productId: id,
                    order: String(maxOrder + index + 1),
                    criterion: "" as const,
                    justification: "",
                  })),
                ],
              });
              navigate(`${root}${suffix}`);
            }}
          >
            Confirmar selección
          </Button>
        </Group>
      </Stack>
    </>
  );
}
