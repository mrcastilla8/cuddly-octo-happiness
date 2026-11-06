import type { ReactNode } from "react";
import {
  Anchor,
  Box,
  Breadcrumbs,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "react-router-dom";

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: readonly { label: string; to?: string }[];
  actions?: ReactNode;
}
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <Stack gap="sm" mb="lg">
      {breadcrumbs && (
        <Breadcrumbs separator="/" styles={{ root: { flexWrap: "wrap" } }}>
          {breadcrumbs.map((item, index) =>
            item.to && index < breadcrumbs.length - 1 ? (
              <Anchor key={item.label} component={Link} to={item.to} size="sm">
                {item.label}
              </Anchor>
            ) : (
              <Text
                key={item.label}
                size="sm"
                aria-current={
                  index === breadcrumbs.length - 1 ? "page" : undefined
                }
              >
                {item.label}
              </Text>
            ),
          )}
        </Breadcrumbs>
      )}
      <Group justify="space-between" align="flex-start" gap="lg" wrap="wrap">
        <Box style={{ flex: "1 1 480px", minWidth: 0 }}>
          <Title order={1}>{title}</Title>
          {description && (
            <Text size="sm" c="dimmed" mt="sm">
              {description}
            </Text>
          )}
        </Box>
        {actions && <Group gap="sm">{actions}</Group>}
      </Group>
    </Stack>
  );
}
