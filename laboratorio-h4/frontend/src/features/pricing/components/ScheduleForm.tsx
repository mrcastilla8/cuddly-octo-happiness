import {
  Button,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  ConfirmDialog,
  FeedbackAlert,
  SectionCard,
} from "../../../components/shared";
import { tokens } from "../../../theme/tokens";
import { useScheduleForm } from "../hooks/usePriceSchedules";
import type { ScheduleDraft } from "../services/pricingModels";
import { displayInstant, priceTimeZone } from "../services/pricingValidation";
import { formatMoney } from "../services/pricePresentation";
import { UnsavedPriceGuard } from "./UnsavedPriceGuard";
import { useUnsavedPriceNavigation } from "../hooks/useUnsavedPriceNavigation";

export function ScheduleForm({
  targetId,
  currency,
  channel,
  onCreated,
}: {
  targetId: string;
  currency: string;
  channel: "global" | "retail";
  onCreated: () => void;
}) {
  const form = useScheduleForm(targetId, currency, channel, onCreated);
  const locked = form.action.busy || !!form.action.result;
  const blocker = useUnsavedPriceNavigation(form.dirty, form.action.busy);
  function change<K extends keyof ScheduleDraft>(
    key: K,
    value: ScheduleDraft[K],
  ) {
    form.change({ ...form.draft, [key]: value });
  }
  const reference =
    form.reference.state.status === "success"
      ? form.reference.state.result?.price
      : undefined;
  return (
    <>
      <UnsavedPriceGuard blocker={blocker} busy={form.action.busy} />
      <div style={{ maxWidth: tokens.layout.form }}>
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (form.validate()) form.setReviewing(true);
            else {
              const element = event.currentTarget;
              requestAnimationFrame(() =>
                element
                  .querySelector<HTMLElement>('[aria-invalid="true"]')
                  ?.focus(),
              );
            }
          }}
        >
          <SectionCard
            title="Nueva vigencia programada"
            description="Una programación futura no reemplaza anticipadamente el precio vigente."
          >
            <Text size="sm">
              * Campo obligatorio. Zona: {priceTimeZone}. Fecha de referencia:{" "}
              {displayInstant(form.now)}.
            </Text>
            <SimpleGrid cols={2} spacing="lg">
              <Select
                label="Tipo de precio"
                required
                value={form.draft.kind}
                data={[
                  { value: "REGULAR", label: "Regular" },
                  { value: "OFERTA", label: "Oferta" },
                ]}
                onChange={(value) => {
                  if (value === "REGULAR" || value === "OFERTA")
                    change("kind", value);
                }}
                disabled={locked}
              />
              <NumberInput
                label="Importe programado"
                required
                value={form.draft.amount}
                onValueChange={(value, source) => {
                  if (source.source === "event") change("amount", value.value);
                }}
                hideControls
                disabled={locked}
                error={form.errors.amount}
              />
              <TextInput
                label="Moneda"
                value={form.draft.currency}
                readOnly
                error={form.errors.currency}
              />
              <Select
                label="Canal de la programación"
                value={form.draft.channel}
                data={[
                  { value: "global", label: "Global" },
                  { value: "retail", label: "Retail" },
                ]}
                onChange={(value) =>
                  change("channel", value === "retail" ? "retail" : "global")
                }
                disabled={locked}
              />
              <TextInput
                type="datetime-local"
                label="Fecha y hora de inicio"
                required
                value={form.draft.start}
                onChange={(event) => change("start", event.currentTarget.value)}
                description={priceTimeZone}
                disabled={locked}
                error={form.errors.start}
              />
              <TextInput
                type="datetime-local"
                label="Fecha y hora de fin (opcional)"
                value={form.draft.end}
                onChange={(event) => change("end", event.currentTarget.value)}
                description="Sin fin no se inventa una caducidad."
                disabled={locked}
                error={form.errors.end}
              />
            </SimpleGrid>
            {form.draft.start && form.reference.state.status === "loading" && (
              <Text size="sm" role="status">
                Consultando precio regular para la vigencia…
              </Text>
            )}
            {form.draft.start && form.reference.state.status === "error" && (
              <FeedbackAlert
                semantic="error"
                title="Vigencia de referencia no disponible"
              >
                {form.reference.state.message}
              </FeedbackAlert>
            )}
            {reference && (
              <Text size="sm">
                Regular de referencia:{" "}
                {formatMoney(reference.regular, reference.currency)} ·{" "}
                {displayInstant(reference.validFrom)} →{" "}
                {reference.validUntil
                  ? displayInstant(reference.validUntil)
                  : "Sin fin"}
                . La validación definitiva corresponde a Pricing.
              </Text>
            )}
            <Textarea
              label="Motivo de la programación"
              required
              value={form.draft.reason}
              onChange={(event) => change("reason", event.currentTarget.value)}
              disabled={locked}
              error={form.errors.reason}
            />
            {form.action.error && (
              <FeedbackAlert
                semantic={
                  form.action.error.kind === "unknown" ? "warning" : "error"
                }
                title={
                  form.action.error.kind === "unknown"
                    ? "Resultado desconocido"
                    : "Programación no confirmada"
                }
              >
                {form.action.error.message}
                {form.action.error.kind === "unknown" &&
                  " El formulario se conserva. Consulta la lista para comprobar el resultado antes de volver a enviar."}
              </FeedbackAlert>
            )}
            {form.action.result && (
              <FeedbackAlert semantic="success" title="Precio programado">
                Vigencia pendiente: {displayInstant(form.action.result.start)} →{" "}
                {form.action.result.end
                  ? displayInstant(form.action.result.end)
                  : "Sin fin"}{" "}
                · {priceTimeZone}. El precio actual se conserva.
              </FeedbackAlert>
            )}
            <Group justify="flex-end" gap="sm">
              {form.action.result ? (
                <Button variant="outline" onClick={form.newDraft}>
                  Nueva programación
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={locked || form.action.error?.kind === "unknown"}
                >
                  Programar precio
                </Button>
              )}
            </Group>
          </SectionCard>
        </form>
      </div>
      <ConfirmDialog
        opened={form.reviewing && blocker.state !== "blocked"}
        title="Confirmar programación futura"
        confirmLabel="Confirmar programación"
        submitting={form.action.busy}
        onCancel={() => form.setReviewing(false)}
        onConfirm={() => void form.create()}
      >
        <Text size="sm">
          {form.draft.kind === "REGULAR" ? "Regular" : "Oferta"}:{" "}
          {form.draft.amount} {form.draft.currency} ·{" "}
          {form.draft.channel === "retail" ? "Retail" : "Global"}. Inicio{" "}
          {form.draft.start}; fin {form.draft.end || "Sin fin"}, {priceTimeZone}
          . Motivo: {form.draft.reason}. La vigencia futura no reemplaza
          anticipadamente el precio actual.
        </Text>
      </ConfirmDialog>
    </>
  );
}
