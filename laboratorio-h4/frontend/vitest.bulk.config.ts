import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/bulk.unit.test.ts"],
    environment: "node",
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
