import {
  createTheme,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from "@mantine/core";
import { tokens } from "./tokens";
import { componentDefaults } from "./component-defaults";

// Mantine needs ten entries. Repeat the documented role rather than inventing shades.
const roleScale = (color: string): MantineColorsTuple => [
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
  color,
];
export const theme = createTheme({
  primaryColor: "brand",
  primaryShade: 6,
  white: tokens.color.surface,
  black: tokens.color.ink,
  colors: {
    brand: roleScale(tokens.color.primary),
    danger: roleScale(tokens.color.errorText),
  },
  fontFamily: tokens.font.body,
  defaultRadius: "sm",
  respectReducedMotion: true,
  fontSizes: { xs: "12px", sm: "14px", md: "16px", lg: "18px", xl: "20px" },
  lineHeights: {
    xs: "1.333333",
    sm: "1.428571",
    md: "1.5",
    lg: "1.444444",
    xl: "1.4",
  },
  spacing: Object.fromEntries(
    Object.entries(tokens.spacing).map(([key, value]) => [key, `${value}px`]),
  ),
  radius: Object.fromEntries(
    Object.entries(tokens.radius).map(([key, value]) => [key, `${value}px`]),
  ),
  headings: {
    fontFamily: tokens.font.heading,
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "32px", lineHeight: "1.25" },
      h2: { fontSize: "28px", lineHeight: "1.285714" },
      h3: { fontSize: "24px", lineHeight: "1.333333" },
      h4: { fontSize: "20px", lineHeight: "1.4" },
    },
  },
  shadows: {
    xs: "none",
    sm: tokens.shadow.floating,
    md: tokens.shadow.floating,
    lg: tokens.shadow.dialog,
    xl: tokens.shadow.dialog,
  },
  components: componentDefaults,
});

export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    ...Object.fromEntries(
      Object.entries(tokens.color).map(([key, value]) => [
        `--po-${key}`,
        value,
      ]),
    ),
    "--po-font-heading": tokens.font.heading,
    "--po-overlay": tokens.overlay,
  },
  light: {
    "--mantine-color-body": tokens.color.cloud,
    "--mantine-color-text": tokens.color.ink,
    "--mantine-color-dimmed": tokens.color.secondary,
    "--mantine-color-error": tokens.color.errorText,
  },
  dark: {},
});
