import { FileInput, Paper, Stack, Text } from "@mantine/core";
import { IconUpload } from "@tabler/icons-react";

export interface FileSelectionProps {
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  description?: string;
  accept?: string;
  error?: string;
  disabled?: boolean;
}
export function FileSelection({
  label,
  value,
  onChange,
  description,
  accept,
  error,
  disabled,
}: FileSelectionProps) {
  return (
    <Paper
      p="lg"
      style={{ borderStyle: "dashed", borderColor: "var(--po-control)" }}
    >
      <Stack gap="md">
        <FileInput
          label={label}
          value={value}
          onChange={onChange}
          description={description}
          accept={accept}
          error={error}
          disabled={disabled}
          clearable
          placeholder="Seleccionar archivo"
          leftSection={<IconUpload size={20} stroke={2} aria-hidden="true" />}
        />
        {value && (
          <Text size="sm" role="status">
            Archivo seleccionado: {value.name} ·{" "}
            {new Intl.NumberFormat("es-PE").format(value.size)} bytes
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
