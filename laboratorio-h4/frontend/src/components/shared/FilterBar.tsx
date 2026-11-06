import type { ReactNode } from "react";
import { Group, Paper, Stack, Text } from "@mantine/core";

export interface FilterBarProps {
  children: ReactNode;
  summary?: string;
  applied?: ReactNode;
  align?: "flex-start" | "flex-end";
}
export function FilterBar({
  children,
  summary,
  applied,
  align = "flex-end",
}: FilterBarProps) {
  return (
    <Paper component="section" aria-label="Filtros" p="md">
      <Stack gap="md">
        <Group align={align} gap="md" wrap="wrap">
          {children}
        </Group>
        {(applied || summary) && (
          <Group justify="space-between" gap="sm" wrap="wrap">
            {applied}
            {summary && (
              <Text size="sm" c="dimmed" role="status">
                {summary}
              </Text>
            )}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
