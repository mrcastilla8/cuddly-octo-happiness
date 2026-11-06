import { Button, Group, Modal, Stack, Text } from "@mantine/core";

export function UnsavedChangesDialog({
  opened,
  submitting,
  onStay,
  onDiscard,
}: {
  opened: boolean;
  submitting: boolean;
  onStay: () => void;
  onDiscard: () => void;
}) {
  return (
    <Modal opened={opened} onClose={onStay} title="Cambios sin guardar">
      <Stack gap="lg">
        <Text size="sm">
          {submitting
            ? "Hay un guardado en curso. Espera su resultado antes de salir."
            : "Tu propuesta todavía no se ha guardado. Puedes seguir editando o descartar el borrador para salir."}
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="outline" data-autofocus onClick={onStay}>
            Seguir editando
          </Button>
          <Button color="danger" disabled={submitting} onClick={onDiscard}>
            Descartar cambios
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
