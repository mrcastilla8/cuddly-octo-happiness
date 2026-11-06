import type { ReactNode } from "react";
import { Badge } from "@mantine/core";
import { semanticTokens, type Semantic } from "../../theme/tokens";

export interface StatusBadgeProps {
  children: ReactNode;
  semantic?: Semantic;
  size?: "sm" | "md";
}
// The caller selects a presentation role. This component does not infer backend state.
export function StatusBadge({
  children,
  semantic = "neutral",
  size = "sm",
}: StatusBadgeProps) {
  const role = semanticTokens[semantic];
  return (
    <Badge
      size={size}
      style={{
        background: role.background,
        color: role.text,
        border: `1px solid ${role.border}`,
        minHeight: size === "md" ? 28 : 24,
        paddingInline: size === "md" ? 12 : 8,
        whiteSpace: "normal",
      }}
    >
      {children}
    </Badge>
  );
}
