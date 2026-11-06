import type { ReactNode } from "react";
import { Paper, Stack, Text } from "@mantine/core";

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}
// A presentation-only KPI. It never derives a price, total, stock or status.
export function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <Paper p="lg" h="100%">
      <Stack gap="sm">
        <Text size="sm" fw={600} c="dimmed">
          {label}
        </Text>
        <Text
          component="div"
          fw={600}
          style={{
            fontSize: 28,
            lineHeight: "36px",
            fontVariantNumeric: "tabular-nums",
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </Text>
        {description && (
          <Text component="div" size="sm" c="dimmed">
            {description}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
