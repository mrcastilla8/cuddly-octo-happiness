# Preparación de autenticación reversible para Bulk H4

## Estado actual en Frontend

En `VITE_DATA_MODE=api`, Bulk selecciona exclusivamente `HttpBulkRepository`. Este llama `G7Session.getAccessToken()` antes de cada operación y envía `Authorization: Bearer …`; si no hay sesión o token, falla con error de configuración. No existe una ruta anónima ni un fallback al repositorio mock. Por eso el frontend actual no puede usar Bulk sin G7, aunque Gateway y `bulk-svc` estén configurados en `RESTRICTED_DEMO`: la solicitud ni siquiera se emite sin el token. Un token falso tampoco es una adaptación segura.

Esto coincide con el estado de Backend #144: demo deshabilitada por defecto, excepciones solo para operaciones explícitamente permitidas y controles de Gateway/servicio conservados. La política H4 prohíbe asumir que `RESTRICTED_DEMO` implica acceso público o que un flag por sí solo prueba el aislamiento.

## Adaptación reversible propuesta

Mantener `VITE_DATA_MODE=api` y el mismo `BulkRepository`, e inyectar en el transporte HTTP una política de autorización seleccionada explícitamente entre sesión G7 y modo restringido de demo. La opción de demo debe permanecer desactivada por defecto; solo tras acordar con el owner transversal el nombre/semántica del flag, se habilitaría en una configuración local de demostración. En modo demo el transporte omitiría `Authorization` sin fabricar identidad ni token; el camino G7 seguiría intacto y sería el valor predeterminado. Retirar la configuración volvería de forma inmediata al camino autenticado.

Este PR no implementa ni activa esa opción porque #144 exige no inventar un flag transversal y la evidencia de aislamiento debe venir del entorno. Antes de habilitarla se requiere:

- Gateway y servicio en un perímetro privado no accesible desde Internet, con allowlist/red de entrada y rutas/métodos Bulk explícitamente acotados.
- Configuración `RESTRICTED_DEMO` validada en ambos lados, apagada por defecto, con controles de negocio, límites, trazabilidad de actor técnico de demo y persistencia conservados.
- CORS del Gateway limitado al origen exacto del frontend de demo, métodos y headers requeridos (`Content-Type`, `X-Correlation-Id`), y exposición de `Content-Disposition` para descargas. CORS no sustituye autenticación ni perímetro.
- Evidencia operativa de que acceso directo externo y rutas/métodos no permitidos se deniegan, más prueba de regresión del camino JWT real.

La fase sin G7 queda `BLOQUEADO_ESPECÍFICO` hasta que Gateway/servicio y el entorno aporten esas condiciones y el owner apruebe la configuración. Este documento no acredita backend implementado, despliegue, aislamiento ni integración real.
