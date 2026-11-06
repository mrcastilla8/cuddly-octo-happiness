import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/features/combos/**/*.test.ts",
      "src/features/promotions/**/*.test.tsx",
    ],
    environment: "node",
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
