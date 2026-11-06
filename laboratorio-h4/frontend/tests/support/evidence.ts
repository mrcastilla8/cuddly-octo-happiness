import { test } from "@playwright/test";

// A test run produces artifacts, not an unreviewed replacement of team evidence.
// Opt-in updates are restricted to the three features owned by Cueva.
export function evidencePath(file: string) {
  if (
    process.env.UPDATE_PROMOTIONS_EVIDENCE === "1" &&
    /^(cupones|promociones|recomendaciones)-s0[1-7]-1440\.png$/.test(file)
  ) {
    return `docs/evidencias/${file}`;
  }
  return test.info().outputPath(file);
}
