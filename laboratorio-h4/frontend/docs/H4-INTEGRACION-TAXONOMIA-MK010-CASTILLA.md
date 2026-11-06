# H4 — Recuperación e integración de Taxonomía MK-010

Fecha: 2026-11-04. Estado de esta entrega: adaptador frontend implementado y validado localmente; integración con Gateway desplegado y JWT G7 real pendientes.

## Trazabilidad

| Referencia | SHA / estado | Nota |
| --- | --- | --- |
| Frontend `master` base | `095a591a3e096614e76b4d99e623ecbba43f6c1f` | HEAD consultado antes de crear la rama. |
| Frontend PR #65 | `715ae909b1fc8cf45598c863f787b284dd2367ec` | Commit de López preservado mediante `git cherry-pick -x`. |
| Commit recuperado | `3378f19` | Único conflicto en README; se conservaron los cambios actuales de `master` y la fila nueva de Taxonomía. |
| Rama de trabajo | `castilla-mk010-gateway-h4` | Nombre alternativo: Git ya contiene la rama local `castilla`, por lo que no admite `castilla/mk010-gateway-h4` como referencia anidada. |
| Docs consultados al implementar | `cb7eec179f812d38929e20c5ab6f7a77139c4090` | OpenAPI, SPEC/HU/FLOW-010 y fuentes UX locales. |
| OpenAPI de Docs contrastado en esta actualización | `80f208978c2c703e2b2d62064112365e7b9e1677` | `master` remoto, `contratos/http/openapi.yaml`; solo se actualizaron estas notas, sin cambiar adaptador ni DTOs. |
| Backend consultado | `5abfffc9b86306df87d19695817aa678588e0341` | Solo lectura para el contrato y guías. No se modificó el repositorio Backend. |

PR #65 permanece abierta e intacta. PR #63 no fue modificada. El checkout frontend preexistente `feat/taxonomy-gateway` con siete archivos locales modificados se conservó sin cambios.

## Cambios MK-010

- `GET /api/v1/tipos-producto` valida `items`, todos los campos de `PageMeta`, tamaño y página solicitados, cantidad de resultados, total estable entre páginas, IDs no vacíos y únicos, nombres no vacíos, `schemaVersion` positivo y estados publicados `ACTIVO`/`INACTIVO`.
- Paginación usa tamaño 200, el máximo de OpenAPI. No hay límite artificial de páginas ni truncamiento silencioso. Características asignadas y límite quedan no disponibles porque el endpoint no los entrega.
- Cada consulta tiene timeout acotado y comparte cancelación con la señal del hook. La UI conserva loading, éxito, lista vacía, error visible y reintento; el modo `api` nunca cambia a fixtures ante un fallo.
- La sesión G7 humana existente se reutiliza. Solo ante `401 TOKEN_INVALIDO` se renueva y repite el GET una vez; errores 401 desconocidos, 403, 5xx, conexión fallida y ausencia de sesión no se reintentan. Las rutas administrativas MK-008, MK-009, MK-011 y MK-012 y operaciones MK-010 sin adapter permanecen cerradas en API.
- `test:unit:taxonomy` quedó agregado a `npm test`; el workflow existente ya ejecuta ese comando. No se editó `.github/workflows/frontend.yml` ni la configuración de CI atomizada.
- El verificador de producción permite el copy exacto “Datos simulados” solo en rutas Taxonomía del modo `mock`; mantiene bloqueados los avisos comerciales/técnicos y no permite fallback en `api`.

## Contrato y seguridad pendientes

En el OpenAPI actual de Docs (`80f208978c2c703e2b2d62064112365e7b9e1677`), `GET /tipos-producto` (`listarTiposProducto`) declara `userBearer` y `serviceBearer` como alternativas de seguridad. El esquema `userBearer` describe un JWT humano; `serviceBearer`, un JWT de servicio con audiencia `api-productos` y el scope declarado por operación. Para esta ruta figuran `x-required-scope: catalogo:leer`, `x-allowed-client-ids: [modulo-productos]` y `x-scope-registration-status: pending-security-registration`. El OpenAPI define requisitos y estado documental, pero no acredita que exista una credencial, JWT, grant o registro efectivo. La integración con credenciales/grants reales no se ha comprobado.

`TipoProductoAdmin.estado` referencia `EstadoEntidad`, que solo publica `ACTIVO` e `INACTIVO`. `PENDING_DEACTIVATION` aparece en el OpenAPI actual en el esquema de resultado de verificación de desactivación; no pertenece al enum de `TipoProductoAdmin.estado`. El runtime de Backend puede devolver ese estado al listar tipos, por lo que existe una discrepancia entre el provider y el contrato publicado. El adaptador de frontend conserva el rechazo de estados no publicados: no aceptará `PENDING_DEACTIVATION` hasta que el owner de Taxonomía y Docs homologuen qué estado devuelve el listado y cómo queda reflejado en el contrato.

La segunda discrepancia es `schemaVersion`: el OpenAPI actual permite enteros desde 0 (`minimum: 0`) en `TipoProductoAdmin`, mientras que Backend exige un entero positivo para el tipo. El adaptador mantiene esa validación positiva. Corresponde a Backend/Docs homologar el mínimo contractual y alinear la regla antes de admitir `0`; no se cambia unilateralmente el frontend para relajarla.

La política H4 `RESTRICTED_DEMO` y Backend #144 fueron leídos. Esta rama no implementa bypass, token técnico, acceso anónimo ni secretos. La prueba positiva con JWT G7 real, la verificación del grant del Gateway y la homologación de ambas discrepancias contractuales siguen pendientes.

## Validaciones locales

Entorno: Node `v24.3.0`, npm `11.4.2`. `npm ci` terminó, pero emitió `EBADENGINE`: el repositorio requiere Node `>=22.12.0 <23`. También reportó 13 advisories (12 moderados, 1 alto); no se cambiaron dependencias.

| Comando | Resultado |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run test:unit:taxonomy` | PASS, 36 tests |
| `npm test` | PASS, 416 tests en los seis grupos configurados |
| `$env:VITE_DATA_MODE='mock'; npm run build` | PASS |
| `$env:VITE_DATA_MODE='api'; npm run build` | PASS |
| `node scripts/verify-production.mjs mock` | PASS, 58 vistas; aviso mock explícito limitado a Taxonomía |
| `node scripts/verify-production.mjs api` | PASS, 53 vistas; cero carga de mocks/bundles |
| `npx playwright test tests/taxonomy-mk010.spec.ts tests/taxonomy-ui.spec.ts --workers=1` | PASS, 40 tests; pruebas UI/mock y viewport 1440×900, no integración de Gateway |
| `node scripts/ci/run-taxonomy-integration.mjs` en Backend | PASS, 39/39 con PostgreSQL desechable, checkout `feat/bulk-h4-cierre-http` en SHA `ca1c5a6fd0bf304267007f9b017f5780fb25f538`; prueba del provider, no del flujo Frontend→Gateway |

Docker está disponible. No se halló un harness ejecutable de Frontend→Gateway→Taxonomy local en los archivos inspeccionados; no se levantó el compose Oracle porque requiere imágenes/variables externas y monta una CA runtime de Oracle. No se contactó Supabase, Gateway compartido ni servicios desplegados.

## Estado por capa

| Capa | Estado |
| --- | --- |
| MOCK | Preservado en modo `mock`; cubierto por Playwright UI. |
| ADAPTER | Implementado; validación, cancelación, timeout, errores y renovación limitada cubiertos por tests simulados. |
| API / Gateway | No verificado con Gateway real; route/contrato consultados no prueban servicio activo ni grant. |
| JWT | Usa el runtime de sesión humana G7; no hay prueba con JWT emitido por G7 ni scope real. |
| E2E | No existe evidencia desplegada Frontend→Gateway→Taxonomy. El harness de PostgreSQL solo valida el provider backend aislado. |

La ejecución CI remota, el SHA final y la URL de la PR se reportarán en la entrega después de publicar la rama. No se fusionará ninguna PR ni se cerrarán issues.
