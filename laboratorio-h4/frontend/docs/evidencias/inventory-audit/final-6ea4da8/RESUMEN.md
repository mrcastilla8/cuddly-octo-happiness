# Evidencia de validación — MK-015 / MK-016 (rama `taco`)

- **SHA de código validado:** `6ea4da8` (`test(inventory): regresiones TAC-13 y TAC-14 …`)
- **Commit de correcciones previo:** `bfd85f6` (`fix(inventory): aclarar estados no excluyentes por SKU e incluir error de ubicaciones`)
- **Base:** `origin/master` = `2759c8d` (sin avanzar; **no** fue necesario re-sync)
- **Ámbito:** `src/features/inventory/` (MK-015 control de stock, umbrales y traslados; MK-016 dashboard y alertas)
- **Este documento no introduce cambios de código**; solo adjunta la evidencia de la validación local.

## Hallazgos de esta ronda (Marco)

| ID | Sev. | Corrección | Regresión |
|---|---|---|---|
| TAC-13 | P2 | La grilla de KPIs aclara que los estados por SKU no son mutuamente excluyentes y que su suma puede superar el total de SKU únicos. | `inventory-dashboard.spec.ts` → *TAC-13: aclara que un SKU puede contarse en varios estados…* |
| TAC-14 | P2 | El aviso parcial de filtros del dashboard incluye el error de ubicaciones (que el hook ya detectaba) y permite reintentarlo con el mismo botón que categorías y marcas. | `inventory-dashboard.spec.ts` → *TAC-14: incluye ubicaciones en el aviso y las recupera al reintentar* |

Los hallazgos previos (TAC-01…TAC-12) se mantienen corregidos y con sus regresiones verdes.

## Resultados (comandos ejecutados)

| Comando | Resultado | Log |
|---|---|---|
| `npm run typecheck` | PASS | `typecheck.txt` |
| `npm run lint` | PASS | `lint.txt` |
| `VITE_DATA_MODE=mock npm run build` | PASS | `build-mock.txt` |
| `node scripts/verify-production.mjs mock` | PASS (52 vistas) | `verify-mock.txt` |
| `node scripts/vercel-smoke.mjs http://127.0.0.1:5174` | PASS (5 rutas) | `vercel-smoke.txt` |
| `VITE_DATA_MODE=api npm run build` | PASS | `build-api.txt` |
| `node scripts/verify-production.mjs api` | PASS (48 vistas) | `verify-api.txt` |
| `npx playwright test --retries=1` | **310 ejecutadas: 309 passed + 1 flaky** (pasó en el reintento) | `playwright-full.txt` |

- **Flaky observado:** `tests/inventory.spec.ts:325 › MK-015: Navegación entre vistas de inventario`.
  Verificado en aislamiento con `--repeat-each=3`: **3 passed**. Es un flake por carga, no un fallo de código.
- **`git diff --check`:** limpio.

## CI

El workflow corre en `pull_request`. La evidencia de **CI verde para el SHA final** se adjunta en el PR
(no puede registrarse aquí de antemano porque depende del run de Actions del PR abierto).
