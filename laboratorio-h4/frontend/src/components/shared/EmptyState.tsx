import type { ReactNode } from "react";
import { Stack, Text } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Stack align="center" gap="sm" p="xl" role="status" ta="center">
      <IconInbox size={24} stroke={2} aria-hidden="true" />
      <Text size="lg" fw={600}>
        {title}
      </Text>
      <Text size="sm" c="dimmed">
        {description}
      </Text>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </Stack>
  );
}
