# Auditoría MK-013 — H01–H16 / MOCK_REPLACEABLE

Este informe conserva la ejecución histórica anterior al commit `0026543`. La entrega actual está publicada en [PR #21](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/21). La integración posterior con `master`, N03–N05 y la suite completa de los cuatro módulos se registran en [INTEGRACION_VERA_MASTER.md](INTEGRACION_VERA_MASTER.md); las menciones históricas a cambios locales/no push no describen el estado de esa PR.

Fecha de ejecución: **2026-10-11**, America/Bogota. Rama comprobada: **vera**. Base limpia: **c3ef0c9a1a4a171e6dc5131f1f4167c9f17c0e11**. Los cambios de auditoría permanecen locales sobre ese commit. El fetch confirmó `origin/master@dd8ac2bf41151efa3848c93a87eae83ff6c34a0c`; no se hizo merge de ramas de otros owners ni push.

**Resultado:** criterio local **MOCK_REPLACEABLE comprobado**; entrega **MOCK_INTEGRATED / MOCK_ONLY**. No se acredita API_INTEGRATED, aprobación UX humana, merge, despliegue o cierre del issue #15. S04 permanece PARCIAL / BLOCKED_CONTRACT por Q-013-01/02. El cambio de moneda exige política del provider y está bloqueado en el formulario.

## Fuentes y clasificación

Se verificaron AGENTS.md, README.md, package/configuración, árbol real y archivos de la entrega inicial. Docs sigue en **master@be5c2db16aca6d6d18b3005a2da4205f724038e3**, comprobado con `git ls-remote`. La carpeta hermana local conserva una estructura anterior; se usan las fuentes oficiales por SHA, de solo lectura.

Fuentes normativas de esa revisión: `requisitos/specs/SPEC-013-gestion-precios-individuales-masivos.md`, `requisitos/hu/HU-013-gestion-precios-individuales-masivos.md`, `requisitos/flujos/FLOW-013-gestion-precios-individuales-masivos.md`, `ux/wireframes/flows/WF-013-gestion-precios-individuales-masivos.md`; `ux/mockups/ux/propuesta-ux.md`, `ux-decisions.md`, `ux-guidelines.md` (UX 2.0); `ux/mockups/DESIGN.md` (1.1.0); `ux/mockups/MK-013/component-spec.md`, `plan.md`, `tasks.md` y HTML S01–S06. Se releyeron las reglas de importe/vigencia y los schemas relevantes de `contratos/http/openapi.yaml` (0.5.0). `validation-report.md`: NO ENCONTRADO; MK-013 continúa En revisión.

SAFE_NOW: desacoplar puertos/datos, normalizar modelos, inyectar reloj y descarga, corregir resolución/contexto/validación preliminar, aislar simulaciones y probar reemplazo. NEEDS_DECISION: contenido/admisión de archivos y política de cambio/conversión de moneda. No se modificaron Docs o Backend ni se inventaron endpoints/scopes.

## Matriz de hallazgos

| ID | Corrección comprobable | Verificación / límite |
|---|---|---|
| H01 | Resumen y desglose resuelven cada SKU para el canal solicitado; la fila del objetivo seleccionado coincide con el resumen. El precio administrativo del producto conserva el alcance global publicado | Prueba de mutación específica Retail y segundo adapter con precio Retail CHF diferente; ambos valores coinciden |
| H02 | S03 consulta precio en el instante de inicio mediante el puerto de lectura as-of; compara oferta contra el regular correspondiente y comprueba cobertura del intervalo consultado. El adapter vuelve a validar | Oferta igual/superior se rechaza; el segundo adapter permite 400 CHF contra regular futuro 500.005, aunque el actual es 310.125. La consulta preliminar no sustituye validación del provider |
| H03 | Moneda vinculada a la lectura y control readOnly. El validador rechaza conservar automáticamente una oferta al cambiar moneda | Casos USD/123/XXX frente a lectura PEN rechazados. No se convierten importes |
| H04 | Cada programación tiene targetId y se lista únicamente para ese objetivo; el contexto usa asociación productTargetId del catálogo, sin literal base. La resolución as-of aplica primero programación heredada y luego override del SKU, con intervalo común | Programa base y SKU por separado; el SKU programado conserva regular de referencia 150 y oferta propia 100; prueba de edición al target asociado al producto de otro catálogo |
| H05 | No se introduce excepción por tipo: superposición regular/oferta del mismo objetivo/canal rechazada conforme a SPEC §5 y CA-09 | Prueba de intervalos de ambos tipos, rechazo sin mutación; otro objetivo permanece independiente. Si el provider desea otra regla, debe revisar sus fuentes |
| H06 | La entrada no admite moneda arbitraria de tres caracteres: formato de código y coincidencia con moneda confirmada por lectura | No se inventa un catálogo de monedas habilitadas. Esa política/conversión no está publicada y permanece pendiente |
| H07 | Descripción preparada de PR reescrita alrededor del resultado final, base c3ef0c9, evidencia de reemplazo y límites actuales | PR usa Refs #15; no se declara publicación/cierre/aprobación |
| H08 | Reloj de exposición 17/10/2026 identificado; precios de octubre cubren ese instante, con fechas ISO sin expiración ficticia el día 15 | Prueba de pertenencia temporal y transición a precio sin oferta el 1/11 UTC; no se cambia DESIGN/SPEC |
| H09 | PricingRepository no contiene scenario ni tipos de simulación. Los escenarios viven en DemoControl + decorador dentro de mocks | Prueba estática de puerto/vistas/hooks; segundo adapter implementa el mismo puerto sin simulación |
| H10 | Targets se obtienen con listTargets a través de provider/puerto. Páginas y componentes productivos no importan priceTargets | Otro catálogo/UUID/SKU; sin producto ficticio de respaldo ni selección automática de una variante |
| H11 | prevalidate recibe ImportInput con File y allowPartial; cambio de archivo/política invalida revisión | Segundo adapter registra instancia File, nombre, bytes opacos y ambos valores de política. Mock normal devuelve BLOCKED_CONTRACT; decorador explícito puede aportar respuesta artificial sin parser |
| H12 | Único selector createPricingRuntime, modo mock/api. API sin factory usa adapter de error explícito; fallo de factory o lectura no carga el mock | Falta de API, fallo del otro origen y factory fallido; no fallback y ninguna solicitud de módulos mocks en la prueba alternativa |
| H13 | Clock es un puerto inyectado; modo API usa systemClock. validateSchedule recibe el instante de referencia y no importa mockClock | Dos relojes validan/rechazan el mismo inicio; fecha del sistema comprobada separadamente |
| H14 | ReportFile contiene Blob + filename del adapter. ReportDownloader gestiona click/object URL y revocación; páginas no fabrican data URLs, CSV ni nombres | Descarga resultado-cafeteras.csv con bytes exactos; fallo de descarga conserva filas confirmadas |
| H15 | Panel, textos/fecha/lote artificiales y fault injection dentro de mocks; product views solo presentan notice/ReviewTools inyectados cuando existen | Modo api de prueba carece de selectores artificiales aunque la URL tenga modoRevision. Gallery Foundation sigue siendo demostración separada |
| H16 | Modelo único de precio con decimales, código de moneda e ISO. Sin EditablePrice.view duplicado, S/ en valores internos ni fechas locales parseadas | Normalización verificada; formato se aplica en PriceSummary/PriceBreakdown; CHF y tres decimales permanecen intactos |

## Contratos pendientes y decisiones seguras

- **Q-013-01**, component-spec §13: faltan contenido/cabeceras/formato/límites del archivo. El puerto transporta archivo/política, pero el mock normal rechaza prevalidación; no se implementa parser, plantilla o contrato supuesto.
- **Q-013-02**, component-spec §13: política de admisión con errores parciales indefinida. El botón Confirmar importación sigue deshabilitado incluso con una respuesta ficticia válida. No se crea un lote de la selección.
- **Política de cambio de moneda**, OpenAPI PrecioUpdateRequest/ProgramacionPrecioRequest: se publica longitud de tres caracteres, sin catálogo de monedas habilitadas ni conversión/reinterpretación de ofertas. Se conserva la moneda leída y se bloquea el cambio. Owner de decisión: Pricing; no se completa esta regla desde JSX.
- **Adapter API/catálogo real**: no implementado/configurado. El puerto listTargets es interno de Frontend, no un endpoint nuevo de Pricing. Su futuro adapter deberá consumir Catálogo/identidades publicados y mapear DTOs. API ausente o fallida muestra error y no simula datos.
- La regla actual de superposición aplica al objetivo/canal y no publica una excepción regular/oferta; se sigue literalmente. No se atribuye validación real de backend a las comparaciones locales o al adapter de memoria.

## Prueba independiente de sustitución

`tests/adapters/alternatePricingRepository.ts` es una implementación independiente que solo consume puertos/tipos/validadores comunes, sin importar el mock original ni sus fixtures. Catálogo: Cafetera Andina y COF-STEEL-XL; producto UUID 88999999-cccc-4444-aaaa-777777777777; keys catalog-coffee-908 y catalog-steel-771; moneda CHF; lote import-coffee-55.

El harness `tests/harness/pricing-adapter.html/tsx` inyecta ese adapter por el mismo selector en modo api y monta el **mismo App/router/páginas**. No hay condiciones del harness en código productivo. Vite lo sirve en desarrollo; el build de producto no incluye HTML/entry de tests.

Casos ejecutados:

1. S01 → SKU/Retail: resumen y fila CHF 450.500 / oferta CHF 400.25; sin datos del catálogo anterior.
2. S02 → scope producto: lectura regular 310.125 y moneda CHF; confirma escritura en la asociación del catálogo alternativo, con una sola mutación.
3. S03 → oferta futura: lectura as-of 500.005; propuesta 400 válida, aunque supera el regular actual. Programa el target correcto.
4. S04 → archivo v1/política parcial → archivo v2/política total: los dos envelopes llegan al adapter; la revisión anterior se invalida. Confirmación permanece bloqueada.
5. S05 → lote alternativo: filas/contadores propios; descarga archivo con bytes/nombre del adapter. Rechazo del reporte no borra lo confirmado.
6. S06 → otro SKU/Retail/instante: usa la referencia de vigencia alternativa; vuelve a S01 con selección e instante.
7. API sin factory → error de configuración; origen alternativo fallido → error con última consulta marcada. No se muestra catálogo de reemplazo ni se habilita edición sobre dato antiguo.

El aviso del harness declara datos de prueba y ausencia de backend real. Que el selector se ejercite en modo api demuestra sustitución del puerto, **no** integración HTTP.

## Reloj y fechas para la exposición

- Clock real: fecha actual del sistema, ISO UTC; presentación America/Bogota.
- Clock mock: **2026-10-17T12:00:00Z**, equivalente a **17/10/2026 07:00 America/Bogota**. Vive exclusivamente en el dataset/factory de demo y se anuncia en pantalla.
- Precio global de octubre: intervalo **[2026-10-01T00:00:00Z, 2026-11-01T00:00:00Z)**; en Bogotá 30/09 19:00 → 31/10 19:00. Incluye el 17 de octubre.
- Desde 1/11 UTC hay una lectura global sin oferta; el histórico de septiembre es otro intervalo/snapshot.
- Los documentos normativos fijan reloj de fixture del 2/10. El del 17 es una variante local de exposición solicitada por el usuario, registrada explícitamente; no se modifican sus fuentes ni se desplazan reglas reales.
- Programar una vigencia futura no modifica anticipadamente la lectura actual; su resolución as-of ocurre en el adapter, no en componentes.

## Integración con otros owners

Se verificó `git diff --name-only` contra HEAD para AppRoutes, productRoutes, productPages y navegación: **sin modificaciones de esta auditoría**. Theme, shared y AppShell tampoco cambian. El único montaje transversal nuevo está en main.tsx: PricingProvider alrededor de App, que no registra rutas ni elimina funcionalidades.

La entrega inicial c3ef0c9 ya incluye cambios del data router y rutas frente a master; este informe no afirma que ese diff desaparezca ni garantiza ausencia de conflictos futuros. MK-001 y otros owners deben conservar sus registros al integrar. La descripción de PR hace explícita la revisión de ese montaje/diff y no atribuye a la auditoría nuevas rutas ajenas.

## Archivos creados/modificados

- `src/main.tsx`, `.env.example`: configuración única de entorno y montaje de runtime/provider.
- `src/features/pricing/services/pricingRepository.ts`, `pricingModels.ts`: catálogo/operaciones sin escenarios y modelo normalizado; File/política y reporte binario.
- `services/pricingService.ts`: selector mock/api con factory inyectable y fallo sin fallback.
- `services/pricingRuntime.ts`, `PricingContext.ts`, `browserReportDownloader.ts`: Clock, updates/read invalidation, contexto y descarga de Blob independiente.
- `services/pricingValidation.ts`, `pricePresentation.ts`: validación por referencia/moneda/reloj y formato exclusivo de presentación.
- `adapters/mockPricingRepository.ts`: nueva instancia por runtime, targets/intervalos/canal/programaciones scoped y bloqueos de archivo.
- `adapters/unavailableApiPricingRepository.ts`: errores de configuración explícitos en todas las operaciones.
- `components/PricingProvider.tsx`: carga de catálogo por puerto e inyección del runtime.
- `components/PricingPageFrame.tsx`: estados de catálogo, notice y herramientas opcionales sin importar fixtures.
- `components/PriceFilters.tsx`: targets como props desde servicio, sin fixture importado.
- `components/PriceSummary.tsx`, `PriceBreakdown.tsx`: decimales/moneda/ISO formateados al renderizar.
- `components/PriceEditForm.tsx`, `ScheduleForm.tsx`: moneda vinculada, validación de vigencia y confirmaciones sin copy artificial.
- `components/ImportRowsTable.tsx`: copy operativo independiente del origen.
- `hooks/usePricingContext.ts`, `useCurrentPrice.ts`, `usePriceEdit.ts`, `useHistoricalPrice.ts`, `usePriceSchedules.ts`, `usePriceImport.ts`, `usePriceBatch.ts`: consumo de servicios/reloj/descarga inyectados; ningún scenario ni target ficticio.
- `pages/CurrentPricePage.tsx`, `EditPricePage.tsx`, `PriceSchedulesPage.tsx`, `HistoricalPricePage.tsx`, `ImportPricesPage.tsx`, `PriceImportResultPage.tsx`: seis vistas sin fixtures; referencia de lote introducida por usuario, archivo/política reales en el puerto y reporte del adapter.
- `mocks/prices.ts`, `workflows.ts`: datos normalizados, clock de exposición, relación producto/SKU y propiedad de programaciones.
- `mocks/demoControl.ts`, `demoPricingDecorator.ts`, `PricingDemoPanel.tsx`, `createDemoPricingRuntime.ts`: escenarios/notices/herramientas aislados.
- Eliminados `components/PricingScenarioControl.tsx` y `services/pricingScenarios.ts`: su responsabilidad ahora está solo en mocks.
- `tests/pricing-audit.spec.ts`: 14 pruebas de hallazgos/reemplazo.
- `tests/adapters/alternatePricingRepository.ts`, `tests/harness/pricing-adapter.html/tsx`: adapter independiente y montaje de las mismas páginas.
- `tests/pricing-workflows.spec.ts`: actualizado por cambios funcionales autorizados (labels sin demo, fecha elegida explícitamente, descarga abstracta y puerto sin scenario); se conserva cobertura de conflicto, foco, cancelación y navegación.
- `README.md`, `docs/PR_MK013.md`, `docs/VALIDACION_MK013.md`, `docs/AUDITORIA_MK013.md`: arquitectura, fechas, límites, revisión e historial.
- `docs/evidencias/mk-013-*.png`: doce capturas de MK-013 actualizadas y cuatro nuevas del segundo adapter/error sin fallback. Los PNG ajenos de Foundation regenerados se restauran a HEAD.

## Validaciones ejecutadas

| Comprobación | Comando/evidencia | Resultado |
|---|---|---|
| Baseline c3ef0c9 | npm run typecheck, npm run lint; npm test -- --workers=2 | PASS; 34 pruebas antes de editar |
| TypeScript final | npm run typecheck | PASS, sin errores |
| Build final | npm run build | PASS; TypeScript + Vite 8.3.4, 7198 módulos |
| Lint final | npm run lint | PASS, sin errores/warnings propios |
| Suite completa | npm test -- --workers=2 | **48 PASS**, 1.2 min (34 previas actualizadas + 14 nuevas) |
| Último ajuste de resolución heredada | npm test -- tests/pricing-audit.spec.ts --workers=2 | **14 PASS**, 9.8 s; también typecheck/build/lint repetidos |
| Formato | Prettier --check sobre archivos existentes modificados/nuevos | PASS; se excluyen paths eliminados |
| Visual | 1440×900 Chromium, capturas fullPage y scrollWidth <= innerWidth | PASS en seis vistas y capturas alternativas; inspección visual sin overflow de página |
| Harness en producción | Inspección dist tras build | HTML/entry de tests ausentes |
| API/backend/auth/eventos | Pruebas de integración remota | **NO EJECUTADO / NO INTEGRADO** |
| Aprobación independiente | Revisión humana de UX/funcional/técnica | **PENDIENTE** |

La suite completa precede al último ajuste del mock para mantener el regular heredado al programar oferta específica del SKU; se volvió a ejecutar la batería afectada de 14 pruebas y los checks técnicos. No se cambiaron las expectativas de Foundation para ocultar fallos. En el recorrido S06 inicial se detectó un test que dependía de una fecha ficticia prellenada: ahora el usuario/prueba elige el instante explícitamente, y la suite completa pasó.

## Evidencia

Cuatro capturas adicionales:

- `mk-013-h09-h16-segundo-adapter-retail-1440.png`: otro SKU/CHF, precio Retail coincidente en resumen y fila.
- `mk-013-h02-segundo-adapter-programacion-1440.png`: oferta futura validada contra su referencia 500.005.
- `mk-013-h11-segundo-adapter-archivo-1440.png`: archivo y política del segundo origen; admisión bloqueada.
- `mk-013-h12-api-sin-fallback-1440.png`: fallo de otro origen con última consulta identificada, sin mock sustituto.

También se regeneraron las seis capturas S01–S06 y variantes de edición/conflicto/programación/error de fila/lote. Ninguna captura acredita backend o aprobación humana.

## Criterio MOCK_REPLACEABLE y pendientes

- [x] Pantallas/componentes/hooks productivos sin import directo de fixtures.
- [x] Puertos sin parámetros/tipos de escenarios artificiales.
- [x] Un único selector de adapters por entorno; ausencia/fallo de API sin fallback.
- [x] Targets/IDs/SKU obtenidos mediante puerto, con asociación de producto explícita.
- [x] Segundo adapter independiente utilizado por las mismas seis páginas.
- [x] Reloj, descarga y mensajes/herramientas de demo aislados.
- [x] Importes/códigos/fechas internos separados de formato visual.
- [x] Bloqueos Q-013-01/02 y política de moneda explícitos.
- [x] Git inicial y fuentes verificados; Docs/Backend conservados; rutas de otros owners no modificadas.
- [x] Typecheck/build/lint/tests/desktop realmente ejecutados.
- [ ] HTTP/auth/catálogo real y validación autoritativa de backend.
- [ ] Parser/admisión y política de cambio de moneda confirmados.
- [ ] Revisión independiente y publicación/merge autorizados.

Estado final: **MOCK_INTEGRATED / MOCK_REPLACEABLE local**; S04 **PARCIAL / BLOCKED_CONTRACT**. Mantener **Refs #15**, sin cierre automático.
