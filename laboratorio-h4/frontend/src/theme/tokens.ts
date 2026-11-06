// ux/mockups/DESIGN.md 1.1.0 — Docs master @ be5c2db16aca6d6d18b3005a2da4205f724038e3, §4–7.
export const designSource = {
  version: "1.1.0",
  branch: "master",
  commit: "be5c2db16aca6d6d18b3005a2da4205f724038e3",
  path: "ux/mockups/DESIGN.md",
} as const;
export const tokens = {
  color: {
    cloud: "#F7F5F0",
    surface: "#FFFFFF",
    subtle: "#EDEAE2",
    ink: "#1B1812",
    secondary: "#495057",
    disabled: "#868E96",
    border: "#DEE2E6",
    control: "#868E96",
    primary: "#F76707",
    primaryHover: "#C2410C",
    selection: "#FCE3D0",
    focus: "#4361EE",
    signalSoft: "#E1E6FB",
    volt: "#C3E504",
    voltSoft: "#EEF7B0",
    success: "#2F9E44",
    successBg: "#EBFBEE",
    successText: "#1C6B30",
    warning: "#F08C00",
    warningBg: "#FFF9DB",
    warningText: "#8A4B00",
    error: "#E03131",
    errorBg: "#FFF5F5",
    errorText: "#B42318",
    info: "#1971C2",
    infoBg: "#E7F5FF",
  },
  font: {
    body: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    heading: 'Oswald, "Segoe UI", sans-serif',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, inset: 12 },
  radius: { xs: 4, sm: 8, md: 12, lg: 16, full: 999 },
  layout: { header: 64, sidebar: 240, padding: 32, form: 880, briefForm: 640 },
  shadow: {
    floating: "0 4px 12px rgba(27,24,18,0.12)",
    dialog: "0 12px 32px rgba(27,24,18,0.18)",
  },
  overlay: "rgba(27,24,18,0.40)",
  layer: {
    sticky: 100,
    floating: 200,
    overlay: 300,
    dialog: 310,
    dialogFloating: 320,
    notification: 400,
  },
} as const;

export type Semantic =
  "neutral" | "info" | "success" | "warning" | "error" | "promotion";
export const semanticTokens = {
  neutral: {
    background: tokens.color.subtle,
    text: tokens.color.ink,
    border: tokens.color.border,
  },
  info: {
    background: tokens.color.infoBg,
    text: tokens.color.info,
    border: tokens.color.info,
  },
  success: {
    background: tokens.color.successBg,
    text: tokens.color.successText,
    border: tokens.color.success,
  },
  warning: {
    background: tokens.color.warningBg,
    text: tokens.color.warningText,
    border: tokens.color.warningText,
  },
  error: {
    background: tokens.color.errorBg,
    text: tokens.color.errorText,
    border: tokens.color.error,
  },
  promotion: {
    background: tokens.color.voltSoft,
    text: tokens.color.ink,
    border: tokens.color.ink,
  },
} satisfies Record<
  Semantic,
  { background: string; text: string; border: string }
>;
