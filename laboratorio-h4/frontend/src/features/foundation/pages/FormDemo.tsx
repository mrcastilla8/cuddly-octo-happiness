import { useRef } from "react";
import {
  Button,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import {
  ConfirmDialog,
  FeedbackAlert,
  PageHeader,
  SectionCard,
  StatusBadge,
} from "../../../components/shared";
import { useDemoForm } from "../hooks/useDemoForm";

export function FormDemo() {
  const form = useDemoForm();
  const nameRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <PageHeader
        title="Formularios y confirmación"
        description="Controles con labels, ayuda, validación y revisión antes de confirmar."
        breadcrumbs={[{ label: "Componentes" }, { label: "Formularios" }]}
      />
      <Stack gap="lg" maw={880}>
        <FeedbackAlert semantic="info" title="Formulario de demostración">
          Las entradas solo viven en esta sesión. La confirmación prueba la
          interfaz y no guarda datos comerciales.
        </FeedbackAlert>
        {form.confirmed && (
          <FeedbackAlert semantic="success" title="Ejemplo confirmado">
            Se completó la demostración local. Puedes seguir editando los
            valores.
          </FeedbackAlert>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.review()) nameRef.current?.focus();
          }}
          noValidate
        >
          <Stack gap="lg">
            <SectionCard
              title="Datos del ejemplo"
              actions={<StatusBadge>Demostración</StatusBadge>}
            >
              <Text size="sm" c="dimmed">
                * Campo obligatorio en este ejemplo.
              </Text>
              <TextInput
                ref={nameRef}
                label="Nombre del ejemplo"
                required
                value={form.values.name}
                onChange={(event) =>
                  form.update("name", event.currentTarget.value)
                }
                error={form.nameError}
                description="Etiqueta visible para revisar el formulario."
              />
              <Textarea
                label="Descripción"
                value={form.values.description}
                onChange={(event) =>
                  form.update("description", event.currentTarget.value)
                }
                description="Conserva su contenido al cancelar una confirmación."
              />
              <Radio.Group
                label="Tipo de ejemplo"
                value={form.values.kind}
                onChange={(value) => form.update("kind", value)}
              >
                <Group gap="md" mt="sm">
                  <Radio value="simple" label="Simple" />
                  <Radio value="composed" label="Compuesto" />
                </Group>
              </Radio.Group>
              <MultiSelect
                label="Etiquetas de demostración"
                data={["Entrenamiento", "Accesorios", "Running"]}
                value={form.values.tags}
                onChange={(value) => form.update("tags", value)}
                clearable
              />
              <Checkbox
                label="Mostrar este ejemplo en la revisión"
                checked={form.values.visible}
                onChange={(event) =>
                  form.update("visible", event.currentTarget.checked)
                }
              />
            </SectionCard>
            <SectionCard
              title="Lectura y restricciones"
              description="Los valores de lectura mantienen su contraste; los controles deshabilitados explican su motivo."
            >
              <SimpleGrid cols={2} spacing="lg">
                <TextInput
                  label="Referencia de ejemplo"
                  value="DEMO-FORM"
                  readOnly
                  description="Valor de solo lectura, seleccionable y copiable."
                />
                <NumberInput
                  label="Cantidad ilustrativa"
                  value={2}
                  disabled
                  description="Deshabilitada: este ejemplo solo muestra el estado visual."
                />
              </SimpleGrid>
              <Checkbox
                label="Simular fallo de confirmación"
                checked={form.simulateError}
                onChange={(event) =>
                  form.setSimulateError(event.currentTarget.checked)
                }
              />
            </SectionCard>
            <Group justify="flex-end">
              <Button
                type="submit"
                leftSection={
                  <IconCheck size={20} stroke={2} aria-hidden="true" />
                }
              >
                Revisar ejemplo
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
      <ConfirmDialog
        opened={form.opened}
        title="Confirmar ejemplo"
        confirmLabel="Confirmar ejemplo"
        onCancel={form.cancel}
        onConfirm={() => void form.confirm()}
        submitting={form.submitting}
        error={
          form.error && (
            <FeedbackAlert semantic="error" title="Confirmación no completada">
              {form.error}
            </FeedbackAlert>
          )
        }
      >
        <Stack gap="md">
          <Text fw={600}>{form.values.name}</Text>
          <Text size="sm">
            Esta acción confirma únicamente el recorrido de demostración. No
            crea, activa ni cambia un producto.
          </Text>
          <Text size="sm" c="dimmed">
            Al cancelar, se conservan las entradas del formulario.
          </Text>
        </Stack>
      </ConfirmDialog>
    </>
  );
}
