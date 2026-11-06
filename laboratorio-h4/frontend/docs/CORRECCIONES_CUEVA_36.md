# Correcciones de Cueva — issues #7, #8, #9 y #36

Fecha: 16 de octubre de 2026, America/Lima. Rama existente: `cueva`.
Estado: **MOCK_INTEGRATED / MOCK_ONLY; revisión independiente pendiente**.

## Base, alcance y fuentes

- Raíz comprobada: `C:/Users/axel.cueva/Desktop/uni/G6-Productos-Ofertas-frontend`.
- `SOURCE_SHA` inicial: `1486482dbb164934e908d918526d2b7102ff0339`.
- `AUDIT_MASTER_SHA` / base de corrección: `2759c8d031b35e665432a9ca0f2a45c87943f072`.
- Git inicial limpio; `origin/cueva` coincidía con HEAD. Tras `git fetch origin`,
  `cueva...origin/master` dio 0 commits propios / 65 de master.
  `git merge --ff-only origin/master` avanzó la misma rama sin conflictos,
  reescritura de historia ni modificaciones a la rama local `master`.
- Las PR #22 y #23 ya estaban fusionadas. Sus resultados históricos no validan
  este cambio. Esta entrega no crea ramas adicionales.
- Docs oficial: `Taller-SW-Web/G6-Productos-Ofertas-docs`, `master` en
  `c36bd9a18f4fdb188df0d7e5158a431cf4b4ea7b`, consultado mediante GitHub.
  La copia local `../Productos-y-Ofertas-docs` tiene estructura anterior y no
  se usó como autoridad vigente. `../docs` no existe.
- Fuentes: `requisitos/specs/SPEC-005-gestion-cupones-descuento.md`,
  `SPEC-006-gestion-ofertas-promociones.md`, `SPEC-007-reglas-venta-cruzada-upselling.md`;
  HU/FLOW del mismo ID; `ux/wireframes/flows/WF-005/006/007-*`;
  `ux/mockups/ux/{propuesta-ux,ux-decisions,ux-guidelines}.md`;
  `ux/mockups/DESIGN.md` 1.1.0 y
  `ux/mockups/MK-005/006/007/{component-spec,plan,tasks}.md`.
- Inspeccionados los 19 HTML presentes: `mk_005_s01`–`s06`,
  `mk_006_s01`–`s06`, `mk_007_s01`–`s07`. Los tres
  `validation-report.md` siguen **NO ENCONTRADOS**; las aprobaciones documentales
  siguen pendientes. No se copiaron HTML ni se modificó Docs/Backend.
- Frontend: AGENTS, README, guía React, componentes Foundation, puertos y
  composición de Catálogo y Promociones, adapters, fixtures y suite real.
- Fuente del proveedor adicional: `requisitos/specs/SPEC-003-gestion-productos-crud.md`
  en el mismo SHA de Docs: `simple: sku_base = SKU vendible`; en padres con
  variantes, `sku_base` solo es identidad base. El adapter conserva esa distinción.
- Coordinación: #33 y #36. El puente de este PR pertenece al consumidor
  Promociones; no cambia interfaces ni implementaciones de Poma/López/Vera/Castilla.

## Hallazgos y reproducción

| ID | Severidad / estado | Reproducción, observado y esperado | Resolución / test |
|---|---|---|---|
| CUE-01 / CUE-04 | P1, REPRODUCIDO → CORREGIDO_Y_PROBADO localmente | Editar el nombre de `PROD-OXF-001` en `/productos/.../editar`; navegar por el menú a Promociones → Crear → Seleccionar alcance. Catálogo confirmó el cambio, pero el selector no mostró el nombre nuevo: seguía leyendo `catalogChoices.ts`. Se esperaba consultar el mismo estado de Productos/SKU. | `catalogPromotionRepository.ts` adapta los puertos existentes de Catálogo. Prueba E2E `CUE-01/CUE-04: editar en Catálogo actualiza el alcance de Promociones en la misma sesión` falló antes del cambio y pasó después. |
| CUE-02 | P1 de integración, sincronización realizada; auditoría funcional local | La comparación inicial confirmó los 65 commits de retraso. No era un fallo E2E de formularios. | Fast-forward a la base indicada. Se mantienen los módulos de master y se ejecutan sus regresiones junto con las de #7/#8/#9. |
| CUE-03 | P1 de compatibilidad; interfaces conservadas, revisión de owners pendiente | Riesgo de modificar fuentes/contratos compartidos. No se presentó como bug de concurrencia reproducido. | Adapter del consumidor, sin cambios a puertos de Catálogo/Taxonomía, main, rutas, navegación, config, CI, package, Pricing o Combos. Tests consumidor-proveedor con instancias aisladas. |
| CUE-05 (adicional) | P2, REPRODUCIDO → CORREGIDO_Y_PROBADO localmente | Leer BIENVENIDA15, editar su promoción a «Bienvenida actualizada» con fin 01/12/2026 y volver a consultar cupón/listado. Se obtenían el nombre anterior y fin 01/11/2026. MK-005 component-spec §9 exige nombre/vigencia desde PromocionAdmin. | La composición consulta la promoción actual en lecturas de cupones. No altera límites/usos. `MK-005/MK-006: nombre y vigencia del cupón se consultan desde la promoción vigente` falló antes y pasó después; E2E adicional en `promotions-catalog-integration.spec.ts`. |
| CUE-06 (gate de regresión) | P2 de prueba, temporización reproducida y sincronización corregida | La prueba existente `catalog.spec.ts` S01 falló en el gate completo; repetirla sin cambios dio 2 fallos y 1 pase. La dirección URL se actualizaba antes de terminar el render; seleccionar otro filtro o abrir el detalle podía usar la vista anterior. | Se agregaron esperas/aserciones por las filas de la búsqueda vacía y el modelo aplicado. Se conservaron todas las aserciones originales de URL, retorno y overflow; no se cambió código de Catálogo ni se introdujeron sleeps/retries. Tres repeticiones posteriores: PASS. Se conservan los logs de fallo y repetición; la suite completa se reejecuta sobre el test final. |

El commit de corrección se identifica por el commit que incorpora este reporte y
el diff de `cueva` frente a `AUDIT_MASTER_SHA`; la validación remota y el candidato
de merge solo podrán identificarse después de publicar el cambio.

## Implementación y límites de composición

`getPromotionRuntime("mock")` usa
`createCatalogMockPromotionServices(getCatalogServices("mock"))`.
El adapter solo consume `catalog.list`, `catalog.listVariants` y
`taxonomy.getCategories`. Recorre todas las páginas, conserva IDs y códigos SKU
opacos, incluye productos `ACTIVO` y variantes `ACTIVA`, y propaga errores y
cancelaciones. En productos simples, el puerto de Catálogo define `skuBase`
como SKU vendible; en padres con variantes no se publica ese código como SKU.
No se calcula disponibilidad, saldo, precio ni superioridad comercial.

Las referencias iniciales de campañas/reglas se fijan explícitamente al seed de
Catálogo: `PROD-OXF-001`, `PROD-CAS-001`, `CAS-COR-001`, `CAT-ROPA`.
No existe conversión de IDs antiguos, ni una segunda copia mutable de productos.
Los IDs administrativos de campañas/reglas/cupones se mantienen; los fixtures
aislados anteriores quedan para pruebas de puertos. No hay fallback a ellos
cuando el servicio compartido falla o una referencia deja de existir.

Los selectores consultan el estado actual al abrir el editor; un borrador que
conserve una referencia desactivada se rechaza al guardar. La lectura histórica
de campañas/reglas conserva la configuración y muestra una referencia no
disponible cuando corresponde; no borra ni sustituye productos automáticamente.
Recargar reinicia la demostración de todos estos repositorios en memoria.

En Cupones, las lecturas enriquecen nombre/vigencia desde Campañas; la consulta
de asociaciones e historial usa directamente el puerto de cupones para evitar
recursión. El historial no pierde activaciones/usos y la asociación sigue
bloqueando cambios de modalidad. API conserva sus puertos propios y
`CommercialModeGate`; no se selecciona el puente mock en modo API.

## Cobertura funcional y visual

- MK-005 S01–S06: listado, alta/edición, normalización/unicidad, promoción cupón,
  límites/uso desconocido, retorno/contexto, rechazo/incertidumbre y estado.
- MK-006 S01–S06: alta/edición, canales y descuento explícitos, alcance producto
  separado de SKU, selector/cancelación, historial y capacidad de modalidad.
- MK-007 S01–S07: tipos de alta distintos, origen producto/categoría,
  exclusión de origen/duplicados/inactivos, orden, criterio upsell explícito,
  justificación, borrador, errores y confirmación de estado con foco.
- Nuevas pruebas consumidor-proveedor: edición/activación/desactivación,
  paginación del proveedor, cancelación/error, rechazo de referencias antiguas,
  composición aislada por prueba, alta en borrador y SKU activado después de un
  resultado de preparación confirmado explícitamente en el mock de pruebas.
- Nuevas pruebas E2E: edición de producto → alcance; desactivación de variante y
  producto → selectores; edición de promoción → listado/detalle de cupón.
- Ningún escenario académico se presenta como HTTP, eventos, stock o consumo real.

La evidencia automatizada de las 19 vistas se genera en `test-results/` con
viewport 1440×900, comprobaciones de geometría, Oswald/Inter y foco en diálogos.
La evidencia de esta corrección se conserva en `docs/evidencias/cueva-20261016/`.

## Validaciones finales

Entorno: Windows, Node **22.23.3**, npm **11.19.0**, Chromium Playwright,
viewport **1440×900**, `VITE_DATA_MODE=mock` explícito para la suite.
Los ejecutables de TypeScript/ESLint/Playwright se invocaron con ese Node;
corresponden a los scripts reales de `package.json`. No se cambiaron dependencias.

| Gate | Comando equivalente | Resultado local / evidencia |
|---|---|---|
| Instalación | `npm ci --prefer-offline --fetch-retries=0 --fetch-timeout=20000` | PASS, 191 paquetes, `install.txt`; versión del runtime en `runtime.txt`. |
| Typecheck | `npm run typecheck` (`tsc --noEmit`) | PASS, exit 0, `typecheck.txt`. |
| Lint | `npm run lint` (`eslint .`) | PASS, exit 0, `lint.txt`; repetido tras sincronizar el test de Catálogo, exit 0. |
| Build mock | `VITE_DATA_MODE=mock npm run build` | PASS, `build-mock.txt`. |
| Build API | `VITE_DATA_MODE=api npm run build` | PASS, `build-api.txt`. |
| Producción mock | `node scripts/verify-production.mjs mock` | PASS, 48 vistas a 1440 px, cero errores; `production-mock.txt`. |
| Producción API | `node scripts/verify-production.mjs api` | PASS, 44 vistas, providers ausentes explícitos y cero carga de mocks/bundles en las rutas bloqueadas; `production-api.txt`. No acredita Bulk API ni integración HTTP real. |
| Smoke local | `node scripts/vercel-smoke.mjs http://127.0.0.1:5174` | PASS, cinco rutas + refresh y 39 recursos JS/CSS; `smoke-local.txt`. No se ejecutó contra un despliegue de este diff. |
| Suite completa inicial | `npm test -- --workers=2 --reporter=list` | 258 PASS / 1 FAIL en S01 de Catálogo; `playwright-initial.txt`. |
| Diagnóstico sin cambio | Mismo S01, `--repeat-each=3 --workers=1` | 1 PASS / 2 FAIL; `catalog-recheck.txt`, `catalog-initial-failure.md`. |
| Diagnóstico sincronizado | Mismo S01, `--repeat-each=3 --workers=1` | 3 PASS; `catalog-synchronized.txt`, sin retirar aserciones. |
| Suite completa final | `npm test -- --workers=2 --reporter=list` | PASS, 259 pruebas, cero fallos, 8.0 minutos, exit 0; `playwright-full.txt`. |
| Visual | `tests/promotions-visual.spec.ts` y nuevas integraciones | 19 vistas: ancho de página 1440 en viewport 1440×900, tipografía/foco/diálogos comprobados. 22 PNG + mediciones en `visual/`. Inspección visual de MK-005 S02/S04, MK-006 S03/S04, MK-007 S03/S07 y del cupón con promoción actualizada: sin recortes ni superposición de controles observados. |
| Git | `git diff --check` | PASS local. Master remoto se consultó nuevamente al finalizar y conserva `2759c8d031b35e665432a9ca0f2a45c87943f072`. El commit de entrega incorpora este reporte. |

Matriz de entrega:

- [x] Fuentes normativas y versión/SHA verificadas; 19 pantallas identificadas.
- [x] Estado Git inicial limpio, historia conservada e incorporación de master comprobada.
- [x] TypeScript, build mock/API y lint ejecutados con resultado PASS.
- [x] Suite completa final: 259 PASS, cero fallos, exit 0 (8.0 minutos).
- [x] Loading/empty/error, rechazo/conflicto/incertidumbre y conservación de borrador cubiertos por pruebas propias.
- [x] Revisión visual desktop 1440 px con evidencia; no equivale a aprobación UX.
- [x] Sin HTTP directo desde componentes, nuevos HEX ni tokens/estados/scopes inventados.
- [x] Docs/Backend sin modificaciones; dependencias de integración registradas.
- [x] Nivel declarado MOCK_INTEGRATED / MOCK_ONLY, sin API real ni VALIDATED.
- [ ] CI remota, revisión independiente, candidato de merge y despliegue de este diff: NO EJECUTADOS.

## Pendientes de revisión e integración

- Revisión de Poma del consumidor Catálogo/SKU y coordinación con López/Vera/
  Castilla para fuentes compartidas futuras; no se envían mensajes ni solicitudes
  en nombre del usuario sin autorización.
- Visto bueno UX de Vera y revisión técnica/funcional independiente. Una captura
  y una suite local no acreditan aprobación ni cierre de #7/#8/#9.
- Publicación autorizada, PR `cueva` → `master`, CI remota y revisión del candidato
  combinado. No declarar LISTO_PARA_MERGE antes de cumplir esos gates.
- El usuario autorizó publicar únicamente en su rama remota `cueva`, **sin crear
  PR**. El borrador local de descripción se conserva como documentación; no se
  abre PR, no se hace merge y no se cierran issues. En los logs de diagnóstico
  solo se retiraron espacios al final de línea para pasar `git diff --check`.
- Si master avanza: REVALIDACIÓN_OBLIGATORIA. Sin protección exigible, cola de
  merges coordinada por el responsable de #33. No se modifican reglas de GitHub.
- INT-04/05/06 de #33 y los pendientes de otros owners no se resuelven desde
  esta entrega. El puente Catálogo→Promociones no homologa el mock de Taxonomía
  ni conecta Pricing/Inventario/Combos.
- D-REC-01/02, providers administrativos HTTP, autenticación/permisos reales y
  persistencia comercial: BLOCKED_CONTRACT para integración real. El objetivo
  contractual 0.6.0-rc.1 de Docs no acredita una API ejecutable. No se implementan
  consumos/restituciones, checkout ni reglas de pago/stock.
- No hay merge a master ni validación de un despliegue de este diff.

## Archivos de esta corrección

- `src/features/promotions/adapters/catalogPromotionRepository.ts`: puente lector.
- `src/features/promotions/mocks/integratedFixtures.ts`: referencias iniciales.
- `src/features/promotions/services/promotionServices.ts`: composición integrada y
  nombre/vigencia vigente para Cupones; preserva modo global y factories API.
- `tests/promotions-catalog-{contract,integration}.spec.ts`: reproducción/regresión.
- `tests/{campaigns,recommendations,promotions-states}.spec.ts`: mismos casos con
  los productos del Catálogo compartido; activación por UI para tener varios
  candidatos sin introducir fixtures ajenos.
- `tests/catalog.spec.ts`: sincroniza la prueba S01 con los resultados visibles
  de los filtros, añadiendo comprobaciones sin retirar ninguna existente.
- `README.md`: funcionamiento del demo y selección de composición.
- Este reporte y evidencia: trazabilidad y resultados verificables.
- `docs/PR_CUEVA_36.md`: descripción de PR preparada para publicación autorizada.

**Estado de entrega: MOCK_INTEGRATED / MOCK_ONLY; cierre de issues pendiente de
revisión, publicación y aceptación de limitaciones.**
