# MK-013 — Implementación y validación local del issue #15

> **Revisión vigente:** la auditoría H01–H16 corrige el acoplamiento y las limitaciones de esta entrega inicial. Consultar [AUDITORIA_MK013.md](AUDITORIA_MK013.md) para arquitectura, resultados actuales, sustitución de adapter y reloj de exposición del 17 de octubre. El contenido que sigue es el registro histórico de la implementación inicial, cuya base se consolidó en `c3ef0c9a1a4a171e6dc5131f1f4167c9f17c0e11`; sus métodos/escenarios/capturas no describen por sí solos la versión posterior a la auditoría.

Fecha: 2026-10-11. Responsable del issue: Leonardo Vera Rodríguez. Rama real: `vera`, por instrucción explícita del usuario. Base Frontend: `dd8ac2bf41151efa3848c93a87eae83ff6c34a0c`. La rama inicial limpia `1c996775377c9f5dcaaf0028999c08039f9df5b5` se actualizó con `git fetch origin --prune` y `git merge --ff-only origin/master`. Este informe corresponde a cambios locales sobre esa base; no declara commit, push, PR publicada, merge ni despliegue.

Entrega: **MOCK_INTEGRATED / MOCK_ONLY** en las partes implementables. **S04 PARCIAL / BLOCKED_CONTRACT: Q-013-01/02**. API real: NO. Aprobación UX/técnica independiente: PENDIENTE. El issue permanece abierto.

## Fuentes comprobadas

Docs oficial: [Productos-y-Ofertas-docs](https://github.com/Taller-SW-Web/Productos-y-Ofertas-docs), `master@be5c2db16aca6d6d18b3005a2da4205f724038e3`. `git ls-remote` verificó el SHA. La API de árbol verificó las rutas y seis HTML. El conector de archivo devolvió un error de lectura; se consultaron los archivos por `raw.githubusercontent.com` en el mismo SHA. `../docs` no existe en este workspace; `../Productos-y-Ofertas-docs` existe pero su checkout `vera@b640b7f` tiene estructura anterior, por lo que no se usó como norma vigente. No se modificó su árbol ni Git; los cuatro `tmp-expo-*.png` ya existían.

Fuentes consumidas en esa revisión:

- `requisitos/specs/SPEC-013-gestion-precios-individuales-masivos.md`: reglas de importes, herencia y versión.
- `requisitos/hu/HU-013-gestion-precios-individuales-masivos.md`: CA-01–10.
- `requisitos/flujos/FLOW-013-gestion-precios-individuales-masivos.md`: consulta, edición, programación, histórico y lote.
- `ux/wireframes/flows/WF-013-gestion-precios-individuales-masivos.md`: inventario de seis pantallas. No se usó DESIGN de wireframes para estilos.
- `ux/mockups/ux/propuesta-ux.md`, `ux-decisions.md`, `ux-guidelines.md`: UX 2.0, contexto, complejidad, recuperación, foco y ausencia.
- `ux/mockups/DESIGN.md`: **1.1.0**, norma visual vigente. Se reutilizan los tokens del theme existente sin modificarlo.
- `ux/mockups/MK-013/component-spec.md`, `plan.md`, `tasks.md`: 1.0.0, **En revisión**, Q-013-01/02 abiertos. Su referencia visual 1.0.0 se interpreta con DESIGN vigente 1.1.0.
- `ux/mockups/MK-013/prototipo/mk_013_s01.html` a `mk_013_s06.html`: composición de referencia; no código productivo ni autoridad contractual.
- `ux/mockups/MK-013/validation-report.md`: **NO ENCONTRADO** en el árbol oficial; no se atribuye aprobación.
- `contratos/http/openapi.yaml` **0.5.0** y `catalogo-errores.md`: paths y schemas de Pricing, versionado, oferta, programación, paginación, prevalidación, lotes y reporte. Sin invocar endpoints ni integrar eventos.
- Frontend: `AGENTS.md`, `README.md`, `docs/GUIA_IMPLEMENTACION_FRONTEND_REACT.md`, `docs/COMPONENTES_FOUNDATION.md`, scripts/configuración y módulos existentes de shell/rutas/navegación/theme/shared/pricing.

## Clasificación y límites

SAFE_NOW: S01 contextual, edición/versionado y confirmación mock S02, programación/listado S03, selección/política y representación de respuestas S04, consulta/reporte de lote existente S05 e histórico S06. Todas tienen acceso directo y no requieren un recorrido previo para lectura.

NEEDS_DECISION / BLOCKED_CONTRACT:

| ID | Fuente | Impacto | Propuesta y owner de decisión |
|---|---|---|---|
| Q-013-01 | component-spec §13; OpenAPI multipart | No existe contrato del contenido del archivo; se bloquean parser, plantilla, formatos, cabeceras, máximos y admisión del archivo elegido | Owner Pricing Leonardo propone definición; revisión técnica de Miguel según Docs |
| Q-013-02 | component-spec §13; PrevalidacionPrecio | No se define qué errores admiten política parcial; nunca se habilita confirmar por `allow_partial` o `valid=false` | Owner Pricing debe precisar admisión/rechazo y registrar fuente revisada |

La simulación de S04 devuelve respuestas explícitas del fixture sin recibir ni leer el archivo. Un resultado `valid=true` ficticio tampoco habilita importar bytes sin contrato. S05 consume exclusivamente `batch-013-01`, ya existente en fixtures; no representa un lote generado por S04. Los importes son modelos de presentación separados del contrato externo; un adapter HTTP futuro requiere mapper, autenticación y pruebas reales del provider.

Canales disponibles en el piloto: Global y Retail. No se añade una nueva definición de canales. Marketplace, Chatbot y Ventas publicados no están incluidos en estos fixtures y su cobertura queda pendiente. El histórico conserva la independencia de la consulta vigente y resuelve SKU/canal/instante, sin timeline ni edición de auditoría.

## Matriz de rutas, interacción y evidencia

Capturas Chromium a viewport **1440 × 900**, `fullPage` para contenido con scroll vertical. Archivos en `docs/evidencias/`; no certifican aprobación humana.

| Pantalla | Ruta real | Entrada → acción → resultado/navegación | Evidencia | Fuente |
|---|---|---|---|---|
| S01 | `/precios` | Producto/SKU/canal aplicado → consultar → herencia/override/fallback; lectura fresca habilita S02/S03/S06; error conserva última lectura marcada y bloquea esos enlaces | `mk-013-s01-1440.png` | SPEC §§2,5; FLOW §4.2; UXG-001/006/008/017 |
| S02 | `/precios/editar` | Objetivo releído → importes/oferta/moneda/motivo → confirmación → nueva versión mock; volver a S01 refleja cambio durante la sesión. Cancelar/salir conserva o descarta explícitamente | `mk-013-s02-1440.png`, `mk-013-s02-confirmado-1440.png` | SPEC §5; FLOW §4.3; UXG-002/011/018/021 |
| S02 conflicto | misma ruta, revisión de guardado | Versión 4 → propuesta → conflicto → releer versión 5 → comparar manteniendo propuesta → aceptar revisión → nueva confirmación versión 6; sin sobrescribir versión silenciosamente | `mk-013-s02-conflicto-1440.png` | CA-08; component-spec FX-013-08; UXG-014 |
| S03 | `/precios/programaciones` | Páginas del objetivo → propuesta futura con zona → confirmación → programación pendiente; S01 conserva precio actual. Fechas inválidas/superposición/rechazo no crean vigencia | `mk-013-s03-1440.png`, `mk-013-s03-programado-1440.png` | CA-09; FLOW §4.3; UXG-006/009/011 |
| S04 | `/precios/importar` | Archivo/política → simular respuesta independiente → errores/totales ficticios; cambiar archivo/política invalida revisión; confirmar permanece bloqueado. Error no analizable no pasa a etapa 2 | `mk-013-s04-1440.png`, `mk-013-s04-error-fila-1440.png` | component-spec §§9,13, FX-013-11/12; UXG-004/006/015 |
| S05 | `/precios/importaciones/:batchId` | Referencia conocida → consultar sin reenviar → cola/proceso/parcial/total/fallido; filas ausentes se explican; refresco fallido conserva consulta marcada. Reporte ficticio terminal → descargar; corregir abre S04 sin archivo ni nuevo lote | `mk-013-s05-1440.png`, `mk-013-s05-cola-1440.png`, `mk-013-s05-sin-filas-1440.png` | FLOW §4.4; FX-013-13/14/15; UXG-009/012/015 |
| S06 | `/precios/historico` | SKU/canal/instante → consultar → precio del instante, vigencia y fallback global; ausencia distinta de error. Atrás/retorno conserva contexto e instante aplicado | `mk-013-s06-1440.png` | FLOW §4.2; FX-013-16; UXG-001/006/017 |

Escenarios de revisión: `modoRevision=1` en desarrollo. Son controles de fixtures, no flags de selección de adapter ni parámetros HTTP. El único punto de selección de adapter sigue en `services/pricingService.ts`. El reloj para fechas futuras es `2026-10-02T12:00:00Z`, conforme a component-spec §12; la zona de inputs es America/Bogota UTC−5 y se convierte explícitamente, sin depender del equipo anfitrión.

Las mutaciones bloquean doble envío. Rechazo de servicio, sesión inválida, autorización insuficiente y vigencia superpuesta conservan borrador sin falso éxito. Una escritura desconocida no es rechazo: se conserva la propuesta, se bloquea el reenvío y en S02 se permite releer sin atribuir autoría a la lectura. Navegación desde confirmación usa un único diálogo visible. El data router sustituye al BrowserRouter para proteger también sidebar, scope y Atrás/Adelante; las rutas ajenas se conservan.

## Diferencias corregidas respecto de HTML

| Pantalla/elemento | Regla observada / problema | Corrección React y owner |
|---|---|---|
| S01 badges/KPI/canales | HTML colorea origen/categorías, ofrece descuento/IGV/estado comercial y canales no trazables | DESIGN 1.1.0 §§4.1.1,7,9: neutros para origen/KPI; sin cifras derivadas o estados comerciales añadidos. UX owner Leonardo |
| S02/S03 importes y foco | HTML fija step 0.10, mínimo 1 y anillos naranja/verde | SPEC >0 sin precisión nueva; decimal string exacto; focus signal central. No se calcula descuento. UX owner Leonardo |
| S04 archivo y admisión | HTML fija CSV/columnas y permite continuar con errores aunque Q siga abierto | Sin `accept`, parser o plantilla; resultado de fixture explícito, confirmación bloqueada. Decisión de contrato pendiente de Pricing |
| S05 filas y auditoría | HTML usa emerald/rose y afirma integración inmediata de bitácora | Tokens semánticos existentes solo en estados de fila; detalle null como ausencia, sin afirmar consumo de auditoría. UX owner Leonardo |
| S06 etiquetas/resultado | HTML denomina actual/vigente un resultado histórico y añade enlace a auditoría no implementada | Labels «en fecha», sin comandos históricos, timeline ni ruta inexistente. UX owner Leonardo |
| Navegación/botones | La nueva jerarquía activaba dos enlaces por prefijo y Stack estiraba botones | Destino activo más específico, alias para resultados de importación; botones por contenido según DESIGN §7. No cambios de theme/shared/shell |

## Archivos creados/modificados

Todos dentro del frontend; sin dependencias nuevas en package/lockfile.

- `src/app/routes/productPages.tsx`, `productRoutes.tsx`: cinco páginas diferidas/rutas de Pricing nuevas.
- `src/app/routes/AppRoutes.tsx`, `src/main.tsx`: RouterProvider/data router para bloqueo seguro de navegación; mismas rutas de producto/demos y fallback.
- `src/app/navigation/navigation.ts`, `ApplicationNavigation.tsx`: importar precios y selección activa única del destino más específico.
- `src/features/pricing/pages/CurrentPricePage.tsx`: acciones contextuales de lectura fresca y acceso S04; conserva consulta y estados.
- `src/features/pricing/pages/EditPricePage.tsx`: S02, scope y lectura previa.
- `src/features/pricing/pages/PriceSchedulesPage.tsx`: S03 y composición lista/formulario.
- `src/features/pricing/pages/ImportPricesPage.tsx`: S04, dos etapas y bloqueos.
- `src/features/pricing/pages/PriceImportResultPage.tsx`: S05, lote/estado/reporte y recuperación.
- `src/features/pricing/pages/HistoricalPricePage.tsx`: S06, filtros aplicados e instante contextual.
- `src/features/pricing/components/PriceSummary.tsx`, `PriceBreakdown.tsx`: reutilizar resumen histórico con labels apropiadas y unidades sin fijar PEN en encabezados.
- `src/features/pricing/components/PriceEditForm.tsx`: oferta/importes/confirmación/comparación de conflicto.
- `src/features/pricing/components/ScheduleForm.tsx`, `SchedulesTable.tsx`: formulario de vigencia y listado paginado.
- `src/features/pricing/components/ImportRowsTable.tsx`: presentación común de errores y resultados publicados por fila.
- `src/features/pricing/components/PricingPageFrame.tsx`: cabecera/retorno/aviso mock y contexto inválido; composición local de shared.
- `src/features/pricing/components/PricingScenarioControl.tsx`: revisión explícita solo en desarrollo.
- `src/features/pricing/components/UnsavedPriceGuard.tsx`: confirmación de salida usando ConfirmDialog existente.
- `src/features/pricing/hooks/usePriceEdit.ts`, `usePriceSchedules.ts`, `usePriceImport.ts`, `usePriceBatch.ts`, `useHistoricalPrice.ts`: controladores de cada flujo.
- `src/features/pricing/hooks/usePricingContext.ts`, `usePricingRequest.ts`, `useUnsavedPriceNavigation.ts`: contexto, lecturas cancelables/envío único y protección de navegación/recarga.
- `src/features/pricing/services/pricingRepository.ts`, `pricingModels.ts`: puerto ampliado y modelos internos tipados, separados de DTO HTTP.
- `src/features/pricing/services/pricingValidation.ts`, `pricingScenarios.ts`: validaciones pertinentes exactas de decimal/fecha y opciones de revisión.
- `src/features/pricing/adapters/mockPricingRepository.ts`: estado local de precios/programaciones; lecturas, mutaciones y respuestas/reportes de fixtures sin HTTP.
- `src/features/pricing/mocks/prices.ts`, `workflows.ts`: SKU de referencia explícito y fixtures de programación/prevalidación/lote/reporte.
- `tests/pricing-workflows.spec.ts`: recorridos, fronteras temporales/decimales, conflictos, foco, estados y capturas de MK-013. Tests anteriores se conservan.
- `README.md`, `docs/VALIDACION_MK013.md`, `docs/PR_MK013.md`: ejecución/alcance, trazabilidad y descripción de revisión preparada.
- `docs/evidencias/mk-013-*.png`: capturas de seis vistas y variantes críticas. Las capturas preexistentes de Foundation regeneradas por pruebas se restauran al terminar para evitar cambios ajenos.

Shared reutilizados: PageHeader, SectionCard, FilterBar, StatusBadge, FeedbackAlert, EmptyState, EntityTable, ConfirmDialog, MetricCard, FileSelection. Mantine y Tabler existentes; no nuevos wrappers compartidos ni modificaciones de theme/AppShell.

## Validaciones

Baseline de `dd8ac2b`: Node v22.21.0, npm 10.9.4. `npm ci`: PASS, 191 paquetes, 0 vulnerabilidades. Typecheck/build/lint: PASS. `npm test -- --workers=2`: 13 PASS antes de editar.

Resultados ejecutados:

| Comprobación | Comando / evidencia | Resultado observado |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS, sin errores; repetido tras el ajuste final de foco |
| Build | `npm run build` | PASS, TypeScript + Vite 8.3.4; 7192 módulos; repetido tras el último ajuste S02 |
| Lint | `npm run lint` | PASS, sin errores ni warnings propios; repetido tras el ajuste final |
| Suite completa | `npm test -- --workers=2` | **34 PASS** (13 anteriores + 21 nuevos), 1.1 min |
| Evidencias estabilizadas | `npm test -- tests/pricing-workflows.spec.ts --workers=2 --grep 'validation, focus\|version conflict\|future creation\|changing file\|queued, processing\|six direct views'` | 6 PASS, 19.7 s; capturas al inicio de página y después de cerrar diálogos |
| Último ajuste S02 | `npm test -- tests/pricing-workflows.spec.ts --workers=2 --grep 'validation, focus\|version conflict\|six direct views'` | **3 PASS, 12.7 s**; foco también en error al conservar oferta, botones por contenido, resumen con datos de la respuesta confirmada y geometría de las seis vistas |
| Visual desktop | 12 PNG locales y prueba de `scrollWidth <= innerWidth` para S01–S06, viewport 1440×900 | Capturas inspeccionadas: sin overflow de página/cortes de campos; scroll vertical explícito. Revisiones de conflicto, programación y error de fila; no aprobación UX humana |
| Whitespace | `git diff --check` | PASS; Git informa conversión futura LF→CRLF como aviso, sin errores de diff |
| API/backend/eventos | Pruebas contractuales remotas | **NO EJECUTADO**; no existe integración HTTP en esta entrega |

La suite completa precede al último ajuste pequeño de foco/ancho/resumen confirmado de S02; se repitieron los recorridos afectados y las seis vistas, además de typecheck/lint/build. El resumen S02 muestra la respuesta guardada y conserva por separado la lectura original para revisión, sin presentar el precio anterior como vigente tras éxito. No se modificaron los tests de Foundation ni sus expectativas. Las capturas se estabilizaron esperando el cierre del diálogo y desplazando al inicio: el header fijo de una captura fullPage desde scroll intermedio no se usa como evidencia de solapamiento real.

Durante desarrollo se detectó pérdida del cero final por conversión de NumberInput y se corrigió con `onValueChange.value`, sin pasar importes por float. Se corrigieron selectores de test para campos de fecha etiquetados y estado ambiguo. Un recorrido anterior de Foundation falló al escribir una captura con error de filesystem `UNKNOWN`; el resultado final requiere una ejecución completa posterior sin ese fallo. No se alteraron sus expectativas para ocultarlo.

## Pendientes y matriz de verificación

Pendientes: Q-013-01/02, aprobación técnica/funcional/UX independiente, canales adicionales publicados sin fixture, HTTP/autenticación/persistencia real, pipeline backend/eventos y publicación de PR autorizada. No se declara Figma, despliegue, evaluación WCAG exhaustiva ni aprobación del mockup.

- [x] Fuentes normativas verificadas por ruta y SHA; estado documental real registrado.
- [x] Pantallas S01–S06 identificadas; S04 incompleta declarada.
- [x] Git inicial inspeccionado y limpio; actualización por avance directo en `vera`.
- [x] Resultado de typecheck/build/lint/tests registrado tras suite completa y repetición de ajustes afectados.
- [x] Capturas desktop 1440 px inspeccionadas; no certificación ni aprobación UX humana.
- [x] Estados loading/empty/error, borradores, confirmación/cancelación, foco y recuperación verificados en recorridos de tests.
- [x] Sin HTTP desde componentes, HEX locales, endpoints/DTO/scopes nuevos ni cálculos comerciales.
- [x] Docs y Backend no modificados; limitaciones y bloqueos registrados.
- [x] Nivel real especificado: MOCK_INTEGRATED; S04 PARCIAL/BLOCKED_CONTRACT.
