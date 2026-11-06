# Entrega de Cueva — MK-005, MK-006 y MK-007

> **Estado vigente:** la entrega anterior fue integrada en PR #22. Las correcciones posteriores, pruebas y revisión visual están en la actualización al final de este documento. Tras completar la validación local, Axel autorizó publicar en `cueva` y abrir una nueva PR hacia `master`. La PR registra el estado remoto, CI y revisiones. Las secciones originales conservan la evidencia histórica de aquella entrega.

Fecha: 2026-10-11, America/Lima. Refs [#7 Cupones](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/7), [#8 Promociones](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/8), [#9 Recomendaciones](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/9).

**MOCK_INTEGRATED / MOCK_ONLY, provisional.** Las 19 pantallas del alcance frontend están implementadas. No se declara aprobación UX, API real ni cierre de issues. Entrega en `cueva`, autorizada por Axel para commit, publicación y preparación de revisión el 11 de octubre. El estado de publicación/CI/revisión se registra en la PR; este reporte acredita implementación y comprobaciones locales.

## Inventario y fuentes

- TAREA: completar los tres issues propios de Cueva.
- RAÍZ: `C:/Users/axela/OneDrive/Escritorio/PROYECTO/G6-Productos-Ofertas-frontend`, verificada con Git.
- RAMA: `cueva`; base `dd8ac2bf41151efa3848c93a87eae83ff6c34a0c`.
- GIT INICIAL: limpio en master; origin/cueva apuntaba a la misma base. Se cambió a cueva por instrucción del usuario, que prevalece sobre la sugerencia de rama nueva de los issues. No se destruyeron cambios previos.
- DOCS: accesible en `../Productos-y-Ofertas-docs`; `../docs` no existe en este entorno. Local limpio lab/lopez, SHA `80eb28c324e77bbafe27ee01803335b03c3e5417`.
- DOCS OFICIAL: G6-Productos-Ofertas-docs, master, SHA **`be5c2db16aca6d6d18b3005a2da4205f724038e3`**, consultado mediante GitHub. Se contrastaron blobs normativos; no se editó Docs ni Backend.
- SHARED: PageHeader, SectionCard, FilterBar, SearchField, EntityTable, FeedbackAlert, EmptyState, StatusBadge, ConfirmDialog, MetricCard; Mantine/Tabler/theme existentes.
- ALCANCE: src/features/promotions, registro de rutas/navegación y router de datos necesario para proteger borradores, pruebas y documentación/evidencia. Theme/shared/otras features preservados.
- BLOQUEOS: contratos administrativos provisionales, D-REC-01/02 y aprobación documental/UX pendiente. NIVEL: MOCK_INTEGRATED.

Se inspeccionaron package/lockfile, scripts, configuración, workflows, shell/router/navegación/theme/shared y patrones Foundation/Pricing. Foundation PR #2 está fusionada en master (`731ae1d3cdad100d943d35111a4da6229a31fb96`); sus reportes históricos se conservan. La consulta inicial de Git remoto falló por DNS. Antes de publicar, `git fetch origin --prune` terminó correctamente y confirmó que HEAD, origin/cueva y origin/master compartían la base `dd8ac2b`. Issues y fuentes oficiales se consultaron por el conector y se releían sus criterios de cierre antes de publicar.

Comparación: origin/castilla local `041a4d3f449d177330d92b851bd87a698d26ca64`, con cinco vistas de MK-001 y adapter de carga masiva. Cueva partía de Foundation/Pricing sin Promotions. Esta entrega completa el alcance de UI/mocks de los tres issues propios; pantallas/commits no acreditan equivalencia de esfuerzo ni cierre de issues de Castilla.

**Fuentes leídas:** Frontend AGENTS.md, README.md, docs/GUIA_IMPLEMENTACION_FRONTEND_REACT.md, docs/COMPONENTES_FOUNDATION.md, reportes Foundation e issues #7/#8/#9 completos. En Docs:

- EQUIPO_Y_RESPONSABILIDADES.md.
- requisitos/specs/SPEC-005-gestion-cupones-descuento.md; SPEC-006-gestion-ofertas-promociones.md; SPEC-007-reglas-venta-cruzada-upselling.md.
- requisitos/hu/HU-005-gestion-cupones-descuento.md; HU-006-gestion-ofertas-promociones.md; HU-007-reglas-venta-cruzada-upselling.md.
- requisitos/flujos/FLOW-005-gestion-cupones-descuento.md; FLOW-006-gestion-ofertas-promociones.md; FLOW-007-reglas-venta-cruzada-upselling.md.
- ux/wireframes/flows/WF-005-gestion-cupones-descuento.md; WF-006-gestion-ofertas-promociones.md; WF-007-reglas-venta-cruzada-upselling.md.
- ux/mockups/ux/propuesta-ux.md, ux-decisions.md, ux-guidelines.md (UX 2.0); ux/mockups/DESIGN.md (1.1.0).
- ux/mockups/MK-005, MK-006, MK-007: component-spec.md, plan.md, tasks.md y los 19 HTML reales (6+6+7), leídos como composición sin copiarlos como React.
- contratos/http/openapi.yaml (0.5.0), catalogo-errores.md: límite de operaciones/DTO administrativos, sin asumir provider ejecutable.

validation-report.md de los tres MK: **NO ENCONTRADOS**. Component-spec/plan/tasks mantienen aprobación pendiente: HTML existente no equivale a APROBADO. La denominación anterior del repo sin G6 no permitió consultar los archivos; se usó la fuente oficial real.

Blobs oficiales contrastados: SPEC005 d112f32a73753eed7ff39645faaddb5fd7a4be37; SPEC006 dd7de3bab66ff01ee747ba9174b3f7c2495793d5; SPEC007 24ea7bff45281f62bf6cebad7d18c195e366b471; component-spec006 456adbbdc2f4db4133c4e73da3dc39a997be0692; component-spec007 032d62b947178f3a90144bf26fa0f12aaa2c9678. DESIGN y plan/tasks005 también contrastados.

## Trazabilidad de pantallas

Capturas en docs/evidencias, Chromium a **1440 × 900**, fullPage con scroll vertical natural. Las rutas /estado reproducen el mismo diálogo accesible desde detalle; no añaden pantallas comerciales.

| Pantalla | Ruta React | Acción/resultado verificado | Captura |
|---|---|---|---|
| MK-005-S01 | /cupones | Estado/paginación, detalle, editar, crear y contexto de regreso | cupones-s01-1440.png |
| MK-005-S02 | /cupones/nuevo | Código normalizado/único, promoción cupón, límites/mínimo/política, alta confirmada | cupones-s02-1440.png |
| MK-005-S03 | /cupones/:couponId/editar | Identidad, promoción/usos conservados; rechazo/incertidumbre | cupones-s03-1440.png |
| MK-005-S04 | /cupones/:couponId | Configuración y uso; editar/límites/estado | cupones-s04-1440.png |
| MK-005-S05 | /cupones/:couponId/limites | Cero, Sin límite y No disponible diferenciados; retorno | cupones-s05-1440.png |
| MK-005-S06 | /cupones/:couponId/estado | Cancelar/rechazar conserva estado/usos; confirmar cambia estado | cupones-s06-1440.png |
| MK-006-S01 | /promociones | Estado/modalidad/paginación, edición/detalle y contexto | promociones-s01-1440.png |
| MK-006-S02 | /promociones/nueva | Beneficio/prioridad/vigencia/canales/política explícitos | promociones-s02-1440.png |
| MK-006-S03 | /promociones/:promotionId/editar | Capacidad de modalidad, propuesta/error/conflicto conservados | promociones-s03-1440.png |
| MK-006-S04 | Formulario + /alcance | Productos completos/SKU; cancelar solo selección temporal | promociones-s04-1440.png |
| MK-006-S05 | /promociones/:promotionId | Configuración/alcance y acciones reales | promociones-s05-1440.png |
| MK-006-S06 | /promociones/:promotionId/estado | Confirmación, rechazo e historial que bloquea modalidad | promociones-s06-1440.png |
| MK-007-S01 | /recomendaciones | Estado/tipo/paginación y dos entradas de alta diferenciadas | recomendaciones-s01-1440.png |
| MK-007-S02 | /recomendaciones/nueva/venta-cruzada | Complementos activos sin origen/repetidos y orden | recomendaciones-s02-1440.png |
| MK-007-S03 | /recomendaciones/:ruleId/editar | Tipo/identidad/candidatos, conflicto y errores | recomendaciones-s03-1440.png |
| MK-007-S04 | /recomendaciones/nueva/upselling | Criterio sin default por candidato, justificación ≤500 | recomendaciones-s04-1440.png |
| MK-007-S05 | Formulario + /productos | Excluye origen/inactivos/añadidos; confirma o cancela conservando borrador | recomendaciones-s05-1440.png |
| MK-007-S06 | /recomendaciones/:ruleId | Origen/tipo/prioridad/vigencia y candidatos ordenados | recomendaciones-s06-1440.png |
| MK-007-S07 | /recomendaciones/:ruleId/estado | Confirmar/cancelar/rechazar/consultar resultado, candidatos conservados | recomendaciones-s07-1440.png |

## Comportamiento e integración

Página → componentes → hooks → puerto/service → adapter mock → fixtures. Modelos de presentación explícitos; IDs locales no son UUID contractuales. Un punto de composición por servicio selecciona el adapter siguiendo Pricing, sin flags de API en componentes. No hay HTTP directo, any ni HEX locales en Promotions.

Mutaciones en memoria de la pestaña: **recargar reinicia los datos**. No se alteran pedidos/stock/precios/pagos. Layouts anidados conservan el formulario al abrir/cancelar selectores; selección temporal se aplica solo al confirmar. Salir con borrador pide Seguir editando/Descartar, incluido Atrás. Guardando bloquea controles, doble envío y descarte. createBrowserRouter/RouterProvider reemplazan el wrapper BrowserRouter para utilizar el bloqueo de React Router, preservando raíz/Precios/galería DEV/404.

Cupones: trim/mayúsculas ASCII, código A–Z/0–9/guion/guion bajo y unicidad excluyendo el propio cupón. Promoción debe ser de modalidad cupón. Límites opcionales enteros positivos; ausencia explícita = Sin límite; uso no recibido = No disponible; cero confirmado = 0. Cambiar límite no recalcula disponibilidad ni borra consumo. Política configurada sin restitución de pedidos. Nueva promoción de modalidad cupón aparece en la sesión y la asociación bloquea su modalidad.

Promociones: porcentaje (0,100] o monto positivo, prioridad positiva, inicio/fin Lima válidos, fin posterior, canal y alcance explícitos. Política exclusiva inicial normativa. Producto completo permanece como productId, sin expansión a SKU. Modalidad editable solo con capacidad informada true; false/ausencia bloqueados. Mock revalida asociación e historial de activación, incluso después de desactivar.

Recomendaciones: edición conserva tipo; cambio de origen producto/categoría pide confirmación. Productos activos, sin duplicados ni origen específico; orden positivo. Upsell requiere uno de cuatro criterios normativos por candidato, sin default ni comparación por precio; justificación opcional ≤500. Precio y disponibilidad **No disponible** por D-REC-01/02, sin sumar SKU ni agregar/reemplazar pedidos.

Estados: carga/vacío/error/ausencia/acceso distintos. Rechazo conserva propuesta/registro; conflicto exige consultar/revisar. Resultado incierto bloquea reenvío automático: edición/estado consultan registro; Cupones puede localizar alta por código único en el demo. Creaciones de campañas/reglas sin ID confirmado requieren buscar en listado; no se promete API de recuperación. La búsqueda de 100 cupones/igualdad de snapshots es solo estrategia de este demo.

Escenarios DEV + modoRevision=1: loading/empty/error/missing/session/forbidden; saving/save-error/rejected/conflict/unknown-result; selection-empty/selection-error/unknown-capability y usage-unavailable donde aplican. Producción ignora habilitación. No hay controles técnicos en navegación comercial. Acceso simulado no acredita autenticación real.

**BLOCKED_CONTRACT:** operaciones administrativas provisional-internal; provider ejecutable/URL/auth/grants y mapping DTO reales sin verificar. D-REC-01/02 bloquean enriquecimientos, no administración. API real: NO EJECUTADO. Docs/Backend: sin modificaciones.

## Diferencias de fuentes

| Fuente / problema | Corrección/propuesta en React | Owner pendiente |
|---|---|---|
| MK005 cita DESIGN1.0; vigente1.1 | Theme existente1.1 | Cueva/Vera |
| HTML S01/S04 colorean Activo/Inactivo ordinario | Badge neutral, DESIGN §4.1.1/DS-C14 | Vera |
| HTML Material Symbols/JetBrains/tamaños/decoraciones | Inter/Oswald/Tabler y defaults, sin HEX locales | Vera |
| RUN10 HTML difiere de fixture mínimo/vigencia | Fixture component-spec005 §13 para demo; homologación pendiente | Cueva/PO |
| tasks005 T11 pide filtrar RUN10; spec/API estado/paginación | Sin búsqueda remota no publicada | Cueva/Taco |
| Issues/HTML sugieren búsquedas amplias; spec006/007 delimita filtros | Estado/modalidad o estado/tipo; búsqueda local en selector mock | Cueva/providers |
| D-REC-01/02 abiertos | No disponible, sin precio/stock ficticio | Owners contratos/PO |
| Plan/tasks aprobación pendiente pese a HTML | Entrega provisional según issues; sin APROBADO/VALIDATED | Cueva/Vera/PO |

## Archivos y responsabilidad

Dentro de src/features/promotions:

- services/{coupon,campaign,recommendation,catalog}Repository.ts: tipos de presentación y puertos.
- services/{coupon,campaign,recommendation,catalog}Service.ts: composición de adapters.
- services/couponPresentation.ts, couponValidation.ts, campaignValidation.ts, recommendationValidation.ts, administration.ts: semántica/contexto/validación/normalización/errores.
- mocks/coupons.ts, campaigns.ts, recommendations.ts, catalogChoices.ts: fixtures tipados deterministas.
- adapters/mockCouponRepository.ts, mockCampaignRepository.ts, mockRecommendationRepository.ts, mockPromotionCatalogRepository.ts: memoria, revalidación, filtros, escenarios y vínculo cupón/promoción.
- hooks/useCoupons.ts, useAdministrationRead.ts: consultas cancelables y resultados obsoletos.
- hooks/useCouponForm.ts, useAdministrationEditor.ts, usePromotionCommand.ts, useUnsavedChanges.ts: borradores, validación, single-flight, reconciliación y navegación.
- components/CouponForm.tsx, CouponSummary.tsx, CouponStateDialog.tsx: formulario, consulta y confirmación de cupón.
- components/CampaignScope.tsx, RecommendationCandidates.tsx: alcance y candidatos con orden/criterio/justificación.
- components/AdministrationStateDialog.tsx, EditorMessage.tsx, UnsavedChangesDialog.tsx: estado compartido, recuperación y descarte.
- pages/CouponsPage.tsx, CouponDetailPage.tsx, CouponFormPage.tsx: seis vistas de Cupones.
- pages/CampaignsPage.tsx, CampaignDetailPage.tsx, CampaignEditorLayout.tsx, CampaignFormPage.tsx, CampaignScopePage.tsx: seis vistas de Promociones.
- pages/RecommendationsPage.tsx, RecommendationDetailPage.tsx, RecommendationEditorLayout.tsx, RecommendationFormPage.tsx, RecommendationSelectorPage.tsx: siete vistas de Recomendaciones.

Transversales y evidencia:

- src/app/routes/AppRoutes.tsx, src/main.tsx: router de datos/bloqueo sin provider duplicado.
- src/app/routes/productRoutes.tsx, productPages.tsx: registro y carga diferida.
- src/app/navigation/navigation.ts, ApplicationNavigation.tsx: tres enlaces/grupos funcionales, conserva Precios/demos.
- tests/coupons.spec.ts, coupon-write.spec.ts, campaigns.spec.ts, recommendations.spec.ts, promotions-states.spec.ts: **29 pruebas nuevas** de flujos, errores, teclado, estados, guardas, selectores y contexto; conserva las 13 existentes.
- docs/evidencias/{cupones,promociones,recomendaciones}-sXX-1440.png: **19 capturas**; diez evidencias históricas regeneradas por sus suites con la navegación actual.
- README.md, este reporte y PR_PROMOTIONS_CUEVA.md: ejecución/rutas/alcance, fuentes/pruebas y descripción de revisión.

## Validaciones

Instalación PASS: npm ci --prefer-offline --fetch-retries=0 --fetch-timeout=20000, 191 paquetes. Node24.11.1/npm11.6.2. Chromium instalado por npx playwright install chromium. Primer intento con red limitada no terminó; se reinstaló con éxito y se utilizó formatter3.8.1 de caché, sin cambiar dependencias/lockfile.

| Comprobación | Resultado |
|---|---|
| npm run typecheck | PASS, salida0 |
| npm run build | PASS, salida0, Vite8.3.4 |
| npm run lint | PASS, salida0 |
| npm test -- --workers=2 | PASS: 42 pruebas, salida0, 3.1 min (13 existentes + 29 nuevas) |
| Pruebas tras ajuste visual | 13 pertinentes PASS; 3 recorridos de evidencia PASS; captura de diálogo final PASS (1 prueba adicional) |
| Visual1440×900 | PASS de inspección de las 19 vistas; criterio completo visible y diálogos capturados tras transición, sin overflow de página |
| git diff --check | PASS, salida0; avisos LF/CRLF |
| Preview producción4173 | PASS: tres listados y tres altas; revisión DEV ignorada, galería inaccesible y cero errores de página |
| API/auth/grants reales, despliegue, Actions | NO EJECUTADO |

Los fallos intermedios se inspeccionaron: labels/selección de botones durante cierre de modal/nombre de acción y región de carga en tests. Se corrigieron labels, selectores y problemas de foco/conservación de diálogo/guardado confirmado frente a guardas. No se cambiaron pruebas existentes para ocultar fallos.

## Matriz y pendientes

- [x] Fuentes/rutas/revisión verificadas y aprobación pendiente declarada.
- [x] Git inicial/branch/cambios inspeccionados; 19 pantallas identificadas.
- [x] Typecheck/build/lint ejecutados.
- [x] Suite completa42 PASS; pruebas pertinentes tras ajuste visual PASS.
- [x] Las 19 vistas y la última captura de cupón inspeccionadas; evidencia final registrada.
- [x] Estados y errores con mocks, sin HTTP visual/HEX/any/contratos inventados.
- [x] Docs/Backend preservados y P0 registrados.
- [ ] API/grants/despliegue: NO EJECUTADO.
- [ ] Publicación, revisión independiente y aprobación UX: PENDIENTE.

SAFE_NOW: UI/mocks de19vistas completos. NEEDS_DECISION: homologación documental y aprobación UX/funcional; BLOCKED_CONTRACT: HTTP real y enriquecimientos D-REC-01/02.

Publicación autorizada en `cueva` mediante commits de base compartida, flujos y validación; PR hacia master con Refs #7/#8/#9 mientras falte revisión. Solicitar revisión UX a LeonardoVera y técnica/funcional a mrcastilla8, conforme a los issues y responsabilidades. No se afirma DoD global cerrado hasta revisión y aceptación de limitaciones. Mobile/tablet, backend, auth y auditoría WCAG exhaustiva fuera de alcance.

**Estado: MOCK_INTEGRATED provisional de los tres MK; publicación/revisión de issues pendiente.**

## Actualización: correcciones locales posteriores a PR #22

**Estado actual: MOCK_INTEGRATED, revisión humana pendiente.** Trabajo local en `cueva`, desde `master`/`origin/master` verificado en `421951b30d506589e43dcc4c07b4194eea2026b8`, merge de PR #22. Se sincronizó mediante avance directo, sin merge adicional de contenido. Git inicial limpio; cambios de esta iteración conservados sin commit, push, PR nueva, comentarios, cierre de issues ni merge remoto. PR #22 ya estaba fusionada por el owner, lo que no acredita aprobación UX. Los issues #7/#8/#9 y su aceptación independiente siguen pendientes en la última consulta remota.

### Qué se confirmó y corrigió

| Solicitud | Evidencia del problema | Corrección y comprobación |
|---|---|---|
| Desacoplar mocks | Cupones importaba funciones de otro adapter; promociones/recomendaciones consultaban fixtures de Catálogo | Composición única `promotionServices.ts`; factories con dependencias por puertos. Dobles de los cuatro servicios sustituidos independientemente, con IDs externos a fixtures. |
| Reasignar cupones | Con cupón A→B, A tenía cero asociaciones vigentes y seguía bloqueada | Consulta de asociaciones actuales paginada, separada del historial simulado de activación/uso. Pruebas de última asociación, varias asociaciones, cupón inactivo, rechazo e historial. |
| Capacidad desconocida | Guardar otros campos convertía `undefined` en `true` | La edición conserva hechos desconocidos; no admite cambio de modalidad sin capacidad explícita `true`. Prueba directa de edición y cambio rechazado. |
| Validaciones de adapter | Alta/edición admitían monto cero/negativo/no numérico y política inválida | `couponInputErrors` y normalización comunes al formulario y al mock. Rechazos directos sin mutación. También se comprueban enums de estado/modalidad/tipo/criterio y booleanos de combinación. |
| Escenarios en interfaces | Puertos recibían `scenario`; no se encontró bypass de parámetros DEV en producción | Puertos reciben exclusivamente datos y `AbortSignal`. Fallos en decoradores `dev/`; la selección de escenarios exige DEV y `modoRevision=1`. Prueba de la versión compilada. |
| Diez capturas previas | Las suites sobrescribían PNG de Foundation/Pricing al ejecutar pruebas | Se conservan los PNG de HEAD: los antiguos previos a PR #22 incluían navegación/demo ya retirados. Nuevas ejecuciones escriben artefactos en `test-results/`; opt-in restringido a los tres MK propios. Ningún PNG versionado cambia en esta corrección. |
| Revisión visual | Campos de origen de recomendaciones contiguos, sin gap | MK-007-S02/S03/S04: `Stack gap=md` existente de Mantine, 16 px según DESIGN §4.3. Se conserva el resto de las vistas; comprobación automática y captura inspeccionada. |

La elegibilidad se simula en el servicio, nunca en React. Requiere promoción inactiva, sin activación previa, sin cupones asociados actualmente y sin uso histórico confirmado. Un cupón inactivo continúa siendo una asociación. Una reasignación fallida no elimina la anterior. El contador de usos del cupón se conserva: trasladarlo no constituye un nuevo consumo de la promoción destino. La simulación registra observaciones para no atribuir otra vez los usos anteriores; si contador/asociación cambian externamente sin información suficiente o el uso es desconocido, mantiene historial desconocido. Los hechos iniciales pertenecen a fixtures del simulador. En la integración real, la capacidad y su revalidación siguen siendo responsabilidad del provider, no una inferencia autoritativa de esta simulación.

No se implementaron HTTP, endpoints, DTO comerciales, auth, grants, consumo, restitución, stock ni cálculo de precio. El periodo de la promoción se mapea a las referencias del mock con hora de Lima; el futuro adapter debe mapear el periodo oficial recibido, no reutilizar fixtures. La sustitución con dobles acredita el aislamiento de los puertos; no acredita transacciones ni comunicación con APIs reales.

### Inventario de cambios y dependencias

Se reutilizaron los contratos de presentación, validadores, hooks, Mantine, Tabler y componentes existentes. Se comprobó que los archivos nuevos cubren responsabilidades antes ausentes; no duplican endpoints, componentes visuales ni un Design System.

| Archivos dentro de Frontend | Motivo |
|---|---|
| `src/features/promotions/services/promotionServices.ts` (nuevo) | Composición central, sustitución por puerto y enlace de referencias/asociaciones; instancia aislada por factory. |
| `services/{coupon,campaign,recommendation,catalog}Service.ts` | Aliases de la composición, sin selección separada de mocks por feature. |
| `services/couponRepository.ts`, `administration.ts`, `catalogRepository.ts` | Retirar escenarios de los contratos productivos; conservar modelos/errores/reglas comunes. |
| `services/couponValidation.ts`, `campaignValidation.ts`, `recommendationValidation.ts`, `couponPresentation.ts` | Validación compartida, enums/normalización y traslado de controles DEV fuera de presentación productiva. |
| `adapters/mock{Coupon,Campaign,Recommendation,PromotionCatalog}Repository.ts` | Factories con memoria aislada, inyección de referencias, asociaciones vigentes y validación; sin importaciones entre adapters. Catálogo solo lee sus propios fixtures. |
| `mocks/promotionHistory.ts` (nuevo) | Historial propio del simulador, sin inventar un campo o DTO HTTP. Conservar `true`/`false`/desconocido. |
| `dev/demoScenarios.ts`, `demoServices.ts`, `reviewServices.ts` (nuevos) | Tipos/parsers DEV, decoradores de fallos y selección del servicio de revisión; sin parámetros DEV en los puertos. |
| `hooks/useAdministrationEditor.ts`, `useCouponForm.ts`, `useCoupons.ts`, `components/CouponStateDialog.tsx` | Adaptar llamadas a puertos sin escenarios y conservar reconciliación/revisión explícita. |
| `pages/{CampaignDetailPage,CampaignEditorLayout,CampaignsPage,CouponDetailPage,CouponFormPage,CouponsPage,RecommendationDetailPage,RecommendationEditorLayout,RecommendationsPage}.tsx` | Consumir composición/decoradores y nuevas firmas; conservar estructura visual, estados y navegación. |
| `pages/RecommendationFormPage.tsx` | Único ajuste de composición visual: 16 px entre los dos campos de origen. |
| `tests/promotions-adapters.spec.ts` (nuevo) | 22 pruebas directas de sustitución, validación, reasignación/historial, aislamiento, fallos y cancelación. |
| `tests/promotions-visual.spec.ts` (nuevo) | Un recorrido de las 19 vistas: tokens/geometría/diálogos y capturas para revisión humana. |
| `tests/support/evidence.ts` (nuevo) | Destino de artefactos y actualización deliberada exclusivamente de evidencias de Cueva. |
| `tests/{campaigns,coupon-write,coupons,recommendations,foundation,foundation-review,pricing}.spec.ts` | Cambiar solo el destino de capturas; mismas aserciones y recorridos. Justificación de cambios en pruebas ajenas: impedir sobrescritura de evidencia del equipo. |
| `README.md`, este reporte y `PR_PROMOTIONS_CUEVA.md` | Arquitectura/sustitución, evidencia vigente, límites y borrador local para futura revisión. |

Sin cambios en `src/theme/`, `src/components/shared/`, `src/app/`, Foundation, Pricing, dependencias ni lockfile. Docs y Backend permanecen de solo lectura. Los diez PNG históricos y los 19 PNG versionados permanecen idénticos a HEAD. Las nuevas capturas quedan en los artefactos locales de la suite.

### Contraste visual de las 19 vistas

Fuentes: los 19 `ux/mockups/MK-00{5,6,7}/prototipo/mk_00*_s*.html`, sus `component-spec.md`/`plan.md`/`tasks.md`, DESIGN 1.1.0 §§4–12, UX Guidelines/Decisions 2.0 y los requisitos enumerados al inicio. Se volvió a verificar Docs: `lab/lopez` en `80eb28c324e77bbafe27ee01803335b03c3e5417`, `origin/master` en `be5c2db16aca6d6d18b3005a2da4205f724038e3`; sin diferencias en estas carpetas normativas/contratos entre ambas referencias. No se editó ninguna fuente oficial.

Se contrastaron estructura, títulos, campos/acciones y reglas de los HTML con código, DOM y capturas actuales. No se afirma igualdad pixel a pixel con el HTML renderizado ni aprobación humana. Capturas Chromium tomadas con viewport 1440×900: páginas altas con fullPage y scroll vertical permitido por DESIGN; los tres diálogos se capturan solo dentro del viewport. Todas las imágenes se inspeccionaron; se verificó la captura final tras corregir el gap.

| Vista | Comprobación y diferencia que debe conocer UX |
|---|---|
| MK-005-S01 | Estado/paginación/tabla/acciones legibles; badges neutros frente a colores ordinarios del HTML, según DESIGN §4.1.1. |
| MK-005-S02 | Tres grupos de configuración y política explícita; ancho breve 640 px y scroll vertical. HTML ofrece otra densidad/rotulación; no se modificaron campos de negocio. |
| MK-005-S03 | Mismo formulario, código/promoción precargados, usos intactos y estado desde confirmación. Fixture RUN10 distinto de datos de muestra HTML: homologación pendiente con PO. |
| MK-005-S04 | Configuración y uso legibles, acciones completas; RUN10 como entidad real seleccionada en vez del ejemplo BIENVENIDA15 del HTML. |
| MK-005-S05 | Cero, Sin límite y No disponible distintos, política visible y retorno contextual; mismas reglas con distinta entidad de muestra. |
| MK-005-S06 | Diálogo de 480 px con entidad/impacto/estado, foco en Cancelar, sin recorte; conserva usos y no ejecuta pedidos. |
| MK-006-S01 | Estado/modalidad/tabla/paginación; ocho fixtures para casos históricos, frente a cuatro del HTML. Sin buscador remoto inventado. |
| MK-006-S02 | Campos completos en 880 px, estado/modalidad explícitos y canales/alcance/combinación; React agrupa beneficio-vigencia y canales-alcance de otra forma. Confirmar agrupación/densidad con Vera. |
| MK-006-S03 | Precarga, motivo de modalidad deshabilitada y guardado/cancelación; capacidad falsa/desconocida no se transforma en permiso. Misma diferencia de agrupación de S02. |
| MK-006-S04 | Producto completo y SKU distinguibles, selección/retorno conservados; selector vertical con checkboxes frente a composición de catálogo/resumen del HTML. Confirmar composición con Vera sin rediseñar por cuenta propia. |
| MK-006-S05 | Beneficio/prioridad/vigencia/canales, alcance y combinación; título conserva nombre, sin añadir porcentaje al nombre de entidad del HTML. |
| MK-006-S06 | Diálogo 480 px, foco seguro, explicación de impacto y conservación de historial; sin superposición de controles. |
| MK-007-S01 | Dos altas diferenciadas, estado/tipo/tabla; estado y tipo neutros. Sin parámetros/filtros comerciales no publicados. |
| MK-007-S02 | Origen por producto/categoría y candidatos; gap corregido a 16 px. React reúne identificación/origen: agrupación para revisión UX. |
| MK-007-S03 | Regla/criterio/orden/justificación visibles íntegramente; gap corregido, conserva tipo. Tabla de criterios utilizable con scroll vertical. |
| MK-007-S04 | Sin criterio ni origen preseleccionados; gap corregido y criterio obligatorio tras seleccionar candidato. HTML precargado es demo, no default de alta. |
| MK-007-S05 | Selección temporal de productos y confirmación/cancelación; exclusión comprobada de origen, repetidos e inactivos. Lista con checkboxes frente a filas/panel del HTML: pendiente de UX. |
| MK-007-S06 | Candidatos ordenados, criterio y justificación; precio/disponibilidad No disponible por D-REC-01/02. Se muestra la entidad seleccionada, no el fixture fijo de HTML. |
| MK-007-S07 | Diálogo de 480 px con entidad/impacto y foco; fixture de revisión ejercita Activar, otros recorridos de suite ejercitan Desactivar. |

Mediciones comunes: ancho de documento ≤1440, título a x=272 (sidebar 240 + padding 32), padding derecho/inferior 32 px, Oswald H1 32/40 en mayúsculas, Inter operativo y cloud `#F7F5F0`. Se reutilizan cards/campos/acciones del tema; no se introdujeron HEX, tipografías ni componentes shared nuevos. Márgenes, espaciados, componentes, estados, navegación, diálogos y overflow comprobados mediante suite/capturas; no es una auditoría WCAG exhaustiva.

### Evidencias y revisión de Vera

El recorrido `tests/promotions-visual.spec.ts` guarda 19 PNG y `mediciones-19-vistas.json` en `test-results/promotions-visual-19-vista-47547-1-capturas-para-revisión-UX/`. Son artefactos locales, regenerables y no versionados. Las evidencias previas de `docs/evidencias/` permanecen preservadas; el README documenta la actualización deliberada de los tres MK propios.

**Visto bueno de Vera: PENDIENTE.** La PR anterior no tenía revisión UX registrada en la última consulta. No se contactó a Vera ni se publicó una nueva PR, respetando la instrucción de Axel de no enviar nada hasta autorización. Queda preparada localmente la revisión: las 19 rutas/capturas, mediciones, agrupación de campos, composición de selectores, homologación de fixtures, estados/foco y las discrepancias anteriores. Owner de apariencia/agrupación: Vera; datos/reglas: Cueva/PO; contratos: provider correspondiente. Solicitar aprobación explícita cuando Axel autorice la coordinación externa.

### Validaciones de esta iteración

| Verificación | Resultado |
|---|---|
| `npm run typecheck` | PASS, salida 0. |
| `npm run build` | PASS, salida 0, compilación TypeScript y Vite 8.3.4. |
| `npm run lint` | PASS, salida 0. |
| `npm test -- --workers=2` | PASS, 65 pruebas, 2.8 min: 42 previas + 22 directas de adapters + 1 recorrido visual de 19 vistas. Foundation/Pricing incluidos sin regresiones detectadas. |
| Visual 1440×900 | 19 vistas inspeccionadas y mediciones PASS; aprobación UX humana PENDIENTE. |
| Producción local 4173 | PASS: tres listados ignoran `empty`, cuatro altas ignoran `session`, controles de alta habilitados, Foundation inaccesible y cero errores de página. |
| Escenarios DEV en bundle de Promotions | No se encontraron ramas de selección/error/capacidad demo tras compilación; la factory mock de datos permanece por ser MOCK_ONLY. |
| `git diff --check` y alcance | PASS, salida 0; sin cambios en PNG versionados, theme/shared, shell, código Foundation/Pricing, dependencias o lockfile. |
| API/auth/CI remoto/despliegue/revisión humana | NO EJECUTADO en esta iteración. |

Los fallos de comprobación intermedios se corrigieron: imports/firmas al trasladar escenarios; en el nuevo chequeo visual, `status` también identifica mensajes informativos estables y por eso se espera solo la ausencia de mensajes de carga. En la comprobación de producción se corrigió una aserción que exigía un alert inexistente. No se debilitó ninguna aserción previa ni se ocultó un fallo de aplicación. El servidor local existente sirvió la versión recompilada; intentar levantar otro en el mismo puerto rechazó correctamente la duplicación.

**Pendientes externos:** autorización para publicar nueva PR a `master` (sin merge directo), revisión técnica y UX de Vera, aceptación de issues y homologación documental. **BLOCKED_CONTRACT:** provider/auth/grants/mapping administrativos reales sin verificar; D-REC-01/02 para precio/disponibilidad por producto. No se marca VALIDATED, API_INTEGRATED ni DoD global cerrado.

### Autorización posterior para publicar

Después de la validación local descrita arriba, Axel solicitó publicar los cambios en su rama `cueva` y abrir la PR hacia `master`. Se verificaron de nuevo el remoto, la rama y sus referencias: `HEAD`, `origin/cueva` y `origin/master` en `421951b30d506589e43dcc4c07b4194eea2026b8`, sin PR abierta previamente para esta rama. La restricción de no enviar cambios queda revocada para este commit, push y apertura de PR. Las referencias a trabajo sin publicar en la sección anterior describen el momento de las comprobaciones locales. La revisión humana y la aceptación de los issues siguen pendientes; no hay autorización para merge directo.

## Corrección del 12 de octubre: avisos y consumo neutral de servicios

**MOCK_INTEGRATED / MOCK_ONLY.** Correcciones solicitadas por Axel para MK-005/006/007 en su rama local `cueva`, con seguimiento de `origin/cueva`, desde `f914478b028d01cc00bd011844ebfe3ccc426df7`. Git inicial limpio. La validación se completó como cambios locales sin commit ni push; después Axel autorizó publicarlos con mensajes de commit en español. La PR #23 ya existe para `cueva` hacia `master`: se amplía esa entrega y se actualiza su descripción. Las autorizaciones/publicaciones de las secciones anteriores corresponden a aquella iteración.

Los nueve avisos de demostración se reúnen en `PromotionDataNotice`, reutilizando el mismo FeedbackAlert y sus textos/ubicaciones. Su visibilidad depende del origen de la composición, sin flags por pantalla. Las confirmaciones de guardado/estado usan texto neutral. Con origen `backend`, los avisos desaparecen y los escenarios de revisión se ignoran incluso en DEV.

`usePromotionServices` expone los puertos configurados, consulta de confirmación y reintento. Páginas, hooks de formularios y diálogos no importan `dev/`, interpretan escenarios ni conocen adapters. El resolver de revisión está ligado a la composición y conserva los decoradores existentes; no importa su instancia global, por lo que no crea un ciclo de ejecución. Las consultas comparan también su callback para descartar una respuesta de otro puerto. La carga de referencias del formulario de cupón reutiliza `useAdministrationRead`.

La conexión futura consiste principalmente en proporcionar los cuatro adapters verificados en `createPromotionServices` y seleccionar `createPromotionRuntime(promotionServices, "backend")` en el mismo punto de composición. En backend los puertos de confirmación son los mismos adapters; `prepareCreation` solo comprueba cancelación y no acredita permisos. Autenticación/autorización reales deben proceder del provider. No se implementaron HTTP, endpoints ni nuevos contratos.

### Fuentes e inventario

Lecturas: AGENTS/README/package/configuración y código real de Frontend. Docs se encontró en `../Productos-y-Ofertas-docs`, rama `master`, SHA `d0d9e37330d3426accf91158fe4febf7d41d4494`: DESIGN 1.1.0, UX Guidelines/Decisions 2.0 y component-spec de MK-005/006/007. Esta copia local no contiene los HTML ni validation-report de esos MK; no acredita aprobación documental actual. El alcance de las 19 vistas se comprobó en rutas y en la suite existente. No se cambian estructura visual, tokens, reglas ni validadores por esta refactorización.

Rutas de la tabla relativas a `src/features/promotions/`, salvo las que comienzan por `README`, `docs/` o `tests/`.

| Archivo | Cambio |
|---|---|
| `services/promotionServices.ts` | Origen y resolver central de servicios; selección DEV exclusivamente en composición mock. |
| `hooks/usePromotionServices.ts` (nuevo) | Acceso neutral a servicios, contexto transitorio y reintentos. |
| `components/PromotionDataNotice.tsx` (nuevo) | Único catálogo/renderizado de los avisos; ocultación automática con backend. |
| `dev/reviewServices.ts` | Resolver ligado a los puertos seleccionados; parsers/decoración/limpieza aislados de las páginas. |
| `dev/demoScenarios.ts` | Retirar el parser de mutaciones que quedó sin consumidores. |
| `dev/demoServices.ts` | Actualizar comentario del punto de selección; ninguna lógica del decorador modificada. |
| `hooks/useCoupons.ts` | Recibir CouponRepository y descartar respuestas de otro callback. |
| `hooks/useCouponForm.ts` | Guardar/reconciliar con repositorios inyectados; retirar imports DEV. |
| `hooks/useAdministrationRead.ts` | Verificar identidad de consulta además de clave para no mostrar datos del puerto anterior. |
| `hooks/useAdministrationEditor.ts` | Nombre neutral del puerto de confirmación; usarlo al consultar el resultado actual. |
| `components/CouponStateDialog.tsx` | Recibir puertos para cambio/confirmación; retirar escenario e imports DEV. |
| `pages/CouponsPage.tsx` | Listado/reintento neutral y aviso central. |
| `pages/CouponDetailPage.tsx` | Lectura/cambio/confirmación neutrales, aviso central y éxitos sin texto de simulación. |
| `pages/CouponFormPage.tsx` | Puertos y referencias neutrales; acceso por resultado de consulta y aviso central. |
| `pages/CampaignsPage.tsx` | Servicios/reintento neutrales y aviso central. |
| `pages/CampaignDetailPage.tsx` | Lectura/cambio/confirmación neutrales y aviso central. |
| `pages/CampaignEditorLayout.tsx` | Resolver/guardas/referencias y retorno sin interpretar escenarios. |
| `pages/CampaignFormPage.tsx` | Sustituir únicamente el aviso por su componente central. |
| `pages/RecommendationsPage.tsx` | Listado/referencias/reintento neutrales y aviso central. |
| `pages/RecommendationDetailPage.tsx` | Lectura/cambio/confirmación neutrales y aviso central. |
| `pages/RecommendationEditorLayout.tsx` | Resolver/guardas/referencias y retorno sin interpretar escenarios. |
| `pages/RecommendationFormPage.tsx` | Sustituir únicamente el aviso por su componente central. |
| `tests/promotions-visual.spec.ts` | Una prueba de regresión de la selección backend sobre las 19 vistas. |
| `README.md` | Uso de composición, avisos, puertos y límite de acceso real. |
| `docs/AVANCE_FRONTEND_CUEVA.md` | Este inventario y resultados actuales. |
| `docs/PR_PROMOTIONS_CUEVA.md` | Descripción en español de la PR #23 con el alcance final y la validación real. |

Los dos archivos nuevos cubren responsabilidades ausentes: distribución neutral de los servicios y aviso transversal a las páginas de estos MK. No duplican repositorios, decoradores ni shared. Adapters, fixtures, historial, validadores, theme, navegación, dependencias y evidencias versionadas permanecen sin cambios. Docs y Backend no se modificaron.

### Validación actual

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | PASS, salida 0, repetido tras corregir la nueva aserción. |
| `npm run build` | PASS, salida 0, TypeScript y Vite 8.3.4. |
| `npm run lint` | PASS, salida 0. |
| `npm test -- --workers=2` | 65 pruebas anteriores PASS; la nueva prueba falló inicialmente por exigir que todos los campos estuvieran habilitados. |
| `npm test -- tests/promotions-visual.spec.ts --workers=2 --grep 'composición backend' --output=test-results/backend-composition` | PASS, 1 prueba, 19 vistas. Se corrigió solo la aserción nueva: nombre/código y botón Crear habilitados; el origen conserva su bloqueo funcional hasta seleccionar tipo. |
| Cobertura final | Las 65 pruebas existentes y la nueva comprobación están verificadas; no se modificó ninguna aserción anterior ni se añadieron fixtures. |
| Visual 1440×900 | Recorrido de 19 vistas y mediciones PASS. Inspección manual de seis capturas: MK-005-S02/S06, MK-006-S02, MK-007-S02/S04/S07. Revisión UX independiente pendiente. |
| Aislamiento | Búsqueda sin coincidencias de imports `dev/`, parámetros de revisión o selección DEV en páginas/hooks/componentes. Selectores de escenarios ausentes en el chunk de Promotions de producción. |
| `git diff --check` | PASS; alcance revisado. |

La prueba nueva sustituye solo el origen de la composición en el módulo servido por Vite y reutiliza los puertos existentes como doble de servicio. Comprueba avisos ocultos, guardas DEV ignoradas y disponibilidad de las 19 vistas; no demuestra HTTP ni conexión a backend. Las 19 capturas/mediciones permanecen en `test-results/promotions-visual-19-vista-47547-1-capturas-para-revisión-UX/`; el resultado del reintento de la prueba nueva queda en `test-results/backend-composition/`.

Pendientes: adapters/contratos/auth/grants administrativos reales; D-REC-01/02 para enriquecimientos; revisión técnica/UX independiente. Ninguno se presenta como resuelto por esta corrección. Estado final: **MOCK_INTEGRATED**, publicación autorizada en `cueva` y revisión mediante [PR #23](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/23). La PR registra el SHA remoto y el estado de CI; no se autoriza ni declara merge a `master`.

## Corrección de lectura al crear cupones — MK-005-S02/S03

Trabajo en `cueva` desde `233706f4f90a39250aede516a01c01ccebcc3b08`, Git inicial limpio y sincronizado. Fuentes: petición de Axel en PR #23, AGENTS.md, README, hook/página/composición reales y pruebas existentes. El alcance es evitar una consulta sin ID; no modifica diseño, contratos ni reglas de negocio.

| Archivo | Cambio |
|---|---|
| `src/features/promotions/hooks/useCoupons.ts` | `useCoupon` acepta ID ausente; devuelve `null` sin llamar al puerto cuando no hay ID. Hooks/efectos siguen ejecutándose incondicionalmente. |
| `src/features/promotions/pages/CouponFormPage.tsx` | Pasar `couponId` directamente, sin sustituirlo por cadena vacía. |
| `tests/coupon-write.spec.ts` | Espiar las llamadas al puerto compuesto antes del montaje; alta sin lecturas, edición de `run10` con lectura. Sin fixtures nuevos ni alteración de resultados. |
| `docs/PR_PROMOTIONS_CUEVA.md` | Corrección y validación puntual en la descripción de la PR. |
| `docs/AVANCE_FRONTEND_CUEVA.md` | Este registro. |

La prueba nueva se ejecutó antes de cambiar el hook y falló con dos lecturas de `""`, confirmando que detecta la regresión. Después del fix pasó junto con todas las pruebas de Cupones. El tipo de la propiedad del espía se ajustó antes de la validación final de TypeScript; las aserciones de comportamiento permanecen iguales.

| Validación | Resultado |
|---|---|
| `npm run typecheck` | PASS, salida 0. |
| `npm run build` | PASS, salida 0, TypeScript + Vite 8.3.4. |
| `npm run lint` | PASS, salida 0. |
| `npm test -- tests/coupon-write.spec.ts tests/coupons.spec.ts --workers=2 --output=test-results/coupon-read-fix` | PASS, 13 pruebas en 38.2 s, incluida la nueva regresión y las 12 existentes de Cupones. |
| Visual 1440×900 | Capturas de S01–S06 regeneradas por las suites; S02 inspeccionada manualmente. Sin cambios visuales. |
| `git diff --check` | PASS. |
| Suite global / API HTTP / CI remoto | NO EJECUTADO como parte de esta corrección puntual. |

Publicación autorizada por Axel en `cueva` y actualización de PR #23; sin merge directo. Estado **MOCK_INTEGRATED / MOCK_ONLY**. Los contratos/adapters HTTP y la revisión independiente siguen pendientes; no bloquean la prevención de lecturas innecesarias.

## Sincronización con master y modo global mock/api — 12 de octubre

Axel solicitó incorporar los cinco commits nuevos de `origin/master` a `cueva`, conservar Pricing y los 19 flujos propios, compatibilizar la composición con `VITE_DATA_MODE` y validar antes de publicar. Git inicial limpio, `cueva`/`origin/cueva` en `64e077bbd74e2f309e47a5ca9a9ad11027f5437e`. Tras fetch, `origin/master` está en `9b0365c` (merge de PR #21). Se usa merge normal sin reescribir historial ni modificar master. GitHub confirmaba PR #23 abierta, sin merge automático por conflicto.

### Resolución y alcance

Solo `README.md` presentó conflicto de contenido. Se conservaron las rutas S01–S06, configuración, sustitución de adapters, reloj, límites de archivo/moneda y reportes de Pricing de master, junto con arquitectura, avisos y evidencia de Promotions de cueva. Se actualiza la referencia a PR #21 ya integrada según el historial Git. Los informes históricos de Vera no se reescriben.

Las rutas lazy, navegación de cinco destinos, shell, `CommercialModeGate`, `DataModeContext`, `dataMode.ts`, `main.tsx`, Vite y el código de Pricing se incorporan idénticos a `origin/master`. Las evidencias PNG versionadas también coinciden con master: antes de ejecutar los tests que escriben capturas de Pricing se conservó una copia y después se repusieron exactamente los bytes. Las nuevas 19 capturas propias y sus mediciones quedan en `test-results/`; no se sobrescribe la evidencia del equipo como parte de esta corrección.

La composición de Promotions usa el tipo `DataMode` y recibe el valor validado de `DataModeContext`. No lee otra variable, no conserva selección `mock/backend` y no inicializa memoria mock al importar el módulo. `getPromotionRuntime(mode)` conserva la instancia seleccionada; `createPromotionRuntime("api")` sin provider falla explícitamente. La factory `api` puede proporcionar los cuatro puertos juntos y sus errores se propagan sin fallback. El gate actual sigue bloqueando el módulo completo en api y evita cargar sus páginas/adapters. Los parámetros DEV solo se decoran en mock.

Cuando se disponga de los cuatro adapters HTTP oficiales, se inyectarán en `dependencies.api` dentro del punto central de composición y se habilitará la capacidad correspondiente del gate común. No se necesitan cambios de páginas/hooks/formularios. Esa habilitación futura no se realizó en esta entrega. Auth/grants reales deben provenir del provider; no se infieren de la configuración.

| Archivo propio de esta sincronización | Motivo |
|---|---|
| `README.md` | Resolver conflicto conservando ambas entregas y documentar la única configuración global. |
| `src/features/promotions/services/promotionServices.ts` | Composición por DataMode, inicialización bajo demanda y factory api sin fallback. |
| `src/features/promotions/hooks/usePromotionServices.ts` | Consumir el contexto global, manteniendo servicios/reintentos neutrales. |
| `src/features/promotions/components/PromotionDataNotice.tsx` | Visibilidad desde el mismo contexto global, sin importar una instancia mock. |
| `services/{coupon,campaign,recommendation,catalog}Service.ts` de Promotions | Eliminar cuatro aliases sin consumidores que seleccionaban mocks al importar. La búsqueda confirmó que no hay referencias restantes. |
| `tests/coupon-write.spec.ts` | Mantener el espía de regresión sobre el puerto seleccionado bajo demanda. Cero lecturas al crear, lectura al editar. |
| `tests/promotions-adapters.spec.ts` | Rechazo sin provider, propagación de fallo y composición conjunta de los cuatro puertos API. Los dobles no acreditan HTTP. |
| `tests/promotions-visual.spec.ts` | Conservar recorrido mock de las 19 vistas; adaptar el caso API a la barrera global real, sin bypass ni selección paralela. |
| `scripts/verify-production.mjs` | Ampliar el smoke de master a las 19 vistas propias en ambos builds, conservando Pricing S01 y su reintento. |
| `.github/workflows/frontend.yml` | Conservar validaciones/smoke mock/suite; añadir build api y smoke sin fallback al mismo job. |
| `docs/PR_PROMOTIONS_CUEVA.md`, este informe | Alcance final y evidencias actuales de PR #23. |

Fuentes leídas: AGENTS, README de ambas ramas, configuración, rutas/código y pruebas reales, informe `docs/INTEGRACION_VERA_MASTER.md`, estado de PR #23 y los cinco commits de master. Docs local `../Productos-y-Ofertas-docs/mockups/{DESIGN.md,ux/ux-guidelines.md,ux/ux-decisions.md}`: DESIGN 1.1.0 y UX 2.0; misma copia cuya referencia previa comprobada es `master@d0d9e37330d3426accf91158fe4febf7d41d4494`. No se modifica Docs ni Backend ni se interpreta esta sincronización como aprobación UX.

### Validación local de la sincronización

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | PASS, salida 0. |
| `npm run build`, `VITE_DATA_MODE=mock` | PASS, salida 0. |
| `npm run build`, `VITE_DATA_MODE=api` | PASS, salida 0. No acredita backend real. |
| `npm run lint` | PASS, salida 0. |
| `npm test`, `VITE_DATA_MODE=mock`, `CI=true` | PASS, **112 pruebas**, 3.7 min, dos workers como el workflow. Pricing, Foundation, 19 vistas propias, guardas, formularios/selectores, navegación y regresión del ID vacío incluidos. |
| `node scripts/verify-production.mjs mock` | PASS, 19 vistas de Promotions y Pricing S01, 1440 px, controles DEV ignorados, sin pageerror. |
| `node scripts/verify-production.mjs api` | PASS, las 19 vistas bloqueadas sin forms/tablas/diálogos ni avisos de datos simulados; Pricing sin provider y reintento explícito; cero requests a mocks/páginas bloqueadas. |
| Visual mock 1440×900 | Recorrido/mediciones/capturas de 19 vistas PASS; inspección manual de MK-005-S02, MK-006-S04 y MK-007-S07. Cinco destinos en navegación, sin overflow. |
| Alcance | Sin diferencias frente a origin/master en Pricing, app/shared, main/Vite/.env.example y PNG versionados. |
| Conflictos / `git diff --check` | Ningún archivo unmerged ni marcador pendiente; PASS. |

El resultado de GitHub Actions y la fusionabilidad del SHA publicado se registran en la descripción/checks de [PR #23](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/23), tras esperar su finalización. La existencia del workflow o la validación local no sustituyen ese resultado remoto. Se publica solo en `cueva`; no se hace merge de PR #23 ni se cierran issues.

Estado **MOCK_INTEGRATED / MOCK_ONLY**. En `api`, **BLOCKED_CONTRACT/provider ausente** se conserva explícito. Pendientes: contratos/adapters/auth/grants administrativos, D-REC-01/02, Q-013-01/02 y moneda de Pricing, revisión técnica/UX independiente.
