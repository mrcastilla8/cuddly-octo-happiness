import { useRef } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import {
  Button,
  Checkbox,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  FeedbackAlert,
  PageHeader,
  SectionCard,
} from "../../../components/shared";
import { CampaignScope } from "../components/CampaignScope";
import { EditorMessage } from "../components/EditorMessage";
import { PromotionDataNotice } from "../components/PromotionDataNotice";
import {
  channelChoices,
  type CampaignDraft,
} from "../services/campaignRepository";
import type { CampaignEditorContext } from "./CampaignEditorLayout";
export function CampaignFormPage() {
  const { form, initial, root, suffix, products, catalogError } =
    useOutletContext<CampaignEditorContext>();
  const navigate = useNavigate(),
    formRef = useRef<HTMLFormElement>(null),
    draft = form.draft;
  const disabled = form.submitting || form.unknown;
  const update = <K extends keyof CampaignDraft>(
    key: K,
    value: CampaignDraft[K],
  ) => form.update({ ...draft, [key]: value });
  const cancel = () =>
    navigate(
      initial ? `/promociones/${initial.id}${suffix}` : `/promociones${suffix}`,
    );
  const field = (
    name: string,
    label: string,
    extra: {
      type?: string;
      inputMode?: "decimal" | "numeric";
      description?: string;
    } = {},
  ) => (
    <div data-field={name}>
      <TextInput
        label={label}
        aria-label={label}
        required
        name={name}
        value={
          draft[
            name as "name" | "benefit" | "priority" | "validFrom" | "validUntil"
          ]
        }
        onChange={(event) =>
          update(
            name as
              | "name"
              | "benefit"
              | "priority"
              | "validFrom"
              | "validUntil",
            event.currentTarget.value,
          )
        }
        disabled={disabled}
        error={form.errors[name]}
        {...extra}
      />
    </div>
  );
  return (
    <>
      <PageHeader
        title={
          initial ? `Editar promoción — ${initial.name}` : "Crear promoción"
        }
        breadcrumbs={[
          { label: "Ofertas y promociones", to: `/promociones${suffix}` },
          { label: initial ? "Editar" : "Crear" },
        ]}
      />
      <PromotionDataNotice kind="campaign-form" />
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit((name) =>
            requestAnimationFrame(() =>
              formRef.current
                ?.querySelector<HTMLElement>(
                  `[data-field="${name}"] input, [data-field="${name}"] button`,
                )
                ?.focus(),
            ),
          );
        }}
      >
        <Stack maw={880} gap="lg" mt="lg">
          <EditorMessage
            message={form.message}
            unknown={form.unknown}
            conflict={form.conflict}
            checking={form.checking}
            consult={() => void form.consult()}
            recoveryMessage={form.recoveryMessage}
            currentName={form.current?.name}
            onList={() => navigate(`/promociones${suffix}`)}
          />
          <SectionCard title="Identificación y modalidad">
            {field("name", "Nombre de la promoción")}
            <div data-field="mode">
              <Select
                label="Modalidad comercial"
                aria-label="Modalidad comercial"
                required
                data={[
                  { value: "automatic", label: "Automática" },
                  { value: "coupon", label: "Con cupón" },
                ]}
                value={draft.mode || null}
                disabled={
                  disabled || (!!initial && initial.canChangeMode !== true)
                }
                onChange={(value) => {
                  if (value === "automatic" || value === "coupon")
                    update("mode", value);
                }}
                error={form.errors.mode}
                description={
                  initial && initial.canChangeMode !== true
                    ? initial.canChangeMode === undefined
                      ? "No se pudo comprobar la capacidad de cambio. Se conserva la modalidad."
                      : "Esta promoción no permite cambiar modalidad. Crea otra promoción para usar una modalidad diferente."
                    : "Selecciona la modalidad de esta promoción."
                }
              />
            </div>
            {!initial ? (
              <div data-field="status">
                <Select
                  label="Estado inicial"
                  aria-label="Estado inicial"
                  required
                  value={draft.status || null}
                  data={[
                    { value: "active", label: "Activo" },
                    { value: "inactive", label: "Inactivo" },
                  ]}
                  disabled={disabled}
                  onChange={(value) => {
                    if (value === "active" || value === "inactive")
                      update("status", value);
                  }}
                  error={form.errors.status}
                />
              </div>
            ) : (
              <Text size="sm">
                El estado se cambia con confirmación desde el detalle.
              </Text>
            )}
            {field("priority", "Prioridad", {
              inputMode: "numeric",
              description: "Entero positivo. 1 es la mayor prioridad.",
            })}
          </SectionCard>
          <SectionCard title="Beneficio y vigencia">
            <div data-field="discountType">
              <Select
                label="Tipo de beneficio"
                aria-label="Tipo de beneficio"
                required
                value={draft.discountType || null}
                data={[
                  { value: "percentage", label: "Porcentaje" },
                  { value: "amount", label: "Monto fijo" },
                ]}
                disabled={disabled}
                onChange={(value) => {
                  if (value === "percentage" || value === "amount")
                    update("discountType", value);
                }}
                error={form.errors.discountType}
              />
            </div>
            {field("benefit", "Valor del beneficio", {
              inputMode: "decimal",
              description:
                draft.discountType === "percentage"
                  ? "Mayor que cero y hasta 100 %."
                  : draft.discountType === "amount"
                    ? "Monto fijo positivo. Moneda no informada por esta consulta."
                    : "Selecciona el tipo de beneficio.",
            })}
            {field("validFrom", "Fecha y hora de inicio", {
              type: "datetime-local",
              description: "America/Lima (UTC−5).",
            })}
            {field("validUntil", "Fecha y hora de fin", {
              type: "datetime-local",
              description: "Posterior al inicio, en hora de Lima.",
            })}
          </SectionCard>
          <SectionCard title="Canales y alcance">
            <div data-field="channels">
              <Checkbox.Group
                label="Canales habilitados"
                required
                value={draft.channels}
                error={form.errors.channels}
                onChange={(value) => update("channels", value)}
              >
                <Group mt="sm" gap="lg">
                  {channelChoices.map((item) => (
                    <Checkbox
                      key={item.value}
                      value={item.value}
                      label={item.label}
                      disabled={disabled}
                    />
                  ))}
                </Group>
              </Checkbox.Group>
            </div>
            <Text size="sm">
              Selecciona explícitamente al menos un canal; una selección vacía
              no significa todos.
            </Text>
            <CampaignScope configuration={draft} products={products} />
            {catalogError && (
              <FeedbackAlert
                semantic="warning"
                title="Referencias no disponibles"
              >
                {catalogError}
              </FeedbackAlert>
            )}
            {form.errors.scope && (
              <Text size="sm" c="var(--po-errorText)" role="alert">
                {form.errors.scope}
              </Text>
            )}
            <div data-field="scope">
              <Button
                component={Link}
                variant="outline"
                disabled={disabled}
                to={`${root}/alcance${suffix}`}
              >
                Seleccionar alcance
              </Button>
            </div>
          </SectionCard>
          <SectionCard title="Política de combinación">
            <Checkbox
              label="Combinar con ofertas de Pricing"
              checked={draft.combination.pricing}
              disabled={disabled}
              onChange={(event) =>
                update("combination", {
                  ...draft.combination,
                  pricing: event.currentTarget.checked,
                })
              }
            />
            <Checkbox
              label="Combinar con promociones automáticas"
              checked={draft.combination.automatic}
              disabled={disabled}
              onChange={(event) =>
                update("combination", {
                  ...draft.combination,
                  automatic: event.currentTarget.checked,
                })
              }
            />
            <Checkbox
              label="Combinar con cupones"
              checked={draft.combination.coupon}
              disabled={disabled}
              onChange={(event) =>
                update("combination", {
                  ...draft.combination,
                  coupon: event.currentTarget.checked,
                })
              }
            />
            <Text size="sm">
              Todas deshabilitadas representan una promoción exclusiva. Esta
              pantalla no calcula el precio final de una compra.
            </Text>
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
                : "Crear promoción"}
            </Button>
          </Group>
        </Stack>
      </form>
    </>
  );
}
