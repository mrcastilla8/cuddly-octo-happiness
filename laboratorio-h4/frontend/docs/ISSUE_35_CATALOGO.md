# Issue #35 — Catálogo/SKU sobre master vigente

Fecha: 16 de octubre de 2026 (America/Lima). Rama de trabajo: `poma`.
Refs #35, #5, #6. No se cierra el issue ni se autoriza merge/despliegue.

## Base y alcance de la auditoría

- `SOURCE_SHA` inicial: `af80e5335ea4b948f578981f36ccb31bab9d94f1` (`poma` y `origin/poma`). Árbol limpio.
- `AUDIT_MASTER_SHA` / `BASE_SHA`: `2759c8d031b35e665432a9ca0f2a45c87943f072`.
- `git fetch origin`; comparación inicial: 0 commits propios y 33 pendientes frente a master.
- `git merge --ff-only origin/master`: aplicado en **poma**, sin conflictos ni nueva rama.
- El PR histórico #25 ya fue fusionado en master (`3871882`); no se presenta como PR abierto de esta entrega.
- Solo se modifica Frontend. No existe `../docs`; Docs se consulta remotamente, sin modificarlo ni Backend.

Fuentes oficiales fijadas en Docs **`master@c36bd9a18f4fdb188df0d7e5158a431cf4b4ea7b`**:

- `requisitos/specs/SPEC-003-gestion-productos-crud.md`, `SPEC-004-gestion-variantes-skus.md`, `SPEC-009-gestion-caracteristicas.md`, `SPEC-010-asociacion-tipo-producto-caracteristica.md`.
- `requisitos/hu/HU-003-gestion-productos-crud.md`, `HU-004-gestion-variantes-skus.md`.
- `requisitos/flujos/FLOW-003-gestion-productos-crud.md`, `FLOW-004-gestion-variantes-skus.md`.
- `ux/wireframes/flows/WF-003-gestion-productos-crud.md`, `WF-004-gestion-variantes-skus.md`.
- `ux/mockups/ux/propuesta-ux.md`, `ux-decisions.md`, `ux-guidelines.md` y `ux/mockups/DESIGN.md` (1.1.0).
- `ux/mockups/MK-003/{component-spec,plan,tasks}.md` y sus siete HTML `mk_003_s01.html`–`mk_003_s07.html`.
- `ux/mockups/MK-004/{component-spec,plan,tasks}.md` y sus seis HTML `mk_004_s01.html`–`mk_004_s06.html`.
- `validation-report.md`: **NO ENCONTRADO** para ambos MK; los documentos conservan estados pendientes/en revisión.
- `contratos/http/openapi.yaml`, `catalogo-errores.md`. No se implementa HTTP ni mensajería desde el navegador.

## Hallazgos, reproducción y solución

Los logs iniciales se conservan en `evidencias/issue35/reproduccion-inicial.txt` y `reproduccion-consumidores.txt`. Los tests iniciales se ejecutaron antes de cambiar la lógica afectada. Una primera ejecución del test de marca usó `textbox` en lugar del `combobox` real: ese timeout fue un error del test, no evidencia del defecto. La repetición con el rol correcto sí comprobó la opción ausente.

| ID / severidad definitiva | Reproducción y observado | Esperado / corrección | Regresión |
|---|---|---|---|
| POM-01 / P1 | Crear «Marca transversal Poma» en `/marcas/nueva`; navegar desde el sidebar a `/productos/nuevo`; abrir Marca. La marca recién creada no existe en las opciones. | Consultar los servicios editables de Taxonomía. El mismo puerto se usa para resolver nombres al crear/editar/listar/leer productos; no se copian las etiquetas de una lista congelada. | `POM-01/POM-04: a brand created in the real app is selectable in Catalog`; `POM-01: create and rename masters preserve their IDs and refresh Catalog names`; recorrido real de categoría. |
| POM-02 / P1 | Crear producto con `skuBase=cam-oxf-bla-m`, ya usado por variante; crear variante con `sku=moch-ent-001`, ya usado por producto simple. Ambas llamadas se aceptaban. | Un espacio global de SKU, insensible a mayúsculas y sin reutilizar códigos reservados. La comprobación se realiza después de las lecturas asíncronas, antes de mutar. | `POM-02: product SKU cannot reuse an existing variant SKU`; `POM-02: variant SKU cannot reuse a simple product sellable SKU`. |
| POM-03 / P1 | Editar/desactivar un producto de Catálogo y consultar `listTargets` de Pricing: no aparece ese ID. Consultar el catálogo de Promociones: tampoco aparece el producto/SKU activo de Catálogo. | Proyecciones de lectura de la misma instancia de Catálogo. Pricing conserva IDs/SKU/estado y se actualiza por suscripción; Promociones usa el estado del padre y del hijo. No se fabrica precio vigente ni elegibilidad por canal. | `POM-03: Pricing reads the current Catalog identity and state`; `POM-03: Promotions preserves Catalog IDs/SKU and excludes inactive parent`; recorridos reales a Precios/Promociones. |
| POM-04 / P1 | La reproducción de marca anterior usa el entrypoint comercial, no un harness; confirma la ausencia de la composición efectiva. | `main.tsx` inyecta `CatalogServicesContext` y el runtime mock usa el puente compartido. API continúa usando adapters no disponibles sin cargar ese puente. | Mismos recorridos de app real, más `catalog-injection.spec.ts` y `catalog-regressions.spec.ts`. |

La creación/renombrado de categoría se verifica adicionalmente con los servicios oficiales y la app real después de la corrección; no se presenta como una reproducción E2E previa independiente.

La revisión de la implementación detectó además dos riesgos durante este trabajo,
documentados separadamente en `reproduccion-composicion.txt`: inyectar un puerto mock
de Taxonomía no gobernaba las escrituras del repositorio de Catálogo y una activación
que esperaba el esquema podía sobrescribir una baja concurrente. Se reprodujeron con
`POM-04: explicit mock Taxonomy injection also governs Catalog writes` y
`POM-02: asynchronous activation cannot overwrite a concurrent state change`, antes
de sus correcciones. La inyección ahora inicializa un repositorio aislado con el mismo
puerto para lectura/escritura; cachea la promesa para evitar dos instancias iniciales.
La activación comprueba cancelación y revisión del store después de esperar el esquema,
antes de modificar el estado. No se atribuyen estos dos riesgos a la base master inicial.

## Compatibilidad y fuente de cada identidad

`sharedMockTaxonomyRepository.ts` consume `createTaxonomyServicesAdapter(getTaxonomyServices("mock"))`. Las altas/ediciones de MK-008/011 viven únicamente en los servicios de Taxonomía. Los nombres se releen por **ID exacto**; si el provider oficial publica el mismo ID, tiene prioridad. Los tipos oficiales siempre consultan su esquema oficial: no se completan sus roles con características homónimas de fixtures.

Se conservan los registros históricos `CAT-*`, `BRD-*`, `TIP-*`, `CAR-*` como compatibilidad inmutable del demo anterior. **No constituyen una migración aprobada ni una segunda fuente editable.** No se equipara `CAT-ROPA` con `ropa`, `TIP-CAMISA` con `ropa`, ni una marca histórica con Nike/Adidas. Persisten esos IDs en los productos/SKU existentes y el demo continúa abriendo sus formularios. Cerrar la migración de esas referencias requiere decisión de López/Poma; no hay constancia de aprobación de ese mapeo en las fuentes actuales.

`mockCatalogConsumers.ts` proyecta el mismo Catálogo en puertos de lectura de Pricing y Promociones, con paginación de productos/variantes y cancelación. Catálogo es la fuente de identidad/estado de sus registros; Pricing conserva la autoridad de sus precios, Promociones la de sus reglas. Las lecturas de Promociones excluyen al padre inactivo y marcan no elegibles sus SKU, conservando el estado individual de la variante en Catálogo. Eso no acredita disponibilidad comercial para un canal concreto.

Los ejemplos históricos independientes de Vera/Cueva se conservan en sus fixtures sin editarlos ni emparejarlos por nombre. Una coincidencia de ID exacto cede a la lectura de Catálogo. Los productos nuevos de Catálogo no reciben precios ficticios: si Pricing no tiene registro, la UI muestra **«Sin precio aplicable»**. No se implementa el proceso asíncrono de inicialización ni se copia `priceInitial` como precio vigente.

Archivos compartidos afectados: `main.tsx`, los adapters mock de Pricing/Promociones y `PricingProvider`/runtime demo. Un único cambio de composición en esta rama; no hay modificaciones a rutas, navegación, CI, dependencias, Vercel o fixtures ajenos. La revisión de López/Vera/Cueva permanece pendiente; no se enviaron comentarios ni se atribuye su aprobación.

## Pantallas y rutas productivas verificables

| MK / vista | Ruta |
|---|---|
| 003-S01 | `/productos` |
| 003-S02 | `/productos/nuevo` |
| 003-S03 | `/productos/:productId/editar` |
| 003-S04 | `/productos/:productId` |
| 003-S05 | `/productos/:productId/activar` (diálogo del detalle, incluida reactivación según estado) |
| 003-S06 | `/productos/:productId/preparacion` |
| 003-S07 | `/productos/:productId/desactivar` (diálogo del detalle) |
| 004-S01 | `/productos/:productId/variantes` |
| 004-S02 | `/productos/:productId/variantes/nueva`, `/productos/:productId/variantes/:variantId/editar` |
| 004-S03 | `/productos/:productId/variantes/:variantId` |
| 004-S04 | `/productos/:productId/variantes/:variantId/preparacion` |
| 004-S05/S06 | diálogos abiertos por los botones del detalle de variante; sin ruta independiente en el router actual |

No se convierten las rutas de mockup `/MK003/SXX` o `/MK004/SXX` en rutas comerciales.

## Contratos y límites pendientes

- **BLOCKED_CONTRACT — roles de esquema oficial**: los puertos actuales de Taxonomía no publican rol identificador. Se verifica que sigue `undefined`; el formulario SKU bloquea el guardado, sin deducir rol desde obligatoriedad o nombres. La migración de tipos históricos requiere decisión del owner; este patch no la resuelve silenciosamente.
- **Q-06** sigue abierto: no se envía `tipoProductoId` en edición de producto. Se conserva la validación anterior.
- **D-CAT-01..06 / barcode**: SPEC-003/004 distinguen producto, variante, SKU y código de barras. La administración/cardinalidad/asociación siguen abiertas y no hay resolver conectado en este frontend. No se inventa un mock `barcode=sku` ni se declara probado HTTP de resolución. El control de unicidad corrige la ambigüedad del SKU vendible, sin afirmar integración de Retail.
- Precios vigentes, inicialización real y elegibilidad por canal no se derivan del estado `ACTIVO`. La consulta administrativa de Pricing puede incluir borradores/inactivos con su estado visible.
- En `api`, Catálogo/Taxonomía/Pricing no recurren al puente mock. La discrepancia histórica de Bulk en API es ajena a este issue y continúa documentada en README; los smokes no acreditan su corrección.
- Las escrituras siguen en memoria y se pierden al recargar. Refresh SPA confirma que las rutas cargan; no significa persistencia del borrador en Backend.

## Validación y publicación

Archivos de implementación y propósito:

| Ruta | Cambio |
|---|---|
| `src/main.tsx` | Provider explícito de Catálogo en la raíz. |
| `src/features/catalog/services/catalogServices.ts` | Selección única de adapters, puente compartido y escrituras con Taxonomía inyectada. |
| `src/features/catalog/adapters/sharedMockTaxonomyRepository.ts` | Lecturas oficiales editables y compatibilidad de IDs históricos sin inferir equivalencias. |
| `src/features/catalog/adapters/mockCatalogRepository.ts` | Maestros por puerto, nombres vigentes, SKU global, notificación de cambios y comprobación de concurrencia. |
| `src/features/catalog/adapters/mockCatalogConsumers.ts` | Proyecciones de lectura para consumidores de identidad/estado. |
| `src/features/catalog/components/ProductFormFields.tsx` | Opciones de maestros inactivos deshabilitadas. |
| `src/features/pricing/adapters/mockPricingRepository.ts` | Targets actuales de Catálogo sin inventar registros de precios. |
| `src/features/pricing/mocks/createDemoPricingRuntime.ts` | Suscripción al store de identidad del demo, conservando controles de revisión. |
| `src/features/pricing/components/PricingProvider.tsx` | Relectura del catálogo cuando cambia la revisión del provider. |
| `src/features/promotions/adapters/mockPromotionCatalogRepository.ts` | Productos/categorías leídos desde los puertos compartidos y exclusión por estado. |
| `tests/catalog-issue35.spec.ts` | Reproducciones y regresiones de los hallazgos, incluyendo recorridos de la app real. |
| `README.md`, este informe y `docs/evidencias/issue35/` | Estado actual, límites y evidencia trazable. |

Validación local sobre código estable, con Node **22.23.3**, después de incorporar master:

| Comprobación | Resultado / evidencia |
|---|---|
| Instalación del lockfile | PASS: `npm ci --prefer-offline --no-audit`, `npm-ci-supported-node22.txt`. |
| `npm run typecheck` | PASS, exit 0; `typecheck-final.txt`. |
| `npm run lint` | PASS, exit 0; `lint-final.txt`. |
| `npm test -- --workers=2 --reporter=line` | **261/261 PASS**, 8.6 min, exit 0; `suite-final-node22.txt`. Incluye 11 casos del issue. |
| `VITE_DATA_MODE=mock npm run build` | PASS, exit 0; `build-mock-final.txt`. |
| `VITE_DATA_MODE=api npm run build` | PASS, exit 0; `build-api-final.txt`. |
| Producción mock a 1440 px | PASS: 48 vistas, `production-mock-final.txt`; smoke de cinco rutas, refresh SPA y 38 recursos, `smoke-mock-final.txt`. |
| Recorridos inter-MK en el build mock | 3/3 PASS, `production-cross-feature-final.txt`; mismas pruebas del issue contra preview. |
| Smoke de ejecución API posterior al build | NO EJECUTADO: interrumpido antes de iniciarse. Se conservan las pruebas API aprobadas de la suite; no equivalen a este smoke. |
| `git diff --check` | PASS tras las correcciones. |
| Sincronización remota | Nuevo fetch después de la suite: master sigue en `2759c8d`; sin commits nuevos que incorporar. |

El ejecutable Node 22 se invocó explícitamente para npm y Playwright. La primera
invocación de `npm` mediante el wrapper de Windows todavía usó el Node 24 del sistema,
aunque PATH incluía Node 22, y emitió `EBADENGINE`; se conserva como
`npm-ci-system-wrapper.txt`. No se alteró el rango de engines para ocultarlo. La
instalación y los gates finales se repitieron con el ejecutable correcto.

Ejecuciones anteriores: las 26 regresiones dirigidas y luego los ocho primeros casos
del issue pasaron. Una prueba de recorrido usó «Volver al detalle» y «Gestión de precios»
en lugar de los enlaces reales «Ver detalle» y «Consultar precios»; se corrigió el test,
no la app, y se repitió. La primera suite exploratoria registró 249 PASS / 10 FAIL de
259 casos, con cuatro timeouts de Bulk y fallos posteriores de estados/formularios.
Durante esa corrida se incorporaron las dos correcciones adicionales y hubo HMR:
no se usa como evidencia de un árbol estable ni se atribuye cada fallo a una única
causa sin prueba. Se conserva íntegra en `suite-completa.txt`. La corrida final de
261 casos se hizo sin editar el código y pasó completa con dos workers, como CI.

El usuario autorizó publicar poma y abrir el PR, sin ampliar el alcance ni repetir
la suite. Se reutilizan las validaciones del código estable anterior; solo se completa
este registro. Estado: `MOCK_INTEGRATED`, integración HTTP no implementada. No se declara
`LISTO_PARA_MERGE`: requieren revisión el CI de HEAD, el smoke API pendiente y los acuerdos
de compatibilidad indicados. Si avanza `master`, se requiere nueva sincronización y revalidación.
