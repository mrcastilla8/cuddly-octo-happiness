# Diferencias antes/después — corrección y auditoría final

## Cambios de cantidad

- Antes: 81 borradores; después: 81. Se mantienen 80, se elimina 1 y se agrega 1. No se fusiona ni divide ningún issue de servicio.
- Eliminado SHARED-BACK-02: INFRA #1 ya cubre conexión, SSL, env/seed runner y control de acceso; health/config quedan en BACK-01 y Drizzle en BACK-02 por servicio.
- Agregado SHARED-BACK-05: smoke/aceptación transversal final, posterior a los ocho BACK-09. Esto separa el harness de feature del cierre integrado y rompe la dependencia circular.
- SHARED-BACK-03 cambia de E2E final a preparación del harness frontend antes de BACK-09. Su única salida de repositorio es Frontend; no exige cambios Backend.
- SHARED-BACK-04 queda como índice de cobertura MK→pantallas→operationIds→adapter→pruebas, independiente de la ejecución final.

## Cambios de calidad

| Antes | Después |
|---|---|
| Objetivo y alcance repetían texto funcional | Objetivo expresa resultado y Alcance lista tareas/operationIds distintos |
| Invariantes de dominio copiadas en BACK-01..09 | Reglas ubicadas en BACK-03; BACK-01 trata configuración/health/readiness |
| Status podía derivarse de scaffold o texto libre | Los 81 usan estados permitidos; endpoints mock no cuentan como API |
| Dependencias en cadenas de texto | depends_on y blocks usan IDs; issues externos en external_dependencies; autorizaciones pendientes en blocking_conditions |
| Cuerpo genérico en BACK-04/05/06/08 | Operaciones concretas de OpenAPI/AsyncAPI y mappings MK/pages/adapters |
| Inventory resumido por PR #10 | Cada BACK-01..09 indica commit abreviado, archivos y pruebas; PR abierto permanece sin validar/fusionar |
| Riesgo Supabase afirmaba exposición pública general | Se separan RLS y las otras cuatro capas sin afirmar exposición efectiva |
| Pruebas E2E costosas o ambiguas | Unit/contract focalizadas; Chromium/worker 1 local; suite completa CI/cierre; E2E exige React→Gateway real sin mocks |
| Sin dry-run ni ledger | Se añade validador offline y plantilla ledger, sin integración de publicación |

## Estado posterior

81 issues: 56 NO_INICIADO, 16 PARCIAL, 2 IMPLEMENTADO_SIN_VALIDAR y 1 BLOQUEADO_ESPECÍFICO; 0 IMPLEMENTADO_VALIDADO. Las dos piezas de Inventory con código en PR abierto se clasifican IMPLEMENTADO_SIN_VALIDAR; el resto se reporta con alcance faltante.

Sin publicación, escritura GitHub, edición de repositorios, ejecución SQL, cambio de credenciales ni despliegue.


## Dependencias y mensajería afinadas

- Se mapearon como prerrequisitos obligatorios los servicios G6 que deben estar listos antes de ejecutar cada BACK-09 de integración; el detalle por issue está en la matriz y el grafo.
- Se agregaron seis conjuntos de dependencias condicionales de operación en BACK-08 (Taxonomía, Catálogo, Pricing, Promociones, Combos y Bulk). Solo condicionan los flujos nombrados; las otras operaciones siguen avanzando de forma independiente.
- Catalog BACK-06 ahora distingue la publicación de pricing.product.initialization.requested e inventory.sku.initialization.requested de los resultados de inicialización que consume, conforme a AsyncAPI RC2.
- El dry-run valida ciclos, referencias e inversas sobre dependencias obligatorias más condicionales.
