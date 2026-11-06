# Evidencia — Integración con `origin/master` (`15afd22`) y re-validación completa (Issue #39)

- **SHA de `origin/master` integrado:** `15afd228e4a987336fc32b4cceeb6ebfff0da967` (Merge PR #42 — Bulk/Combos)
- **SHA de merge en `taco`:** `b1a64da6d0ecf804d4f01f75a687ea0179337137`
- **SHA de código validado:** `70ffad13c6a7698235ffb17face4d1b0b65ad0d5`
- **Rama:** `taco` (sin ramas nuevas ni force push)

## 1. Resolución de los 8 archivos compartidos con `origin/master` (`15afd22`)

| Archivo | Resolución aplicada |
|---|---|
| `src/app/config/CommercialModeGate.tsx` | Conserva en `mockOnly` tanto `/inventario` como `/combos`, diferenciando el título/mensaje de Combos (`Provider API de Combos no configurado`) y el general (`Integración API no disponible`). |
| `src/app/routes/productPages.tsx` | Conserva las exportaciones lazy de Bulk (`BulkLayout`, `BulkUploadPage`, `BulkReviewPage`, `BulkProgressPage`, `BulkResultPage`, `BulkDownloadsPage`), Inventario (`StockControlPage`, `ThresholdsPage`, `TransfersPage`, `InventoryDashboardPage`) y Combos (`ComboListPage`, `ComboCreatePage`, `ComboEditPage`, `ComboDetailPage`). |
| `src/app/routes/productRoutes.tsx` | Conserva todas las rutas de Combos (`/combos*`), Carga masiva (`/carga-masiva*`) e Inventario (`/inventario`, `/inventario/umbrales`, `/inventario/traslados`, `/inventario/dashboard`). |
| `src/app/navigation/navigation.ts` | Conserva `bulkNavigation` (`Carga masiva` y `Descargas y exportación` con `IconFileSpreadsheet`), `Gestión de combos` (`/combos`) y las 3 entradas de Inventario (`Control de stock`, `Traslados de stock`, `Dashboard analítico`). |
| `scripts/verify-production.mjs` | Conserva las verificaciones de las 4 rutas de Inventario y las 5 rutas de Combos (más `?scenario=list-error` en `mock`), la regex combinada de modo `api` y el cómputo de `totalViews` (58 en `mock`, 53 en `api`). |
| `tests/taxonomy-ui.spec.ts` | Elimina el conteo fijo de 17 enlaces y verifica por nombre y `href` los destinos relevantes, incluyendo `Gestión de combos` (`/combos`), `Control de stock` (`/inventario`), `Traslados de stock` (`/inventario/traslados`) y `Dashboard analítico` (`/inventario/dashboard`). |
| `tests/integration.spec.ts` | Verifica por nombre y `href` tanto `Gestión de combos` (`/combos`) como `Control de stock` (`/inventario`) y el grupo `INVENTARIO`. |
| `README.md` | Conserva la documentación de Carga masiva, Gestión de combos (MK-002) e Inventario (MK-015/MK-016), así como los scripts de prueba de `master` (`npm test`, `npm run test:ci`, `npm run test:unit:combos`, `npm run test:unit:bulk`). |

## 2. Resultados reales de validación sobre SHA `70ffad13c6a7698235ffb17face4d1b0b65ad0d5`

| Comando | Resultado | Detalle |
|---|---|---|
| `npm ci` | **PASS** | 208 paquetes auditados, 0 vulnerabilidades. |
| `npm run typecheck` | **PASS** | `tsc --noEmit` sin errores. |
| `npm run lint` | **PASS** | `eslint .` sin errores ni advertencias. |
| `$env:VITE_DATA_MODE='mock'; npm run build` | **PASS** | 7455 módulos transformados, `dist/` generado en 2.04s. |
| `node scripts/verify-production.mjs mock` | **PASS** | `PASS producción mock: 58 vistas de Catálogo, Promotions, Pricing S01, Auditoría S01–S05, Taxonomía, Inventario y Combos S01–S03, 1440 px, sin errores; módulos presentes, tablas comerciales verificadas y controles de revisión ausentes.` |
| `node scripts/vercel-smoke.mjs http://127.0.0.1:5174` | **PASS** | `PASS smoke mock: cinco rutas, refresh, 42 recursos JS/CSS, cero errores; http://127.0.0.1:5174` |
| `$env:VITE_DATA_MODE='api'; npm run build` | **PASS** | 7455 módulos transformados, `dist/` generado en 1.84s. |
| `node scripts/verify-production.mjs api` | **PASS** | `PASS producción api: 53 vistas de Catálogo, Promotions, Pricing S01, Auditoría S01–S05, Taxonomía, Inventario y Combos S01–S03, 1440 px, sin errores; providers ausentes explícitos, reintento y persistencia del error de Pricing, taxonomía, inventario y combos bloqueados y cero carga de mocks/bundles.` |
| `npm run test:ci` | **PASS** | Unitarias Combos: **36 passed (36)** · Unitarias Bulk: **24 passed (24)** · E2E Playwright: **286 passed (11.2m)** (0 fallos, 0 reintentos). |
| `npm run test:e2e:smoke:bulk` | **PASS** | **4 passed (13.6s)**. |
| `npm run test:smoke:combos` | **PASS** | **5 passed (11.8s)**. |
