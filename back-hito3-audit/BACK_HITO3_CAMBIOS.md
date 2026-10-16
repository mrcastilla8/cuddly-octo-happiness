# Diferencias antes/después — corrección y auditoría final

## Cambios de cantidad

- Antes: 81 borradores en la versión auditada; después de esta auditoría: 82. Se mantienen 80, se elimina 1 y se agregan 2 (SHARED-BACK-05 y DEPLOY-BACK-02). No se fusiona ni divide ningún issue de servicio.
- Eliminado SHARED-BACK-02: INFRA #1 ya cubre conexión, SSL, env/seed runner y control de acceso; health/config quedan en BACK-01 y Drizzle en BACK-02 por servicio.
- Agregado SHARED-BACK-05: smoke/aceptación transversal final, posterior a los ocho BACK-09. Esto separa el harness de feature del cierre integrado y rompe la dependencia circular.
- SHARED-BACK-03 cambia de E2E final a preparación del harness frontend antes de BACK-09. Su única salida de repositorio es Frontend; no exige cambios Backend.
- SHARED-BACK-04 queda como índice de cobertura MK→pantallas→operationIds→adapter→pruebas, independiente de la ejecución final.

## Cambios de calidad

| Antes | Después |
|---|---|
| Objetivo y alcance repetían texto funcional | Objetivo expresa resultado y Alcance lista tareas/operationIds distintos |
| Invariantes de dominio copiadas en BACK-01..09 | Reglas ubicadas en BACK-03; BACK-01 trata configuración/health/readiness |
| Status podía derivarse de scaffold o texto libre | Todos los registros usan estados permitidos; endpoints mock no cuentan como API |
| Dependencias en cadenas de texto | depends_on y blocks usan IDs; issues externos en external_dependencies; autorizaciones pendientes en blocking_conditions |
| Cuerpo genérico en BACK-04/05/06/08 | Operaciones concretas de OpenAPI/AsyncAPI y mappings MK/pages/adapters |
| Inventory resumido por PR #10 | Cada BACK-01..09 indica commit abreviado, archivos y pruebas; PR abierto permanece sin validar/fusionar |
| Riesgo Supabase afirmaba exposición pública general | Se separan RLS y las otras cuatro capas sin afirmar exposición efectiva |
| Pruebas E2E costosas o ambiguas | Unit/contract focalizadas; Chromium/worker 1 local; suite completa CI/cierre; E2E exige React→Gateway real sin mocks |
| Sin dry-run ni ledger | Se añade validador offline y plantilla ledger, sin integración de publicación |

## Estado posterior

## Conteos reconciliados contra MANIFEST y SUMMARY

| Estado | Cantidad |
|---|---:|
| NO_INICIADO | 63 |
| PARCIAL | 16 |
| IMPLEMENTADO_SIN_VALIDAR | 2 |
| IMPLEMENTADO_VALIDADO | 0 |
| NO_APLICA | 0 |
| BLOQUEADO_ESPECÍFICO | 1 |

Total de registros: 82.

Estado del paquete recalculado desde MANIFEST: 82 issues. Las dos piezas de Inventory con código en PR abierto se clasifican IMPLEMENTADO_SIN_VALIDAR; el resto se reporta con alcance faltante.

Sin publicación, escritura GitHub, edición de repositorios, ejecución SQL, cambio de credenciales ni despliegue.


## Dependencias y mensajería afinadas

- Se mapearon como prerrequisitos obligatorios los servicios G6 que deben estar listos antes de ejecutar cada BACK-09 de integración; el detalle por issue está en la matriz y el grafo.
- Se agregaron seis conjuntos de dependencias condicionales de operación en BACK-08 (Taxonomía, Catálogo, Pricing, Promociones, Combos y Bulk). Solo condicionan los flujos nombrados; las otras operaciones siguen avanzando de forma independiente.
- Catalog BACK-06 ahora distingue la publicación de pricing.product.initialization.requested e inventory.sku.initialization.requested de los resultados de inicialización que consume, conforme a AsyncAPI RC2.
- El dry-run valida ciclos, referencias e inversas sobre dependencias obligatorias más condicionales.


## Correcciones de esta auditoría

- El manifiesto incorpora service explícito en cada registro y el validador comprueba los conteos declarados, sin un total rígido.
- Los conteos iniciales de esa auditoría quedaron reconciliados entre MANIFEST, SUMMARY, MATRIZ, ISSUES, CAMBIOS y DEPENDENCIAS; NO_INICIADO: 62. El nuevo issue de despliegue se suma como NO_INICIADO.
- Frontend taco conserva un mock adapter y una suite Playwright de 20 declaraciones; el snapshot no tiene páginas/rutas ni adapter HTTP Inventory.
- La excepción retrospectiva del PR #10 conserva el PR histórico y sus commits/paths verificables; un PR por issue sigue aplicando a trabajo nuevo.
- GATEWAY-BACK-03 puede probar consumers con contratos en entorno aislado; publishers reales son dependencias condicionales únicamente para pruebas integradas.
- La lista de eventos usa nombres completos de AsyncAPI. La excepción histórica PR #10 valida SHA, commits, paths y tests del diff; la evidencia no afirma merge.
- Se sustituyeron frases de dependencias que aparentaban estar ya cerradas por condiciones futuras de prerrequisito.
- El dry-run cruza manifiesto, SUMMARY, matriz, issues, aprobaciones, ledger y documentos de soporte; valida asignaciones, grafo, contratos y cuerpos idénticos. Las pruebas negativas se hacen en memoria y dejan el manifiesto intacto.
- La revisión de seguridad del paquete público no encontró secretos ni rutas locales en sus 16 archivos.


## Hallazgo de despliegue Oracle — FALTA_ISSUE

INFRA #8/PR #9 reutiliza CD, no autoriza activar la demo; DEPLOY-BACK-01 prepara sin desplegar; SHARED-BACK-05 valida después. Se agrega DEPLOY-BACK-02 para autorización, readiness, smoke y rollback, limitado al allowlist vigente y sin duplicar pipelines. Un servicio no habilitado se excluye y no bloquea el subconjunto autorizado. La ejecución sigue sin autorizarse en este paquete.


## Trazabilidad complementaria INT-ASAP

Se añadió `BACK_HITO3_INT_ASAP_TRAZABILIDAD.md` para #19–#33. No cambia el total de 82 borradores ni sus estados. Las referencias abiertas no acreditan código; crédito futuro requiere evidencia exacta. Quedan documentados gates específicos, independencia del desarrollo local y colisión de ownership/código en apps/api-gateway.


## Fase 2 — responsables y prepublicación (2026-10-16)

- Se formalizaron exactamente siete asignaciones aprobadas por Marco Castilla en [BACK_HITO3_APROBACION_RESPONSABLES.md](BACK_HITO3_APROBACION_RESPONSABLES.md), referencia `APPROVAL-BACK-HITO3-OWNERS-20261016`.
- Los responsables se sincronizaron desde el manifiesto en matriz e issues; se conservaron `code_repository`, objetivos, operaciones, dependencias, criterios y ownership de los ocho servicios/Gateway.
- Conteos finales derivados del manifiesto: Marco 21, Gabriel 11, Axel 14, Leonardo López 9, Leonardo Vera 18, Miguel 9 y OWNER_PENDIENTE 0; total 82.
- `publication_authorized=false`, `publication_started=false`, `authorized=false` y `records=[]` se mantienen.
- Se reejecutó el escaneo sobre los 16 archivos del paquete; ver fecha, patrón y resultado exacto en `review_metadata.secret_scan` y `SUMMARY`.
- El validador compara los IDs BACK en la celda de su fila INT-ASAP exacta, y una prueba negativa mueve referencias entre filas.
