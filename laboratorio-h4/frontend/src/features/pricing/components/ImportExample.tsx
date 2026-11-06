import { useState } from "react";
import { Button, Group, Radio, Stack, Stepper, Text } from "@mantine/core";
import { FileSelection, SectionCard } from "../../../components/shared";

export function ImportExample() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState(0);
  const [policy, setPolicy] = useState<string | null>(null);
  const updateFile = (value: File | null) => {
    setFile(value);
    setStep(0);
    setPolicy(null);
  };
  return (
    <Stack gap="lg">
      <Stepper
        active={step}
        onStepClick={(value) => {
          if (value === 0) setStep(0);
        }}
      >
        <Stepper.Step
          label="Archivo y validación"
          description="Selección del archivo"
        />
        <Stepper.Step
          label="Revisión y confirmación"
          description="Política y resultado"
        />
      </Stepper>
      <SectionCard
        title="Archivo de precios"
        description="Selecciona el archivo de precios."
      >
        <FileSelection
          label="Seleccionar archivo de precios"
          value={file}
          onChange={updateFile}
        />
        {!file && (
          <Text size="sm">
            Selecciona un archivo para revisar la segunda etapa de presentación.
          </Text>
        )}
        <Button variant="outline" disabled={!file} onClick={() => setStep(1)}>
          Revisar selección de archivo
        </Button>
      </SectionCard>
      {step === 1 && (
        <SectionCard title="Revisión de la política">
          <Radio.Group
            label="Política ante errores"
            value={policy ?? ""}
            onChange={setPolicy}
          >
            <Stack gap="md" mt="sm">
              <Radio value="partial" label="Permitir resultados parciales" />
              <Radio value="all" label="Rechazar el lote si hay errores" />
            </Stack>
          </Radio.Group>
          <Group justify="space-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              Volver al archivo
            </Button>
            <Button disabled>Confirmar importación</Button>
          </Group>
        </SectionCard>
      )}
    </Stack>
  );
}
