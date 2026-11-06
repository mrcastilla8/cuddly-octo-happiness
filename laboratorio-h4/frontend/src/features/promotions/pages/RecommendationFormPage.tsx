import { useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import {
  ConfirmDialog,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { EditorMessage } from "../components/EditorMessage";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
import { RecommendationCandidates } from "../components/RecommendationCandidates";
import {
  recommendationKindLabel,
  type RecommendationDraft,
} from "../services/recommendationRepository";
import type { RecommendationEditorContext } from "./RecommendationEditorLayout";
export function RecommendationFormPage() {
  const {
    form,
    initial,
    products,
    categories,
    catalogError,
    root,
    suffix,
    navigationBlocked,
  } = useOutletContext<RecommendationEditorContext>();
  const navigate = useNavigate(),
    formRef = useRef<HTMLFormElement>(null),
    draft = form.draft;
  const [pendingOrigin, setPendingOrigin] = useState<
    "product" | "category" | null
  >(null);
  const disabled = form.submitting || form.unknown;
  const update = <K extends keyof RecommendationDraft>(
    key: K,
    value: RecommendationDraft[K],
  ) => form.update({ ...draft, [key]: value });
  const originChoices = (draft.originType === "category" ? categories : products)
    .filter(item => item.active || item.id === draft.originId);
  const changeOriginType = (value: string | null) => {
    if (value !== "product" && value !== "category") return;
    if (value === draft.originType) return;
    if (draft.originId) setPendingOrigin(value);
    else form.update({ ...draft, originType: value, originId: "" });
  };
  const cancel = () =>
    navigate(
      initial
        ? `/recomendaciones/${initial.id}${suffix}`
        : `/recomendaciones${suffix}`,
    );
  const field = (
    name: "name" | "priority" | "validFrom" | "validUntil",
    label: string,
    type = "text",
  ) => (
    <div data-field={name}>
      <TextInput
        label={label}
        aria-label={label}
        required
        type={type}
        value={draft[name]}
        onChange={(event) => update(name, event.currentTarget.value)}
        disabled={disabled}
        error={form.errors[name]}
        description={
          type === "datetime-local"
            ? "America/Lima (UTC−5)."
            : name === "priority"
              ? "Entero positivo. 1 es la mayor prioridad."
              : undefined
        }
      />
    </div>
  );
  return (
    <>
      <PageHeader
        title={
          initial
            ? `Editar regla — ${initial.name}`
            : draft.kind === "upsell"
              ? "Crear regla de upselling"
              : "Crear regla de venta cruzada"
        }
        breadcrumbs={[
          { label: "Reglas de recomendación", to: `/recomendaciones${suffix}` },
          { label: initial ? "Editar" : recommendationKindLabel(draft.kind) },
        ]}
      />
      <PromotionDataNotice kind="recommendation-form" />
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit((name) =>
            requestAnimationFrame(() =>
              formRef.current
                ?.querySelector<HTMLElement>(
                  `[data-field="${name}"] input, [data-field="${name}"] button, [data-field="${name}"] textarea`,
                )
                ?.focus(),
            ),
          );
        }}
      >
        <Stack gap="lg" maw={880} mt="lg">
          <EditorMessage
            message={form.message}
            unknown={form.unknown}
            conflict={form.conflict}
            checking={form.checking}
            consult={() => void form.consult()}
            recoveryMessage={form.recoveryMessage}
            currentName={form.current?.name}
            onList={() => navigate(`/recomendaciones${suffix}`)}
          />
          <SectionCard
            title="Identificación y origen"
            actions={
              <StatusBadge>{recommendationKindLabel(draft.kind)}</StatusBadge>
            }
          >
            {field("name", "Nombre de la regla")}
            <Stack data-field="origin" gap="md">
              <Select
                label="Tipo de origen"
                aria-label="Tipo de origen"
                required
                value={draft.originType || null}
                disabled={disabled}
                data={[
                  { value: "product", label: "Producto" },
                  { value: "category", label: "Categoría" },
                ]}
                onChange={changeOriginType}
                error={!draft.originType ? form.errors.origin : undefined}
              />
              <Select
                label={
                  draft.originType === "category"
                    ? "Categoría de origen"
                    : "Producto de origen"
                }
                aria-label={
                  draft.originType === "category"
                    ? "Categoría de origen"
                    : "Producto de origen"
                }
                required
                value={draft.originId || null}
                disabled={disabled || !draft.originType || !!catalogError}
                data={originChoices.map((item) => ({
                  value: item.id,
                  label: item.name,
                  disabled: !item.active,
                }))}
                onChange={(value) => update("originId", value ?? "")}
                error={draft.originType ? form.errors.origin : undefined}
              />
            </Stack>
            {draft.originType === "product" && products.some(item => item.id === draft.originId && !item.active) && (
              <Text size="sm">El producto de origen está inactivo. Su asociación se conserva hasta que elijas otro origen.</Text>
            )}
            {catalogError && (
              <FeedbackAlert
                semantic="warning"
                title="Referencias no disponibles"
              >
                {catalogError} El borrador se conserva.
                {draft.originId && <Text size="sm">Referencia de origen conservada: {draft.originId}</Text>}
              </FeedbackAlert>
            )}
            {!initial ? (
              <div data-field="status">
                <Select
                  label="Estado inicial"
                  aria-label="Estado inicial"
                  required
                  value={draft.status || null}
                  disabled={disabled}
                  data={[
                    { value: "active", label: "Activa" },
                    { value: "inactive", label: "Inactiva" },
                  ]}
                  onChange={(value) => {
                    if (value === "active" || value === "inactive")
                      update("status", value);
                  }}
                  error={form.errors.status}
                />
              </div>
            ) : (
              <Text size="sm">
                La edición conserva el tipo de regla y el estado se cambia
                mediante confirmación desde el detalle.
              </Text>
            )}
          </SectionCard>
          <SectionCard title="Vigencia y prioridad">
            {field("validFrom", "Fecha y hora de inicio", "datetime-local")}
            {field("validUntil", "Fecha y hora de fin", "datetime-local")}
            {field("priority", "Prioridad")}
          </SectionCard>
          <SectionCard
            title="Productos recomendados"
            description={
              draft.kind === "upsell"
                ? "Cada producto necesita un criterio explícito, sin valores preseleccionados. La justificación es opcional."
                : "Selecciona complementos activos distintos del producto de origen."
            }
          >
            <RecommendationCandidates
              draft={draft}
              products={products}
              errors={form.errors}
              disabled={disabled}
              onChange={(candidates) => update("candidates", candidates)}
            />
            {form.errors.candidates && (
              <Text role="alert" c="var(--po-errorText)" size="sm">
                {form.errors.candidates}
              </Text>
            )}
            <div data-field="candidates">
              <Button
                component={Link}
                to={`${root}/productos${suffix}`}
                disabled={disabled}
                variant="outline"
              >
                Seleccionar productos recomendados
              </Button>
            </div>
          </SectionCard>
          <Group justify="flex-end" gap="sm">
            <Button
              variant="outline"
              disabled={form.submitting}
              onClick={cancel}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={form.submitting}
              disabled={disabled || (form.conflict && !form.current)}
            >
              {initial
                ? form.conflict
                  ? "Guardar propuesta revisada"
                  : "Guardar cambios"
                : draft.kind === "upsell"
                  ? "Crear regla de upselling"
                  : "Crear regla de venta cruzada"}
            </Button>
          </Group>
        </Stack>
      </form>
      <ConfirmDialog
        opened={pendingOrigin !== null && !navigationBlocked}
        title="Cambiar tipo de origen"
        confirmLabel="Cambiar origen"
        onCancel={() => setPendingOrigin(null)}
        onConfirm={() => {
          if (pendingOrigin)
            form.update({ ...draft, originType: pendingOrigin, originId: "" });
          setPendingOrigin(null);
        }}
      >
        <Text size="sm">
          Se descartará la referencia de origen anterior para elegir otra del
          tipo correcto. Los candidatos y demás datos del borrador se conservan.
        </Text>
      </ConfirmDialog>
    </>
  );
}
