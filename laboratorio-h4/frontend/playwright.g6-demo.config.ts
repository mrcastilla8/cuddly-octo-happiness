import { defineConfig } from "@playwright/test";
if (!process.env.G6_DEMO_BASE_URL)
  throw new Error("Define G6_DEMO_BASE_URL con el frontend real a verificar.");
export default defineConfig({
  testDir: "./verification",
  testMatch: "g6-read-demo.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 20000 },
  use: {
    baseURL: process.env.G6_DEMO_BASE_URL,
    viewport: { width: 1440, height: 900 },
    browserName: "chromium",
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
});
