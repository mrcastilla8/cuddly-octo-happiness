import { Text } from "@mantine/core";

export interface SufijoResaltadoProps {
  base: string;
  completo: string;
}

// Highlights the auto-generated suffix of a suggested slug without inventing colors.
export function SufijoResaltado({ base, completo }: SufijoResaltadoProps) {
  const sufijo = completo.startsWith(base) ? completo.slice(base.length) : "";
  return (
    <Text component="span">
      {base}
      {sufijo && (
        <Text component="span" fw={700} td="underline">
          {sufijo}
        </Text>
      )}
    </Text>
  );
}
