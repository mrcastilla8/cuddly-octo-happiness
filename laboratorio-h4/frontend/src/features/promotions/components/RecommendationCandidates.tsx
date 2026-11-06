import { Button, Select, Text, Textarea, TextInput } from "@mantine/core";
import { EntityTable, type TableColumn } from "../../../components/shared";
import {
  criterionLabel,
  superiorityChoices,
  type RecommendationDraft,
  type RecommendedProduct,
} from "../services/recommendationRepository";
import type { CatalogProductChoice } from "../services/catalogRepository";
export function RecommendationCandidates({
  draft,
  products,
  onChange,
  errors = {},
  disabled = false,
}: {
  draft: RecommendationDraft;
  products: CatalogProductChoice[];
  onChange?: (candidates: RecommendedProduct[]) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const name = (id: string) =>
    products.find((item) => item.id === id)?.name ?? "Producto no disponible";
  const update = (index: number, patch: Partial<RecommendedProduct>) =>
    onChange?.(
      draft.candidates.map((item, row) =>
        row === index ? { ...item, ...patch } : item,
      ),
    );
  const rows = draft.candidates.map((item, index) => ({ ...item, index }));
  if (!onChange)
    rows.sort((left, right) => Number(left.order) - Number(right.order));
  const columns: TableColumn<RecommendedProduct & { index: number }>[] = [
    {
      key: "product",
      header: "Producto recomendado",
      width: onChange ? 140 : 170,
      render: (row) => (
        <>
          <Text size="sm" fw={600}>
            {name(row.productId)}
          </Text>
          {products.some(item => item.id === row.productId && !item.active) && (
            <Text size="sm">Inactivo · asociación conservada</Text>
          )}
          {errors[`candidate-${row.index}`] && (
            <Text size="sm" c="var(--po-errorText)" role="alert">
              {errors[`candidate-${row.index}`]}
            </Text>
          )}
        </>
      ),
    },
    {
      key: "order",
      header: "Orden",
      width: 90,
      render: (row) =>
        onChange ? (
          <div data-field={`order-${row.index}`}>
            <TextInput
              label="Orden"
              aria-label={`Orden de ${name(row.productId)}`}
              inputMode="numeric"
              value={row.order}
              disabled={disabled}
              error={errors[`order-${row.index}`]}
              onChange={(event) =>
                update(row.index, { order: event.currentTarget.value })
              }
            />
          </div>
        ) : (
          row.order
        ),
    },
    ...(draft.kind === "upsell"
      ? [
          {
            key: "criterion",
            header: "Criterio de superioridad",
            width: 245,
            render: (row: RecommendedProduct & { index: number }) =>
              onChange ? (
                <div data-field={`criterion-${row.index}`}>
                  <Select
                    label="Criterio"
                    aria-label={`Criterio para ${name(row.productId)}`}
                    value={row.criterion || null}
                    data={superiorityChoices}
                    required
                    disabled={disabled}
                    error={errors[`criterion-${row.index}`]}
                    onChange={(value) => {
                      const choice = superiorityChoices.find(
                        (item) => item.value === value,
                      );
                      if (choice)
                        update(row.index, { criterion: choice.value });
                    }}
                  />
                </div>
              ) : (
                criterionLabel(row.criterion)
              ),
          },
          {
            key: "justification",
            header: "Justificación comercial",
            width: 225,
            render: (row: RecommendedProduct & { index: number }) =>
              onChange ? (
                <div data-field={`justification-${row.index}`}>
                  <Textarea
                    label="Justificación"
                    aria-label={`Justificación para ${name(row.productId)}`}
                    value={row.justification}
                    disabled={disabled}
                    description="Opcional, hasta 500 caracteres."
                    error={errors[`justification-${row.index}`]}
                    onChange={(event) =>
                      update(row.index, {
                        justification: event.currentTarget.value,
                      })
                    }
                  />
                </div>
              ) : (
                row.justification || "Sin justificación"
              ),
          },
        ]
      : []),
    ...(onChange
      ? [
          {
            key: "actions",
            header: "Acciones",
            width: 95,
            render: (row: RecommendedProduct & { index: number }) => (
              <div data-field={`candidate-${row.index}`}>
                <Button
                  variant="subtle"
                  size="sm"
                  disabled={disabled}
                  aria-label={`Quitar ${name(row.productId)}`}
                  onClick={() =>
                    onChange(
                      draft.candidates.filter(
                        (_, index) => index !== row.index,
                      ),
                    )
                  }
                >
                  Quitar
                </Button>
              </div>
            ),
          },
        ]
      : [
          {
            key: "price",
            header: "Precio informativo",
            width: 135,
            render: () => "No disponible",
          },
          {
            key: "availability",
            header: "Disponibilidad",
            width: 135,
            render: () => "No disponible",
          },
        ]),
  ];
  return (
    <EntityTable
      caption="Productos recomendados"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.productId}
      state={{ status: "success" }}
      empty={{
        title: "Sin productos recomendados",
        description: "Selecciona productos activos distintos del origen.",
      }}
    />
  );
}
