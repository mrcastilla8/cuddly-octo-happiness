import { useRef } from "react";
import {
  Button,
  Group,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { FeedbackAlert, SectionCard } from "../../../components/shared";
import type {
  CouponField,
  CouponPromotion,
  CouponView,
} from "../services/couponRepository";
import type { useCouponForm } from "../hooks/useCouponForm";

export function CouponForm({
  form,
  promotions,
  initial,
  onCancel,
  onReload,
}: {
  form: ReturnType<typeof useCouponForm>;
  promotions: CouponPromotion[];
  initial: CouponView | null;
  onCancel: () => void;
  onReload: () => void;
}) {
  const codeRef = useRef<HTMLInputElement>(null);
  const promotionRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLInputElement>(null);
  const globalRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const policyRef = useRef<HTMLInputElement>(null);
  const refs: Record<CouponField, typeof codeRef> = {
    code: codeRef,
    promotionId: promotionRef,
    status: statusRef,
    globalLimit: globalRef,
    customerLimit: customerRef,
    minimumAmount: amountRef,
    cancellationPolicy: policyRef,
  };
  const disabled = form.submitting || form.uncertain;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit((field) =>
          requestAnimationFrame(() => refs[field].current?.focus()),
        );
      }}
    >
      <Stack gap="lg" maw={640}>
        {form.message && (
          <FeedbackAlert
            semantic={form.uncertain ? "warning" : "error"}
            title={
              form.uncertain
                ? "Resultado sin confirmar"
                : "No se guardó la propuesta"
            }
            actions={
              form.uncertain ? (
                <Button
                  variant="outline"
                  loading={form.checking}
                  onClick={() => void form.reconcile()}
                >
                  Consultar resultado
                </Button>
              ) : form.conflict ? (
                <Button variant="outline" onClick={onReload}>
                  Consultar registro actual
                </Button>
              ) : undefined
            }
          >
            {form.message}
          </FeedbackAlert>
        )}
        {form.recoveryMessage && (
          <FeedbackAlert semantic="warning" title="Consulta del resultado">
            {form.recoveryMessage}
          </FeedbackAlert>
        )}
        <SectionCard title="Identificación y promoción">
          <TextInput
            ref={codeRef}
            label="Código del cupón"
            aria-label="Código del cupón"
            required
            value={form.draft.code}
            onChange={(event) => form.update("code", event.currentTarget.value)}
            error={form.errors.code}
            disabled={disabled}
            description="Letras A–Z, números, guion y guion bajo. Se eliminan espacios de los extremos y se normaliza a mayúsculas."
          />
          <Select
            ref={promotionRef}
            label="Promoción asociada"
            aria-label="Promoción asociada"
            required
            data={promotions.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            value={form.draft.promotionId || null}
            onChange={(value) => form.update("promotionId", value ?? "")}
            error={form.errors.promotionId}
            disabled={disabled}
            description="Solo promociones de modalidad cupón. La vigencia corresponde a la promoción."
          />
          {!initial ? (
            <Select
              ref={statusRef}
              label="Estado inicial"
              aria-label="Estado inicial"
              required
              data={[
                { value: "active", label: "Activo" },
                { value: "inactive", label: "Inactivo" },
              ]}
              value={form.draft.status || null}
              onChange={(value) => {
                if (value === "active" || value === "inactive")
                  form.update("status", value);
              }}
              error={form.errors.status}
              disabled={disabled}
            />
          ) : (
            <Text size="sm">
              El estado se cambia desde el detalle mediante confirmación. Los
              usos registrados se conservan.
            </Text>
          )}
        </SectionCard>
        <SectionCard title="Límites y monto mínimo">
          <TextInput
            ref={globalRef}
            label="Límite global"
            inputMode="numeric"
            value={form.draft.globalLimit}
            onChange={(event) =>
              form.update("globalLimit", event.currentTarget.value)
            }
            error={form.errors.globalLimit}
            disabled={disabled}
            description="Entero positivo. Vacío significa Sin límite."
          />
          <TextInput
            ref={customerRef}
            label="Límite por cliente"
            inputMode="numeric"
            value={form.draft.customerLimit}
            onChange={(event) =>
              form.update("customerLimit", event.currentTarget.value)
            }
            error={form.errors.customerLimit}
            disabled={disabled}
            description="Vacío significa Sin límite. Si se configura, el canal debe identificar al cliente."
          />
          <TextInput
            ref={amountRef}
            label="Monto mínimo"
            inputMode="decimal"
            value={form.draft.minimumAmount}
            onChange={(event) =>
              form.update("minimumAmount", event.currentTarget.value)
            }
            error={form.errors.minimumAmount}
            disabled={disabled}
            description="Mayor que cero. Vacío significa Sin monto mínimo. Moneda no informada por esta consulta."
          />
        </SectionCard>
        <SectionCard title="Restitución al cancelar">
          <Radio.Group
            label="Política de restitución"
            required
            value={form.draft.cancellationPolicy}
            onChange={(value) => {
              if (value === "restore" || value === "keep")
                form.update("cancellationPolicy", value);
            }}
            error={form.errors.cancellationPolicy}
          >
            <Stack gap="sm" mt="sm">
              <Radio
                ref={policyRef}
                disabled={disabled}
                value="restore"
                label="Restaurar uso al cancelar"
              />
              <Radio
                disabled={disabled}
                value="keep"
                label="No restaurar uso al cancelar"
              />
            </Stack>
          </Radio.Group>
        </SectionCard>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={form.submitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={form.submitting}
            disabled={form.submitting || form.uncertain || form.conflict}
          >
            {initial ? "Guardar cambios" : "Crear cupón"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
