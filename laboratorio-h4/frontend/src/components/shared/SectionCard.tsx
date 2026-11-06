import { useId, type ReactNode } from "react";
import { Box, Group, Paper, Stack, Text, Title } from "@mantine/core";
import classes from "../../theme/primitives.module.css";

export interface SectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}
export function SectionCard({
  title,
  description,
  actions,
  children,
}: SectionCardProps) {
  const headingId = useId();
  return (
    <Paper component="section" p="lg" aria-labelledby={headingId}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Box>
            <Title order={3} id={headingId} className={classes.cardTitle}>
              {title}
            </Title>
            {description && (
              <Text size="sm" c="dimmed" mt="xs">
                {description}
              </Text>
            )}
          </Box>
          {actions}
        </Group>
        {children}
      </Stack>
    </Paper>
  );
}
