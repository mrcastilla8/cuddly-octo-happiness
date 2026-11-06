import { Button, Stack, Text } from "@mantine/core";
import { FeedbackAlert } from "../../../components/shared";
export function EditorMessage({
  message,
  unknown,
  conflict,
  checking,
  consult,
  recoveryMessage,
  currentName,
  onList,
}: {
  message?: string;
  unknown: boolean;
  conflict: boolean;
  checking: boolean;
  consult: () => void;
  recoveryMessage?: string;
  currentName?: string;
  onList: () => void;
}) {
  if (!message) return null;
  return (
    <Stack gap="md">
      <FeedbackAlert
        semantic={unknown ? "warning" : "error"}
        title={
          unknown ? "Resultado sin confirmar" : "No se guardó la propuesta"
        }
        actions={
          unknown || conflict ? (
            <Button variant="outline" onClick={consult} loading={checking}>
              {unknown ? "Consultar resultado" : "Consultar registro actual"}
            </Button>
          ) : undefined
        }
      >
        {message}
        {currentName && (
          <Text size="sm">
            Registro consultado: {currentName}. Revisa tu propuesta antes de
            guardarla.
          </Text>
        )}
      </FeedbackAlert>
      {recoveryMessage && (
        <FeedbackAlert
          semantic="info"
          title="Consulta del resultado"
          actions={
            <Button variant="outline" onClick={onList}>
              Consultar listado
            </Button>
          }
        >
          {recoveryMessage}
        </FeedbackAlert>
      )}
    </Stack>
  );
}
