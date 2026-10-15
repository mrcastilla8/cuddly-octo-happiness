# Auditoría final — corte 2026-10-15

## Avance y evidencia

- Siete servicios no Inventory tienen scaffold NestJS/GET /health; esto acredita parcialmente solo BACK-01. No se infiere avance de dominio, persistencia, APIs o eventos.
- Gateway local acredita GET /health, no forwarding, auth demo ni consumers BFF.
- Inventory está en rama taco/PR #10 OPEN/DRAFT, head 2c4a18105c5e379edc8476b9d315aa6be1134b80. Se hizo mapeo issue-por-issue abajo. No se confunde código en PR abierto con merge o release.
- Frontend auditado tiene páginas/fixtures/mocks y VITE_DATA_MODE; para la mayoría no hay adapter HTTP real. MK-015/016 no tienen feature/pages/adapters Inventory en el checkout. VITE_DATA_MODE=api no debe caer a fixtures.
- GitHub: Backend #1 y #8 OPEN, PR #9 MERGED; DATA #11–#16 y DATA-VAL-001 #17 OPEN; Frontend MK-001 issue #3 CLOSED y #4–#18 OPEN. PR UI #21–#27 MERGED según feature salvo #28 OPEN; la UI/mocks no acreditan integración HTTP. Backend PR #10 OPEN/DRAFT.

## PR #10 Inventory: mapa de alcance, commits, archivos y tests

| Bloque | Evidencia observada en PR abierto | Estado del issue |
|---|---|---|
| BACK-01 config/auth | CONFIGURACION.md, src/config/inventory.config.ts, src/auth/*, src/main.ts; commits 03a491879255, 3378f0413ada, 393773e2f494; test/app.e2e-spec.ts cubre health y casos JWT | IMPLEMENTADO_SIN_VALIDAR |
| BACK-02 Drizzle/DB | src/drizzle/schema.ts, src/database/*, src/repositories/*; commits 8a0204313fa6, bf8f699bfe31, 13da441f4767; test DB/UPDATE RETURNING/rollback | IMPLEMENTADO_SIN_VALIDAR |
| BACK-03 dominio | reservations, disponibilidad, operations, Kardex, idempotency; reservations.cycle.spec.ts, reservations.concurrency.spec.ts, disponibilidad.spec.ts; incidentes, umbrales, traslados, offline/F3 aún no cubiertos | PARCIAL |
| BACK-04 consultas | src/inventory.controller.ts: disponibilidad/operación y verificación comercial; app.e2e-spec.ts; restantes operationIds ausentes | PARCIAL |
| BACK-05 writes | Controller/service: reservar/confirmar/liberar; prueba de ciclo e idempotencia; los restantes writes HTTP OpenAPI no constan en controller | PARCIAL |
| BACK-06 eventos | src/outbox/*, src/workers/*; commits 4f03d9d3a87d, 22c055f922ce, 9cba206f68e9, b947fd9e9a7f; test publisher/recovery. No se acreditan consumers bulk adjust/SKU init | PARCIAL |
| BACK-07 robustez | src/errors/*, expiration/outbox/workers; commits 61541b6d9160, 116e7b306f3a; pruebas de recovery/expiración; alcance restante | PARCIAL |
| BACK-08 React | No feature Inventory/pages/adapters detectados; Frontend #17/#18 OPEN | NO_INICIADO |
| BACK-09 E2E producto | test/app.e2e-spec.ts, test/inventory.real.integration.spec.ts; PR declara 11/11 con PostgreSQL/Rabbit efímeros. No cubre React→Gateway | PARCIAL |

Los resultados son declaraciones/archivos visibles en un PR abierto; confirmar checks al SHA vigente y no contarlos como merged. Los tests de proveedor no son E2E de la aplicación.

## Supabase — interpretación corregida

La lectura de metadatos mostró 84 tablas con RLS desactivado; el advisory de seguridad mencionó roles anon y authenticated. La lectura realizada no verificó para cada tabla: grants efectivos, si el schema está expuesto por la API, credenciales PostgreSQL directas de cada servicio ni una ruta externa que permita llegar a datos. Por eso no se afirma que las 84 estén públicamente expuestas. La publicación de demo anónima permanece P0 hasta documentar las cinco capas. El trabajo local con PostgreSQL aislado y fixtures sintéticos puede continuar. No se ejecutó SQL ni se modificaron policies/grants.

## Solapamientos revisados

- SHARED-BACK-02 eliminado: INFRA #1 cubre configuración/conexión SSL, env de ejemplo, runner y control de acceso; env/health propios quedan en BACK-01 y Drizzle en BACK-02.
- DEPLOY-BACK-01 retenido con límite: INFRA #8/PR #9 cubre CD Oracle reusable; el issue nuevo solo prepara composición de demo, readiness, referencias secretas y rollback integrados. No reimplementa pipeline ni lo activa.
- DATA-BACK-01 retenido: DATA #11–#16 prepara fixtures por owner y DATA-VAL #17 valida; ninguno acredita procedimiento de restauración entre demos. El nuevo issue orquesta/describe restore del dataset autorizado y reutiliza INFRA #1, sin duplicar seeds ni autorizar escritura.
- price-audit: BACK-05 se limita al POST de exportación asíncrona. BACK-06 consume pricing.price.changed, usa inbox/dedupe y declara NO_APLICA a outbox/publicación de evento propio; no se agrega CRUD admin ni evento.
- Inventory ajuste manual: OpenAPI no contiene operación HTTP genérica de ajuste; no se inventa. El ajuste bulk usa el comando AsyncAPI ya descrito.

## Hallazgos abiertos

### P0

- Demo pública sin login frente a operaciones userBearer: por resolver para cada operationId con G7/Seguridad y Marco. Prohibido quitar guards o usar token de servicio desde React.
- Habilitación pública Supabase/Gateway pendiente de confirmar por separado RLS, grants, schemas expuestos, credenciales DB y rutas públicas. El advisory es señal para revisar, no prueba de exposición efectiva general.

### P1

- Contratos RC HTTP/AsyncAPI no prueban homologación externa; G5 debe confirmar provisioning/topología/retry-DLX; las pruebas aisladas no sustituyen eso.
- Component specs de MK-005..007 están documentados en revisión/no aprobados, mientras issues/páginas frontend tienen su propio estado. La UI sigue sujeta a alineación UX; APIs internas pueden avanzar.
- MK-016 aparece como plantilla sin instanciación en docs y MK-015/016 no tienen frontend inventory actual. Bloqueo acotado a UX/operación externa de esas pantallas.
- Seis transversales conservan OWNER_PENDIENTE; el manifiesto propone candidatos sin asignar.

### P2

- No se encontró DATA-007 ni restauración en los DATA existentes; no se inventa número.
- Playwright queda enfocado a Chromium/worker 1 local; suite completa solo CI/cierre.

## Corte de repositorios

La auditoría anterior registró Docs master c36bd9a18f4fdb188df0d7e5158a431cf4b4ea7b, checkout Docs cb7ee179f812d38929e20c5ab6f7a77139c4090 con cambios ajenos preservados; Backend master 24227527c632be4f3b8de612954328904ea57de0, checkout taco PR#10; Frontend master 79f407dfeb7f11c958faa4de0b2f0ec4321ea28f, local fd3e8c4408e310cbea60c445b64f3de4184e362a. No se supuso sincronía. Branches/repo/assignees deben revalidarse al publicar.

No se ejecutó gh issue create/edit/close, no se publicaron issues, no se modificaron repositorios, PRs, issues, datos, grants ni infraestructura.

## Revalidación final de owners y ramas

La lectura actual de branches confirma `castilla`, `poma`, `cueva`, `lopez`, `vera` y `taco` en Backend y Frontend. Los seis logins oficiales —mrcastilla8, GabrielPGu, AXL031, VicuzS, LeonardoVera y MiguelTacoZavala— son asignables en ambos repositorios al corte consultado. Mapeo de ownership: bulk/combos→mrcastilla8/castilla; catálogo→GabrielPGu/poma; promociones y Gateway→AXL031/cueva; taxonomía→VicuzS/lopez; pricing/audit→LeonardoVera/vera; Inventory→MiguelTacoZavala/taco. Los transversales permanecen OWNER_PENDIENTE.

Las referencias Frontend reconsultadas muestran MK-001 issue #3 CLOSED, MK-002..016 #4..#18 OPEN. PR Frontend #21..#27 MERGED y #28 OPEN; PRs UI aportan estado de presentación solamente. No se usaron como evidencia API.


## Dependencias entre bounded contexts y AsyncAPI

- BACK-08 registra dependencias condicionales por operación y flujo; no convierten una integración pendiente en bloqueo de todo el servicio. BACK-09 registra los prerrequisitos de los servicios participantes para el ciclo de integración. La matriz y BACK_HITO3_DEPENDENCIAS.md conservan ambos tipos por separado.
- Catalog BACK-06 publica pricing.product.initialization.requested e inventory.sku.initialization.requested, y consume sus respuestas; los nombres y responsabilidades se verificaron contra AsyncAPI RC2 candidata en master. No se presume implementación ni homologación por estar en contrato.
- El grafo completo auditado (obligatorias y condicionales) tiene 0 ciclos, 0 referencias rotas y 0 desajustes de relación inversa.
