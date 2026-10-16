# Auditoría final — corte 2026-10-15

## Avance y evidencia

- Siete servicios no Inventory tienen scaffold NestJS/GET /health; esto acredita parcialmente solo BACK-01. No se infiere avance de dominio, persistencia, APIs o eventos.
- Gateway local acredita GET /health, no forwarding, auth demo ni consumers BFF.
- Inventory está en rama taco/PR #10 OPEN/DRAFT, head 2c4a18105c5e379edc8476b9d315aa6be1134b80. Se hizo mapeo issue-por-issue abajo. No se confunde código en PR abierto con merge o release.
- Frontend auditado tiene páginas/fixtures/mocks y VITE_DATA_MODE; para la mayoría no hay adapter HTTP real. En Inventory sí existe un adapter mock y `tests/inventory.spec.ts` con 20 declaraciones, pero faltan componentes/páginas y rutas Inventory; VITE_DATA_MODE=api no debe caer a fixtures.
- GitHub: Backend #1 y #8 OPEN, PR #9 MERGED; DATA #11–#16 y DATA-VAL-001 #17 OPEN; Frontend MK-001 issue #3 CLOSED y #4–#18 OPEN. PR UI #21–#27 MERGED según feature salvo #28 OPEN; la UI/mocks no acreditan integración HTTP. Backend PR #10 OPEN/DRAFT.

## PR #10 Inventory: mapa de alcance, commits, archivos y tests

| Bloque | Evidencia observada en PR abierto | Estado del issue |
|---|---|---|
| BACK-01 config/auth | apps/inventory-svc/CONFIGURACION.md, src/config/inventory.config.ts, src/auth/*, src/main.ts; commits 03a491879255, 3378f0413ada, 393773e2f494; test/app.e2e-spec.ts cubre health y casos JWT | IMPLEMENTADO_SIN_VALIDAR |
| BACK-02 Drizzle/DB | apps/inventory-svc/src/drizzle/schema.ts, src/database/*, src/repositories/*; commits 8a0204313fa6, bf8f699bfe31, 13da441f4767; test DB/UPDATE RETURNING/rollback | IMPLEMENTADO_SIN_VALIDAR |
| BACK-03 dominio | apps/inventory-svc/src/reservations, disponibilidad, operations, Kardex, idempotency; reservations.cycle.spec.ts, reservations.concurrency.spec.ts, disponibilidad.spec.ts; incidentes, umbrales, traslados, offline/F3 aún no cubiertos | PARCIAL |
| BACK-04 consultas | apps/inventory-svc/src/inventory.controller.ts: disponibilidad/operación y verificación comercial; test/app.e2e-spec.ts; restantes operationIds ausentes | PARCIAL |
| BACK-05 writes | Controller/service en apps/inventory-svc: reservar/confirmar/liberar; prueba de ciclo e idempotencia; los restantes writes HTTP OpenAPI no constan en controller | PARCIAL |
| BACK-06 eventos | apps/inventory-svc/src/outbox/*, src/workers/*; commits 4f03d9d3a87d, 22c055f922ce, 9cba206f68e9, b947fd9e9a7f; tests publisher/recovery. No se acreditan consumers bulk adjust/SKU init | PARCIAL |
| BACK-07 robustez | apps/inventory-svc/src/errors/*, expiration/outbox/workers; commits 61541b6d9160, 116e7b306f3a; pruebas de recovery/expiración; alcance restante | PARCIAL |
| BACK-08 React | Frontend `taco`: existe `mockInventoryAdapter.ts` y `tests/inventory.spec.ts` (20 tests declarados); faltan componentes/páginas, adapter HTTP y rutas registradas; Frontend #17/#18 OPEN | NO_INICIADO |
| BACK-09 E2E producto | apps/inventory-svc/test/app.e2e-spec.ts, test/inventory.real.integration.spec.ts; PR declara 11/11 con PostgreSQL/Rabbit efímeros. No cubre React→Gateway | PARCIAL |

Las rutas backend de la tabla son relativas a `apps/inventory-svc/`. Los resultados son declaraciones/archivos visibles en un PR abierto; confirmar checks al SHA vigente y no contarlos como merged. Los tests del servicio no son E2E de la aplicación.

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
- En el corte anterior a la aprobación formal, siete responsables transversales/deployment estaban pendientes. La aprobación de Marco del 2026-10-16 se registra en [BACK_HITO3_APROBACION_RESPONSABLES.md](BACK_HITO3_APROBACION_RESPONSABLES.md).

### P2

- No se encontró DATA-007 ni restauración en los DATA existentes; no se inventa número.
- Playwright queda enfocado a Chromium/worker 1 local; suite completa solo CI/cierre.

## Corte de repositorios

La auditoría anterior registró Docs master c36bd9a18f4fdb188df0d7e5158a431cf4b4ea7b, checkout Docs cb7ee179f812d38929e20c5ab6f7a77139c4090 con cambios ajenos preservados; Backend master 24227527c632be4f3b8de612954328904ea57de0, checkout taco PR#10; Frontend master 79f407dfeb7f11c958faa4de0b2f0ec4321ea28f, local fd3e8c4408e310cbea60c445b64f3de4184e362a. No se supuso sincronía. Branches/repo/assignees deben revalidarse al publicar.

No se ejecutó gh issue create/edit/close, no se publicaron issues, no se modificaron repositorios, PRs, issues, datos, grants ni infraestructura.

## Revalidación final de owners y ramas

La lectura actual de branches confirma `castilla`, `poma`, `cueva`, `lopez`, `vera` y `taco` en Backend y Frontend. Los seis logins oficiales —mrcastilla8, GabrielPGu, AXL031, VicuzS y LeonardoVera y MiguelTacoZavala— conservan el mapeo por servicio. La comprobación automatizada del corte anterior validaba 75 asignaciones existentes y siete pendientes; el corte del 2026-10-16 formaliza las siete asignaciones restantes con registro documental y conserva los repositorios de código.

Las referencias Frontend reconsultadas muestran MK-001 issue #3 CLOSED, MK-002..016 #4..#18 OPEN. PR Frontend #21..#27 MERGED y #28 OPEN; PRs UI aportan estado de presentación solamente. No se usaron como evidencia API.


## Dependencias entre bounded contexts y AsyncAPI

- BACK-08 registra dependencias condicionales por operación y flujo; no convierten una integración pendiente en bloqueo de todo el servicio. BACK-09 registra los prerrequisitos de los servicios participantes para el ciclo de integración. La matriz y BACK_HITO3_DEPENDENCIAS.md conservan ambos tipos por separado.
- Catalog BACK-06 publica pricing.product.initialization.requested e inventory.sku.initialization.requested, y consume sus respuestas; los nombres y responsabilidades se verificaron contra AsyncAPI RC2 candidata en master. No se presume implementación ni homologación por estar en contrato.
- El grafo completo auditado (obligatorias y condicionales) tiene 0 ciclos, 0 referencias rotas y 0 desajustes de relación inversa.


## Revisión actualizada de Frontend Inventory y acreditación retrospectiva

- Frontend branch taco, HEAD f01cb3146322cd546396a8fa73a8f07fcbc2fb93: el árbol contiene src/features/inventory/adapters/mockInventoryAdapter.ts (mock, no HTTP) y tests/inventory.spec.ts (20 declaraciones Playwright). No contiene componentes/páginas bajo src/features/inventory; AppRoutes/productRoutes/demoRoutes no registran /inventario. No ejecuté los specs ni los cuento como resultado. BACK-08 sigue NO_INICIADO para integración real y ordena revisar/reutilizar lo existente.
- Backend PR #10 sigue OPEN/DRAFT en HEAD 2c4a18105c5e379edc8476b9d315aa6be1134b80; tiene 20 commits y 55 archivos. Las rutas de evidencia ahora usan la raíz correcta apps/inventory-svc/.
- Excepción retrospectiva INVENTORY-PR10-RETROSPECTIVE: el PR histórico único puede aportar evidencia a varios bloques cuando cada bloque identifica commits, archivos y tests en el diff. No representa un PR por issue, no acredita merge/cierre ni exime los nuevos cambios de su PR.
- OpenAPI RC1 en master: blob f64bfe9a097b2a0f74c2600988305443d92f640e, 135 operationIds. AsyncAPI RC2: blob a5552e51c651d1eabfcd6cbb9607abf8ab0573e9, 40 nombres de mensaje y 11 eventos declarados para api-gateway/bff.
- Los seis logins conservan el mapeo oficial y las ramas castilla, poma, cueva, lopez, vera y taco existen en Backend y Frontend. Las siete asignaciones transversales/deployment aprobadas constan en el registro formal; OWNER_PENDIENTE queda en cero.
- La revisión de secretos y exposición pública se resume en la sección de cierre de esta auditoría.

## Cierre de auditoría del paquete público

- Conteos recalculados desde los registros y cruzados entre MANIFEST, SUMMARY, MATRIZ, ISSUES, CAMBIOS y DEPENDENCIAS: 82 registros, 63 NO_INICIADO, 16 PARCIAL, 2 IMPLEMENTADO_SIN_VALIDAR, 1 BLOQUEADO_ESPECÍFICO; 0 IMPLEMENTADO_VALIDADO y 0 NO_APLICA. El validador no fija el total; comprueba que las declaraciones coincidan.
- Responsable, login, rama y repositorio de código verificados por registro. Las siete asignaciones aprobadas coinciden en manifiesto, matriz, cuerpos y registro de aprobación; los owners de servicios y Gateway no cambian.
- Grafo acíclico: 158 aristas obligatorias y condicionales tras agregar DEPLOY-BACK-02, sin referencias rotas, autorreferencias ni divergencias de `blocks`.
- Contratos auditados contra snapshots de OpenAPI RC1 (135 operationIds) y AsyncAPI RC2 (40 mensajes); los 11 eventos BFF del Gateway están presentes en AsyncAPI. No se añadieron operaciones ni mensajes.
- Inventory Frontend: `taco` contiene adapter mock y 20 declaraciones Playwright; no se ejecutaron. No se hallaron componentes/páginas Inventory ni rutas registradas. PR #10 Backend sigue OPEN/DRAFT; su excepción retrospectiva conserva SHA, commits, archivos y pruebas como procedencia, no como PRs por issue ni como evidencia de merge.
- Gateway BACK-03: pruebas de consumers y contrato pueden correr con broker aislado. Solo las integraciones con los cuatro publishers reales dependen de ellos; auth y límites de seguridad se conservan.
- Escaneo de secretos y rutas locales en los 16 archivos actuales del paquete (incluido el registro de aprobación): cero coincidencias de claves privadas, tokens GitHub/AWS/Slack, URLs con credenciales o rutas personales. Logins, ramas, SHA y URLs públicas se mantienen como evidencia intencional; no se exponen valores secretos.
- Dry-run positivo; ocho pruebas negativas y verificación de la asignación formal aprobada. `git diff --check` aprobado. No se ejecutaron Playwright ni pruebas de aplicación; no se escribieron issues oficiales, no se ejecutó SQL ni se desplegó.

### Pendientes

- Las siete asignaciones pendientes al corte anterior quedaron aprobadas por Marco el 2026-10-16 para preparación documental únicamente; publication_authorized sigue false y el ledger permanece vacío.
- PR #10 y sus checks deben revalidarse si se actualiza el corte; permanece sin merge/cierre acreditados.
- Los contratos RC no prueban homologación o implementación externa. Provisioning de broker, garantías retry/DLX y pruebas con publishers reales quedan con los owners correspondientes.
- Esta auditoría documental no acredita runtime ni resuelve permisos de Seguridad, exposición efectiva de Supabase o autorización de demo pública.


## Dictamen adicional: FALTA_ISSUE

Evidencia: INFRA #8 sigue OPEN y su criterio 5 limita la habilitación inicial a Inventory, mientras el criterio 9 impide desplegar automáticamente la VM durante ese lote. DEPLOY-BACK-01 solo prepara composición y explícitamente no despliega. SHARED-BACK-05 ejecuta smoke real después de los BACK-09 y no activa la liberación. Arquitectura.md §39 requiere el recorrido E2E Frontend + Gateway + servicios relevantes, pero no es una autorización de deploy. No existe issue vigente que conecte la autorización, ejecución Oracle, readiness y rollback.

Se agrega **DEPLOY-BACK-02** como borrador: aprobación escrita por ventana/ambiente/SHA/conjunto, reutilización de CD vigente, secretos por referencias protegidas, readiness, smoke selectivo y rollback de artefactos. Solo alcanza componentes actualmente habilitados. Los no habilitados se omiten; no se crea pipeline ni se habilitan desde este issue. No autoriza ejecutar despliegue ahora. INFRA #8: https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/8. PR #9 está MERGED (head afbae4e66063898882f6586a07039d34facf2db8; 2026-10-14T18:19:10Z), pero INFRA #8 sigue OPEN.

El validador comprueba las siete asignaciones aprobadas contra `owner_assignment_approvals` y el documento [BACK_HITO3_APROBACION_RESPONSABLES.md](BACK_HITO3_APROBACION_RESPONSABLES.md). La prueba usa este ID documental real, no una URL o referencia simulada; no modifica publicación ni permisos.


## Trazabilidad complementaria INT-ASAP ↔ BACK (corte 2026-10-16)

Se revisaron en modo lectura #19–#33; el EPIC y los cortes permanecen OPEN. La matriz `BACK_HITO3_INT_ASAP_TRAZABILIDAD.md` enlaza cada corte con BACK, operaciones/mensajes, responsables, alcance restante, evidencia/crédito y gates externos. Se conservan los 82 borradores y no se añade un flujo INT para BACK-08.

INT-ASAP puede priorizar cortes externos en paralelo con implementación BACK independiente. Se separan pruebas unit/contract, integración PostgreSQL/RabbitMQ, consumer externo, React→Gateway→servicio, E2E de 16 MK y demo Oracle. #21 delimita el corte HTTP de Marco; Axel retiene ownership general Gateway. Coordinar cambios en apps/api-gateway. Las siete asignaciones transversales/deployment están aprobadas para preparación documental; no equivalen a autorización de publicación o despliegue.
