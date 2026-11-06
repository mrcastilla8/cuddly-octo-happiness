import { useState } from "react";
import {
  Button,
  Group,
  Radio,
  Stack,
  Stepper,
  Text,
  TextInput,
} from "@mantine/core";
import { Link } from "react-router-dom";
import {
  FeedbackAlert,
  FileSelection,
  SectionCard,
} from "../../../components/shared";
import { usePricingContext } from "../hooks/usePricingContext";
import { usePriceImport } from "../hooks/usePriceImport";
import { PricingPageFrame } from "../components/PricingPageFrame";
import { ImportRowsTable } from "../components/ImportRowsTable";
import { UnsavedPriceGuard } from "../components/UnsavedPriceGuard";
import { useUnsavedPriceNavigation } from "../hooks/useUnsavedPriceNavigation";

export function ImportPricesPage() {
  const context = usePricingContext();
  const form = usePriceImport();
  const [batchId, setBatchId] = useState("");
  const blocker = useUnsavedPriceNavigation(!!form.file, form.preview.busy);
  return (
    <PricingPageFrame
      title="Importar precios"
      description="Selecciona un archivo y una política antes de solicitar su prevalidación."
      requiresTarget={false}
    >
      <UnsavedPriceGuard blocker={blocker} busy={form.preview.busy} />
      <Stepper active={form.step}>
        <Stepper.Step
          label="Archivo y validación"
          description="Selección y política"
        />
        <Stepper.Step
          label="Revisión y confirmación"
          description="Respuesta de prevalidación"
        />
      </Stepper>
      <SectionCard
        title="Archivo de precios"
        description="Selecciona el archivo y la política de importación."
      >
        <FileSelection
          label="Seleccionar archivo de precios"
          value={form.file}
          onChange={form.changeFile}
          disabled={form.preview.busy}
          description="Seleccionar otro archivo invalida la revisión anterior."
        />
        <Radio.Group
          label="Política ante errores"
          value={form.policy}
          onChange={form.changePolicy}
        >
          <Stack gap="md" mt="sm">
            <Radio
              value="all"
              label="Rechazar el lote si hay errores"
              disabled={form.preview.busy}
            />
            <Radio
              value="partial"
              label="Permitir resultados parciales"
              disabled={form.preview.busy}
            />
          </Stack>
        </Radio.Group>
        <Text size="sm">
          Cambiar de política exige una nueva revisión. Su elección no habilita
          admisión con errores.
        </Text>
        <Button
          style={{ alignSelf: "flex-start" }}
          variant="outline"
          disabled={!form.file || !form.policy || form.preview.busy}
          loading={form.preview.busy}
          onClick={() => void form.prevalidate()}
        >
          Prevalidar archivo
        </Button>
        {(!form.file || !form.policy) && (
          <Text size="sm">
            Selecciona un archivo y una política para solicitar la
            prevalidación.
          </Text>
        )}
        {form.preview.error && (
          <FeedbackAlert
            semantic={
              form.preview.error.kind === "blocked_contract"
                ? "warning"
                : "error"
            }
            title="Prevalidación no disponible"
          >
            {form.preview.error.message}
          </FeedbackAlert>
        )}
      </SectionCard>
      {form.step === 1 && form.preview.result && (
        <SectionCard title="Revisión de prevalidación">
          <Text size="sm">
            Archivo: {form.file?.name}. Política:{" "}
            {form.policy === "partial"
              ? "Permitir resultados parciales"
              : "Rechazar el lote si hay errores"}
            . Total publicado: {form.preview.result.total} filas.
          </Text>
          <FeedbackAlert
            semantic={form.preview.result.valid ? "info" : "warning"}
            title={
              form.preview.result.valid
                ? "Sin errores reportados"
                : "Errores por fila"
            }
          >
            Revisa los resultados antes de continuar.
          </FeedbackAlert>
          <ImportRowsTable
            caption="Errores de prevalidación"
            rows={form.preview.result.errors}
          />
          <Group justify="space-between">
            <Button variant="outline" onClick={form.back}>
              Volver al archivo
            </Button>
            <Button disabled>Confirmar importación</Button>
          </Group>
        </SectionCard>
      )}
      <SectionCard
        title="Consultar un lote existente"
        description="Utiliza la referencia recibida de una importación previamente admitida."
      >
        <TextInput
          label="Referencia de lote"
          value={batchId}
          onChange={(event) => setBatchId(event.currentTarget.value)}
        />
        <Button
          component={Link}
          to={`/precios/importaciones/${encodeURIComponent(batchId.trim())}${context.suffix}`}
          disabled={!batchId.trim()}
          variant="outline"
          style={{ alignSelf: "flex-start" }}
        >
          Consultar lote
        </Button>
      </SectionCard>
    </PricingPageFrame>
  );
}
