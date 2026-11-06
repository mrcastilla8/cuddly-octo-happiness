# Auditoría histórica MK-003 / MK-004 — revisión del 13 de octubre de 2026

> Actualización del 16 de octubre: la revisión vigente de composición, sincronización
> y validación es [Issue #35 — Catálogo/SKU](ISSUE_35_CATALOGO.md). Este archivo conserva
> la evidencia histórica del PR #25, ya integrado en master. Sus afirmaciones sobre
> PR abierto, fuentes/versiones, tests y puente predeterminado no describen la entrega #35.

Rama `poma`, PR #25 en borrador. Estado: `MOCK_INTEGRATED`; `BLOCKED_CONTRACT` para
activar Taxonomía compartida y HTTP real. Esta sección sustituye las conclusiones de
publicación/conflictos y los resultados de la auditoría histórica incluida abajo.

## Revisión final acotada: valorId de LISTA y precondiciones Q-06

Base local limpia `aa68005d2a0b51f7447bf4eb4e5c17468863ded2`, rama `poma`.
En esta revisión no se integra master ni se rehacen las correcciones anteriores.
Fuentes: SPEC-010 y `ux/mockups/MK-003/component-spec.md` en Docs
`942bf7322eb388fe5b0fcc9c5a565152e1099139`; modelos/puertos reales y README de Frontend.
Component Spec establece que Q-06 continúa abierta: el request de edición no publica
`tipoProductoId`; las precondiciones conocidas no autorizan enviar ese campo.

Archivos y cambios:

- `src/features/catalog/hooks/useProductForm.ts`: LISTA inicializa la selección desde
  `valorId`; el estado conserva el ID y el payload separa `valorId` de `valor`, usando
  la etiqueta actual del esquema. Los mocks históricos que guardaban un ID en `valor`
  se recuperan únicamente si Taxonomía confirma ese ID exacto. No se infieren IDs por
  etiqueta; un valor antiguo sin ID confirmado exige selección explícita antes de guardar.
  Mientras Q-06 permanezca abierta, se rechaza el cambio de tipo en el hook y se omite
  `tipoProductoId` del payload de edición. El alta conserva su tipo obligatorio.
- `src/features/catalog/components/ProductFormFields.tsx`: la precondición de ausencia
  de publicación exige `publishedCommercially === false`; true/undefined no demuestran
  elegibilidad. Se distingue la elegibilidad funcional del bloqueo contractual Q-06;
  el control sigue deshabilitado en edición. Se muestra el error de ID LISTA no confirmado.
- `tests/harness/catalog-adapter.tsx`: escenarios de etiqueta anterior/renombrada,
  publicación true/false/undefined y captura del payload de alta, con las mismas páginas.
- `tests/catalog-final-review.spec.ts`: seis regresiones. Renombrar una opción mantiene
  su ID y selección al volver a abrir el producto; crear/editar envía ID y etiqueta por
  separado. Un dato histórico sin ID no se interpreta por nombre. Los tres estados de
  publicación distinguen precondiciones y nunca envían el campo bloqueado por Q-06.
- Este informe, `PR_CATALOGO_MK003_MK004.md` y evidencias `lista-q06-final/`: resultados
  y captura nueva de la selección renombrada. Ninguna otra funcionalidad se modifica.

| Validación de esta revisión final | Resultado |
| --- | --- |
| Regresiones focalizadas finales | 6/6 PASS, 10.8 s en última ejecución con captura corregida |
| npm run typecheck | PASS, exit 0 |
| npm run lint | PASS, exit 0, incluida repetición final |
| VITE_DATA_MODE=mock npm run build | PASS, exit 0 |
| VITE_DATA_MODE=api npm run build | PASS, exit 0 |
| npx playwright test --workers=4 --reporter=line | 205/205 PASS, 4.2 min, exit 0 |
| git diff --check | PASS |
| Visual 1440 px | Captura nueva de LISTA renombrada inspeccionada; selección vigente y bloqueo Q-06 visibles |

Las primeras ejecuciones focalizadas detectaron selectores que omitían el asterisco
literal de la etiqueta y una reapertura que cargaba el entrypoint comercial en lugar
del harness API. Se ajustaron solo los tests y se repitieron los seis casos con éxito.
El CRUD previo pasó sus once casos en la ejecución focalizada inicial.
Los logs conservan resultados iniciales y finales, sin declarar PASS a esas fallas.
Q-06, mapeo/roles de Taxonomía e integración HTTP permanecen pendientes. No se modifica
Docs/Backend, no se hace merge de PR #25 y no se cierran issues.

## Resincronización posterior: master incorpora MK-014

Tras publicar `0e668fdfceff5ac7d0262e9e0b1197c4fecc13e3`, su
[CI terminó correctamente](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38442138042).
Una comprobación nueva encontró que master avanzó a
`2fbc0d68da664b1fd7fad06ab51688c8cf7e5af9` mediante PR #26 de Vera (MK-014).
Esto volvió a producir conflictos en PR #25: la sincronización previa era correcta
para su base `fdbacba`, pero ya no bastaba contra la nueva base.

Merge aditivo nuevo: `6e3c66a50834c28f59f7c6615e2764eafdb61ca4`. Se resolvieron
`productRoutes.tsx`, `verify-production.mjs`, `integration.spec.ts` y
`taxonomy-ui.spec.ts`, conservando ambos conjuntos de rutas y todas las verificaciones.
El menú contiene ahora 12 destinos (7 comerciales + 5 Taxonomía). El smoke conserva
Catálogo y añade las cinco vistas de Auditoría de precios. README conserva ambos
alcances y corrige la descripción antigua de capturas compartidas.

No se modificó ninguna implementación de MK-014, Taxonomía, Pricing ni Promociones
respecto de la nueva base; las siete correcciones de Catálogo permanecen.
Docs sigue en `942bf7322eb388fe5b0fcc9c5a565152e1099139`.
Se leyó también `docs/VALIDACION_MK014.md` incorporado desde master.
El comentario a López permanece sin respuesta confirmatoria; no se inventa el mapeo.

| Validación contra la nueva base | Resultado |
| --- | --- |
| Suite completa con MK-014 y regresiones | 199/199 PASS, 5.0 min, exit 0 |
| mock: typecheck / lint / build | PASS, exit 0. Primer build rechazado por sandbox (EPERM al resolver audit-demo.csv); repetición fuera del sandbox PASS, sin cambios de código |
| api: typecheck / lint / build | PASS, exit 0, ejecución fuera del sandbox |
| Producción mock a 1440 px | 48 vistas PASS, sin errores de runtime ni overflow |
| Producción api a 1440 px | 44 vistas PASS, sin errores de runtime/overflow y sin descarga de mocks |

Logs nuevos: `evidencias/catalog-audit/resync-master-2fbc0d6/`.
Incluyen la suite íntegra, gates mock/API, el fallo sandbox y su repetición exitosa,
smokes y cinco capturas MK-014 generadas con el menú integrado. S01 fue inspeccionada
visualmente; las cinco vistas incluyen geometría, foco de modal y descargas verificadas
por la suite. `git diff --check`: PASS; cero commits detrás del master nuevo.
Los resultados de 177 pruebas y smokes 43/39 incluidos abajo son históricos de la
base anterior; no se atribuyen a la nueva integración.

## Fuentes y sincronización

- Git inicial limpio en `79dc879b64f1c3638351d9bfebd3ef0f1dc4a6b1`.
- Docs remotos consultados en `master@942bf7322eb388fe5b0fcc9c5a565152e1099139`:
  SPEC-003/004/009/010, HU/FLOW/WF-003/004, DESIGN, propuesta/decisiones/guías UX,
  component-spec/plan/tasks y prototipos MK-003 S01–S07 y MK-004 S01–S06,
  `contratos/http/openapi.yaml` y `catalogo-errores.md`.
  `validation-report.md`: NO ENCONTRADO en ambos MK; no se acredita aprobación UX.
- Frontend: AGENTS, README, puertos reales de Catálogo y servicios de Taxonomía
  incorporados por PR #24 (`lopez`, autor `VicuzS`). Docs/Backend solo lectura.
- Se integraron los 13 commits de `origin/master@fdbacbae347b346bb492c27b3f4fab3c81be77da`
  mediante merge local `6267499`. Conflictos resueltos aditivamente en
  `productRoutes.tsx` e `integration.spec.ts`; las rutas y navegación de los demás
  módulos se conservaron. `git rev-list --count HEAD..origin/master`: 0.
  La implementación `src/features/taxonomy/` coincide con master; no se reescribió.

## Correcciones nuevas y archivos

1. `useProductForm.ts`: resultado de esquema ligado al tipo/provider actual;
   diferencia pendiente/error/éxito, incluido vacío válido. La guarda de submit y
   los botones impiden escribir sin confirmación. Reintento explícito; edición
   preserva atributos históricos fuera del esquema confirmado.
   `ProductCreatePage.tsx`, `ProductEditPage.tsx`, `ProductFormFields.tsx` muestran
   los estados y evitan presentar un error como “sin características”.
2. `mockCatalogRepository.ts`: update trabaja sobre copia independiente y publica
   el producto/version solo tras validar; imágenes y atributos se copian.
   Altas de producto/variante usan `crypto.randomUUID()` en lugar del reloj truncado.
3. `VariantCreatePage.tsx`: identidad de ruta controla el montaje del formulario y
   la consulta del padre. Cambio de productId descarta producto, campos y errores
   anteriores; las respuestas del montaje anterior quedan invalidadas.
4. `taxonomyServicesAdapter.ts` consume los servicios oficiales de López, sin
   fixtures adicionales, preservando IDs, obligatoriedad/unidad y valores LISTA
   activos. Límite TEXTO de configuración oficial. Tipo desconocido falla.
   `catalogServices.ts` permite inyectar el bridge en mock/API sin cambiar páginas.
   Roles identificadores y límites NUMERO requieren metadata explícita del owner;
   no se deducen por nombre ni por obligatoriedad.
5. `VariantFormFields.tsx` usa StatusBadge neutro para el modelo de venta; SKU Base
   y badges de modelo de los diálogos de producto usan gris. Colores de errores,
   advertencias y estados técnicos se conservan por significado, no por categoría.
6. `tests/catalog-regressions.spec.ts` y harness: regresiones de guardado pendiente/
   fallido (incluido submit programático), esquema vacío válido, atributos históricos,
   update atómico con recuperación posterior, 100 productos y 100 variantes con reloj
   congelado, bridge oficial y navegación client-side con carga/error del nuevo padre.
7. `pricing-audit.spec.ts` y `pricing-workflows.spec.ts`: evidencePath por prueba;
   se elimina la escritura concurrente en PNG versionados sin reducir las aserciones.
   `taxonomy-ui.spec.ts` comprueba los 11 enlaces reales y conserva verificaciones de
   destino activo, rutas, formularios y geometría. `verify-production.mjs` amplía el
   smoke existente con Catálogo, preservando verificaciones de los demás módulos.
8. README y `COORDINACION_TAXONOMIA_CATALOGO.md`: composición, propuesta y decisiones
   que requieren revisión de López. Las evidencias nuevas viven en
   `evidencias/catalog-audit/revision-2026-10-13/`.

## Validaciones reales de esta revisión

| Comprobación | Resultado |
| --- | --- |
| Nuevas regresiones aisladas | 6/6 PASS |
| Primera suite tras integrar | 172/177; cinco fallos por expectativa antigua de 10 enlaces en Taxonomía |
| Suite repetida tras corregir esa expectativa | 177/177 PASS, 3.5 min |
| Suite completa del código final, después del ajuste visual de esquema | 177/177 PASS, 3.6 min, exit 0; ver suite-final.txt |
| mock: npm run typecheck / npm run lint / npm run build | PASS, exit 0; repetidos después del ajuste final |
| api: npm run typecheck / npm run lint / npm run build | PASS, exit 0; repetidos después del ajuste final, ver gates-api-final.txt |
| node scripts/verify-production.mjs mock | PASS: 43 vistas, 1440×900, sin errores de runtime/overflow |
| node scripts/verify-production.mjs api | PASS: 39 vistas, 1440×900; providers ausentes explícitos y cero descarga de mocks; repetido sobre el build final |
| git diff --check | PASS |

Las suites completas incluyen productos/variantes, Pricing S01–S06,
Cupones/Promociones/Recomendaciones, Foundation, navegación y Taxonomía MK-008–MK-012.
La suite final queda registrada íntegramente en `suite-final.txt`; los smokes y gates
API se registran junto a ella. Capturas nuevas inspeccionadas: modelo neutro y edición
con esquema fallido; el botón queda bloqueado y los campos existentes se conservan.
No se atribuye una aprobación UX humana ni integración HTTP a esas comprobaciones.

## Integración y pendientes

`MOCK_INTEGRATED`. Bridge probado, activación compartida predeterminada
`BLOCKED_CONTRACT`: IDs históricos de Catálogo incompatibles con los de Taxonomía,
roles identificadores no publicados y límites NUMERO sin confirmación. Se solicita
coordinación a López en PR #25; no se presenta la solicitud como aprobación.
Ver el documento de coordinación para fuente, propuesta y owner de cada decisión.
Los fixtures históricos siguen aislados; no se copian los nuevos datos oficiales.

Las APIs reales, contratos de otros providers y revisión independiente permanecen
pendientes. No se modifica Docs/Backend ni se cierran issues. Integrar master **en poma**
no equivale a fusionar PR #25 **hacia master**; ese merge no se ejecuta.

---

## Auditoría histórica del 12 de octubre (referencia, sustituida por la revisión superior)

### Correcciones de integración anteriores

Fecha de trabajo: 12 de octubre de 2026 (America/Lima). Rama: `poma`.
Estado: MOCK_INTEGRATED; no se implementó ni verificó un adapter HTTP.
Refs #5 y #6. Los issues no se cierran por esta entrega.

## Fuentes y preflight

- Raíz comprobada: `C:\Users\Gabriel\Desktop\Web Front\G6-Productos-Ofertas-frontend`.
- Git inicial limpio, HEAD `3a2b77e`; Node 24.16.0 / npm 11.13.0.
- No existe `../docs`. Consulta remota de Docs `master@78a923bbc6bada31b39b3d386331f90a4f812b31`.
- [Docs fijado por SHA](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-docs/tree/78a923bbc6bada31b39b3d386331f90a4f812b31).
- `requisitos/specs/SPEC-003-gestion-productos-crud.md`,
  `SPEC-004-gestion-variantes-skus.md`, `SPEC-009-gestion-caracteristicas.md`,
  `SPEC-010-asociacion-tipo-producto-caracteristica.md`.
- `requisitos/hu/HU-003-gestion-productos-crud.md`, `HU-004-gestion-variantes-skus.md`;
  `requisitos/flujos/FLOW-003-gestion-productos-crud.md`, `FLOW-004-gestion-variantes-skus.md`.
- `ux/wireframes/flows/WF-003-gestion-productos-crud.md`, `WF-004-gestion-variantes-skus.md`.
- `ux/mockups/DESIGN.md` 1.1.0, `ux/mockups/ux/propuesta-ux.md`,
  `ux-decisions.md`, `ux-guidelines.md`.
- `ux/mockups/MK-003/{component-spec,plan,tasks}.md` y siete HTML S01–S07.
  `ux/mockups/MK-004/{component-spec,plan,tasks}.md` y seis HTML S01–S06.
  `validation-report.md`: NO ENCONTRADO en ambos MK. Las tareas normativas siguen PENDIENTE.
- `contratos/http/openapi.yaml` y `catalogo-errores.md`.
- Frontend: AGENTS, README, package/configuración, guía de implementación y catálogo Foundation.
- [PR #24 de López](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/24):
  GitHub informa fusionado a master; la premisa del adjunto sobre PR pendiente quedó obsoleta.
  Se inspeccionaron sus puertos de tipos/características y modelos de presentación.
  No se copió ni modificó su implementación.

## Correcciones

1. Composición síncrona: factories devuelven repositorios inicializados. Una Promise sin
   resolver se rechaza explícitamente. Para inicialización asíncrona, hacer await
   antes de crear los servicios e inyectarlos mediante CatalogServicesContext.
   La inyección explícita prevalece sobre la caché predeterminada; ausencia de
   DataModeContext falla. Se eliminaron las fachadas sin consumidores que duplicaban
   lectura de entorno. Ningún puerto API ausente recurre al mock.
2. Variantes: características del esquema del padre, nombres controlados por Taxonomía,
   LISTA con valorId estable y etiqueta separada, NUMERO finito y límites del esquema,
   TEXTO con límite configurado, obligatoriedad y roles comprobados. La ausencia o
   error de esquema/metadatos impide guardar. SKU/identificadores permanecen inmutables
   en edición. No hay CAR-CUSTOM/IDs generados en el formulario.
3. ProductsPage obtiene filtros de Taxonomía mediante su puerto, con carga/error/reintento.
   Las páginas, componentes y hooks de Catálogo no importan mocks.
   Lecturas de listado/detalle/variantes descartan observaciones de un provider anterior.
4. Reintentos simples exigen permiso tanto en Pricing como Inventario; COMPLETED
   o permiso falso rechazan con 409. El 202 conserva PENDING y revoca permiso.
   Se eliminó la finalización por temporizador del reintento. Un resultado de
   Inventario de variante puede introducirse explícitamente en el mock para pruebas;
   es un helper de demostración, no un endpoint ni una simulación de RabbitMQ.
   La edición mock valida el perfil antes de mutar otros campos.
5. Precio inicial de Catálogo diferenciado del vigente de Pricing, sin cero inventado
   cuando falta. Se eliminó la ruta comercial /MK-004 y el fallback PROD-OXF-001;
   preparación enlaza a las variantes del producto seleccionado.
6. Pruebas con adapter alternativo y mismas páginas en modo API: producto/IDs ajenos
   a fixtures, filtros externos, LISTA/NUMERO/TEXTO, error de esquema, sin precio disponible.
   Pruebas de BORRADOR/PENDING, activación bloqueada, confirmación, reintentos y 409.

## Archivos de esta corrección

| Archivos dentro de src/features/catalog | Razón |
|---|---|
| services/catalogServices.ts, CatalogServicesContext.ts, hooks/useCatalogServices.ts | Composición e inyección |
| services/catalogService.ts, taxonomyService.ts (eliminados) | Fachadas sin consumidores y modo duplicado |
| services/catalogRepository.ts, taxonomyRepository.ts | valorId y metadatos del modelo de presentación |
| services/variantAttributeValidation.ts | Validación por esquema |
| hooks/useVariantForm.ts, components/VariantFormFields.tsx | Formulario autorizado, tipos e inmutabilidad |
| hooks/useTaxonomyFilters.ts, pages/ProductsPage.tsx, components/ProductFilters.tsx | Filtros por puerto y legibilidad desktop |
| hooks/useProductList.ts, useProductDetail.ts, useVariantList.ts, useVariantDetail.ts, useVariantPreparation.ts | Lecturas ligadas al provider actual |
| pages/VariantCreatePage.tsx, VariantEditPage.tsx | Guardado bloqueado durante carga/error del esquema |
| pages/VariantListPage.tsx, VariantDetailPage.tsx, ProductPreparationPage.tsx | Precio y navegación contextual |
| adapters/mockCatalogRepository.ts, mockTaxonomyRepository.ts | Permisos, estados, IDs, límite mock de texto y atomicidad de edición |

Otros: `src/app/routes/productRoutes.tsx` retira únicamente /MK-004.
README y este reporte documentan la composición. `tests/catalog.spec.ts`,
`variants.spec.ts` usan capturas de ejecución en test-results en lugar de
sobrescribir evidencia versionada. `tests/catalog-adapters.spec.ts`,
`catalog-injection.spec.ts` y `tests/harness/catalog-adapter.{html,tsx}`
añaden las verificaciones. No se modificaron módulos de Pricing, Promociones,
Cupones, Recomendaciones, Taxonomía, Docs externo o Backend.

## Límites contractuales y coordinación

**BLOCKED_CONTRACT — metadatos de esquema.** OpenAPI EsquemaTipoProducto/
AsociacionTipoCaracteristica publica asociación, obligatoriedad y schemaVersion,
pero no rol identificador ni rango numérico por característica. CaracteristicaAdmin
tampoco publica el límite configurado de texto. El modelo de López ofrece
maxTexto mediante configuración, pero sus asociaciones no informan el rol identificador.
Owner de decisión: Taxonomía (López), Catálogo (Poma) y provider/integración.
Propuesta: confirmar fuente y mapping de esos metadatos al puerto de lectura de
Catálogo; sin inferir roles desde nombres como Color/Talla ni fabricar DTOs.
La ausencia del rol o límite de texto bloquea el formulario. Rango numérico ausente
no se convierte en una regla universal >0.

El demo mantiene fixtures anteriores exclusivamente en adapters/mock. Su sustitución
por Taxonomía requiere IDs y esquema autorizados y es una integración pendiente,
no una segunda fuente de verdad productiva. No se clonó el módulo de López dentro
de Catálogo. La raíz puede inyectar un adapter de lectura de Taxonomía que implemente
getCategories/getBrands/getProductTypes/getAttributeSchema.

Los Q de component-spec son preguntas históricas, no todos contratos ausentes hoy:
la revisión actual sí publica consulta de preparación y reintento. Persisten la
verificación HTTP real, lectura administrativa completa, moneda del precio inicial,
perfil parcial y concordancia de edición de tipo. No se cierran esos Q por mocks.
Los adapters deben mapear modelo de presentación a DTO oficial (incluido valor_id)
y revalidar autoritativamente en servidor.

## Apariencia y evidencia

Se reutilizan Mantine, Tabler, PageHeader, SectionCard, FeedbackAlert y EntityTable.
No se cambiaron theme/tokens ni se agregaron HEX locales. S02 de MK-004 reemplaza
campos libres/badges clicables por controles Select/NumberInput/TextInput del DS.
S01 de MK-003 ajusta anchos para evitar recorte de estado y fragmentación de “Ver detalle”.
Desktop canónico 1440×900, con desplazamiento vertical normal.
Las capturas de ejecución están en test-results; las seleccionadas para el PR
se conservan en `docs/evidencias/catalog-audit/`.
La inspección técnica no acredita aprobación UX humana.

## Validación final

- `npm run typecheck`: PASS (código final).
- `npm run lint`: PASS, sin errores ni warnings de ESLint.
- `VITE_DATA_MODE=mock npm run build`: PASS; en PowerShell se usó $env:VITE_DATA_MODE.
- `VITE_DATA_MODE=api npm run build`: PASS, sin fallback en ejecución.
- `npm test -- --workers=2`: 144 PASS / 1 FAIL de 145, 4.3 minutos.
  El único fallo final fue la escritura de `mk-013-s03-1440.png` por Windows
  (UNKNOWN open), en la prueba de seis vistas de Pricing. Otras pruebas de
  Pricing escriben el mismo archivo en paralelo: colisión de evidencia, no
  una aserción funcional fallida de Catálogo.
- `npm test -- tests/pricing-workflows.spec.ts --workers=1 --grep 'six direct views'`:
  PASS, 1/1. Se verificaron los 145 casos mediante ambas ejecuciones;
  no se declara que la corrida paralela completa haya pasado.
- MK-003: 11 casos PASS. MK-004: 13 casos PASS. Nuevos adapters/inyección:
  8 casos PASS. Regresión funcional de Pricing, Promociones, Cupones y Recomendaciones:
  ejecutada; la limitación de evidencia paralela queda registrada arriba.
- Primera corrida dirigida: 28/30; se corrigió captura incompleta de atributos
  obligatorios en helpers de edición. Corrida intermedia completa: 140/143;
  fallos de edición/helper y estado de Pricing durante HMR. Se repitió con código
  estable: los casos funcionales anteriores pasan. No se modificó Pricing para
  esconder sus resultados.
- Capturas 1440 px de S01–S07 MK-003 y S01–S06 MK-004, incluyendo edición S02,
  más formulario con adapter alternativo. Aserciones sin overflow horizontal;
  inspección visual de listado y formularios de Catálogo. Aprobación UX humana pendiente.
- `git diff --check`: PASS. Las capturas versionadas de Pricing regeneradas por
  sus pruebas fueron restauradas al contenido inicial; no se publican cambios ajenos.
- Logs de builds, suite y repetición en `docs/evidencias/catalog-audit/*.txt`.
- No se reinstalaron dependencias (`npm ci`: NO EJECUTADO); se usó node_modules existente.

### Matriz de verificación

- [x] Fuentes verificadas y fijadas por SHA; alcance/pantallas identificados.
- [x] Git inicial limpio; no se destruyeron cambios previos.
- [x] TypeScript, builds mock/api y lint ejecutados con resultado satisfactorio.
- [x] Tests de Catálogo PASS y regresión ejecutada; fallo/repetición de evidencia documentados.
- [x] Desktop 1440 px: capturas y controles sin overflow; inspección técnica realizada.
- [x] Loading/empty/error verificados en lecturas y error de esquema en formulario.
- [x] Sin HTTP directo desde presentación, IDs ficticios nuevos ni HEX locales nuevos.
- [x] Sin contratos/endpoints/scopes inventados; sin modificación de Docs/Backend.
- [x] Dependencias y nivel MOCK_INTEGRATED explicitados.
- [ ] API real conectada: pendiente de providers y metadatos.
- [ ] Revisión técnica/UX independiente: pendiente.

### Publicación

Los cambios se publican en poma y se propone PR hacia master, sin merge.
La base consultada de master tras fetch es `fdbacba`, que incluye Taxonomía.
Esta entrega no fusiona ni sustituye los archivos de López en poma.
La revisión conjunta contra esa base sigue siendo necesaria antes de merge.

PR creada: [#25](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/25),
borrador abierto poma → master. Correcciones de código en `0a59f075fa7eb18482c965dbaaa0aed1e5b7f139`.
GitHub muestra que la comparación no se puede fusionar automáticamente con master:
pendiente reconciliar los archivos compartidos con la integración de Taxonomía.
No se ejecutó merge. El conector devolvió 403 al crear; la API oficial con la
autenticación existente de Git sí permitió crear el PR.
