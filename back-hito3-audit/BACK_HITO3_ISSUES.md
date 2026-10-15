# Borradores BACK Hito 3 — versión auditada

> 81 IDs lógicos no publicados. Cada issue central está en Backend; BACK-08 y algunos transversales generan un único PR en Frontend según el campo code_repository. Contratos RC citados como candidatos, no acuerdos homologados.

---

# [BACK][taxonomy-svc][01] Preparar estructura y configuración

**TAXONOMY-SVC-BACK-01 · Leonardo López · PARCIAL**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: scaffold NestJS y GET /health existen en la app; readiness, configuración validada y dependencia de negocio no acreditadas.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][taxonomy-svc][02] Implementar persistencia Drizzle

**TAXONOMY-SVC-BACK-02 · Leonardo López · NO_INICIADO**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/taxonomy-svc/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en la rama/corte auditado no se acredita provider Drizzle funcional para este servicio.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][taxonomy-svc][03] Implementar reglas de negocio

**TAXONOMY-SVC-BACK-03 · Leonardo López · NO_INICIADO**

## Objetivo
Las invariantes funcionales de taxonomy-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Categoría máximo dos niveles, sin ciclos; desactivación lógica pendiente de CLEAR y reactivación sujeta al padre. Tipo inmutable de característica y valores válidos; obligatoriedad solo en asociación tipo-característica. Marca normalizada única incluso inactiva, baja lógica. Resolver y confirmar slug en colisión; no agregar sufijo silenciosamente.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: scaffold no acredita reglas del bounded context.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][taxonomy-svc][04] Implementar consultas HTTP

**TAXONOMY-SVC-BACK-04 · Leonardo López · NO_INICIADO**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /categorias (listarCategorias); GET /marcas (listarMarcas); POST /seo/categorias/slug/resolver (resolverSlugCategoriaCreacion); GET /seo/{slug} (obtenerSeoPorSlug); GET /seo/resoluciones/{slugAnterior} (resolverSlugAnterior); GET /categorias/arbol (obtenerArbolCategoriasAdmin); GET /categorias/{categoriaId} (obtenerCategoriaAdmin); GET /caracteristicas (listarCaracteristicas); GET /caracteristicas/{caracteristicaId} (obtenerCaracteristica); GET /caracteristicas/{caracteristicaId}/valores (listarValoresCaracteristica); GET /tipos-producto (listarTiposProducto); GET /tipos-producto/{tipoProductoId} (obtenerTipoProducto); GET /tipos-producto/{tipoProductoId}/caracteristicas (obtenerEsquemaTipoProducto); GET /marcas/{marcaId} (obtenerMarcaAdmin); GET /taxonomia/operaciones/{operationId} (obtenerOperacionMaestra); GET /categorias/{categoriaId}/seo (obtenerSeoCategoriaAdmin); GET /categorias/{categoriaId}/seo/historial (listarHistorialSlugCategoria); GET /categorias/administracion (listarCategoriasAdmin); GET /marcas/administracion (listarMarcasAdmin)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: GET /health no acredita operaciones de consulta de negocio.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][taxonomy-svc][05] Implementar escrituras HTTP

**TAXONOMY-SVC-BACK-05 · Leonardo López · NO_INICIADO**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: POST /categorias (crearCategoria); POST /marcas (crearMarca); POST /seo/categorias/slug/resolver (resolverSlugCategoriaCreacion); PATCH /categorias/{categoriaId} (actualizarCategoria); POST /categorias/{categoriaId}/desactivar (solicitarDesactivacionCategoria); POST /categorias/{categoriaId}/reactivar (reactivarCategoria); POST /caracteristicas (crearCaracteristica); PATCH /caracteristicas/{caracteristicaId} (actualizarCaracteristica); POST /caracteristicas/{caracteristicaId}/valores (crearValorCaracteristica); PATCH /caracteristicas/{caracteristicaId}/valores/{valorId} (actualizarValorCaracteristica); POST /caracteristicas/{caracteristicaId}/valores/{valorId}/desactivar (solicitarDesactivacionValorCaracteristica); POST /caracteristicas/{caracteristicaId}/valores/{valorId}/reactivar (reactivarValorCaracteristica); POST /caracteristicas/{caracteristicaId}/desactivar (desactivarCaracteristica); POST /caracteristicas/{caracteristicaId}/reactivar (reactivarCaracteristica); POST /tipos-producto (crearTipoProducto); POST /tipos-producto/{tipoProductoId}/desactivar (solicitarDesactivacionTipoProducto); POST /tipos-producto/{tipoProductoId}/reactivar (reactivarTipoProducto); POST /tipos-producto/{tipoProductoId}/caracteristicas (asociarCaracteristicaTipoProducto); PATCH /tipos-producto/{tipoProductoId}/caracteristicas/{caracteristicaId} (actualizarAsociacionTipoCaracteristica); POST /tipos-producto/{tipoProductoId}/caracteristicas/{caracteristicaId}/desasociar (solicitarDesasociacionTipoCaracteristica); PATCH /marcas/{marcaId} (actualizarMarca); POST /marcas/{marcaId}/desactivar (solicitarDesactivacionMarca); POST /marcas/{marcaId}/reactivar (reactivarMarca); PATCH /categorias/{categoriaId}/seo (actualizarSeoCategoria)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acreditan operaciones de escritura de negocio.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][taxonomy-svc][06] Implementar eventos y RabbitMQ

**TAXONOMY-SVC-BACK-06 · Leonardo López · NO_INICIADO**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Publica taxonomy.category.updated, taxonomy.product-type-schema.changed, taxonomy.characteristic-value.updated; consume catalog.master.deactivation.checked. Emite/consume el protocolo de baja segura: taxonomy.master.deactivation.check.requested, taxonomy.master.deactivated y taxonomy.master.deactivation.rejected conforme a las responsabilidades declaradas en AsyncAPI RC2 candidata.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita productor/consumer del servicio.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][taxonomy-svc][07] Consolidar robustez y observabilidad

**TAXONOMY-SVC-BACK-07 · Leonardo López · NO_INICIADO**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: health básico no acredita la resiliencia/observabilidad de operaciones de negocio.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][taxonomy-svc][08] Integrar pantallas React vía Gateway

**TAXONOMY-SVC-BACK-08 · Leonardo López · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
MK-008–012: CategoryTreePage, CategoryDetailPage, CreateCategoryPage, EditCategoryPage, DeactivateCategoryPage; CharacteristicListPage, CharacteristicCreatePage, CharacteristicDetailPage, CharacteristicEditPage, CharacteristicValuesPage, CharacteristicStatePage; ProductTypeListPage, ProductTypeCreatePage, ProductTypeDetailPage, ProductTypeAssociatePage; BrandListPage, BrandFormPage, BrandDetailPage; SeoListPage y SeoConfigPage. Adaptadores actuales: taxonomy mockCategoryAdapter, mockCharacteristicAdapter, mockProductTypeAdapter, mockBrandAdapter y mockSeoAdapter; catalog/taxonomyServicesAdapter no acredita cliente HTTP. API por completar. Operaciones OpenAPI asociadas a MK: MK-008: GET /categorias (listarCategorias); GET /categorias/arbol (obtenerArbolCategoriasAdmin); GET /categorias/{categoriaId} (obtenerCategoriaAdmin); GET /categorias/administracion (listarCategoriasAdmin); POST /categorias (crearCategoria); PATCH /categorias/{categoriaId} (actualizarCategoria); POST /categorias/{categoriaId}/desactivar (solicitarDesactivacionCategoria); POST /categorias/{categoriaId}/reactivar (reactivarCategoria); GET /taxonomia/operaciones/{operationId} (obtenerOperacionMaestra) | MK-009: GET /caracteristicas (listarCaracteristicas); POST /caracteristicas (crearCaracteristica); GET /caracteristicas/{caracteristicaId} (obtenerCaracteristica); PATCH /caracteristicas/{caracteristicaId} (actualizarCaracteristica); GET /caracteristicas/{caracteristicaId}/valores (listarValoresCaracteristica); POST /caracteristicas/{caracteristicaId}/valores (crearValorCaracteristica); PATCH /caracteristicas/{caracteristicaId}/valores/{valorId} (actualizarValorCaracteristica); POST /caracteristicas/{caracteristicaId}/valores/{valorId}/desactivar (solicitarDesactivacionValorCaracteristica); POST /caracteristicas/{caracteristicaId}/valores/{valorId}/reactivar (reactivarValorCaracteristica); POST /caracteristicas/{caracteristicaId}/desactivar (desactivarCaracteristica); POST /caracteristicas/{caracteristicaId}/reactivar (reactivarCaracteristica) | MK-010: GET /tipos-producto (listarTiposProducto); POST /tipos-producto (crearTipoProducto); GET /tipos-producto/{tipoProductoId} (obtenerTipoProducto); POST /tipos-producto/{tipoProductoId}/desactivar (solicitarDesactivacionTipoProducto); POST /tipos-producto/{tipoProductoId}/reactivar (reactivarTipoProducto); GET /tipos-producto/{tipoProductoId}/caracteristicas (obtenerEsquemaTipoProducto); POST /tipos-producto/{tipoProductoId}/caracteristicas (asociarCaracteristicaTipoProducto); PATCH /tipos-producto/{tipoProductoId}/caracteristicas/{caracteristicaId} (actualizarAsociacionTipoCaracteristica); POST /tipos-producto/{tipoProductoId}/caracteristicas/{caracteristicaId}/desasociar (solicitarDesasociacionTipoCaracteristica) | MK-011: GET /marcas (listarMarcas); POST /marcas (crearMarca); GET /marcas/{marcaId} (obtenerMarcaAdmin); GET /marcas/administracion (listarMarcasAdmin); PATCH /marcas/{marcaId} (actualizarMarca); POST /marcas/{marcaId}/desactivar (solicitarDesactivacionMarca); POST /marcas/{marcaId}/reactivar (reactivarMarca) | MK-012: POST /seo/categorias/slug/resolver (resolverSlugCategoriaCreacion); GET /categorias/{categoriaId}/seo (obtenerSeoCategoriaAdmin); PATCH /categorias/{categoriaId}/seo (actualizarSeoCategoria); GET /categorias/{categoriaId}/seo/historial (listarHistorialSlugCategoria); GET /seo/{slug} (obtenerSeoPorSlug); GET /seo/resoluciones/{slugAnterior} (resolverSlugAnterior)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: UI/mock/unavailable existentes no acreditan adapter HTTP real ni integración API.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Dependencias condicionales por operación:**
- **Solo baja segura de categoría/característica/marca que espera verificación de Catálogo.** depende de CATALOG-SVC-BACK-06. Mantener el CRUD independiente; habilitar y probar esta secuencia cuando el consumer catalog.master.deactivation.check.requested y su respuesta estén disponibles.

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#10](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/10) (ABIERTO): Coordinar estado de MK-008; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#11](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/11) (ABIERTO): Coordinar estado de MK-009; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#12](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/12) (ABIERTO): Coordinar estado de MK-010; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#13](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/13) (ABIERTO): Coordinar estado de MK-011; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#14](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/14) (ABIERTO): Coordinar estado de MK-012; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][taxonomy-svc][09] Verificar flujo end-to-end

**TAXONOMY-SVC-BACK-09 · Leonardo López · NO_INICIADO**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Leonardo López** (VicuzS) · rama lopez.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Verificar árbol y búsqueda; alta/edición categoría con slug confirmado; baja segura con dependencias y lectura de operationId; CRUD de características/valores y asociación obligatoria; alta/reactivación de marca; actualización de SEO e historial/resolución de slug. No habilitar cambios protegidos sin autorización userBearer.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-008–012 y DEC-F aplicables; datos/taxonomy/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita E2E real React→Gateway→servicio→dependencias.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
Verificar árbol y búsqueda; alta/edición categoría con slug confirmado; baja segura con dependencias y lectura de operationId; CRUD de características/valores y asociación obligatoria; alta/reactivación de marca; actualización de SEO e historial/resolución de slug. No habilitar cambios protegidos sin autorización userBearer. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][catalog-svc][01] Preparar estructura y configuración

**CATALOG-SVC-BACK-01 · Gabriel Poma · PARCIAL**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: scaffold NestJS y GET /health existen en la app; readiness, configuración validada y dependencia de negocio no acreditadas.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][catalog-svc][02] Implementar persistencia Drizzle

**CATALOG-SVC-BACK-02 · Gabriel Poma · NO_INICIADO**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/catalog-svc/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en la rama/corte auditado no se acredita provider Drizzle funcional para este servicio.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][catalog-svc][03] Implementar reglas de negocio

**CATALOG-SVC-BACK-03 · Gabriel Poma · NO_INICIADO**

## Objetivo
Las invariantes funcionales de catalog-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Producto nace BORRADOR; identidad estable y sin colisiones. SKU simple corresponde a producto simple; variante no lleva stock propio y hereda precio salvo regla aprobada. Atributos físicos KG/CM positivos y completos al activar. Preparación asíncrona; no inicializar precio ficticio por variante; emitir inicialización de inventario por SKU vendible.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: scaffold no acredita reglas del bounded context.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][catalog-svc][04] Implementar consultas HTTP

**CATALOG-SVC-BACK-04 · Gabriel Poma · NO_INICIADO**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /productos (listarProductos); GET /productos/{productoId} (obtenerProducto); POST /productos/datos-fisicos/consulta (consultarDatosFisicos); GET /productos/por-slug/{slug} (obtenerProductoPorSlug); GET /productos/{productoId}/preparacion (obtenerPreparacionProducto); GET /productos/{productoId}/variantes (listarVariantesProducto); GET /productos/{productoId}/variantes/{variantId} (obtenerVariante); POST /productos/codigos-barras/resolver (resolverCodigoBarras)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: GET /health no acredita operaciones de consulta de negocio.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][catalog-svc][05] Implementar escrituras HTTP

**CATALOG-SVC-BACK-05 · Gabriel Poma · NO_INICIADO**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: POST /productos (crearProducto); PATCH /productos/{productoId} (actualizarProducto); POST /productos/{productoId}/activar (activarProducto); POST /productos/{productoId}/desactivar (desactivarProducto); POST /productos/{productoId}/reactivar (reactivarProducto); POST /productos/{productoId}/preparacion/reintentar (reintentarPreparacionProducto); POST /productos/{productoId}/variantes (crearVariante); PATCH /productos/{productoId}/variantes/{variantId} (actualizarVariante); POST /productos/{productoId}/variantes/{variantId}/activar (activarVariante); POST /productos/{productoId}/variantes/{variantId}/desactivar (desactivarVariante); POST /productos/{productoId}/variantes/{variantId}/reactivar (reactivarVariante); POST /productos/{productoId}/variantes/{variantId}/preparacion/reintentar (reintentarPreparacionVariante)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acreditan operaciones de escritura de negocio.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][catalog-svc][06] Implementar eventos y RabbitMQ

**CATALOG-SVC-BACK-06 · Gabriel Poma · NO_INICIADO**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Publica catalog.product.deactivated, catalog.sku.deactivated, catalog.master.deactivation.checked, catalog.bulk.upsert.completed y catalog.bulk.upsert.rejected, pricing.product.initialization.requested e inventory.sku.initialization.requested; consume taxonomy.category.updated, taxonomy.product-type-schema.changed, taxonomy.characteristic-value.updated, taxonomy.master.deactivation.check.requested, catalog.bulk.upsert.requested, pricing.product.initialization.completed y pricing.product.initialization.rejected e inventory.sku.initialization.completed e inventory.sku.initialization.rejected, según responsabilidades de AsyncAPI RC2 candidata.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita productor/consumer del servicio.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][catalog-svc][07] Consolidar robustez y observabilidad

**CATALOG-SVC-BACK-07 · Gabriel Poma · NO_INICIADO**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: health básico no acredita la resiliencia/observabilidad de operaciones de negocio.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][catalog-svc][08] Integrar pantallas React vía Gateway

**CATALOG-SVC-BACK-08 · Gabriel Poma · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
MK-003/004: ProductsPage, ProductCreatePage, ProductDetailPage, ProductEditPage, ProductPreparationPage; VariantListPage, VariantCreatePage, VariantDetailPage, VariantEditPage, VariantPreparationPage. Adaptadores actuales: mockCatalogRepository y unavailableApiCatalogRepository; mockTaxonomyRepository/unavailableApiTaxonomyRepository y taxonomyServicesAdapter son soporte de selecciones, no API de Catálogo implementada. Operaciones OpenAPI asociadas a MK: MK-003: GET /productos (listarProductos); POST /productos (crearProducto); GET /productos/{productoId} (obtenerProducto); PATCH /productos/{productoId} (actualizarProducto); POST /productos/{productoId}/activar (activarProducto); POST /productos/{productoId}/desactivar (desactivarProducto); POST /productos/{productoId}/reactivar (reactivarProducto); GET /productos/por-slug/{slug} (obtenerProductoPorSlug) | MK-004: GET /productos/{productoId}/variantes (listarVariantesProducto); POST /productos/{productoId}/variantes (crearVariante); GET /productos/{productoId}/variantes/{variantId} (obtenerVariante); PATCH /productos/{productoId}/variantes/{variantId} (actualizarVariante); POST /productos/{productoId}/variantes/{variantId}/activar (activarVariante); POST /productos/{productoId}/variantes/{variantId}/desactivar (desactivarVariante); POST /productos/{productoId}/variantes/{variantId}/reactivar (reactivarVariante); GET /productos/{productoId}/preparacion (obtenerPreparacionProducto); POST /productos/{productoId}/preparacion/reintentar (reintentarPreparacionProducto); POST /productos/{productoId}/variantes/{variantId}/preparacion/reintentar (reintentarPreparacionVariante)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: UI/mock/unavailable existentes no acreditan adapter HTTP real ni integración API.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Dependencias condicionales por operación:**
- **Selectores de categoría, características y tipos en MK-003/004.** depende de TAXONOMY-SVC-BACK-04. Las otras operaciones se integran de forma independiente; probar la selección cuando las lecturas de Taxonomía estén disponibles.
- **Preparación async de producto/variante y estado de inicialización.** depende de PRICING-SVC-BACK-06, INVENTORY-SVC-BACK-06. Probar el flujo completo solo cuando Pricing e Inventory procesen y respondan a los mensajes de inicialización; no ocultar fallo ni crear precio sintético.

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#5](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/5) (ABIERTO): Coordinar estado de MK-003; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#6](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/6) (ABIERTO): Coordinar estado de MK-004; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][catalog-svc][09] Verificar flujo end-to-end

**CATALOG-SVC-BACK-09 · Gabriel Poma · NO_INICIADO**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Gabriel Poma** (GabrielPGu) · rama poma.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Producto borrador → edición → activación; validar categoría/tipo/atributos, preparación y estados de fallo; crear/editar/activar/desactivar/reactivar variante y comprobar identidad, herencia de precio y evento de inicialización de SKU. Verificar idempotencia de reintento y errores.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-003/004, DEC-F-001 y datos/catalog-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita E2E real React→Gateway→servicio→dependencias.

## Dependencias bloqueantes
- CATALOG-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
Producto borrador → edición → activación; validar categoría/tipo/atributos, preparación y estados de fallo; crear/editar/activar/desactivar/reactivar variante y comprobar identidad, herencia de precio y evento de inicialización de SKU. Verificar idempotencia de reintento y errores. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][pricing-svc][01] Preparar estructura y configuración

**PRICING-SVC-BACK-01 · Leonardo Vera · PARCIAL**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: scaffold NestJS y GET /health existen en la app; readiness, configuración validada y dependencia de negocio no acreditadas.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][pricing-svc][02] Implementar persistencia Drizzle

**PRICING-SVC-BACK-02 · Leonardo Vera · NO_INICIADO**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/pricing-svc/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en la rama/corte auditado no se acredita provider Drizzle funcional para este servicio.

## Dependencias bloqueantes
- PRICING-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][pricing-svc][03] Implementar reglas de negocio

**PRICING-SVC-BACK-03 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las invariantes funcionales de pricing-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Pricing es owner del precio base; creación inicial por comando de Catalog. Versión optimista y vigencias sin solapamiento. Variante hereda precio y no genera precio sintético. Publicar price.changed después del commit. Importación atómica solo dentro de Pricing.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: scaffold no acredita reglas del bounded context.

## Dependencias bloqueantes
- PRICING-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][pricing-svc][04] Implementar consultas HTTP

**PRICING-SVC-BACK-04 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /precios (consultarPrecios); GET /precios/skus/{sku} (obtenerPrecioSku); GET /precios/skus/{sku}/programaciones (listarProgramacionesPrecioSku); POST /precios/importaciones/prevalidar (prevalidarImportacionPrecios); GET /precios/importaciones/{batchId} (obtenerImportacionPrecios); GET /precios/importaciones/{batchId}/reporte (descargarReporteImportacionPrecios); GET /precios/productos/{productoId} (obtenerPrecioBaseProducto); GET /precios/productos/{productoId}/programaciones (listarProgramacionesPrecioProducto)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: GET /health no acredita operaciones de consulta de negocio.

## Dependencias bloqueantes
- PRICING-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][pricing-svc][05] Implementar escrituras HTTP

**PRICING-SVC-BACK-05 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: PATCH /precios/skus/{sku} (actualizarPrecioSku); POST /precios/skus/{sku}/programaciones (programarPrecioSku); POST /precios/importaciones/prevalidar (prevalidarImportacionPrecios); POST /precios/importaciones (crearImportacionPrecios); PATCH /precios/productos/{productoId} (actualizarPrecioBaseProducto); POST /precios/productos/{productoId}/programaciones (programarPrecioBaseProducto)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acreditan operaciones de escritura de negocio.

## Dependencias bloqueantes
- PRICING-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][pricing-svc][06] Implementar eventos y RabbitMQ

**PRICING-SVC-BACK-06 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Publica pricing.price.changed, pricing.product.initialization.completed y pricing.product.initialization.rejected y pricing.bulk.price.apply.completed y pricing.bulk.price.apply.rejected; consume pricing.product.initialization.requested, pricing.bulk.price.apply.requested y catalog.sku.deactivated, conforme a AsyncAPI RC2 candidata.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita productor/consumer del servicio.

## Dependencias bloqueantes
- PRICING-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][pricing-svc][07] Consolidar robustez y observabilidad

**PRICING-SVC-BACK-07 · Leonardo Vera · NO_INICIADO**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: health básico no acredita la resiliencia/observabilidad de operaciones de negocio.

## Dependencias bloqueantes
- PRICING-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][pricing-svc][08] Integrar pantallas React vía Gateway

**PRICING-SVC-BACK-08 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
MK-013: CurrentPricePage, EditPricePage, HistoricalPricePage, PriceSchedulesPage, ImportPricesPage, PriceImportResultPage y PricingPatternsPage. Adaptadores actuales: mockPricingRepository y unavailableApiPricingRepository; no adapter HTTP real acreditado. Operaciones OpenAPI asociadas a MK: MK-013: GET /precios (consultarPrecios); GET /precios/skus/{sku} (obtenerPrecioSku); PATCH /precios/skus/{sku} (actualizarPrecioSku); GET /precios/skus/{sku}/programaciones (listarProgramacionesPrecioSku); POST /precios/skus/{sku}/programaciones (programarPrecioSku); GET /precios/productos/{productoId} (obtenerPrecioBaseProducto); PATCH /precios/productos/{productoId} (actualizarPrecioBaseProducto); GET /precios/productos/{productoId}/programaciones (listarProgramacionesPrecioProducto); POST /precios/productos/{productoId}/programaciones (programarPrecioBaseProducto); POST /precios/importaciones/prevalidar (prevalidarImportacionPrecios); POST /precios/importaciones (crearImportacionPrecios); GET /precios/importaciones/{batchId} (obtenerImportacionPrecios); GET /precios/importaciones/{batchId}/reporte (descargarReporteImportacionPrecios)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: UI/mock/unavailable existentes no acreditan adapter HTTP real ni integración API.

## Dependencias bloqueantes
- PRICING-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Dependencias condicionales por operación:**
- **Selección de producto/SKU en pantallas de precio si el flujo la requiere.** depende de CATALOG-SVC-BACK-04. Mantener consulta/edición por ID de SKU independiente y conectar el selector cuando Catalog exponga sus consultas.

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#15](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/15) (ABIERTO): Coordinar estado de MK-013; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][pricing-svc][09] Verificar flujo end-to-end

**PRICING-SVC-BACK-09 · Leonardo Vera · NO_INICIADO**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Consultar precios base/SKU; actualizar con versión vigente y rechazar versión stale; programar vigencia contigua y rechazar solapamiento; prevalidar/importar y consultar resultado/reporte. Verificar que price.changed solo aparezca tras commit y no en variante sin override.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-013 y datos/pricing/physical-model.md; DEC-F de pricing aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita E2E real React→Gateway→servicio→dependencias.

## Dependencias bloqueantes
- PRICING-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
Consultar precios base/SKU; actualizar con versión vigente y rechazar versión stale; programar vigencia contigua y rechazar solapamiento; prevalidar/importar y consultar resultado/reporte. Verificar que price.changed solo aparezca tras commit y no en variante sin override. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][price-audit-svc][01] Preparar estructura y configuración

**PRICE-AUDIT-SVC-BACK-01 · Leonardo Vera · PARCIAL**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: scaffold NestJS y GET /health existen en la app; readiness, configuración validada y dependencia de negocio no acreditadas.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][price-audit-svc][02] Implementar persistencia Drizzle

**PRICE-AUDIT-SVC-BACK-02 · Leonardo Vera · NO_INICIADO**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/price_audit/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en la rama/corte auditado no se acredita provider Drizzle funcional para este servicio.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][price-audit-svc][03] Implementar reglas de negocio

**PRICE-AUDIT-SVC-BACK-03 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las invariantes funcionales de price-audit-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Registro append-only de cambios de precio confirmados; dedupe por message_id; operación fallida no produce auditoría; filtros/paginación y exportación respetan límites CSV 100000 y PDF 500 filas y retención.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: scaffold no acredita reglas del bounded context.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][price-audit-svc][04] Implementar consultas HTTP

**PRICE-AUDIT-SVC-BACK-04 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /auditoria-precios (listarAuditoriaPrecios); GET /auditoria-precios/{auditId} (obtenerAuditoriaPrecio); GET /auditoria-precios/exportaciones/{exportId} (obtenerExportacionAuditoriaPrecios); GET /auditoria-precios/exportaciones/{exportId}/archivo (descargarExportacionAuditoriaPrecios)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: GET /health no acredita operaciones de consulta de negocio.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][price-audit-svc][05] Implementar escrituras HTTP

**PRICE-AUDIT-SVC-BACK-05 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: POST /auditoria-precios/exportaciones (crearExportacionAuditoriaPrecios)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acreditan operaciones de escritura de negocio.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][price-audit-svc][06] Implementar eventos y RabbitMQ

**PRICE-AUDIT-SVC-BACK-06 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Consume pricing.price.changed. No publica eventos propios en AsyncAPI RC2 candidata. Necesita inbox/dedupe transaccional o mecanismo equivalente; OUTBOX de mensajes propios: NO APLICA. No convertir la exportación HTTP en un evento no contratado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita productor/consumer del servicio.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][price-audit-svc][07] Consolidar robustez y observabilidad

**PRICE-AUDIT-SVC-BACK-07 · Leonardo Vera · NO_INICIADO**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: health básico no acredita la resiliencia/observabilidad de operaciones de negocio.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][price-audit-svc][08] Integrar pantallas React vía Gateway

**PRICE-AUDIT-SVC-BACK-08 · Leonardo Vera · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
MK-014: AuditHistoryPage, AuditDetailPage y AuditExportPage. Adaptadores actuales: mockAuditRepository; no adapter HTTP real acreditado. Operaciones OpenAPI asociadas a MK: MK-014: GET /auditoria-precios (listarAuditoriaPrecios); GET /auditoria-precios/{auditId} (obtenerAuditoriaPrecio); POST /auditoria-precios/exportaciones (crearExportacionAuditoriaPrecios); GET /auditoria-precios/exportaciones/{exportId} (obtenerExportacionAuditoriaPrecios); GET /auditoria-precios/exportaciones/{exportId}/archivo (descargarExportacionAuditoriaPrecios)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: UI/mock/unavailable existentes no acreditan adapter HTTP real ni integración API.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#16](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/16) (ABIERTO): Coordinar estado de MK-014; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][price-audit-svc][09] Verificar flujo end-to-end

**PRICE-AUDIT-SVC-BACK-09 · Leonardo Vera · NO_INICIADO**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Leonardo Vera** (LeonardoVera) · rama vera.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Consumir un price.changed committed una sola vez; ignorar duplicado por message_id y no registrar operación rechazada. Consultar historial/detalle vacío y poblado; crear/consultar/descargar exportación dentro de límites y rechazar exceso conforme al contrato.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-014 y datos/price_audit/physical-model.md; ownership append-only; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita E2E real React→Gateway→servicio→dependencias.

## Dependencias bloqueantes
- PRICE-AUDIT-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
Consumir un price.changed committed una sola vez; ignorar duplicado por message_id y no registrar operación rechazada. Consultar historial/detalle vacío y poblado; crear/consultar/descargar exportación dentro de límites y rechazar exceso conforme al contrato. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][promotions-svc][01] Preparar estructura y configuración

**PROMOTIONS-SVC-BACK-01 · Axel Cueva · PARCIAL**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: scaffold NestJS y GET /health existen en la app; readiness, configuración validada y dependencia de negocio no acreditadas.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][promotions-svc][02] Implementar persistencia Drizzle

**PROMOTIONS-SVC-BACK-02 · Axel Cueva · NO_INICIADO**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/promotions-svc/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en la rama/corte auditado no se acredita provider Drizzle funcional para este servicio.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][promotions-svc][03] Implementar reglas de negocio

**PROMOTIONS-SVC-BACK-03 · Axel Cueva · NO_INICIADO**

## Objetivo
Las invariantes funcionales de promotions-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Validar cupón sin consumir; consumo solo después de reserva de inventario confirmada. Restaurar solo consumo previo y según política/idempotencia. Promoción define descuento, canal, vigencia y combinación; no es owner de precio ni pago. Cross-sell/Upsell respeta elegibilidad, orden, deduplicación y criterio.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: scaffold no acredita reglas del bounded context.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][promotions-svc][04] Implementar consultas HTTP

**PROMOTIONS-SVC-BACK-04 · Axel Cueva · NO_INICIADO**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /promociones (listarPromociones); POST /promociones/evaluar (evaluarPromociones); POST /cupones/validar (validarCupon); GET /recomendaciones (obtenerRecomendaciones); GET /cupones (listarCupones); GET /cupones/{cuponId} (obtenerCuponAdmin); GET /promociones/{promocionId} (obtenerPromocionAdmin); GET /recomendaciones/reglas (listarReglasRecomendacion); GET /recomendaciones/reglas/{reglaId} (obtenerReglaRecomendacion); GET /promociones/administracion (listarPromocionesAdmin)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: GET /health no acredita operaciones de consulta de negocio.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][promotions-svc][05] Implementar escrituras HTTP

**PROMOTIONS-SVC-BACK-05 · Axel Cueva · NO_INICIADO**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: POST /promociones (crearPromocion); POST /cupones (crearCupon); PATCH /cupones/{cuponId} (actualizarCupon); POST /cupones/{cuponId}/activar (activarCupon); POST /cupones/{cuponId}/desactivar (desactivarCupon); PATCH /promociones/{promocionId} (actualizarPromocion); POST /promociones/{promocionId}/activar (activarPromocion); POST /promociones/{promocionId}/desactivar (desactivarPromocion); POST /recomendaciones/reglas (crearReglaRecomendacion); PATCH /recomendaciones/reglas/{reglaId} (actualizarReglaRecomendacion); POST /recomendaciones/reglas/{reglaId}/activar (activarReglaRecomendacion); POST /recomendaciones/reglas/{reglaId}/desactivar (desactivarReglaRecomendacion)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acreditan operaciones de escritura de negocio.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][promotions-svc][06] Implementar eventos y RabbitMQ

**PROMOTIONS-SVC-BACK-06 · Axel Cueva · NO_INICIADO**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Consume catalog.product.deactivated, catalog.sku.deactivated, pricing.price.changed, inventory.stock.changed, promotions.coupon.consumption.requested y promotions.coupon.restoration.requested. Publica promotions.coupon.consumption.completed y promotions.coupon.consumption.rejected y promotions.coupon.restoration.completed y promotions.coupon.restoration.rejected; los mensajes de solicitud los produce Ventas, no Promotions, según AsyncAPI RC2 candidata.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita productor/consumer del servicio.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][promotions-svc][07] Consolidar robustez y observabilidad

**PROMOTIONS-SVC-BACK-07 · Axel Cueva · NO_INICIADO**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: health básico no acredita la resiliencia/observabilidad de operaciones de negocio.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][promotions-svc][08] Integrar pantallas React vía Gateway

**PROMOTIONS-SVC-BACK-08 · Axel Cueva · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
MK-005: CampaignsPage/CampaignDetailPage/CampaignFormPage/CampaignScopePage; MK-006: CouponsPage/CouponDetailPage/CouponFormPage; MK-007: RecommendationsPage/RecommendationDetailPage/RecommendationFormPage/RecommendationSelectorPage. Adaptadores actuales: mockCampaignRepository, mockCouponRepository, mockPromotionCatalogRepository y mockRecommendationRepository compuestos por promotionServices.ts; no API HTTP real. Operaciones OpenAPI asociadas a MK: MK-005: GET /promociones (listarPromociones); GET /promociones/administracion (listarPromocionesAdmin); POST /promociones (crearPromocion); GET /promociones/{promocionId} (obtenerPromocionAdmin); PATCH /promociones/{promocionId} (actualizarPromocion); POST /promociones/{promocionId}/activar (activarPromocion); POST /promociones/{promocionId}/desactivar (desactivarPromocion); POST /promociones/evaluar (evaluarPromociones) | MK-006: GET /cupones (listarCupones); POST /cupones (crearCupon); GET /cupones/{cuponId} (obtenerCuponAdmin); PATCH /cupones/{cuponId} (actualizarCupon); POST /cupones/{cuponId}/activar (activarCupon); POST /cupones/{cuponId}/desactivar (desactivarCupon); POST /cupones/validar (validarCupon) | MK-007: GET /recomendaciones (obtenerRecomendaciones); GET /recomendaciones/reglas (listarReglasRecomendacion); POST /recomendaciones/reglas (crearReglaRecomendacion); GET /recomendaciones/reglas/{reglaId} (obtenerReglaRecomendacion); PATCH /recomendaciones/reglas/{reglaId} (actualizarReglaRecomendacion); POST /recomendaciones/reglas/{reglaId}/activar (activarReglaRecomendacion); POST /recomendaciones/reglas/{reglaId}/desactivar (desactivarReglaRecomendacion)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: UI/mock/unavailable existentes no acreditan adapter HTTP real ni integración API.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Dependencias condicionales por operación:**
- **Proyecciones vigentes usadas por promociones, precios y disponibilidad.** depende de CATALOG-SVC-BACK-06, PRICING-SVC-BACK-06, INVENTORY-SVC-BACK-06. CRUD y validación local continúan; probar elegibilidad contra los publishers/consumers reales al completar estas cadenas.

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#7](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/7) (ABIERTO): Coordinar estado de MK-005; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#8](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/8) (ABIERTO): Coordinar estado de MK-006; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#9](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/9) (ABIERTO): Coordinar estado de MK-007; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P1 — Aprobación visual de MK-005..007.** Responsable de resolver: Owner UX correspondiente. Desbloqueo: Alinear los component-spec bajo revisión/no aprobados con pantallas y operación permitida; no bloquea API interna.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P1 — Aprobación visual de MK-005..007.** Responsable de resolver: Owner UX correspondiente. Desbloqueo: Alinear los component-spec bajo revisión/no aprobados con pantallas y operación permitida; no bloquea API interna.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][promotions-svc][09] Verificar flujo end-to-end

**PROMOTIONS-SVC-BACK-09 · Axel Cueva · NO_INICIADO**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Campaña por canal/ventana; evaluar combinaciones sin mutar; cupón inválido/válido sin consumo; consumir/restaurar mediante comandos de Ventas solo con secuencia aprobada; recomendaciones sin duplicados y elegibilidad vigente.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-005–007 y datos/promotions/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita E2E real React→Gateway→servicio→dependencias.

## Dependencias bloqueantes
- PROMOTIONS-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
Campaña por canal/ventana; evaluar combinaciones sin mutar; cupón inválido/válido sin consumo; consumir/restaurar mediante comandos de Ventas solo con secuencia aprobada; recomendaciones sin duplicados y elegibilidad vigente. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][combos-svc][01] Preparar estructura y configuración

**COMBOS-SVC-BACK-01 · Marco Castilla · PARCIAL**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: scaffold NestJS y GET /health existen en la app; readiness, configuración validada y dependencia de negocio no acreditadas.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][combos-svc][02] Implementar persistencia Drizzle

**COMBOS-SVC-BACK-02 · Marco Castilla · NO_INICIADO**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/combos-svc/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en la rama/corte auditado no se acredita provider Drizzle funcional para este servicio.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][combos-svc][03] Implementar reglas de negocio

**COMBOS-SVC-BACK-03 · Marco Castilla · NO_INICIADO**

## Objetivo
Las invariantes funcionales de combos-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Combo requiere al menos dos SKU vendibles directos, sin repetidos ni combos anidados; no posee stock/reserva propios; disponibilidad derivada/informativa; precio positivo y estrictamente menor que suma regular y suma pública vigente de componentes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: scaffold no acredita reglas del bounded context.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][combos-svc][04] Implementar consultas HTTP

**COMBOS-SVC-BACK-04 · Marco Castilla · NO_INICIADO**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /combos/{comboId} (obtenerCombo); GET /inventario/disponibilidad (consultarDisponibilidad); GET /combos (listarCombosAdmin); GET /combos/{comboId}/disponibilidad (consultarDisponibilidadCombo)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: GET /health no acredita operaciones de consulta de negocio.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][combos-svc][05] Implementar escrituras HTTP

**COMBOS-SVC-BACK-05 · Marco Castilla · NO_INICIADO**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: PATCH /combos/{comboId} (actualizarCombo); POST /combos (crearCombo); POST /combos/{comboId}/desactivar (desactivarCombo)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acreditan operaciones de escritura de negocio.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][combos-svc][06] Implementar eventos y RabbitMQ

**COMBOS-SVC-BACK-06 · Marco Castilla · NO_INICIADO**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Consume catalog.product.deactivated, catalog.sku.deactivated e inventory.stock.changed. No publica eventos propios en AsyncAPI RC2 candidata; no agregar outbox/publicaciones. Proyección local solo según contrato/modelo propio.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita productor/consumer del servicio.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][combos-svc][07] Consolidar robustez y observabilidad

**COMBOS-SVC-BACK-07 · Marco Castilla · NO_INICIADO**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: health básico no acredita la resiliencia/observabilidad de operaciones de negocio.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][combos-svc][08] Integrar pantallas React vía Gateway

**COMBOS-SVC-BACK-08 · Marco Castilla · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
MK-002: ComboListPage, ComboDetailPage, ComboCreatePage y ComboEditPage. Adaptadores actuales: mockCombosRepository y unavailableCombosAdapters; no hay adapter HTTP real. VITE_DATA_MODE=api debe fallar/cerrar estado no disponible, nunca cambiar a mock. Operaciones OpenAPI asociadas a MK: MK-002: GET /combos (listarCombosAdmin); POST /combos (crearCombo); GET /combos/{comboId} (obtenerCombo); PATCH /combos/{comboId} (actualizarCombo); POST /combos/{comboId}/desactivar (desactivarCombo); GET /combos/{comboId}/disponibilidad (consultarDisponibilidadCombo)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: UI/mock/unavailable existentes no acreditan adapter HTTP real ni integración API.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Dependencias condicionales por operación:**
- **Selector de componentes SKU, precio vigente y disponibilidad informativa.** depende de CATALOG-SVC-BACK-04, PRICING-SVC-BACK-04, INVENTORY-SVC-BACK-06. List/detail independientes continúan; aceptar creación/disponibilidad real cuando los providers necesarios estén listos.

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#4](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/4) (ABIERTO): Coordinar estado de MK-002; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][combos-svc][09] Verificar flujo end-to-end

**COMBOS-SVC-BACK-09 · Marco Castilla · NO_INICIADO**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Crear/editar/consultar/desactivar combo; rechazar SKU repetido, no vendible, anidado y precio fuera del límite; actualizar disponibilidad informativa con cambios de inventario sin crear saldo o reserva propia.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-002 y datos/combos/physical-model.md; DEC-F aplicables; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita E2E real React→Gateway→servicio→dependencias.

## Dependencias bloqueantes
- COMBOS-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
Crear/editar/consultar/desactivar combo; rechazar SKU repetido, no vendible, anidado y precio fuera del límite; actualizar disponibilidad informativa con cambios de inventario sin crear saldo o reserva propia. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][bulk-svc][01] Preparar estructura y configuración

**BULK-SVC-BACK-01 · Marco Castilla · PARCIAL**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: scaffold NestJS y GET /health existen en la app; readiness, configuración validada y dependencia de negocio no acreditadas.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][bulk-svc][02] Implementar persistencia Drizzle

**BULK-SVC-BACK-02 · Marco Castilla · NO_INICIADO**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/bulk-svc/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en la rama/corte auditado no se acredita provider Drizzle funcional para este servicio.

## Dependencias bloqueantes
- BULK-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][bulk-svc][03] Implementar reglas de negocio

**BULK-SVC-BACK-03 · Marco Castilla · NO_INICIADO**

## Objetivo
Las invariantes funcionales de bulk-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Validar archivo y plantilla antes de aplicar filas; idempotencia por batch; resultado por fila/dominio; sin rollback distribuido. No inventar ubicación default; stock inicial solo mediante comando de Inventory con ubicación aprobada. Exportación total CSV/XLSX asíncrona.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: scaffold no acredita reglas del bounded context.

## Dependencias bloqueantes
- BULK-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][bulk-svc][04] Implementar consultas HTTP

**BULK-SVC-BACK-04 · Marco Castilla · NO_INICIADO**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /carga-masiva/productos/plantilla (descargarPlantillaProductos); GET /carga-masiva/productos/importaciones/{batchId} (obtenerImportacionGeneralProductos); GET /carga-masiva/productos/importaciones/{batchId}/reporte (descargarReporteImportacionGeneral); GET /carga-masiva/productos/exportaciones/{exportId} (obtenerExportacionGeneralProductos); GET /carga-masiva/productos/exportaciones/{exportId}/archivo (descargarExportacionGeneralProductos)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: GET /health no acredita operaciones de consulta de negocio.

## Dependencias bloqueantes
- BULK-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][bulk-svc][05] Implementar escrituras HTTP

**BULK-SVC-BACK-05 · Marco Castilla · NO_INICIADO**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: POST /carga-masiva/productos/importaciones (crearImportacionGeneralProductos); POST /carga-masiva/productos/importaciones/{batchId}/reanudar (reanudarImportacionGeneral); POST /carga-masiva/productos/exportaciones (crearExportacionGeneralProductos)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acreditan operaciones de escritura de negocio.

## Dependencias bloqueantes
- BULK-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][bulk-svc][06] Implementar eventos y RabbitMQ

**BULK-SVC-BACK-06 · Marco Castilla · NO_INICIADO**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Publica catalog.bulk.upsert.requested, pricing.bulk.price.apply.requested e inventory.bulk.stock.adjust.requested; consume catalog.bulk.upsert.completed y catalog.bulk.upsert.rejected, pricing.bulk.price.apply.completed y pricing.bulk.price.apply.rejected e inventory.bulk.stock.adjust.completed e inventory.bulk.stock.adjust.rejected. Outbox para comandos locales durables; inbox/dedupe para resultados recibidos, según AsyncAPI RC2 candidata.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita productor/consumer del servicio.

## Dependencias bloqueantes
- BULK-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][bulk-svc][07] Consolidar robustez y observabilidad

**BULK-SVC-BACK-07 · Marco Castilla · NO_INICIADO**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: health básico no acredita la resiliencia/observabilidad de operaciones de negocio.

## Dependencias bloqueantes
- BULK-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][bulk-svc][08] Integrar pantallas React vía Gateway

**BULK-SVC-BACK-08 · Marco Castilla · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
MK-001: BulkUploadPage, BulkReviewPage, BulkProgressPage, BulkResultPage y BulkDownloadsPage. Adaptadores actuales: mockBulkRepository; no adapter HTTP real. Operaciones OpenAPI asociadas a MK: MK-001: GET /carga-masiva/productos/plantilla (descargarPlantillaProductos); POST /carga-masiva/productos/importaciones (crearImportacionGeneralProductos); GET /carga-masiva/productos/importaciones/{batchId} (obtenerImportacionGeneralProductos); GET /carga-masiva/productos/importaciones/{batchId}/reporte (descargarReporteImportacionGeneral); POST /carga-masiva/productos/importaciones/{batchId}/reanudar (reanudarImportacionGeneral); POST /carga-masiva/productos/exportaciones (crearExportacionGeneralProductos); GET /carga-masiva/productos/exportaciones/{exportId} (obtenerExportacionGeneralProductos); GET /carga-masiva/productos/exportaciones/{exportId}/archivo (descargarExportacionGeneralProductos)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: UI/mock/unavailable existentes no acreditan adapter HTTP real ni integración API.

## Dependencias bloqueantes
- BULK-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Dependencias condicionales por operación:**
- **Importación/reanudación que espera resultados async de los tres bounded contexts.** depende de CATALOG-SVC-BACK-06, PRICING-SVC-BACK-06, INVENTORY-SVC-BACK-06. Plantilla, preview y exportación pueden probarse por separado; el lote real no se declara E2E hasta que los tres handlers/resultados funcionen.

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#3](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/3) (CERRADO): Coordinar estado de MK-001; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][bulk-svc][09] Verificar flujo end-to-end

**BULK-SVC-BACK-09 · Marco Castilla · NO_INICIADO**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Marco Castilla** (mrcastilla8) · rama castilla.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Validar archivo correcto/incorrecto, preview sin escritura y confirmación; progreso por lote/fila, fallo parcial y reanudación idempotente; exportación async con descarga. Verificar que default_location ausente nunca se invente.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-001 y datos/bulk/physical-model.md; ownership de orquestación parcial; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita E2E real React→Gateway→servicio→dependencias.

## Dependencias bloqueantes
- BULK-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
Validar archivo correcto/incorrecto, preview sin escritura y confirmación; progreso por lote/fila, fallo parcial y reanudación idempotente; exportación async con descarga. Verificar que default_location ausente nunca se invente. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][inventory-svc][01] Preparar estructura y configuración

**INVENTORY-SVC-BACK-01 · Miguel Taco · IMPLEMENTADO_SIN_VALIDAR**

## Objetivo
El servicio inicia con configuración válida, health/readiness comprobables y sin registrar secretos.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Auditar app NestJS, scripts/env/schema de configuración, validación fail-closed, health/readiness y logging. No implementar reglas funcionales en este bloque.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
IMPLEMENTADO_SIN_VALIDAR: PR #10 OPEN/DRAFT añade configuración/auth del servicio (apps/inventory-svc/CONFIGURACION.md, apps/inventory-svc/src/config/inventory.config.ts, apps/inventory-svc/src/auth/*, module/main). El scaffold health existente no equivale al PR fusionado.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inspeccionar módulos, env, scripts y endpoint health actuales de esta app.
- [ ] Implementar validación de configuración, readiness/health y logging seguro.
- [ ] Documentar variables por nombre/descripción, nunca valores sensibles.

## Criterios de aceptación
- [ ] Variables obligatorias inválidas hacen fallar el arranque; readiness reporta solo dependencias del servicio.
- [ ] Health no se declara como readiness ni registra secretos.
- [ ] No se agregan rutas o reglas de negocio.

## Pruebas obligatorias
Unit/config tests de env faltante/malformado, health vs readiness y ausencia de secretos en logs.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** Auth y config aparecen en PR #10; no está fusionado. Commits relacionados: 03a491879255, 3378f0413ada, 393773e2f494. Archivos: apps/inventory-svc/CONFIGURACION.md; apps/inventory-svc/src/config/inventory.config.ts; apps/inventory-svc/src/auth/*; apps/inventory-svc/src/inventory-svc.module.ts; apps/inventory-svc/src/main.ts. Pruebas: apps/inventory-svc/test/app.e2e-spec.ts: health y casos JWT 401/403. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][inventory-svc][02] Reconciliar persistencia Drizzle del modelo Inventory

**INVENTORY-SVC-BACK-02 · Miguel Taco · IMPLEMENTADO_SIN_VALIDAR**

## Objetivo
El servicio persiste en su schema propio mediante Drizzle y transacciones reproducibles en entorno aislado.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Mapear datos/inventory-svc/physical-model.md a schema del servicio; provider Drizzle/repositorios/transacciones, permisos efectivos y errores DB en entorno aislado. Sin migraciones reescritas, grants ni Supabase writes.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
IMPLEMENTADO_SIN_VALIDAR: PR #10 añade Drizzle/schema/repositorios y conexión PostgreSQL (apps/inventory-svc/src/drizzle/schema.ts, apps/inventory-svc/src/database/*, apps/inventory-svc/src/repositories/drizzle/*, apps/inventory-svc/src/repositories/interfaces/*). PR abierto; no runtime compartido acreditado.

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Conexión, permiso y proceso de shared Supabase/fixtures; no bloquea trabajo con DB aislada.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Comparar modelo conceptual y físico del schema propio con código Drizzle.
- [ ] Implementar conexión/repositorios/transacciones e inyección del provider.
- [ ] Probar permisos requeridos/denegados en PostgreSQL aislado; no escribir a Supabase compartido.

## Criterios de aceptación
- [ ] Acceso limitado al schema owner; transacciones/unique/foreign keys siguen el modelo propio.
- [ ] No se accede directamente a datos de otro BC ni se reescribe migración aplicada.
- [ ] Pruebas en DB aislada; no grants/policies/SQL shared.

## Pruebas obligatorias
Unit tests de mapping y transacciones; una instancia PostgreSQL aislada por suite, no contenedor por test; verificar permisos positivos/negativos sin escribir en Supabase compartido.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** Drizzle y acceso PostgreSQL implementados en la cabeza abierta. Commits relacionados: 8a0204313fa6, bf8f699bfe31, 13da441f4767. Archivos: apps/inventory-svc/src/drizzle/schema.ts; apps/inventory-svc/src/database/*; apps/inventory-svc/src/repositories/drizzle/*; apps/inventory-svc/src/repositories/interfaces/*. Pruebas: apps/inventory-svc/test/inventory.real.integration.spec.ts: Drizzle/UPDATE RETURNING/transacción rollback. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][inventory-svc][03] Implementar invariantes completas de Inventory

**INVENTORY-SVC-BACK-03 · Miguel Taco · PARCIAL**

## Objetivo
Las invariantes funcionales de inventory-svc se aplican y se prueban en la capa de dominio.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Solo una ubicación elegible; faltante/ambigüedad da INDETERMINADO. No exponer saldo físico por rutas comerciales ni vender por consulta de disponibilidad; reservar en operación separada. Nunca saldo negativo; idempotencia/concurrencia/Kardex. Incidencias y recepciones afectan disponible solo por operación autorizada. Reintegro F3 tras recepción física y aptitud; discrepancias de traslado no alteran disponible.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
PARCIAL: PR #10 implementa reservas/idempotencia, saldo/disponibilidad, operaciones y Kardex; quedan reglas/operaciones SPEC-015 no cubiertas, entre ellas incidencias, traslados, reintegro F3, conciliación offline y umbrales.

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-02 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Convertir reglas de SPEC/HU en reglas puras o servicios del dominio.
- [ ] Aplicar estados/versiones/idempotencia al límite definido por el modelo.
- [ ] Probar límites positivos/negativos; registrar solo contradicciones que bloqueen una regla.

## Criterios de aceptación
- [ ] Cada regla de SPEC/HU citada tiene pruebas positivas, negativas y límite.
- [ ] No se cruza ownership ni se inventan eventos/rutas/campos.
- [ ] Los estados se transicionan de forma idempotente según la regla aprobada.

## Pruebas obligatorias
Unit tests de invariantes/estados límite/errores; fixtures solo en pruebas aisladas.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** Reserva/saldo/Kardex probados parcialmente; incidentes, traslado, F3/reintegro, offline y umbrales pendientes. Commits relacionados: 8a0204313fa6, 721fde7f5cb2, fb9f2ed042f9. Archivos: apps/inventory-svc/src/reservations/reservations.service.ts; apps/inventory-svc/src/disponibilidad/*; apps/inventory-svc/src/operations/*; apps/inventory-svc/src/kardex/*; apps/inventory-svc/src/idempotency/*. Pruebas: apps/inventory-svc/src/reservations/reservations.concurrency.spec.ts; apps/inventory-svc/src/reservations/reservations.cycle.spec.ts; apps/inventory-svc/src/disponibilidad/disponibilidad.spec.ts. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][inventory-svc][04] Implementar consultas HTTP de Inventory

**INVENTORY-SVC-BACK-04 · Miguel Taco · PARCIAL**

## Objetivo
Las operaciones de lectura/evaluación asignadas al servicio responden conforme a operationIds existentes.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estos operationIds de OpenAPI 0.6.0-rc.1 candidata (lecturas más evaluaciones POST sin efecto): GET /inventario/disponibilidad (consultarDisponibilidad); GET /inventario/umbrales (obtenerUmbralesInventario); GET /inventario/dashboard (obtenerDashboardInventario); GET /inventario/traslados (listarTrasladosInventario); GET /inventario/traslados/{trasladoId} (obtenerTrasladoInventario); GET /inventario/disponibilidad/comercial (consultarDisponibilidadComercial); POST /inventario/disponibilidad/comercial/verificar (verificarCantidadComercial)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
PARCIAL: PR #10 implementa GET disponibilidad/operación y POST verificar cantidad/reservar/confirmar/liberar en apps/inventory-svc/src/inventory.controller.ts; no cubre todas las operationId de Inventario del OpenAPI candidato.

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Implementar los operationIds del Alcance; comprobar filtros, paginación, status y Problem.code.
- [ ] Usar repositorios del bounded context; nada de lecturas cross-schema para sustituir APIs externas.
- [ ] Dejar sin exposición canales internos detallados.

## Criterios de aceptación
- [ ] Todos los operationIds enumerados pasan contract tests con parámetros/respuestas/problem details contractuales.
- [ ] Query/read no produce efectos de negocio salvo evaluación/prevalidación especificada como no consumidora.
- [ ] Auth corresponde al operation Security en OpenAPI, sin fallback.

## Pruebas obligatorias
Contract tests de operationIds de lectura/evaluación afectados: parámetros, 2xx, Problem.code, paginación/estado vacío y seguridad declarada; sin Playwright.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** Solo un subconjunto de operaciones HTTP está en el controller; no todas las operationId OpenAPI. Commits relacionados: 66324068beaf, 3378f0413ada, 2b994ee3b601. Archivos: apps/inventory-svc/src/inventory.controller.ts. Pruebas: apps/inventory-svc/test/app.e2e-spec.ts: GET disponibilidad/operación, POST verificar/reservar/confirmar/liberar. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][inventory-svc][05] Implementar escrituras HTTP restantes de Inventory

**INVENTORY-SVC-BACK-05 · Miguel Taco · PARCIAL**

## Objetivo
Las operaciones de escritura asignadas persisten con validación, autorización e idempotencia exigidas.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar solo estas mutaciones operationId de OpenAPI 0.6.0-rc.1 candidata: POST /inventario/reservas (solicitarReserva); POST /inventario/reservas/{reservaId}/confirmar (confirmarReserva); POST /inventario/reservas/{reservaId}/liberar (liberarReserva); PUT /inventario/umbrales/global (actualizarUmbralGlobal); PUT /inventario/umbrales/skus/{sku} (establecerUmbralSku); DELETE /inventario/umbrales/skus/{sku} (eliminarUmbralSku); POST /inventario/incidencias (reportarIncidenciaInventario); POST /inventario/incidencias/{incidenciaId}/resolver (resolverIncidenciaInventario); POST /inventario/reintegros (reintegrarInventario); POST /inventario/conciliaciones-offline (conciliarVentaOffline); POST /inventario/traslados/{trasladoId}/recepciones (registrarRecepcionTrasladoInventario)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
PARCIAL: PR #10 implementa comandos de reserva, confirmar y liberar; faltan varios writes OpenAPI (umbrales, incidencias, reintegro, conciliación offline, recepción de traslado).

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Conciliación Retail y reintegro F3 de Postventa.** Responsable de resolver: G4/Retail y Postventa. Desbloqueo: Homologación de responsabilidades/sequence/permiso; el resto de writes internos puede implementarse.

## Tareas
- [ ] Implementar las mutaciones operationIds del Alcance con validación y transacción propia.
- [ ] Enlazar idempotency/concurrency/versionado donde SPEC/contrato lo exijan.
- [ ] Para POST de evaluación/prevalidación con side-effect cero, mantenerlo en el bloque de consulta; no escribir resultado comercial.

## Criterios de aceptación
- [ ] Solo se implementan operationIds mutantes enumerados.
- [ ] Validación, autorización y atomicidad se prueban; idempotencia/versionado solo según fuente contractual.
- [ ] Publicación de eventos ocurre después de commit por outbox cuando aplique.

## Pruebas obligatorias
Unit + contract de operaciones mutables afectadas; autorización, validación, versionado/idempotency, rollback y persistencia aislada.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** Comandos reserva cubiertos; otros writes HTTP no están en controller. Commits relacionados: 8a0204313fa6, 66324068beaf, 2b994ee3b601. Archivos: apps/inventory-svc/src/inventory.controller.ts; apps/inventory-svc/src/reservations/reservations.service.ts; apps/inventory-svc/src/idempotency/idempotency.service.ts. Pruebas: apps/inventory-svc/test/app.e2e-spec.ts; apps/inventory-svc/src/reservations/reservations.cycle.spec.ts. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Conciliación Retail y reintegro F3 de Postventa.** Responsable de resolver: G4/Retail y Postventa. Desbloqueo: Homologación de responsabilidades/sequence/permiso; el resto de writes internos puede implementarse.

---

# [BACK][inventory-svc][06] Completar eventos y workers de Inventory

**INVENTORY-SVC-BACK-06 · Miguel Taco · PARCIAL**

## Objetivo
Las operaciones de mensajería que AsyncAPI RC2 asigna al servicio se entregan y deduplican correctamente.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Publica inventory.stock.changed e inventory.stock.adjusted, inventory.reservation.created, inventory.reservation.rejected, inventory.reservation.consumed, inventory.reservation.released e inventory.reservation.expired, inventory.consumption.completed e inventory.consumption.rejected, inventory.bulk.stock.adjust.completed e inventory.bulk.stock.adjust.rejected y inventory.sku.initialization.completed e inventory.sku.initialization.rejected; consume catalog.sku.deactivated, inventory.bulk.stock.adjust.requested e inventory.sku.initialization.requested, según AsyncAPI RC2 candidata.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
PARCIAL: PR #10 implementa outbox/publicación y workers. No acredita consumers de inventory.bulk.stock.adjust.requested ni inventory.sku.initialization.requested.

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-05 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar solo producer/consumer y routing keys asignados en AsyncAPI RC2 candidata.
- [ ] Usar outbox transaccional para eventos publicados junto con mutación; inbox/dedupe para consumers según modelo.
- [ ] ACK/retry/reconnect con prueba aislada; retry/DLX productivo solo tras homologación G5.

## Criterios de aceptación
- [ ] No hay evento/consumer fuera de la lista de AsyncAPI RC2.
- [ ] Publish es durable/idempotente y consume con dedupe/ACK conforme al contrato y modelo.
- [ ] No se declara homologación G5 ni retry/DLX productivo sin evidencia externa.

## Pruebas obligatorias
Unit/contract publisher-consumer con message_id/dedup/retry; broker ephemeral una vez por suite. Solo pruebas de provider/consumer, no homologación ni E2E.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** Outbox/workers productores descritos; no se acreditan consumers bulk adjust/SKU init. Commits relacionados: 4f03d9d3a87d, 22c055f922ce, 9cba206f68e9, b947fd9e9a7f. Archivos: apps/inventory-svc/src/outbox/*; apps/inventory-svc/src/workers/*; apps/inventory-svc/src/reservations/reservations.service.ts. Pruebas: apps/inventory-svc/src/outbox/outbox-publisher.spec.ts; apps/inventory-svc/src/workers/inventory-workers.spec.ts; apps/inventory-svc/test/inventory.real.integration.spec.ts. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][inventory-svc][07] Completar resiliencia y observabilidad Inventory

**INVENTORY-SVC-BACK-07 · Miguel Taco · PARCIAL**

## Objetivo
El servicio se comporta de forma observable y controlada ante errores y dependencia indisponible.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Normalizar errores por Problem.code, correlation, logs estructurados sin datos sensibles, readiness y límites/timeouts. Probar fallas DB/broker y replay según responsabilidad. Retry/DLX de producción no se presume aprobado ni probado.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
PARCIAL: PR #10 incluye Problem Details, expiración y recuperación outbox; falta comprobar la cobertura restante de indisponibilidad, métricas y contratos.

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-06 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Clasificar errores negocio/contrato/infra y emitir Problem Details correcto.
- [ ] Exponer health/readiness seguro, correlación y métricas sin secretos/PII innecesaria.
- [ ] Probar caídas, timeouts, duplicados y recuperación con la estrategia que el contract efectivamente fija.

## Criterios de aceptación
- [ ] Fallos DB/broker/upstream y recuperación tienen resultado y observabilidad verificable.
- [ ] No logs con tokens, secretos, datos sensibles innecesarios.
- [ ] No degradación silenciosa a success/empty.

## Pruebas obligatorias
Pruebas focalizadas de timeout/DB/broker fallido, recuperación, métricas/log redaction; suite completa después en CI.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** Problem Details/recovery cubiertos parcialmente; runtime/homologación no acreditados. Commits relacionados: 61541b6d9160, 116e7b306f3a, b947fd9e9a7f. Archivos: apps/inventory-svc/src/errors/*; apps/inventory-svc/src/reservations/reservation-expiration.service.ts; apps/inventory-svc/src/outbox/outbox-publisher.service.ts; apps/inventory-svc/src/workers/*. Pruebas: apps/inventory-svc/src/reservations/reservation-expiration.spec.ts; apps/inventory-svc/test/inventory.real.integration.spec.ts. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][inventory-svc][08] Integrar stock y dashboard React vía Gateway

**INVENTORY-SVC-BACK-08 · Miguel Taco · NO_INICIADO**

## Objetivo
Las pantallas MK del bounded context usan adaptadores HTTP reales y muestran respuestas/errores de API.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend (el issue permanece centralizado en Backend).

## Alcance
En la rama Frontend taco (f01cb3146322cd546396a8fa73a8f07fcbc2fb93) existe src/features/inventory/adapters/mockInventoryAdapter.ts, pero es mock y no acredita HTTP. La búsqueda por árbol no encontró componentes/páginas ni un adapter real bajo src/features/inventory; AppRoutes, productRoutes y demoRoutes tampoco registran rutas /inventario. tests/inventory.spec.ts contiene 20 declaraciones Playwright para MK-015, MK-016 y navegación; no se ejecutaron en esta auditoría y sus rutas esperadas no constan en los routers. Inspeccionar/reutilizar/reparar estos artefactos antes de crear nuevos; no duplicar trabajo. Backend PR #10 cubre solo un subconjunto de operations y no sustituye esta integración. Operaciones OpenAPI asociadas a MK: MK-015: GET /inventario/umbrales (obtenerUmbralesInventario); PUT /inventario/umbrales/global (actualizarUmbralGlobal); PUT /inventario/umbrales/skus/{sku} (establecerUmbralSku); DELETE /inventario/umbrales/skus/{sku} (eliminarUmbralSku); POST /inventario/incidencias (reportarIncidenciaInventario); POST /inventario/incidencias/{incidenciaId}/resolver (resolverIncidenciaInventario); GET /inventario/traslados (listarTrasladosInventario); GET /inventario/traslados/{trasladoId} (obtenerTrasladoInventario); POST /inventario/traslados/{trasladoId}/recepciones (registrarRecepcionTrasladoInventario); POST /inventario/reintegros (reintegrarInventario); POST /inventario/conciliaciones-offline (conciliarVentaOffline) | MK-016: GET /inventario/dashboard (obtenerDashboardInventario); GET /inventario/disponibilidad/comercial (consultarDisponibilidadComercial); POST /inventario/disponibilidad/comercial/verificar (verificarCantidadComercial); GET /inventario/operaciones/{operationId} (consultarOperacionInventario)

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: en Frontend taco existe un adapter mock y una suite Playwright de 20 casos, pero no constan páginas/rutas Inventory ni adapter HTTP real en el árbol auditado. No se declara prueba pasada; las rutas esperadas por la suite tampoco aparecen en AppRoutes/productRoutes/demoRoutes.

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-07 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#17](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/17) (ABIERTO): Coordinar estado de MK-015; UI existente no acredita API.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#18](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/18) (ABIERTO): Coordinar estado de MK-016; UI existente no acredita API.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P1 — Pantallas/integración MK-015/016.** Responsable de resolver: Owner UX y responsables externos de Inventory. Desbloqueo: Resolver la plantilla/spec MK-016 y homologar secuencias que corresponden a Retail/Postventa; no inventar endpoints.
- **P0 — Exponer GETs operativos a usuarios demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Autorización por operationId; omitir saldo/Kardex para canales comerciales.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

## Tareas
- [ ] Revisar y decidir si se reutiliza o repara src/features/inventory/adapters/mockInventoryAdapter.ts y tests/inventory.spec.ts; no recrear estos artefactos sin comprobar su estado.
- [ ] Conectar pantallas MK y flujos listados en Alcance al HTTP client compartido.
- [ ] Quitar mock del composition mode api; conservar fixtures y mock exclusivamente en pruebas o modo mock explícito.
- [ ] Cubrir loading/empty/success/401/403/409/5xx y evitar retries que dupliquen writes.

## Criterios de aceptación
- [ ] Cada MK listado llama los operationIds enumerados y refleja errores/autorización en UI.
- [ ] Acreditar por separado adapter HTTP y rutas/páginas; mocks y specs Playwright existentes no cuentan como integración real.
- [ ] Modo api nunca devuelve fixtures/mocks en error ni muestra saldo detallado fuera de alcance.
- [ ] Las llamadas userBearer no se activan en demo anónima sin resolución formal.

## Pruebas obligatorias
Unit tests de adapters/serialización y contract tests HTTP. Para interacción UI, Playwright Chromium, workers=1 local, sin fallback mock, sin grabación exitosa; mocks solo unit.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** No atribuir progreso backend a la integración frontend. Commits relacionados: ninguno. Archivos: Frontend: no se encontró src/features/inventory, páginas ni adapters; issue Frontend #17/#18 OPEN.. Pruebas: No se encontró browser/API integration de Inventory.. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo llamadas userBearer que se pretenda habilitar en demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Resolver autenticación/autorización por operationId; no tokens de servicio en navegador ni bypass. Seguir con operaciones ya autorizadas.
- **P1 — Pantallas/integración MK-015/016.** Responsable de resolver: Owner UX y responsables externos de Inventory. Desbloqueo: Resolver la plantilla/spec MK-016 y homologar secuencias que corresponden a Retail/Postventa; no inventar endpoints.
- **P0 — Exponer GETs operativos a usuarios demo sin login.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Autorización por operationId; omitir saldo/Kardex para canales comerciales.
- **P0 — Publicación de páginas/datos de esta feature en la demo.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Revisar security por operationId y las capas efectivas de datos/rutas; la ausencia de userBearer en OpenAPI no acredita grants ni autorización de publicación.

---

# [BACK][inventory-svc][09] E2E de stock, persistencia y errores

**INVENTORY-SVC-BACK-09 · Miguel Taco · PARCIAL**

## Objetivo
Los escenarios del servicio se validan de extremo a extremo con servicios reales y datos aislados.

## Responsable
**Miguel Taco** (MiguelTacoZavala) · rama taco.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
MK-015: threshold read/write, reportar/resolver incidencia, recepción de traslado y registro de reintegro solo con autorización externa; bloquea secuencias G4/G7 pendientes. MK-016: consulta comercial disponible/indeterminada, verificación independiente de reserva, dashboard autorizado y operación/replay; nunca enseñar stock_balance/Kardex por canal.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); SPEC/HU/FLOW-015/016, DEC-F adoptadas aplicables y datos/inventory-svc/physical-model.md; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

**Acreditación retrospectiva:** PR #10 aporta evidencia histórica compartida por bloque. Ver commits/files/tests específicos del manifiesto; esto no crea un PR por issue, no acredita merge/cierre y no reemplaza PR propio para cambios nuevos.

## Estado inicial
PARCIAL: PR #10 contiene apps/inventory-svc/test/app.e2e-spec.ts, reservas.cycle/concurrency specs y apps/inventory-svc/test/inventory.real.integration.spec.ts (11/11 declarado en el PR, PostgreSQL/RabbitMQ efímeros). No es E2E React→Gateway ni está fusionado.

## Dependencias bloqueantes
- INVENTORY-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Ejecutar escenarios de negocio del Alcance por la ruta React→Gateway→servicio→PostgreSQL y RabbitMQ si aplica.
- [ ] Asegurar test data aislada/versionada y cleanup reproducible.
- [ ] Entregar evidence por operationId; distinguir provider tests, browser integration, E2E, homologación y deployment.

## Criterios de aceptación
- [ ] Todos los escenarios del Alcance pasan en stack real con versiones, fixture y logs identificados.
- [ ] No se presenta test de provider/mocks como E2E React→Gateway.
- [ ] Flujos aún bloqueados por autoridad externa quedan reportados como BLOQUEADO_ESPECÍFICO, sin bloquear otros tests.

## Pruebas obligatorias
MK-015: threshold read/write, reportar/resolver incidencia, recepción de traslado y registro de reintegro solo con autorización externa; bloquea secuencias G4/G7 pendientes. MK-016: consulta comercial disponible/indeterminada, verificación independiente de reserva, dashboard autorizado y operación/replay; nunca enseñar stock_balance/Kardex por canal. Escalar tests afectados primero; un stack Postgres/Rabbit aislado compartido por la suite. Playwright solo Chromium/1 worker local, sin screenshot/video/tracing en éxitos. E2E real no acepta mocks.

**Trazabilidad específica de PR #10 (OPEN/DRAFT; head 2c4a18105c5e379edc8476b9d315aa6be1134b80):** PR #10 OPEN/DRAFT; no es merged ni prueba deployment. Commits relacionados: 2b994ee3b601, ae4b27cd71fb. Archivos: apps/inventory-svc/test/app.e2e-spec.ts; apps/inventory-svc/test/inventory.real.integration.spec.ts; apps/inventory-svc/src/reservations/reservations.concurrency.spec.ts; apps/inventory-svc/src/reservations/reservations.cycle.spec.ts. Pruebas: PR #10 declara 11/11 apps/inventory-svc/test/inventory.real.integration.spec.ts; incluye PG/Rabbit efímeros. Los tests del servicio no son E2E React→Gateway.. Perspectiva del PR: no fusionado; revalidar contra diff/CI al ejecutar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][gateway][01] Implementar routing interno y límites

**GATEWAY-BACK-01 · Axel Cueva · PARCIAL**

## Objetivo
El Gateway reenvía operaciones existentes del OpenAPI a sus bounded contexts con timeout, health y errores trazables.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Configurar mapping proxy para paths OpenAPI existentes; timeout, propagación de correlation/idempotency headers cuando el contrato los define, Problem Details y readiness. No añadir operationIds.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); OpenAPI 0.6.0-rc.1 y AsyncAPI 0.6.0-rc.2 en master como candidatas; Arquitectura/Arquitectura.md y responsabilidad BFF declarada en AsyncAPI.; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
PARCIAL: checkout solo acredita GET /health; falta enrutamiento del API del módulo.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Inventariar rutas OpenAPI existentes y bounded context propietario; conservar paths/métodos.
- [ ] Implementar proxy, timeout, propagación contractual de headers y sanitización de error.
- [ ] Distinguir health de readiness de dependencias y no publicar puertos internos.

## Criterios de aceptación
- [ ] Solo enruta paths/métodos existentes; los errors Problem.code y headers contractuales pasan sin filtrar secretos.
- [ ] Timeout/rechazo de upstream y readiness tienen pruebas.
- [ ] Servicios internos y broker permanecen no públicos.

## Pruebas obligatorias
Unit/contract de forwarding, timeout, headers, route mismatch, Problem Details y health; HTTP provider de cada ruta en test aislado.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][gateway][02] Aislar demo sin login y resolver auth

**GATEWAY-BACK-02 · Axel Cueva · BLOQUEADO_ESPECÍFICO**

## Objetivo
Las rutas demo aplican la autenticación y autorización vigentes, sin crear un bypass de userBearer.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Preservar verificación de userBearer, issuer/audience/roles/scopes según contrato vigente; permitir solo rutas explícitamente no protegidas y aprobadas en revisión de exposición; sin tokens service-role en React ni guard removal.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); OpenAPI 0.6.0-rc.1 y AsyncAPI 0.6.0-rc.2 en master como candidatas; Arquitectura/Arquitectura.md y responsabilidad BFF declarada en AsyncAPI.; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
BLOQUEADO_ESPECÍFICO: no existe una decisión autorizada de acceso demo sin login para operaciones userBearer. Se puede preparar validación/passthrough seguro, sin omitir guards; habilitar el acceso demo queda bloqueado por operación.

## Dependencias bloqueantes
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Solo operación userBearer que se pretenda servir anónimamente.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Acuerdo de autorización por operationId registrado; conservar guards hasta entonces.
- **P0 — Publicación de demo anónima.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Evidencia separada de RLS, grants efectivos, schemas expuestos por API, credenciales DB directas y rutas públicas; el advisory de RLS no prueba exposición efectiva de las 84 tablas.

## Tareas
- [ ] Conservar JWT guards y validar issuer/audience/roles/scopes de la configuración acordada.
- [ ] Marcar por operationId qué llamadas del demo pueden ser anónimas; las demás requieren resolución G7/Marco.
- [ ] No emitir ni distribuir token técnico al navegador; no abrir servicio/broker público.

## Criterios de aceptación
- [ ] No hay bypass, service token en frontend ni guard removido.
- [ ] Cada operationId expuesta mantiene el esquema userBearer/scopes/roles del contrato; rutas anónimas quedan restringidas a allowlist revisada.
- [ ] La demo sin login queda marcada bloqueada para operaciones sin solución autorizada.

## Pruebas obligatorias
Tests negativos 401/403 por operación, sin token, issuer/audience/scope inválidos; test de rutas públicas solo desde allowlist explícita. El acceso demo real queda bloqueado por autorización.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Solo operación userBearer que se pretenda servir anónimamente.** Responsable de resolver: G7/Seguridad y Marco. Desbloqueo: Acuerdo de autorización por operationId registrado; conservar guards hasta entonces.
- **P0 — Publicación de demo anónima.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Evidencia separada de RLS, grants efectivos, schemas expuestos por API, credenciales DB directas y rutas públicas; el advisory de RLS no prueba exposición efectiva de las 84 tablas.

---

# [BACK][gateway][03] Consumir eventos para seguimiento asíncrono

**GATEWAY-BACK-03 · Axel Cueva · NO_INICIADO**

## Objetivo
El Gateway procesa únicamente los eventos BFF que AsyncAPI RC2 ya le asigna, sin inventar rutas ni mensajes.

## Responsable
**Axel Cueva** (AXL031) · rama cueva.
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Implementar consumers únicamente para los 11 eventos con x-consumers api-gateway/bff en AsyncAPI RC2 candidata: taxonomy.category.updated, taxonomy.master.deactivated, catalog.product.deactivated, pricing.price.changed, inventory.stock.changed, inventory.stock.adjusted, inventory.sku.initialization.rejected, inventory.reservation.created, inventory.reservation.consumed, inventory.reservation.released e inventory.reservation.expired. Unit/contract tests de consumer y recuperación usan mensajes de contrato en broker aislado; no esperan cierre de publishers. Solo la prueba de integración con publisher real depende de TAXONOMY-SVC-BACK-06, CATALOG-SVC-BACK-06, PRICING-SVC-BACK-06 e INVENTORY-SVC-BACK-06 respectivamente. No añadir rutas, storage, permisos ni eventos propios.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
arquitectura/Arquitectura.md; REGISTRO_DEC_F.md y MATRIZ_TRAZABILIDAD_DEC_F.md (DEC-F-001..015 adoptadas internamente, no homologación externa); OpenAPI 0.6.0-rc.1 y AsyncAPI 0.6.0-rc.2 en master como candidatas; Arquitectura/Arquitectura.md y responsabilidad BFF declarada en AsyncAPI.; OpenAPI 0.6.0-rc.1 candidata en master y AsyncAPI 0.6.0-rc.2 candidata en master cuando aplique. No cambiar contrato ni atribuir aceptación externa.

## Estado inicial
NO_INICIADO: no se acredita consumer BFF; handlers y pruebas de contrato pueden desarrollarse en broker aislado, sin esperar a publishers ni resolver la publicación de demo.

## Dependencias bloqueantes
- GATEWAY-BACK-01 (base del Gateway); el trabajo de consumers no depende del cierre de publishers ni de la autenticación de la demo.

**Dependencias condicionales por integración con publishers reales:**
- TAXONOMY-SVC-BACK-06 para taxonomy.category.updated y taxonomy.master.deactivated.
- CATALOG-SVC-BACK-06 para catalog.product.deactivated.
- PRICING-SVC-BACK-06 para pricing.price.changed.
- INVENTORY-SVC-BACK-06 para inventory.stock.changed, inventory.stock.adjusted, inventory.sku.initialization.rejected, inventory.reservation.created, inventory.reservation.consumed, inventory.reservation.released e inventory.reservation.expired.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

## Tareas
- [ ] Implementar handlers y pruebas de contrato con mensajes fixtures en broker aislado; no esperar a publishers reales.
- [ ] Correlacionar solo con destinos BFF existentes; si falta destino/retención aprobada, aislar ese consumer específico.
- [ ] Ejecutar integración real por evento cuando el publisher correspondiente esté listo.
- [ ] Preservar guards y semántica userBearer de las rutas HTTP; no habilitar demo pública ni crear rutas, payloads o persistencia propios.

## Criterios de aceptación
- [ ] Los 11 handlers solo corresponden a eventos declarados para api-gateway/bff en AsyncAPI RC2.
- [ ] Unit/contract tests del consumer pasan con broker aislado sin levantar productores.
- [ ] La integración con publishers reales se exige solo para los eventos cuya dependencia condicional se haya desbloqueado.
- [ ] Se preserva la autenticación existente; no se crean rutas ni tablas sin contrato/decisión.

## Pruebas obligatorias
Unit y contract tests de los 11 consumers con envelopes fixtures basados en AsyncAPI RC2 y broker aislado reutilizado una vez por suite. Pruebas de integración por publisher solo cuando esté disponible (las cuatro dependencias condicionales); no se afirma E2E de demo.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Provisioning de broker y garantías retry/DLX productivas.** Responsable de resolver: G5 y owner G6 de mensajería. Desbloqueo: Homologación del contrato/topología aplicable y evidencia provider/consumer; la lógica interna puede probarse con broker aislado.

---

# [BACK][shared][01] Cliente HTTP común de React para modo API

**SHARED-BACK-01 · OWNER_PENDIENTE · NO_INICIADO**

## Objetivo
El frontend dispone de un cliente HTTP tipado y seguro para llamadas a Gateway con errores consistentes.

## Responsable
**OWNER_PENDIENTE** (no asignar hasta autorización). Candidatos sugeridos, sin asignación: Gabriel Poma — contribución frontend/catalog observada; candidato técnico, no aprobación de ownership. ; Axel Cueva — Gateway/contrato HTTP; candidato de revisión, no asignación..
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend.

## Alcance
Implementar transporte frontend en modo api: base URL no secreta, timeout/cancelación, serialización, Problem.code y errores unavailable/forbidden; modo api falla cerrado cuando falta provider.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
Gobernanza: AGENTS.md de Docs/Backend/Frontend; issues INFRA/DATA/MK vigentes; contratos ejecutables según su estado. No asumir que una guía contextual autoriza cambios compartidos.

## Estado inicial
NO_INICIADO: VITE_DATA_MODE, repositorios mock/unavailable existentes, pero no cliente HTTP transversal acreditado.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Conservar las interfaces repository/port existentes; añadir cliente configurado solo en el composition root API.
- [ ] Traducir HTTP status y Problem.code a errores del dominio sin reintentar escrituras automáticamente.
- [ ] Rechazar base URL ausente/producción insegura y nunca aceptar secretos VITE_*.

## Criterios de aceptación
- [ ] Los adapters api usan el cliente común y devuelven errores contractuales sin depender de mocks.
- [ ] Modo api no tiene fallback mock ante provider/timeout ausente.
- [ ] Ningún token/secret aparece en bundle Vite.

## Pruebas obligatorias
Unit tests del cliente: status/cuerpo Problem Details, timeout, cancelación, header de correlación. Verificar que VITE_DATA_MODE=api no selecciona mocks al fallar.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][deploy][01] Componer demostración privada en Oracle

**DEPLOY-BACK-01 · OWNER_PENDIENTE · PARCIAL**

## Objetivo
Queda preparada la composición de despliegue integrada para los componentes habilitados en Oracle, sin desplegarla.

## Responsable
**OWNER_PENDIENTE** (no asignar hasta autorización). Candidatos sugeridos, sin asignación: Marco Castilla — coordinación de integración y rama backend observada; candidato, no asignación. ; Axel Cueva — owner aprobado de Gateway/infra transversal; candidato, no asignación..
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Documentar y preparar artefactos backend de composición, env/secret references, health/dependencies, smoke checks y rollback para los servicios que estén habilitados; consumir INFRA #8 donde se solape.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
Gobernanza: AGENTS.md de Docs/Backend/Frontend; issues INFRA/DATA/MK vigentes; contratos ejecutables según su estado. No asumir que una guía contextual autoriza cambios compartidos.

## Estado inicial
PARCIAL: Backend #8 sigue OPEN; PR #9 MERGED aporta CD reusable, pero no acredita despliegue integrado de React+Gateway+servicios.

## Dependencias bloqueantes
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#8](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/8) (ABIERTO): CD Oracle existente; reusar lo entregado por PR #9 y no duplicarlo.

**Bloqueos específicos y condición de desbloqueo:**
- **P1 — Despliegue Oracle integrado.** Responsable de resolver: Owner Oracle pendiente y responsables de servicios habilitados. Desbloqueo: Aprobación de ambiente/ventana, secretos privados, TLS/red/readiness/rollback; no publicar si artefacto de servicio no está habilitado.

## Tareas
- [ ] Comparar el pipeline reusable INFRA #8/PR #9 con requisitos del demo.
- [ ] Preparar composición y configuración únicamente para servicios habilitados; health/readiness y rollback documentados.
- [ ] No activar workflow ni desplegar en Oracle en esta preparación.

## Criterios de aceptación
- [ ] La preparación distingue tareas ya entregadas por INFRA #8/PR #9 de composición faltante.
- [ ] Los servicios no habilitados ni datos quedan fuera del deploy.
- [ ] Hay health/readiness, referencias secretas seguras y rollback; no hay deployment ejecutado.

## Pruebas obligatorias
Validación estática de compose/manifests/secret refs y health; smoke solo en ambiente aislado tras autorización; no desplegar Oracle.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P1 — Despliegue Oracle integrado.** Responsable de resolver: Owner Oracle pendiente y responsables de servicios habilitados. Desbloqueo: Aprobación de ambiente/ventana, secretos privados, TLS/red/readiness/rollback; no publicar si artefacto de servicio no está habilitado.

---

# [BACK][data][01] Restaurar dataset demo de forma controlada

**DATA-BACK-01 · OWNER_PENDIENTE · NO_INICIADO**

## Objetivo
El dataset de demo autorizado se puede restaurar de forma repetible usando el mecanismo DATA existente.

## Responsable
**OWNER_PENDIENTE** (no asignar hasta autorización). Candidatos sugeridos, sin asignación: Axel Cueva — owner del runner INFRA #1; candidato para orquestación de restauración, no para seeds ajenos. ; Owners de cada schema — aprobación de sus fixtures; candidatos colectivos sin asignación..
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Definir restauración solo de fixtures demo preaprobados por schema, reusando runner/manifiesto/verify-only de INFRA #1 y resultados DATA; separar render, rollback y eventual persistencia autorizada.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
Gobernanza: AGENTS.md de Docs/Backend/Frontend; issues INFRA/DATA/MK vigentes; contratos ejecutables según su estado. No asumir que una guía contextual autoriza cambios compartidos.

## Estado inicial
NO_INICIADO: DATA #11–#16 y DATA-VAL-001 #17 están OPEN; el mecanismo compartido de seed está documentado como verify_only y no hay restauración demo persistente aprobada acreditada.

## Dependencias bloqueantes
- Ninguna dependencia interna.

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-backend#11](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/11) (ABIERTO): Reconciliar fixture por schema, no duplicar seed de su owner.
- [Taller-SW-Web/G6-Productos-Ofertas-backend#12](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/12) (ABIERTO): Reconciliar fixture por schema, no duplicar seed de su owner.
- [Taller-SW-Web/G6-Productos-Ofertas-backend#13](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/13) (ABIERTO): Reconciliar fixture por schema, no duplicar seed de su owner.
- [Taller-SW-Web/G6-Productos-Ofertas-backend#14](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/14) (ABIERTO): Reconciliar fixture por schema, no duplicar seed de su owner.
- [Taller-SW-Web/G6-Productos-Ofertas-backend#15](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/15) (ABIERTO): Reconciliar fixture por schema, no duplicar seed de su owner.
- [Taller-SW-Web/G6-Productos-Ofertas-backend#16](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/16) (ABIERTO): Reconciliar fixture por schema, no duplicar seed de su owner.
- [Taller-SW-Web/G6-Productos-Ofertas-backend#17](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/17) (ABIERTO): DATA-VAL-001: reusar validaciones aprobadas; no implica restore persistente.
- [Taller-SW-Web/G6-Productos-Ofertas-backend#1](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-backend/issues/1) (ABIERTO): Reusar runner de seed y respetar shared=verify_only.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Persistencia de dataset compartido/demo.** Responsable de resolver: Marco y owners de los schemas afectados. Desbloqueo: Aprobación expresa de fixture exacto, schema/tablas/destino y proceso de despliegue; hasta entonces solo dry-run/rollback aislado.

## Tareas
- [ ] Inventariar DATA-001..006 y DATA-VAL-001; identificar qué fixtures demo ya existen y qué falta para restaurar.
- [ ] Reusar el runner/manifest/verify_only descrito por INFRA #1; no duplicar seeds de cada owner.
- [ ] Proponer ledger/versionado de dataset y pre/post-checks, sin ejecutar persistencia.

## Criterios de aceptación
- [ ] El plan cubre solo datos demo existentes o formalmente aprobados por cada owner/schema.
- [ ] No duplica seeds DATA #11–#16 ni DATA-VAL #17; referencia al mecanismo INFRA #1.
- [ ] Dry-run identifica versión/target, y persistencia está bloqueada hasta autorizaciones expresas.

## Pruebas obligatorias
Dry-run/render y validaciones de manifest; fixture idempotente con transacción ROLLBACK solo si un owner aprueba expresamente dataset/destino. No SQL ni shared writes en este issue.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Persistencia de dataset compartido/demo.** Responsable de resolver: Marco y owners de los schemas afectados. Desbloqueo: Aprobación expresa de fixture exacto, schema/tablas/destino y proceso de despliegue; hasta entonces solo dry-run/rollback aislado.

---

# [BACK][shared][03] Harness transversal E2E y presentación

**SHARED-BACK-03 · OWNER_PENDIENTE · PARCIAL**

## Objetivo
El repositorio frontend tiene preparado un harness de navegador ligero para ejecutar escenarios reales por feature.

## Responsable
**OWNER_PENDIENTE** (no asignar hasta autorización). Candidatos sugeridos, sin asignación: Gabriel Poma — frontend y Playwright observados; candidato técnico, no asignación. ; Axel Cueva — Gateway para destino real de pruebas; candidato de coordinación, no asignación..
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend.

## Alcance
Preparar configuración Playwright de Frontend para escenarios por feature contra Gateway/ambiente aislado; Chromium únicamente, worker=1 en local, reusar servidor solo con salud/puerto comprobados; no crear cambios en Backend.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
Gobernanza: AGENTS.md de Docs/Backend/Frontend; issues INFRA/DATA/MK vigentes; contratos ejecutables según su estado. No asumir que una guía contextual autoriza cambios compartidos.

## Estado inicial
PARCIAL: hay Playwright en Frontend y pruebas Vitest/provider en Backend; no hay harness verificado React→Gateway→servicio real.

## Dependencias bloqueantes
- GATEWAY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Crear harness frontend que use base URL configurable y Gateway real, con test idempotente por feature.
- [ ] Asegurar cleanup y reutilización segura del servidor; pruebas afectadas primero.
- [ ] Documentar cómo ejecutar el test con environment aislado; no incluir compose o handlers Backend.

## Criterios de aceptación
- [ ] El harness ejecuta pruebas feature contra Gateway real con la misma topología HTTP, sin mocks funcionales.
- [ ] Chromium únicamente; worker local=1; server reuse con health/port comprobado.
- [ ] Éxito sin artefactos pesados; fallo conserva evidencia mínima y sanitizada.

## Pruebas obligatorias
Playwright Chromium, feature-focused, workers=1 local; sin video, screenshot ni tracing si todo pasa. Ejecutar browser specs contra UI real y ambiente aislado; mocks no cuentan como E2E.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][shared][04] Cerrar matriz de integración de las 16 MK

**SHARED-BACK-04 · OWNER_PENDIENTE · NO_INICIADO**

## Objetivo
Las 16 MK tienen trazabilidad verificable a sus pantallas, operationIds, adapters, estados de auth y pruebas.

## Responsable
**OWNER_PENDIENTE** (no asignar hasta autorización). Candidatos sugeridos, sin asignación: Marco Castilla — coordinación de cobertura Hito 3; candidato, no asignación. ; Vera, Poma, Lopez, Cueva, Taco y Castilla — validar filas de su servicio; no implica asignar owner del artefacto..
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-frontend.

## Alcance
Mantener matriz única de MK-001..016 con páginas, adapters, operaciones OpenAPI candidatas, auth, eventos si aplican, issue/PR y pruebas/evidencia. No duplicar implementación ni aprobar visuales.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
Gobernanza: AGENTS.md de Docs/Backend/Frontend; issues INFRA/DATA/MK vigentes; contratos ejecutables según su estado. No asumir que una guía contextual autoriza cambios compartidos.

## Estado inicial
NO_INICIADO: MK/issues y pantallas están en repositorios distintos; falta una matriz de cobertura MK→operationId→adapter→pruebas/evidencia.

## Dependencias bloqueantes
- BULK-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- COMBOS-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- CATALOG-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- PROMOTIONS-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- TAXONOMY-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- PRICING-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- PRICE-AUDIT-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- INVENTORY-SVC-BACK-08 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#3](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/3) (CERRADO): Fila de cobertura MK-001; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#4](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/4) (ABIERTO): Fila de cobertura MK-002; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#5](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/5) (ABIERTO): Fila de cobertura MK-003; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#6](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/6) (ABIERTO): Fila de cobertura MK-004; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#7](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/7) (ABIERTO): Fila de cobertura MK-005; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#8](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/8) (ABIERTO): Fila de cobertura MK-006; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#9](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/9) (ABIERTO): Fila de cobertura MK-007; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#10](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/10) (ABIERTO): Fila de cobertura MK-008; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#11](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/11) (ABIERTO): Fila de cobertura MK-009; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#12](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/12) (ABIERTO): Fila de cobertura MK-010; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#13](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/13) (ABIERTO): Fila de cobertura MK-011; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#14](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/14) (ABIERTO): Fila de cobertura MK-012; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#15](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/15) (ABIERTO): Fila de cobertura MK-013; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#16](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/16) (ABIERTO): Fila de cobertura MK-014; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#17](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/17) (ABIERTO): Fila de cobertura MK-015; reconcile, no duplicate.
- [Taller-SW-Web/G6-Productos-Ofertas-frontend#18](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/18) (ABIERTO): Fila de cobertura MK-016; reconcile, no duplicate.

**Bloqueos específicos y condición de desbloqueo:**
- No se identifica bloqueo externo específico para el alcance local.

## Tareas
- [ ] Registrar cada MK con páginas/mockup, feature/pages/adapters, operationId, auth, eventos, issue y PR existentes.
- [ ] Marcar API ausente, UI-only y contract pending como estados distintos.
- [ ] Validar todas las 16 filas sin atribuir homologación ni implementación.

## Criterios de aceptación
- [ ] Hay 16 y solo 16 filas MK, cada una mapea sus pantallas y operationIds existentes.
- [ ] Mock/unavailable/HTTP real y userBearer/public quedan diferenciados.
- [ ] No quedan rutas, mensajes ni aprobaciones inventadas; discrepancias tienen owner/bloqueo.

## Pruebas obligatorias
Verificar cobertura exacta MK-001..016, links y operationIds contra OpenAPI/árbol frontend y estado de adapters; sin ejecutar browser.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-frontend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- Contratos RC y restricciones de gobernanza: seguir la fuente/version indicada; contradicciones detienen solo la operación afectada y se elevan al owner competente.

---

# [BACK][shared][05] Validar demo integrada real sin mocks

**SHARED-BACK-05 · OWNER_PENDIENTE · NO_INICIADO**

## Objetivo
Se acredita la demo integrada autorizada sin mocks funcionales, con incidencias y evidencias reproducibles.

## Responsable
**OWNER_PENDIENTE** (no asignar hasta autorización). Candidatos sugeridos, sin asignación: Marco Castilla — coordinación de integración; candidato, no asignación. ; Axel Cueva — Gateway; candidato de validación de frontera, no asignación..
Issue central: Taller-SW-Web/G6-Productos-Ofertas-backend. PR/cambios de código esperados: Taller-SW-Web/G6-Productos-Ofertas-backend.

## Alcance
Ejecutar checklist y smoke real de la demo aprobada, registrar SHA/ambiente/resultados, errores visibles, restauración/datos y seguridad; publicar evidencia sin credenciales ni capturas/tracing masivos.

## Fuera de alcance
No modificar contratos ejecutables, migraciones aplicadas, credenciales, grants/policies, datos shared ni ownership ajeno. No publicar puertos internos/broker. Aplicar AGENTS.md y los límites de ownership; integrar por APIs/eventos del owner, no por acceso cross-schema.

## Fuentes normativas
Gobernanza: AGENTS.md de Docs/Backend/Frontend; issues INFRA/DATA/MK vigentes; contratos ejecutables según su estado. No asumir que una guía contextual autoriza cambios compartidos.

## Estado inicial
NO_INICIADO: no se acredita todavía una validación de demo integrada sin mocks.

## Dependencias bloqueantes
- TAXONOMY-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- CATALOG-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- PRICING-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- PRICE-AUDIT-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- PROMOTIONS-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- COMBOS-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- BULK-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- INVENTORY-SVC-BACK-09 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- GATEWAY-BACK-03 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- DEPLOY-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- DATA-BACK-01 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).
- SHARED-BACK-04 (prerrequisito: completar pruebas y evidencia, y fusionar el PR antes de iniciar este bloque).

**Issues existentes relacionados:**
- Sin issue externo previo identificado.

**Bloqueos específicos y condición de desbloqueo:**
- **P0 — Publicación de demo anónima.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Evidencia separada de RLS, grants efectivos, schemas expuestos por API, credenciales DB directas y rutas públicas; el advisory de RLS no prueba exposición efectiva de las 84 tablas.

## Tareas
- [ ] Ejecutar la matriz MK completa contra versión SHA/deployment identificada.
- [ ] Registrar por operación lectura/escritura, errores, seguridad y estado de integración.
- [ ] Restaurar fixture solo con aprobación; guardar evidencia mínima, logs sanitizados y resultado/reporte.

## Criterios de aceptación
- [ ] Smoke UI/API es real y usa release SHA identificada; modo mock deshabilitado.
- [ ] Se distinguen endpoints autorizados de userBearer bloqueados; no login bypass.
- [ ] Seguridad Supabase y demo pública tienen evidencia efectiva, más rollback/restore aprobados; sin despliegue hecho por este issue.

## Pruebas obligatorias
Smoke HTTP y Playwright Chromium del flujo integrado real; mock mode prohibido. Workers=1 local, tests afectados primero; suite completa en CI/cierre. Evidencia distingue UI, API, DB, broker y despliegue.

## Evidencias de cierre
- [ ] Un PR revisable desde la rama autorizada en Taller-SW-Web/G6-Productos-Ofertas-backend con SHA y diff acotado.
- [ ] Resultado real de pruebas afectadas, versión/commit, fixtures/entorno y logs sanitizados.
- [ ] Separar implementación local, contrato/provider, integración real, homologación externa y despliegue.
- [ ] Cerrar solo tras aceptación, pruebas, evidencias, PR fusionado e issue cerrado.

## Definición de terminado
- Todos los criterios del issue están demostrados con evidencia enlazable.
- Sin mocks funcionales en modo api; fixtures siguen permitidos en pruebas aisladas.
- Ningún cambio fuera de ownership ni requisito externo atribuido por silencio.
- PR del issue fusionado al repo indicado y cierre autorizado conforme a política.

## Riesgos o bloqueos específicos
- **P0 — Publicación de demo anónima.** Responsable de resolver: Marco y owner competente de Seguridad/Supabase. Desbloqueo: Evidencia separada de RLS, grants efectivos, schemas expuestos por API, credenciales DB directas y rutas públicas; el advisory de RLS no prueba exposición efectiva de las 84 tablas.
