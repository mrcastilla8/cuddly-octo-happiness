import type { ReactNode } from "react";
import { Group, Text } from "@mantine/core";

export interface CampoDatoProps {
  etiqueta: string;
  children: ReactNode;
}

export function CampoDato({ etiqueta, children }: CampoDatoProps) {
  return (
    <Group gap="xs" align="flex-start" wrap="wrap">
      <Text size="sm" fw={600} w={140}>
        {etiqueta}
      </Text>
      <Group gap="xs" align="center" wrap="wrap">
        {children}
      </Group>
    </Group>
  );
}
