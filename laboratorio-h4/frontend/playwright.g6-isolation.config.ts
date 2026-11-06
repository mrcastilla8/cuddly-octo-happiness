import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./verification", testMatch: "g6-demo-isolation.spec.ts", workers: 1, retries: 0,
  use: { baseURL: "http://127.0.0.1:5177", browserName: "chromium", viewport: { width: 1440, height: 900 }, screenshot: "only-on-failure" },
  webServer: { command: "npm run dev -- --port 5177 --strictPort", url: "http://127.0.0.1:5177", reuseExistingServer: false,
    env: { VITE_DATA_MODE: "api", VITE_G6_READ_DEMO: "true", VITE_GATEWAY_ORIGIN: "https://gateway.test" } },
});
