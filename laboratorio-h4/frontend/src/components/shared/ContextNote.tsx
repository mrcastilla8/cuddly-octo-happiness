import type { ReactNode } from "react";
import { Text } from "@mantine/core";

export interface ContextNoteProps {
  title: string;
  children: ReactNode;
}

// Neutral, compact permanent notice. It replaces the light-blue informative
// FeedbackAlert bubbles with a single text block: no background, border,
// shadow, radius, icon or padding.
export function ContextNote({ title, children }: ContextNoteProps) {
  return (
    <Text
      component="p"
      role="note"
      style={{
        color: "var(--po-secondary)",
        fontSize: 14,
        lineHeight: "20px",
      }}
    >
      <Text component="span" inherit fw={600}>
        {title}
      </Text>{" "}
      {children}
    </Text>
  );
}
