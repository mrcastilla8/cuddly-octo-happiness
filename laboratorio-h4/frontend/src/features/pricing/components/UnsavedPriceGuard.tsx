import type { Blocker } from "react-router-dom";
import { Text } from "@mantine/core";
import { ConfirmDialog } from "../../../components/shared";

// Data-router blocker also covers sidebar links and browser Back/Forward.
export function UnsavedPriceGuard({
  blocker,
  busy,
}: {
  blocker: Blocker;
  busy: boolean;
}) {
  return (
    <ConfirmDialog
      opened={blocker.state === "blocked"}
      title="Cambios sin guardar"
      confirmLabel="Descartar y salir"
      onCancel={() => blocker.state === "blocked" && blocker.reset()}
      onConfirm={() =>
        blocker.state === "blocked" && !busy && blocker.proceed()
      }
      submitting={busy}
    >
      <Text size="sm">
        {busy
          ? "Espera la respuesta antes de salir."
          : "La propuesta aún no se ha guardado. Puedes cancelar la salida y seguir editando, o descartarla explícitamente."}
      </Text>
    </ConfirmDialog>
  );
}
