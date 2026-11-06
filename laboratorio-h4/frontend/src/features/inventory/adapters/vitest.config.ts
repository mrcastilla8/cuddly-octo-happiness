import { defineConfig } from "vitest/config";

// Configuración local del feature de inventario. Se ejecuta con
// `npx vitest run --config src/features/inventory/adapters/vitest.config.ts`
// y también forma parte de `npm test` mediante `test:unit:inventory`, para que
// el CI del PR ejecute las regresiones de inventario y no solo Combos/Bulk.
// No modifica las suites existentes de la raíz.
export default defineConfig({
  test: {
    include: ["src/features/inventory/adapters/*.spec.ts"],
    environment: "node",
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
