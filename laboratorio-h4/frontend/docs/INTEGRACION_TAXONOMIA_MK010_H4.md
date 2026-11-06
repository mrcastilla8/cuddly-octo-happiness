# Integración de lectura MK-010 H4

Revisión iniciada desde Frontend `origin/master` en `4428008a4ada21dc75c6f340192fa16a2bb2d685`. Docs consultado en `cb7eec179f812d38929e20c5ab6f7a77139c4090`; Backend `origin/master` consultado en `5abfffc9b86306df87d19695817aa678588e0341`.

## Operaciones y compatibilidad

| Operación | Ruta | OpenAPI / seguridad | Decisión |
|---|---|---|---|
| `obtenerTipoProducto` | `GET /api/v1/tipos-producto/{tipoProductoId}` | `TipoProductoAdmin`; `userBearer`; `x-status: provisional-internal`; 401/403/404/500/503 | Provider implementado, pero no integrar ni habilitar en modo API hasta homologar el estado contractual. El detalle administrativo existente sigue siendo mock; ninguna escritura se abre. |
| `obtenerEsquemaTipoProducto` | `GET /api/v1/tipos-producto/{tipoProductoId}/caracteristicas` | `EsquemaTipoProducto`; `userBearer`; `x-status: stable`; 200/401/403/404/500/503 | Adapter tipado de solo lectura y pantalla `/tipos-producto/:id/esquema`. `schemaVersion` respeta `minimum: 0`; estados aceptados son solo `ACTIVO`/`INACTIVO`. |

La pantalla usa el transporte autenticado que comparte el runtime de Taxonomía con la sesión humana G7 de Promotions. El navegador no guarda credenciales M2M ni secretos; el bearer está en memoria. El transporte solo permite GET, renueva la sesión una vez ante `401 TOKEN_INVALIDO`, y no repite otros errores. El adapter aplica timeout, señal de cancelación, validación de respuesta y errores HTTP explícitos. No cae a mocks en modo API.

## Estado independiente por capa

- **Código frontend:** adapter de listado existente y adapter de esquema añadidos; el detalle separado sigue bloqueado. La ruta del esquema solo se habilita si existe el transporte API; el listado API enlaza al esquema read-only. En mock, la vista de esquema lee el repositorio mock y la vista anterior de detalle y sus escrituras permanecen intactas.
- **Contrato:** esquema estable en OpenAPI. El detalle separado conserva `provisional-internal`.
- **Backend/provider:** en SHA `5abfffc`, `TaxonomyMastersController` implementa ambas rutas GET y `ProductTypeService` resuelve tipo/esquema contra PostgreSQL. `TaxonomyUserGuard` protege el controlador y permite usuario humano autenticado; el servicio de Catálogo se habilita solo para las lecturas explícitamente marcadas, con `catalogo:leer`. El provider que puede exigir/verificar DB está implementado, pero no fue levantado en este turno y no se afirma despliegue ni E2E real.
- **Gateway, grants y JWT:** no se probó Gateway real, grant de permisos ni JWT emitido por G7. El contrato declara `userBearer` y `SCOPE_INSUFICIENTE`; no se inventó un scope granular.
- **E2E local:** no ejecutado. El repositorio contiene harnesses aislados de Taxonomy y Gateway, pero no un runner que levante la cadena autenticada Frontend → Gateway → Taxonomy junto con un emisor G7 local; no se levantaron infraestructura ni credenciales para no tratar una prueba parcial como E2E autenticado. No se usaron Supabase ni servicios compartidos.
- **Homologación/despliegue:** pendientes; no se infieren de OpenAPI, adapter o pruebas de transporte simuladas.

## Dependencias para desbloqueo

- **Backend / Leonardo López:** no bloquea la implementación del provider (presente en `5abfffc`); la evidencia de despliegue por Gateway con PostgreSQL aislado y JWT humano válido desbloquea integración autenticada de extremo a extremo.
- **Docs / owners Backend y Catálogo:** homologar `GET /api/v1/tipos-producto/{tipoProductoId}` antes de habilitar el detalle separado; condición: cambiar verificablemente su estado contractual a compatible/stable con DTO y errores aprobados.
- **Seguridad / G7:** emitir JWT humano con grants para la operación y verificar 401/403 positivos y negativos; condición: evidencia de sesión G7 y autorización efectiva por Gateway. El scope exacto se toma del grant aprobado, no se define en Frontend.
- **Backend y Docs:** resolver la discrepancia del GET de esquema: el provider incluye `PENDING_DEACTIVATION` y `ProductTypeService` exige versión ≥1, mientras OpenAPI define estados `ACTIVO|INACTIVO` y `schemaVersion minimum: 0`. Hasta homologación, el adapter rechaza el estado no publicado y acepta 0 conforme al OpenAPI; no se cambia el contrato desde Frontend.
