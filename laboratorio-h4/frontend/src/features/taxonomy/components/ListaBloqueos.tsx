import { Stack, Text } from "@mantine/core";
import type { BloqueoDependencia } from "../types";

export interface ListaBloqueosProps {
  bloqueos: BloqueoDependencia[];
}

export function ListaBloqueos({ bloqueos }: ListaBloqueosProps) {
  if (bloqueos.length === 0) return null;
  return (
    <Stack gap="xs">
      {bloqueos.map((bloqueo) => (
        <Text key={`${bloqueo.tipo}-${bloqueo.detalle}`} size="sm">
          {`• ${bloqueo.detalle} (${bloqueo.cantidad})`}
        </Text>
      ))}
    </Stack>
  );
}
