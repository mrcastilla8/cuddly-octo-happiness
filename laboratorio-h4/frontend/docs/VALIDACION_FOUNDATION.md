# Validación — Frontend UI Foundation v1

Fecha: 2026-10-09. Issue #1; PR #2 (`vera` → `master`). Estado técnico: **MOCK_INTEGRATED / MOCK_ONLY**. Aprobación humana pendiente. Este reporte sustituye la narración incremental anterior y registra la corrección de FND-01 a FND-06.

## Revisiones y fuentes

- Base entregada y auditada: `ceee9d203581b28d6ff8148e951837ec6d000fec` (publicada en `vera`).
- Correcciones: diff de la PR a partir de esa base; el SHA exacto de cada entrega está en su historial y en `validation-commit.txt` del workflow. Las comprobaciones locales corresponden al árbol con las correcciones indicadas, no se atribuyen al commit anterior.
- Commit local del código corregido y validado: `95722ff3d1cab2d7eb8356a6ee36b2e813b5aafe`. La actualización posterior que registra este SHA y el bloqueo remoto es exclusivamente documental.
- Fuente visual: Docs `master`, `be5c2db16aca6d6d18b3005a2da4205f724038e3`, `ux/mockups/DESIGN.md` **1.1.0**.
- UX: `ux/mockups/ux/ux-guidelines.md` y `ux-decisions.md` 2.0. Piloto: `ux/mockups/MK-013/component-spec.md`, `plan.md`, `tasks.md`, HTML `prototipo/mk_013_s01.html`; requisitos en `requisitos/specs/`, `hu/`, `flujos/`, wireframe en `ux/wireframes/flows/`.
- Contratos de referencia, sin integración: `contratos/http/openapi.yaml`, `catalogo-errores.md`; gobernanza: `EQUIPO_Y_RESPONSABILIDADES.md`.
- Fuentes Frontend: `AGENTS.md`, README, guía de implementación; issue #1 y comentario de auditoría de PR #2 por `mrcastilla8`.

La consulta remota de Docs es solo lectura. El checkout local de Docs permanece en `vera/b640b7f`; no se modificó ni se promovió como revisión vigente. Los HTML ahora existen en `master`; no hay validation-report en el inventario consultado. Su existencia no implica aprobación humana del mockup. S01 se utiliza como piloto provisional YELLOW, con datos ficticios y diferencias explícitas de apariencia/alcance.

## Resultado FND-01–06

| ID | Corrección / evidencia | Estado |
|---|---|---|
| FND-01 | Theme contrastado con DESIGN 1.1.0; trazabilidad en `designSource`; «Activo» neutral en listado/detalle; controles y estados con tokens | Implementado; revisión humana pendiente |
| FND-02 | Instalación y controles completos; workflow de PR que adjunta SHA/capturas/diagnósticos; descripción con matriz de issue | Validación local abajo; Actions pendiente de publicar/ejecutar |
| FND-03 | README y guías usan rutas vigentes y fuente fijada; base entregada, límite S01/mocks y revisión independiente explícitos | Implementado |
| FND-04 | Shell con Outlet, navegación y rutas de producto/demostración separados | Implementado; sin ampliar funciones |
| FND-05 | Región tabular etiquetada y operable por teclado, mínimo de composición, wrapping y caso extenso | Implementado y recorrido de regresión |
| FND-06 | URL posee filtros aplicados; el borrador se reinicia al cambiar contexto por historial; regresión Atrás/Adelante/recarga | Implementado y recorrido de regresión |

### Contraste del theme con 1.1.0

La comparación con la fuente anterior 1.0.0 muestra la incorporación de §4.1.1 (gobernanza cromática), aclaraciones DS-C14/19 y variantes de acción. Los HEX, tipografía, geometría, radios y espaciados consumidos por Foundation se conservan; no se agregaron tonos nuevos.

- «Activo»/«Inactivo» son estados administrativos ordinarios: se retiró success en `ListDemo`, incluida la consulta Drawer. Neutral usa los tokens de superficie/texto/borde. Success se conserva en feedback de resultados confirmados o fixtures de filas confirmadas, no como categoría.
- KPI, origen y tipo permanecen neutrales. Info representa información/seguimiento, warning atención/resultado parcial, error fallo/acción destructiva. La galería de variantes está identificada como muestra, no como datos comerciales reales.
- Botón primario: naranja con ink; hover/pressed oscuro con inverse; foco signal; sin desplazamiento. Secundarios/terciarios conservan variante; destructivo usa error-strong. Los labels largos envuelven. Checkbox/radio checked usan selection-background suave, indicador primary-hover y símbolo ink conforme a la política de selección §4.1.1, sin fondo naranja vivo.
- Loader/skeleton quedan neutrales; Drawer utiliza superficie blanca y sombra dialog del token. Inputs conservan borde de error y foco independiente. Se mantienen Inter/Oswald locales, Tabler currentColor, header 64/sidebar 240/padding 32, cards planas, radios y fuentes exactos.
- No se copiará color decorativo, anotación MK/HTTP, usuario de screenshot o capacidad no publicada del HTML. Tres métricas por fila en el piloto siguen DS-C19. No se calculan ahorro, precio final, stock o cascada comercial en el navegador.

### Arquitectura, tabla e historial

`ApplicationShell` no registra páginas; `ApplicationNavigation` consume configuración separada. `productPages/productRoutes` y `demoPages/demoRoutes` evitan modificar el shell para añadir features y conservan carga diferida sin advertencias Fast Refresh. No se exige ocultar las demos en producción: el entorno aún es Foundation con mocks.

`EntityTable` conserva tabla/caption/headers semánticos. Evalúa jerarquía y, cuando el ancho es necesario, limita el scroll a una región etiquetada con foco visible. Las columnas reciben ancho mínimo de composición o `minWidth` del caller; identificadores/estados no tienen ellipsis y los controles largos envuelven. El caso de revisión contiene SKU extenso sin espacios, descripción larga, importe grande, badge multilinea y una acción al extremo derecho. El recorrido verifica ancho de página, scroll con teclado, control visible, diálogo y retorno de foco.

En S01, editar filtros no altera la consulta. `target/channel` en URL son el contexto aplicado. El contenido se identifica por ese contexto: Atrás/Adelante restaura inputs y resultado, descartando el borrador de filtros sin aplicar del contexto anterior. Recargar restaura la consulta. Consultar en el mismo contexto mantiene las ediciones y genera una lectura nueva. Las respuestas canceladas no cambian otra selección. No existe escritura comercial en este recorrido.

## Matriz del issue #1

| Criterio | Evidencia | Estado |
|---|---|---|
| React/TS/Vite/Mantine/Tabler reproducibles | package/lockfile, main/provider, comandos | Implementado |
| Theme normativo documentado | tokens/defaults/CSS, fuente 1.1.0 fijada | Implementado |
| Shell/router/shared mínimos usados | módulos app y once composiciones shared | Implementado |
| Piloto S01 con mock tipado | `/precios`, Page → hook → port/service → mock → fixtures | Implementado, MOCK_INTEGRATED |
| Estados default/loading/empty/error y recuperación | escenarios y pruebas Pricing | Verificado en suite |
| Desktop 1440, tipografía/tokens/teclado | capturas y recorridos de navegador | Evidencia técnica local |
| Guía para nueva feature y sustitución de adapter | README y COMPONENTES_FOUNDATION | Implementado |
| README/AGENTS/guía coherentes | archivos presentes, rutas/alcance actualizados | Verificado |
| Sin HTTP directo/reglas autoritativas/contratos inventados | componentes/puertos/fixtures y búsqueda de código | Verificado |
| PR contra base acordada | PR #2 usa master; issue menciona main | Base real registrada, sin retarget automático |
| Revisión técnica independiente y UX de correcciones | auditoría inicial pide cambios; nuevo visto bueno aún no recibido | PENDIENTE |

## Archivos de las correcciones

- `src/theme/tokens.ts`, `component-defaults.ts`, `primitives.module.css`: trazabilidad, semántica/defaults y estados de acción.
- `src/features/foundation/pages/ListDemo.tsx`: neutral y acceso a caso de tabla extensa.
- `src/app/App.tsx`, `layout/ApplicationShell.tsx`, `navigation/ApplicationNavigation.tsx`, `navigation.ts`, `routes/AppRoutes.tsx`, `productPages.tsx`, `productRoutes.tsx`, `demoPages.tsx`, `demoRoutes.tsx`, `pages/NotFoundPage.tsx`: separación de responsabilidades.
- `src/components/shared/EntityTable.tsx`, `EntityTable.module.css`, `features/foundation/components/LongTableExample.tsx`, `mocks/tableCases.ts`: región/controles y fixture de tabla extensa.
- `src/features/pricing/pages/CurrentPricePage.tsx`: sincronización declarativa del contexto aplicado y borrador.
- `tests/foundation-review.spec.ts`: semántica y regresiones FND-05/06. `playwright.config.ts`: dos workers para CI.
- `.github/workflows/frontend.yml`: controles de PR, SHA validado y artefactos. No se cambian dependencias.
- README, COMPONENTES_FOUNDATION, GUIA_IMPLEMENTACION y este reporte: rutas/versiones, mapping, matrices y límites actualizados.
- `docs/evidencias/`: capturas regeneradas; nueva `fnd-05-table-1440.png`.

## Validaciones finales

Instalación ejecutada de nuevo: `npm ci` PASS, salida 0, 191 paquetes instalados; auditoría npm reportó 0 vulnerabilidades en ese momento. Node 22.21.0/npm 10.9.4, Windows. No se requiere Backend ni Docs para compilar.

Controles finales ejecutados después de los ajustes de módulos y selección; salidas reales del árbol con correcciones:

| Comando / inspección | Resultado final |
|---|---|
| `npm run typecheck` | PASS, salida 0 |
| `npm run build` | PASS, salida 0; Vite 8.3.4, sin warning de chunk grande |
| `npm run lint` | PASS, salida 0; sin warnings finales |
| `npm test` (suite completa) | PASS, 12 pruebas en 23.6 s, salida 0 |
| Visual 1440 px | PASS técnico: capturas del piloto, muestras y tabla extensa inspeccionadas; foco, semántica y selección medidos |
| `git diff --check` | PASS, salida 0 |
| GitHub Actions | NO EJECUTADO en remoto; workflow preparado para publicación |
| Revisión humana independiente | PENDIENTE; ningún agente firma la aprobación |

Actualización de la descripción de PR #2: intento por conector rechazado con HTTP 403, `Resource not accessible by integration`. La sesión del navegador de respaldo no está autenticada (ofrece Sign in); no se publicó la descripción ni se solicitaron permisos nuevos. Texto completo preparado en `docs/PR_FOUNDATION.md` para pegar en la PR o aplicar cuando haya acceso de escritura. El head remoto sigue en `ceee9d2`; el código de las correcciones permanece local hasta autorizar/publicar el push.

La prueba inicial de semántica apuntaba al span interior del Badge, cuyo fondo es transparente; se corrigió para medir la superficie real del componente. No se modificó la regla esperada de neutralidad ni se marcó ese fallo como PASS. Las advertencias Fast Refresh iniciales de arrays de rutas se resolvieron separando exports de páginas y configuración.

## Alcance, pendientes y responsables

- S01 consulta precio/base/herencia/override/fallback y distingue oferta nula, ausencia y error; selector de Catálogo ficticio, importes y vigencias de fixtures. No declara API integrada, inicialización ni resultado comercial real.
- S02–S05 son muestras de composición. Fechas usan picker nativo etiquetado con zona; no calendario Mantine personalizado. No PATCH/POST/importación/parser/CSV/reanudación de lote. S06 histórico no implementado.
- Q-013-01/02 siguen abiertos en la spec: contenido del archivo y admisión con errores. Owner Pricing Leonardo Vera, revisión contractual con Miguel Taco. No bloquean la foundation de lectura.
- FND-01–06 tienen implementación concreta; no se difiere un riesgo crítico de tabla/historial. Las mejoras incrementales de accesibilidad/datos/errores se incorporarán por owners de cada feature y revisión UX/técnica transversal, sin inventar componentes anticipados.
- Correcciones locales requieren publicación en `vera`, ejecución de Actions y nuevo visto bueno técnico independiente por Axel o revisor designado por el líder, más revisión UX por Vera. Autor de la auditoría inicial: `mrcastilla8`. La PR no se mergea ni el issue se cierra desde esta tarea.

Estado de la implementación: **MOCK_INTEGRATED**. Estado de aprobación/merge: **PARCIAL**, pendiente de publicación y revisión humana de las correcciones.
