import type { ReactNode } from "react";
import { Alert, Box } from "@mantine/core";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import { semanticTokens } from "../../theme/tokens";

type FeedbackSemantic = "info" | "success" | "warning" | "error";
const icons = {
  info: IconInfoCircle,
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  error: IconAlertCircle,
};
export interface FeedbackAlertProps {
  semantic: FeedbackSemantic;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}
export function FeedbackAlert({
  semantic,
  title,
  children,
  actions,
}: FeedbackAlertProps) {
  const colors = semanticTokens[semantic];
  const Icon = icons[semantic];
  return (
    <Alert
      title={title}
      icon={<Icon size={20} stroke={2} aria-hidden="true" />}
      role={semantic === "error" ? "alert" : "status"}
      styles={{
        root: {
          background: colors.background,
          border: `1px solid ${colors.border}`,
        },
        icon: { color: colors.text },
        title: {
          color: "var(--po-ink)",
          fontSize: 14,
          lineHeight: "20px",
          fontWeight: 600,
        },
        message: { color: "var(--po-ink)", fontSize: 14, lineHeight: "20px" },
      }}
    >
      {children}
      {actions && <Box mt="md">{actions}</Box>}
    </Alert>
  );
}
