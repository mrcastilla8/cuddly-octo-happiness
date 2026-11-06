# Integración MK-003/MK-004 con Taxonomía — revisión requerida

> Estado del 16 de octubre: [issue #35](ISSUE_35_CATALOGO.md) activa lecturas de los
> servicios editables de Taxonomía en el demo integrado, preservando por separado los
> IDs históricos. Este informe registra la coordinación original; la migración de
> esos IDs y los roles identificadores oficiales siguen sin aprobación confirmada.
> No se debe interpretar la activación del puente como aprobación de ese mapeo.

Referencia: PR #25; integración de `master@fdbacbae347b346bb492c27b3f4fab3c81be77da`, incluido PR #24 de López.
Fuentes: Docs `master@942bf7322eb388fe5b0fcc9c5a565152e1099139`, SPEC-003/004/009/010 y OpenAPI; puertos `src/features/taxonomy/services/*Repository.ts`.

## Implementado

`createTaxonomyServicesAdapter(services, metadata?)` consume los repositorios oficiales de categorías, marcas, tipos y características. No incorpora nuevos fixtures ni rutas HTTP. Conserva IDs, obligatoriedad, unidad, valores LISTA activos y su `valorId`; el límite TEXTO se obtiene de `characteristic.list().config.maxTexto`. Tipos inexistentes y características/valores no disponibles producen error, no un esquema vacío.

La inyección `createCatalogServices(mode, { taxonomy: adapter })` permite reemplazar ese origen en mock o API sin cambiar páginas. La ausencia de metadatos identificadores mantiene bloqueado el formulario SKU. La selección global mock/API se conserva.

## Decisiones pendientes de López / owner de Taxonomía

| Dato | Observación comprobada | Decisión necesaria |
| --- | --- | --- |
| IDs existentes | Catálogo usa `TIP-CAMISA`/`CAR-COLOR`; Taxonomía publica `ropa`/`color`. | Confirmar migración o mapa explícito versionado. No se deduce equivalencia por nombre. |
| Roles | `ProductTypeAssociation` publica `obligatoria`, pero no rol identificador. | Publicar el rol por tipo y característica; obligatoriedad y rol no son equivalentes. |
| Límites NUMERO | Puertos actuales no publican mínimo/máximo. | Confirmar si existen límites por característica y cómo los entrega el provider. No imponer positividad universal. |
| Límites TEXTO/LISTA | `maxTexto` y `maxValoresLista` pertenecen al provider. | Confirmar que maxTexto aplica al valor de producto/SKU. maxValoresLista limita el catálogo de opciones, no el valor seleccionado. |
| Backend | Taxonomía API falla explícitamente sin adapter HTTP. | Owner implementa los puertos y confirma operaciones publicadas antes de activar API. |

El bridge está probado con los servicios de López. No se activa automáticamente sobre los productos históricos: hacerlo hoy asociaría IDs incompatibles y bloquearía su edición. Los fixtures históricos continúan aislados en el adapter de demostración; no son un contrato ni una copia de los nuevos datos oficiales. La aprobación del mapeo permite sustituir ese adapter en la raíz sin reescribir páginas.

Estado: `MOCK_INTEGRATED`; integración compartida predeterminada `BLOCKED_CONTRACT` por mapeo/roles. Solicitud de revisión en PR #25; una solicitud enviada no equivale a un acuerdo aprobado.
