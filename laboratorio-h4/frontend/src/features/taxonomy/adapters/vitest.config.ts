import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "src/features/taxonomy/adapters/**/*.test.ts",
      "src/features/taxonomy/adapters/**/*.test.tsx",
      "src/features/taxonomy/services/**/*.test.ts",
    ],
    environment: "node",
  },
});
