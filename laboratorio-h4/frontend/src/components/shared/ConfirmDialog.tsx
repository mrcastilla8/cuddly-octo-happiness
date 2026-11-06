import type { ReactNode } from "react";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";

export interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  submitting?: boolean;
  confirmDisabled?: boolean;
  error?: ReactNode;
  destructive?: boolean;
}
export function ConfirmDialog({
  opened,
  title,
  children,
  confirmLabel,
  onCancel,
  onConfirm,
  submitting = false,
  confirmDisabled = false,
  error,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
      withCloseButton={!submitting}
    >
      <Stack gap="lg">
        {children}
        {error}
        {submitting && (
          <Text size="sm" role="status">
            Confirmación en curso…
          </Text>
        )}
        <Group justify="flex-end" gap="sm">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            data-autofocus
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            loading={submitting}
            disabled={submitting || confirmDisabled}
            color={destructive ? "danger" : undefined}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
