import { useState } from "react";
import { Stack, Text } from "@mantine/core";
import { ConfirmDialog, FeedbackAlert } from "../../../components/shared";
import {
  AdministrationError,
  type AdministrationRecord,
} from "../services/administration";
import { usePromotionCommand } from "../hooks/usePromotionCommand";
export function AdministrationStateDialog<T extends AdministrationRecord>({
  record,
  entityLabel,
  opened,
  change,
  read,
  onCancel,
  onConfirmed,
}: {
  record: T;
  entityLabel: string;
  opened: boolean;
  change: (status: "active" | "inactive", signal: AbortSignal) => Promise<T>;
  read: (signal: AbortSignal) => Promise<T | null>;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const command = usePromotionCommand<T>();
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string>();
  const [target, setTarget] = useState<"active" | "inactive">(
    record.status === "active" ? "inactive" : "active",
  );
  const [prevOpened, setPrevOpened] = useState(false);
  if (opened && !prevOpened) {
    setPrevOpened(true);
    setTarget(record.status === "active" ? "inactive" : "active");
  } else if (!opened && prevOpened) {
    setPrevOpened(false);
  }
  const action = `${target === "active" ? "Activar" : "Desactivar"} ${entityLabel}`;
  const unknown =
    command.error instanceof AdministrationError &&
    command.error.kind === "unknown";
  const confirm = async () => {
    if (unknown) {
      if (checking) return;
      setChecking(true);
      try {
        const result = await read(new AbortController().signal);
        if (result?.status === target) onConfirmed();
        else
          setCheckError(
            "La consulta no confirmó el estado solicitado. No se repetirá automáticamente.",
          );
      } catch {
        setCheckError("La consulta del resultado no está disponible.");
      } finally {
        setChecking(false);
      }
    } else {
      const result = await command.run((signal) => change(target, signal));
      if (result) onConfirmed();
    }
  };
  return (
    <ConfirmDialog
      opened={opened}
      title={action}
      confirmLabel={unknown ? "Consultar estado" : action}
      submitting={command.submitting || checking}
      destructive={!unknown && target === "inactive"}
      onCancel={() => {
        command.clearError();
        setCheckError(undefined);
        onCancel();
      }}
      onConfirm={() => void confirm()}
      error={
        command.error instanceof Error ? (
          <FeedbackAlert
            semantic={unknown ? "warning" : "error"}
            title={unknown ? "Estado sin confirmar" : "Cambio rechazado"}
          >
            {command.error.message}
            {checkError && <Text size="sm">{checkError}</Text>}
          </FeedbackAlert>
        ) : undefined
      }
    >
      <Stack gap="sm">
        <Text fw={600}>{record.name}</Text>
        <Text size="sm">
          {target === "inactive"
            ? "Dejará de participar en nuevas consultas. Su configuración y los pedidos históricos se conservan."
            : "Participará en nuevas consultas, sujeto a la vigencia y condiciones configuradas."}
        </Text>
        <Text size="sm">
          El estado visible solo se actualizará al confirmar el resultado.
        </Text>
      </Stack>
    </ConfirmDialog>
  );
}
