export type DataMode = "mock" | "api";

export function resolveDataMode(
  value: string | undefined,
  development: boolean,
): DataMode {
  if (value === undefined && development) return "mock";
  if (value === "mock" || value === "api") return value;
  throw new Error(
    "Configura VITE_DATA_MODE explícitamente como mock (demostración) o api. Producción no admite un valor predeterminado.",
  );
}
