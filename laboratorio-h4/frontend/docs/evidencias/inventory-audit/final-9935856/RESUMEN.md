# Evidencia — Estabilidad del test intermitente y re-validación (MK-015 / MK-016)

- **SHA de código validado:** `9935856` (`test(inventory): estabilizar navegacion entre vistas ante transform en frio de Vite`)
- **Base:** `origin/master` = `2759c8d` (sin avanzar; **no** fue necesario re-sync)
- **Ámbito:** `src/features/inventory/` (MK-015, MK-016). Este commit toca **solo un test** (`tests/inventory.spec.ts`).

## Punto 1 de Marco — test intermitente `tests/inventory.spec.ts::MK-015 Navegación entre vistas`

### Causa identificada
- Las páginas de Inventario se cargan con **`React.lazy`** (`src/app/routes/productPages.tsx`); la primera visita a cada ruta dispara el **transform en frío** de Vite de su grafo de módulos.
- El test afirmaba el heading con el **timeout por defecto de `expect` (5000 ms)**. Bajo **alta concurrencia** (suite `fullyParallel`), ese primer render supera los 5 s. Fallo observado:
  `expect(locator).toBeVisible() failed — getByRole('heading', { name: 'Control de stock y disponibilidad' }) — Timeout: 5000ms — element(s) not found` (tests/inventory.spec.ts:329).
- Medición (chromium, 1440×900), ver `cold-vs-warm.txt`:
  - En reposo: frío **1338 ms** / caliente **974 ms**.
  - Bajo carga (corrida completa a **12 workers**): frío máx **4792 ms** / caliente 2275 ms.
  - Esa corrida a 12 workers registró **9 fallos** con `Timeout: 5000ms` / `element(s) not found`.
  → Confirma que no es un defecto funcional sino el límite de tiempo frente a la contención del dev server. **CI usa 2 workers** (mucha menos contención).

### Corrección (sin debilitar la prueba)
- Se da **margen al arranque** solo a las 4 navegaciones de ese test (`{ timeout: 15_000 }`), manteniendo **el mismo locator y la misma aserción**. No se elimina, ni se salta, ni se cambia lo exigido. No se toca `playwright.config.ts`.

### Evidencia de estabilidad
| Corrida | Config | Resultado | Log |
|---|---|---|---|
| Estrés navegación | `--repeat-each=10 --workers=10 --retries=0` | **10 passed** | `stress-navigation.txt` |
| Completa #1 | default workers, `--retries=0` | 309 passed · **1 fallo fuera de alcance** | `playwright-run-1.txt` |
| Completa #2 | default workers, `--retries=0` | **310 passed** | `playwright-run-2.txt` |
| Completa #3 (como CI) | **`--workers=2`**, `--retries=0` | **310 passed** | `playwright-run-ci-2-workers.txt` |

- El único fallo (run #1) es **`tests/promotions-states.spec.ts:2:1` (MK-006/MK-007)**, `page.goto` con *Test timeout de 30000 ms* bajo alta concurrencia: **fuera del alcance de Inventario** y de la misma clase de contención. La corrida representativa de CI (**2 workers**) fue **completamente limpia**.
- El test señalado por Marco (`inventory.spec.ts:325`) **pasa** en las 3 corridas y en las 10 repeticiones del estrés.

## Re-validación completa (SHA `9935856`)

| Comando | Resultado | Log |
|---|---|---|
| `npm run typecheck` | PASS | `typecheck.txt` |
| `npm run lint` | PASS | `lint.txt` |
| `VITE_DATA_MODE=mock npm run build` | PASS | `build-mock.txt` |
| `node scripts/verify-production.mjs mock` | PASS (52 vistas) | `verify-mock.txt` |
| `node scripts/vercel-smoke.mjs http://127.0.0.1:5174` | PASS (5 rutas) | `vercel-smoke.txt` |
| `VITE_DATA_MODE=api npm run build` | PASS | `build-api.txt` |
| `node scripts/verify-production.mjs api` | PASS (48 vistas) | `verify-api.txt` |

## CI
El workflow corre en `pull_request`. La evidencia de **CI verde para el HEAD final** se adjunta en el PR
(depende del run de Actions del PR abierto).
