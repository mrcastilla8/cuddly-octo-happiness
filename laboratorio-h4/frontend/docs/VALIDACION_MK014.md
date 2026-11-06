# MK-014 — Historial de auditoría de precios / issue #16

Actualizado **2026-10-13**, America/Bogota. Owner: Leonardo Vera Rodríguez. La entrega inicial está publicada en **vera@`6903d9ddd39be8a671a5909dd790a90614ca7161`**, [PR #26](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/26), abierta hacia `master`; base original `fdbacbae347b346bb492c27b3f4fab3c81be77da`. Su [CI](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38353389421) concluyó **success**, con **156 pruebas aprobadas** y [artefacto de evidencias](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38353389421/artifacts/11791379951), no expirado al verificarlo. Esto sustituye la afirmación anterior de cambios solamente locales y CI no ejecutado. El preflight de correcciones P1/P2 encontró Git limpio, `HEAD = origin/vera = 6903d9d`. El owner autoriza ahora commit, push a vera y actualización de la PR; prohíbe merge y cierre de #16.

## Fuentes, alcance y clasificación

- Frontend: AGENTS.md completo, README, package/lock/configuración, árbol real, `docs/GUIA_IMPLEMENTACION_FRONTEND_REACT.md`, `docs/COMPONENTES_FOUNDATION.md`, theme/shared, registries de rutas/navegación y puertos/runtimes existentes.
- [Issue #16](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/16), sin comentarios adicionales.
- Docs oficial `master@78a923bbc6bada31b39b3d386331f90a4f812b31`, comprobado con ls-remote y árbol remoto: `requisitos/specs/SPEC-014-historial-auditoria-precios.md`, `requisitos/hu/HU-014-historial-auditoria-precios.md`, `requisitos/flujos/FLOW-014-historial-auditoria-precios.md`, `ux/wireframes/flows/WF-014-historial-auditoria-precios.md` (0.7).
- Revisión P1/P2: Docs `master@942bf7322eb388fe5b0fcc9c5a565152e1099139`, comparado por árbol/blob contra la referencia inicial: SPEC/HU/FLOW/WF-014, MK-014, DESIGN/UX y contratos HTTP siguen idénticos. No se atribuyen contratos nuevos a los cambios de otros MK.
- `ux/mockups/MK-014/{component-spec,plan,tasks}.md` 1.0.0, **En revisión**; `prototipo/mk_014_s01.html` a `mk_014_s05.html`. `validation-report.md`: **NO ENCONTRADO**. No se atribuye aprobación a los HTML.
- `ux/mockups/{DESIGN.md,ux/propuesta-ux.md,ux/ux-decisions.md,ux/ux-guidelines.md}`: DESIGN **1.1.0**, UX **2.0**. Los cuatro blobs son idénticos a la revisión `be5c2db` ya consultada para Foundation/Pricing; se conserva el theme existente. La referencia 1.0.0 en Component Spec no sustituye DESIGN vigente.
- `contratos/http/openapi.yaml` 0.5.0: GET de listado/detalle estable, seis filtros y aliases pagina/tamanio, modelos de registro/página/solicitud/trabajo; exportación/seguimiento **provisional-internal**. `contratos/http/catalogo-errores.md`: 404 específico, exceso de exportación, sesión/permiso diferenciados.

`../docs` no existe. El checkout hermano `../Productos-y-Ofertas-docs` sigue en `b640b7f`; se consultó la fuente oficial remota por SHA, sin actualizar/modificar ese repo. Sus cuatro `tmp-expo-*.png` preexistentes se conservan. Backend no se modifica.

SAFE_NOW: UI de lectura, filtros/retorno, jobs mock y archivos preparados, separación por puertos, estados, límites y pruebas. NEEDS_DECISION/BLOCKED_CONTRACT: **Q-014-01**, unidad/moneda histórica ausente; validación final de formatos monetarios; estabilidad de exportación y provider/auth reales. Revisión técnica/funcional/UX independiente pendiente.

## Trazabilidad de las cinco vistas

| ID | Ruta/componente real | Interacción y evidencia |
|---|---|---|
| S01 | `/precios/auditoria`, `AuditHistoryPage` | Seis filtros explícitos, rango, 1/20 hasta 200, orden descendente, aplicar/limpiar, contexto de URL e historial. `mk-014-s01-1440.png` |
| S02 | `/precios/auditoria/asientos/:auditId`, `AuditDetailPage` | Modal 640 px sobre listado, quince campos en grupos, sin editar/eliminar/revertir. Escape/cerrar devuelve filtros/página/foco. `mk-014-s02-1440.png` |
| S03 | Misma ruta de detalle, ID inexistente | Null del puerto representa no encontrado; verificado tanto por URL directa como al abrir una fila cuyo detalle ya no está disponible. Sin asiento/código técnico/causa de retención inventados; retorno seguro. `mk-014-s03-1440.png` |
| S04 | `/precios/auditoria/exportar/csv`, `AuditExportPage` | Formato fijo CSV, todo resultado filtrado, límite inclusive 100 000; recepción, procesamiento, disponible, fallo/permiso. `mk-014-s04-1440.png` |
| S05 | `/precios/auditoria/exportar/pdf`, mismo componente | Formato fijo PDF, límite inclusive 500; pasar a CSV solo con cantidad conocida compatible. `mk-014-s05-1440.png` |

Estas son rutas de producto; no se copian las académicas `/MK014/Sxx`. S03 es una variante del modal según respuesta, no una ruta que fabrique un error HTTP. El historial as-of de MK-013 sigue independiente; no se convierte SKU en productId/targetId ni se confunde el canal del precio vigente con el origen del cambio.

## Arquitectura y comportamiento

Página → componentes → hooks → `AuditRepository` → adapter. Modelos internos camelCase, importes como strings decimales sin redondear por float, timestamps ISO, sin moneda añadida ni DTO externos en JSX. No hay HTTP en componentes. El puerto solo recibe datos/AbortSignal: no recibe `scenario`, `caso`, fixtures ni IDs ficticios como parte de su contrato.

`auditService.ts` compone con el **mismo DataModeContext/VITE_DATA_MODE global**. Mock se importa únicamente al seleccionar mock; API usa un factory inyectable o un puerto explícitamente no configurado. Fallos del factory/API se propagan, sin catch-to-mock. El layout acepta runtime inyectado para sustituir datos sin cambiar las páginas.

S01 usa snapshots de consulta, validación y cancelación: filtros sin aplicar no afectan tabla/exportación; aplicar vuelve a página 1 y reaplicar idénticos vuelve a consultar. Respuestas obsoletas no reemplazan la búsqueda actual. Refresco con dato anterior del mismo lector/contexto lo marca como última consulta; sesión/permiso retira tabla y caché anterior. Un error de detalle denegado retira también el fondo protegido antes de pintar. Null, cero y actor ausente se distinguen; email/IP se muestran únicamente si llegan en la respuesta autorizada, sin inferir identidad.

S04/S05 separan solicitud, seguimiento y descarga. La entrada contiene formato y los seis filtros aplicados, excluyendo página/tamaño. El conteo previo no garantiza admisión: el servicio reevalúa y puede rechazar sin ID. Un trabajo recibido no se vuelve «no creado» porque un conteo posterior crezca. No hay porcentaje ni campos inventados de progreso. GET cada dos segundos mientras siga pendiente y consulta manual; errores de GET conservan referencia, sin segundo POST. Resultado incierto sin ID bloquea repetir el envío. Acceder directamente con una referencia solo consulta, nunca crea. COMPLETED requiere recurso disponible para descargar; fallo del archivo conserva la generación confirmada.

## Mocks, sustitución y límites

Dataset local de 25 registros para revisión paginada: modificación, creación, retiro, lote, cero y página 2, con datos ficticios/reservados. Septiembre/octubre 2026 y reloj de trabajos **2026-10-02T12:00:00Z**, explícitos según MK-014. No se exige que un registro histórico siga «vigente» ni se copia el reloj/precio de MK-013. Los jobs mock viven mientras la familia de rutas siga montada; recargar/salir del módulo los reinicia. Una referencia perdida muestra ausencia, sin crear un trabajo sustituto.

`mocks/reviewRepository` y `AuditReviewTools` aíslan revisión DEV+mock (`modoRevision=1&caso=...`); producción/API no carga esas herramientas. Totales 500/501 y 100 000/100 001 son metadatos de revisión, no arrays gigantes. Casos de carga/vacío/errores, actor, null/cero, límites, conteo cambiante, generación/archivo y respuesta incierta cubren el inventario FX-014-01 a 18, sin afirmar pruebas de backend.

CSV/PDF son **recursos locales de muestra preparados**, no un backend exportador ni garantía de que su contenido represente la consulta. El CSV contiene quince columnas y tres ejemplos; PDF una página con aclaración visible, unidad desconocida y datos reservados. Se verificó con ReportLab/Poppler, fuentes Inter/Oswald, render PNG inspeccionado, `pdfinfo` y descarga con firma `%PDF-`. No se fabrica un PDF en JSX ni se contacta `example.test`.

**MOCK_REPLACEABLE comprobado:** `tests/harness/audit-adapter.html` monta el App/router de producto con `createAlternateAuditRepository`, ID `audit-coffee-908`, SKU COF-STEEL-XL, UUID distinto, importes de alta precisión y bytes/nombre de reporte propios. El harness está fuera del entrypoint del build. Se verifica ausencia de requests a mocks originales, filtros aplicados por puerto, límites reevaluados, descarga, fallo de API y ausencia de fallback. No requiere backend desplegado.

## Diferencias respecto del HTML

| Fuente/elemento | Corrección React y regla |
|---|---|
| S01/S02 importes S/ y supuesto de divisa | Número sin divisa + «Moneda no informada», según Q-014-01, SPEC/UXG-017. No se resuelve el contrato desde frontend. |
| S01 campo usuario con placeholder correo y catálogo cerrado de canales | Usuario por identificador; canal como referencia conocida/string abierto, sin endpoint/autocomplete inventado. |
| S01 badges decorativos/«Inmutable», variación verde, focus naranja, Material Symbols y latencia simulada | Shared/Mantine, neutral para operaciones/variaciones, focus signal de DESIGN y Tabler en navegación; sin garantías/latencias fabricadas. |
| S02/S03 diagnósticos HTTP, nombres técnicos, causas de retención y enlaces de probar fixture en flujo comercial | Copy humano, estados diferenciados, sin diagnóstico/registro/causa inventados. Herramientas aisladas en DEV/mock. |
| S04/S05 tamaño/páginas previstas, firmas/membrete/garantías y compatibilidad CSV indiscriminada | Solo referencia/estado/recurso informados; muestras explícitas; CSV alternativo condicionado al total conocido. No se promete contenido formal o integridad criptográfica. |
| S01 hora del HTML no coincide con timestamp ISO de fixture | Se presenta el instante recibido con zona UTC−5, sin convertir Z en una hora local equivalente falsa. |

La discrepancia de moneda y la estabilidad de exports se remiten a sus owners documentales/contractuales; Docs no se edita. Q-014-01: propuesta/decisión de Leonardo, revisión contractual de Miguel según Component Spec; permanece abierta.

## Archivos creados/modificados

| Archivo | Motivo |
|---|---|
| `src/features/price-audit/services/auditRepository.ts` | Modelos internos, puerto read-only, jobs/errores y runtime. |
| `services/auditPresentation.ts` | Query/aplicados, fechas con zona, validación, labels, null y decimales. |
| `services/auditService.ts` | Composición por modo global, inyección API y fallo explícito. |
| `services/AuditRuntimeContext.ts` | Consumo del runtime sin fixtures. |
| `adapters/mockAuditRepository.ts` | Dataset aislado, lecturas, jobs y descarga de recursos preparados. |
| `mocks/entries.ts` | Registros ficticios, orden y paginado verificables. |
| `mocks/createMockAuditRuntime.ts` | Composición/aviso de demo y herramientas solo DEV. |
| `mocks/reviewRepository.ts`, `mocks/AuditReviewTools.tsx` | Escenarios fuera del contrato productivo. |
| `mocks/files/audit-demo.csv`, `audit-demo.pdf` | Muestras estáticas descargables, no informes del backend. |
| `hooks/useAuditRead.ts` | Cancelación, identidad del lector, refresco y caché segura. |
| `hooks/useAuditHistoryContext.ts` | Propagación de acceso denegado del detalle al fondo. |
| `hooks/useAuditExport.ts` | Un envío, seguimiento/recuperación/cancelación y descarga. |
| `components/AuditLayout.tsx`, `AuditDataNotice.tsx` | Runtime por familia y aviso/herramientas comunes. |
| `components/AuditFilters.tsx`, `AuditScope.tsx`, `AuditTable.tsx` | Filtros, alcance aplicado y tabla read-only reutilizando shared. |
| `pages/AuditHistoryPage.tsx`, `AuditDetailPage.tsx`, `AuditExportPage.tsx` | S01–S05 y navegación real. |
| `src/app/routes/productPages.tsx`, `productRoutes.tsx` | Cuatro imports lazy y rutas anidadas, aditivos. |
| `src/app/navigation/navigation.ts` | Historial en grupo Precios; conserva grupos/destinos/matchPaths. |
| `tests/price-audit.spec.ts`, `tests/adapters/alternateAuditRepository.ts`, `tests/harness/audit-adapter.{html,tsx}` | 18 pruebas y segundo adapter. |
| `tests/integration.spec.ts`, `tests/taxonomy-ui.spec.ts` | Solo conteo de links de 10→11 por entrada nueva; no se elimina/relaja otra comprobación. |
| `scripts/verify-production.mjs` | Cinco vistas MK-014 añadidas sin eliminar checks de otros owners. |
| `README.md`, este informe | Alcance real, funcionamiento, sources/bloqueos y evidencia. |
| `docs/evidencias/mk-014-s01-1440.png` a `s05` | Cinco capturas MK-014 revisadas. Las 16 antiguas de Pricing regeneradas por tests se conservaron byte a byte desde HEAD, con Git inicial limpio. |

No se modifican código de Pricing/Promotions/Taxonomía, theme/shared, main, AppRoutes o workflow. Sigue un único createBrowserRouter; todas las rutas/imports anteriores se conservan. La navegación activa usa el prefijo más específico y selecciona Historial también en detalle/exportaciones.

## Quality gates ejecutados

La tabla siguiente conserva la ejecución de la entrega inicial publicada en 6903d9d. Las correcciones P1/P2 y sus comprobaciones posteriores se registran por separado al final.

| Check | Resultado real |
|---|---|
| Baseline `npm ci` | PASS: Node v22.21.0/npm 10.9.4, 191 packages, 0 vulnerabilidades. |
| Baseline typecheck/lint/build mock | PASS sobre fdbacba antes de editar. |
| Final `npm run typecheck` | PASS. |
| Final `npm run lint` | PASS sin warnings/errores de ESLint. |
| `npm run build`, VITE_DATA_MODE=mock | PASS: 7334 módulos; repetición final 2.18 s de Vite. |
| `npm run build`, VITE_DATA_MODE=api | PASS: 7334 módulos; repetición final 2.09 s de Vite. |
| `npm test`, CI=true, dos workers | **156 PASS, 5.1 min**: 138 anteriores + 18 nuevas. Ejecución completa, no únicamente Pricing. |
| `npm test -- tests/price-audit.spec.ts`, CI=true | **18 PASS** después de ampliar S03 con detalle inexistente desde una fila. `.last-run.json`: passed, sin failedTests. Typecheck/lint/build repetidos con PASS tras ese ajuste. |
| Smoke `node scripts/verify-production.mjs api` | PASS: **36 vistas**, incluidas cinco variantes MK-014, providers ausentes explícitos y cero carga de mocks. |
| Smoke `node scripts/verify-production.mjs mock` | PASS: **40 vistas**, tablas/diálogos/formularios presentes y controles DEV ignorados. |
| `git diff --check` | PASS. |
| Visual 1440×900 | Cinco capturas, geometría sin overflow horizontal; modal 640 px, scroll/teclado/foco y lectura de datos largos comprobados; inspección visual del conjunto y PDF. |
| CI remoto / PR publicada — entrega inicial | **PASS / PUBLICADA**: vera@6903d9d, [run 38353389421](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38353389421), job validate/115150648806: typecheck/build/lint, 156 PASS (5.1 min), smoke mock 40/API 36 y carga de evidencias. PR #26 abierta, sin merge. |

La primera suite ampliada mostró cinco fallos exclusivamente por conteo lateral 10 frente a 11; se actualizó esa expectativa en Taxonomía y se repitió la suite completa con éxito. Durante desarrollo, la prueba de refresco detectó reaplicación sin nueva consulta y se corrigió; el caso PDF ajustó el orden del propio test. No se ocultan fallas de funciones ajenas. Las herramientas históricas de screenshot no demuestran aprobación UX.

## Matriz y pendientes

- [x] Fuentes verificadas, cinco vistas identificadas, Git inicial limpio conservado.
- [x] React/TypeScript, build, lint y suite completa ejecutados con PASS.
- [x] Desktop 1440 px, estados loading/empty/error, null/cero, modal/foco y exportaciones verificados.
- [x] Sin HTTP directo en JSX, nuevos HEX en UI, endpoints/roles/scopes inventados o cambios en Docs/Backend.
- [x] Puertos sin escenarios, selección global única y sustitución del adapter comprobada.
- [x] Dependencias y límites registrados, sin aprobación humana/API real atribuida.
- [ ] API/provider/auth/grants reales: pendientes. Exportaciones/seguimiento provisional-internal.
- [ ] Q-014-01: moneda/unidad histórica y formatos monetarios definitivos pendientes.
- [ ] CA backend: publicación postcommit, deduplicación message_id, persistencia append-only, retención/archivo/checksum: NO VERIFICADOS por UI.
- [x] CI remoto de la entrega inicial verificado y enlazado, sin confundirlo con aprobación UX/API.
- [ ] Revisión técnica/funcional/UX independiente y aprobación de documentos: pendientes.

Estado: **MOCK_INTEGRATED / MOCK_ONLY**; interfaz provisional con S01–S05 implementadas, **MOCK_REPLACEABLE comprobado**, sin API_INTEGRATED ni VALIDATED. PR #26 publicada en vera y pendiente de auditoría final; no se fusiona ni se cierra #16 mientras existan estos pendientes.

## Correcciones de auditoría P1/P2 — 2026-10-13

| Hallazgo | Cambio y regresión |
|---|---|
| P1.1: denegación de detalle retenida | `AuditHistoryPage.tsx` vuelve a consultar al regresar de detalle y conserva la ocultación hasta una respuesta autorizada nueva. Ofrece reintento sin recargar la app. `AuditDetailPage.tsx` elimina la denegación al recuperar una lectura autorizada; `useAuditHistoryContext.ts` permite retirar ese mensaje. Prueba de denegación, retorno aún denegado, recuperación con lectura lenta, mismo contexto y apertura posterior. |
| P1.2: canal_origen abierto | `auditPresentation.ts` conserva literalmente todo identificador sin etiqueta conocida, incluidos nombres que coinciden con propiedades de Object. La prueba del adapter alternativo exige `Origen: UNRECOGNIZED`; se mantienen aliases conocidos y no se infieren permisos/canales. |
| P1.3: trabajo de otra referencia | `useAuditExport.ts` asocia trabajo, errores y estados a repository/ID/formato/filtros; invalida al renderizar una referencia nueva, cancela operaciones anteriores y valida ID/formato de la respuesta y descarga. Pruebas con dos jobs, quitar ID, Atrás/Adelante, GET tardío, ID inexistente, descarga tardía cancelada y respuesta con ID diferente; solo dos POST solicitados. Se conserva el bloqueo de doble envío hasta comprometer la referencia en URL, también ante resultado incierto. |
| P1.4: publicación/documentación | README e informe enlazan SHA inicial publicado, PR #26, CI de 156 casos y artefacto. Se incorpora trazabilidad S01–S05 y resultados posteriores; el título/descripcion del PR se actualizan al publicar. |
| P2.5: fechas inexistentes | `auditPresentation.ts` valida estructura completa, calendario gregoriano/bisiestos, horas/minutos/segundos y zona antes de Date.parse. URLs de listado/CSV/PDF con febrero inexistente y abril 31 no consultan ni solicitan; casos de fecha, hora o zona fuera de rango y bisiestos 1900/2000/2024 cubiertos. Conversiones local/legible reutilizan la misma validación. |

Las demoras/contadores/ID de respuesta alternativo viven únicamente en `tests/adapters/alternateAuditRepository.ts` y su harness. El puerto productivo, selector global, mocks originales, endpoints, permisos y moneda permanecen desacoplados. No se modifica navegación compartida ni otros dominios; Q-014-01/exportaciones provisionales permanecen bloqueados.

### Evidencia visual por pantalla

| Pantalla | Composición/resultado | Evidencia versionada |
|---|---|---|
| MK-014-S01 | Listado, filtros, paginación y acceso read-only | [1440 px](evidencias/mk-014-s01-1440.png) |
| MK-014-S02 | Modal 640 px, quince campos, teclado y retorno | [1440 px](evidencias/mk-014-s02-1440.png) |
| MK-014-S03 | No encontrado, sin asiento inventado, retorno contextual | [1440 px](evidencias/mk-014-s03-1440.png) |
| MK-014-S04 | CSV recibido/generado y recurso de muestra | [1440 px](evidencias/mk-014-s04-1440.png) |
| MK-014-S05 | PDF recibido/generado y recurso de muestra | [1440 px](evidencias/mk-014-s05-1440.png) |

Las pruebas vuelven a capturar las cinco vistas en `test-results/` para el artefacto de CI. Las imágenes versionadas registran la composición revisada; no equivalen a aprobación humana ni archivo de backend.

### Validaciones locales de las correcciones P1/P2

| Comando/comprobación | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS sin errores/warnings |
| `VITE_DATA_MODE=mock npm run build` | PASS, 7334 módulos, 5.53 s de Vite |
| `VITE_DATA_MODE=api npm run build` | PASS, 7334 módulos, 3.40 s de Vite |
| `CI=true npm test -- tests/price-audit.spec.ts` | **22 PASS, 50.7 s** |
| `CI=true npm test` | **160 PASS, 5.7 min**, suite completa con todos los módulos |
| `node scripts/verify-production.mjs mock http://127.0.0.1:5184` | **40 vistas PASS**, producción sin controles DEV ni errores |
| `node scripts/verify-production.mjs api http://127.0.0.1:5184` | **36 vistas PASS**, providers ausentes explícitos y cero carga de mocks/bundles |
| `git diff --check` | PASS |
| Visual 1440 px | Cinco capturas nuevas inspeccionadas; geometría/modal/teclado y estados cubiertos. Evidencias anteriores de Pricing conservadas byte a byte desde HEAD. |

Durante la primera ejecución focalizada, 21 casos pasaron y se detectó doble POST al liberar el bloqueo antes de comprometer el ID en navegación. Se corrigió el bloqueo, se repitieron los 22 casos y después toda la suite con éxito. No se reducen assertions de otros módulos. El CI inicial de 156 casos se mantiene como evidencia histórica separada.

### Publicación de las correcciones y comprobación remota

El código P1/P2 y los resultados locales anteriores están publicados en **`3b1d705522ff2bdbd0a7b5240afaff517c1fdaff`**, rama **vera**, mediante push normal (sin force). [Commit de correcciones](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/commit/3b1d705522ff2bdbd0a7b5240afaff517c1fdaff), [CI asociado a ese SHA](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38457417369) y [evidencias de la ejecución](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38457417369#artifacts). Los cambios documentales posteriores conservan ese código; su SHA y comprobación remota se registran en el cuerpo del PR y [Checks de #26](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/26/checks), que identifica cada ejecución. La tabla anterior registra resultados locales; no atribuye los 156 casos del primer CI al nuevo SHA.

El PR tiene título **feat(frontend): MK-014 — Historial de auditoría de precios**, descripción completa con trazabilidad S01–S05, cuatro correcciones P1 y mejora P2, 160 pruebas, fuentes y bloqueos. El conector rechazó la edición con 403 por permisos de la integración; se realizó y verificó mediante la API oficial de GitHub usando la autenticación local que permitió el push autorizado. #26 permanece abierto hacia master, sin merge; #16 permanece abierto y referenciado con Refs.
