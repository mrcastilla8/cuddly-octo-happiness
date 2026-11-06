# Integración vera/master — PR #21

Fecha local: 11 de octubre de 2026, America/Bogota. Raíz comprobada: `C:/Users/User/workspace/G6-Productos-Ofertas-frontend`. Rama `vera`, inicialmente limpia en `00265438fe6b4a3802358574533db4691e79b872`. Target obtenido con fetch: `origin/master@421951b30d506589e43dcc4c07b4194eea2026b8`. Integración con `git merge --no-commit --no-ff origin/master`; master no se modifica.

La [PR #21](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/21) sigue abierta hacia master. El SHA publicado y resultado remoto se vinculan en su descripción/checks antes de solicitar la auditoría final. Este informe registra pruebas locales; no equivale a aprobación humana, despliegue o API integrada.

## Fuentes consultadas

AGENTS.md completo, README, package/configuración, issue #15 y observaciones de auditoría, archivos compartidos de ambas ramas, runtime/contexto/puertos/adapters de Pricing y suite existente. `docs/AVANCE_FRONTEND_CUEVA.md`, `docs/PR_PROMOTIONS_CUEVA.md` y los cinco archivos de pruebas incorporados por master acreditan el alcance implementado de MK-005/006/007.

Docs: `master@be5c2db16aca6d6d18b3005a2da4205f724038e3`, confirmado con ls-remote del remoto oficial `Taller-SW-Web/Productos-y-Ofertas-docs`. `../docs`: NO ENCONTRADO; `../Productos-y-Ofertas-docs` sigue en `b640b7f`, por lo que se conserva la referencia oficial consultada para H01–H16. Fuentes por SHA: SPEC/HU/FLOW/WF-013, propuesta/decisiones/guías UX 2.0, DESIGN 1.1.0, `MK-013/{component-spec,plan,tasks}.md`, seis HTML y OpenAPI 0.5.0. Reporte oficial de validación MK-013: NO ENCONTRADO. No se modificaron Docs/Backend.

SAFE_NOW: registros compartidos, configuración explícita, recuperación de catálogo y pruebas. NEEDS_DECISION: Q-013-01/02, conversión de moneda, providers y aprobación funcional/UX. No se inventan contratos ni se cambian reglas de Cueva.

## Resolución de archivos compartidos

| Archivo | Resolución comprobada |
|---|---|
| `src/app/routes/productRoutes.tsx` | Unión de Pricing S01–S06, Cupones S01–S06, Promociones S01–S06 y Recomendaciones S01–S07. Una sola `/precios`; conserva layouts, hijos `alcance`/`productos` y borradores. |
| `src/app/routes/productPages.tsx` | Merge automático inspeccionado: 19 exports lazy (6 Pricing + 13 componentes para las otras 19 vistas). Ningún import de master perdido. |
| `src/app/navigation/navigation.ts` | Grupos de master y cinco destinos. Importar precios añade alias `/precios/importaciones` mediante `matchPaths`. |
| `src/app/navigation/ApplicationNavigation.tsx` | Grupos de master y prefijo más específico de vera. Una sola entrada activa en las 25 rutas. |
| `src/app/routes/AppRoutes.tsx` | Diferencia de orden de imports resuelta. Un único createBrowserRouter/RouterProvider; root, shell, hijos, not-found y demos solo DEV preservados. |
| `src/main.tsx` | Conserva Mantine/theme/fonts y PricingProvider. Factory único con modo validado; errores de arranque visibles. |
| `README.md` | Inventario/configuración/límites de las 25 pantallas, PR publicada y reportes actuales/históricos. |

`src/features/promotions` y sus cinco archivos de pruebas se conservan idénticos a master. Se reutilizan shell/theme/shared; no cambian tokens, contratos ni ownership.

## N03–N05 y archivos adicionales

- N03: `src/app/config/dataMode.ts`, `vite.config.ts` y `main.tsx` exigen `mock|api` explícito en producción; solo DEV tiene default mock. `pricingService.ts` requiere modo. `.env.example` explica demo/despliegue real. `DataModeContext.ts`/`CommercialModeGate.tsx` y wrapper de `ApplicationShell.tsx` bloquean módulos todavía solo mock en API antes de cargar sus páginas/adapters; en demo siguen disponibles. No se añade otro selector de adapters.
- N04: README, este informe, `PR_MK013.md` y anotación histórica en `AUDITORIA_MK013.md` reflejan integración/PR real. H01–H16 conserva sus 48 tests anteriores y enlaza el resultado nuevo.
- N05: `PricingProvider.tsx` incrementa revisión del catálogo; `PricingContext.ts` expone reintento y `PricingPageFrame.tsx` presenta el botón en error. Conserva runtime/URL/documento; cancela solicitudes anteriores con el hook existente, sin fallback.
- `tests/adapters/alternatePricingRepository.ts` y harness: fallo de catálogo aislado a pruebas, sin escenarios en el contrato productivo. `tests/integration.spec.ts`: ocho tests de configuración, retry, barrera API, 25 rutas, grupos y sidebar/retorno.
- `scripts/verify-production.mjs`: Playwright contra build servido mock/API. `.github/workflows/frontend.yml`: mock explícito, smoke de producción, suite completa y artefactos `frontend-integration-evidence`.
- `docs/evidencias/*.png`: capturas renovadas de las 25 vistas con navegación integrada y casos de auditoría/estados existentes.

## Verificaciones ejecutadas

| Verificación | Resultado |
|---|---|
| `npm ci` | PASS: 191 packages, 0 vulnerabilidades. Primer intento EPERM por binding abierto en Vite; se detuvo solo ese servidor del workspace y se repitió correctamente. |
| `npm run typecheck` | PASS, tsc --noEmit. |
| `npm run lint` | PASS, ESLint sin errores/advertencias. |
| `npm run build`, VITE_DATA_MODE=mock | PASS, 7248 módulos, 2.07 s de Vite en repetición final. |
| `npm run build`, VITE_DATA_MODE=api | PASS, 7248 módulos, 2.91 s de Vite. No acredita API real. |
| `npm run build`, sin VITE_DATA_MODE | Rechazo previsto, exit 1 y mensaje de configuración explícita. N03 comprobado. |
| `npm test`, CI=true (dos workers) | PASS: **85 tests**, 3.3 min. 48 Foundation/Pricing previos + 29 Cueva + 8 nuevos. |
| `git diff --check`, `git diff --cached --check` | PASS; sin marcadores ni paths unmerged. |
| `node scripts/verify-production.mjs api` | PASS contra preview 5174: cuatro rutas, providers ausentes explícitos, retry y cero requests a chunks mock/páginas deshabilitadas. |
| `node scripts/verify-production.mjs mock` | PASS: cuatro módulos presentes, 1440 px y controles de revisión ausentes aunque se envíen parámetros demo. |
| Visual desktop | Chromium 1440×900. Capturas de 25 pantallas, geometría sin overflow; inspección visual de los cuatro conjuntos en láminas de contacto en test-results (solo revisión). |

Se verifican rutas directas/sidebar de las 25 vistas. Las suites comprueban filtros/historial, alta/edición, retorno a listado, borradores y selección temporal conservada al volver de hijos anidados. Sin errores de imports/pageerror en recorridos de integración. Mobile/WCAG exhaustiva y aprobación UX humana: NO EJECUTADOS.

MOCK_REPLACEABLE continúa comprobado en Pricing: otro catálogo/UUID/SKU, CHF y lote, usando App/S01–S06 sin modificaciones. Archivo/política por puerto, reportes del segundo adapter y errores sin fallback verificados. Las páginas productivas de Pricing no importan fixtures ni escenarios; factory único y reloj/downloader inyectados. La barrera API impide cargar mocks de módulos todavía no integrados. No se atribuye MOCK_REPLACEABLE a los adapters de Cueva.

## CI remoto y pendientes

El workflow ejecuta instalación, typecheck, build explícito mock, lint, Chromium, smoke del build y suite completa; publica capturas/diagnóstico y `validation-commit.txt`. El resultado del SHA enviado a vera se vincula en la [descripción/checks de PR #21](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/21/checks). Solo un run concluido exitosamente acredita CI; la existencia del YAML no basta.

CI remoto comprobado para el commit de integración **`c0c4dc96c965f0381d7548206e7e8cf803fa0a84`**: [push SUCCESS](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38193815806) y [PR SUCCESS](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38193818780). El log de PR confirma **85 PASS (3.1 min)** y el smoke del build PASS. [Artefacto frontend-integration-evidence](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38193818780/artifacts/11722857789), 5,443,920 bytes, con capturas/resultados y revisión validada. El checkout del evento pull_request es el merge sintético de GitHub (`c1e2b2c`), asociado al head `c0c4dc9`; el evento push valida el head. La confirmación del commit posterior de documentación queda vinculada en los checks/descripción actualizados de PR #21 antes de entregar la auditoría.

Q-013-01/02 permanecen BLOCKED_CONTRACT: parser/plantilla y admisión con errores no definidos; confirmación de importación deshabilitada. Política de cambio de moneda pendiente. D-REC-01/02 mantienen precio/disponibilidad no disponibles; providers/auth/grants administrativos pendientes. Última revisión técnica/funcional/UX humana pendiente. Estado: **MOCK_INTEGRATED / MOCK_ONLY**, Pricing **MOCK_REPLACEABLE**; S04 parcial por contrato. PR abierta, sin merge a master ni cierre de #15.
