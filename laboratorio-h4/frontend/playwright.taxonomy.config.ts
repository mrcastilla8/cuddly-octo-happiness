import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /taxonomy\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
});
