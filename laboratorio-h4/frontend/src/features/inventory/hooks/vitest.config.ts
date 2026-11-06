import { defineConfig } from "vitest/config";

// Configuración de las pruebas de hooks del feature de inventario.
// Se ejecuta con `npx vitest run --config src/features/inventory/hooks/vitest.config.ts`
// y forma parte de `npm test` mediante `test:unit:inventory`.
// Usa DOM (jsdom) porque las pruebas montan el hook real con React y verifican
// la secuencia completa PUT confirmado -> recarga fallida, no solo funciones
// auxiliares.
export default defineConfig({
  test: {
    include: ["src/features/inventory/hooks/*.spec.ts"],
    environment: "jsdom",
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
