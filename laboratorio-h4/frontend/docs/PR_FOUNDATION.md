# Frontend UI Foundation v1 — correcciones de revisión

La base permite iniciar features sobre React/TypeScript/Vite, Mantine/Tabler, theme central y patrones compartidos. Incluye el piloto de consulta MK-013-S01 con mocks. Esta entrega corrige FND-01–06 sin integrar HTTP ni implementar operaciones comerciales S02–S06.

Refs #1. Base de la PR: `master` (rama predeterminada real; el issue menciona `main`). Base auditada: `ceee9d203581b28d6ff8148e951837ec6d000fec`.

**Publicación de correcciones:** código validado en commit local `95722ff3d1cab2d7eb8356a6ee36b2e813b5aafe`, pendiente de push a `vera`. Los resultados siguientes corresponden a esas correcciones, no al head remoto original. La actualización automática de esta descripción fue rechazada por el conector con 403; este archivo está listo para pegar en la PR. Actualizar el estado después de publicar. No se atribuye aprobación humana ni PASS de Actions por añadir el workflow.

## Fuente normativa

- Docs `master`: `be5c2db16aca6d6d18b3005a2da4205f724038e3`.
- [DESIGN.md 1.1.0](https://github.com/Taller-SW-Web/Productos-y-Ofertas-docs/blob/be5c2db16aca6d6d18b3005a2da4205f724038e3/ux/mockups/DESIGN.md), UX 2.0, spec/plan/tasks y HTML MK-013-S01 de esa revisión.
- Readiness piloto: YELLOW de trabajo, aprobación humana de mockup pendiente. Nivel: **MOCK_INTEGRATED / MOCK_ONLY**.

## Correcciones de auditoría

| ID | Resultado preparado |
|---|---|
| FND-01 | Trazabilidad 1.1.0; Activo/Inactivo neutrales; selección suave, foco signal, estados semánticos y defaults de capas/carga ajustados |
| FND-02 | npm ci y todos los controles locales PASS; workflow preparado que ejecuta suite completa y adjunta SHA/capturas/diagnósticos |
| FND-03 | README y reportes con rutas vigentes, revisión entregada, resultados reales y límites |
| FND-04 | AppShell/Outlet, navegación, rutas de aplicación y demos en módulos separados |
| FND-05 | Región tabular etiquetada con scroll de teclado; anchos de composición, SKU largo, badge/controles multilinea y regresión |
| FND-06 | Filtros aplicados en URL; borrador restablecido con Atrás/Adelante; prueba de historial y recarga |

## Matriz de cumplimiento del issue #1

| Criterio | Evidencia / estado |
|---|---|
| Instalación y controles reproducibles | npm ci/typecheck/build/lint PASS; suite completa PASS |
| MantineProvider, theme y router/shell | Implementados; fuente 1.1.0 fijada |
| Mapping DESIGN y ausencia de colores improvisados | tokens/defaults/CSS y reporte; estado ordinario neutral |
| Shared usados, sin fetch ni reglas autoritativas | Once composiciones reutilizadas en piloto/muestras |
| Piloto accesible | `/precios` (MK-013-S01) |
| Fixtures/adapters y estados deterministas | default/loading/empty/error; herencia, override, fallback, última consulta |
| Desktop 1440 px y teclado | Capturas y regresiones; tabla extensa sin overflow de página |
| Guía de nueva feature / adapter futuro | README, COMPONENTES_FOUNDATION y GUIA_IMPLEMENTACION |
| Documentos Frontend coherentes | README/AGENTS/guía presentes; rutas y límites actualizados |
| PR y revisiones humana técnica/UX | PR existente contra master; nuevo visto bueno de correcciones PENDIENTE |
| Bloqueos externos visibles | Q-013-01/02 de importación, sin bloquear consulta S01 ni inventar contratos |

## Validación local final

2026-10-09; Windows, Node 22.21.0/npm 10.9.4:

- `npm ci`: PASS, salida 0.
- `npm run typecheck`: PASS, salida 0.
- `npm run build`: PASS, salida 0.
- `npm run lint`: PASS, salida 0, sin advertencias finales.
- `npm test`: PASS, **12 pruebas en 23.6 s**.
- `git diff --check`: PASS.
- Visual 1440 px: PASS técnico; capturas regeneradas y tabla extensa inspeccionada. No equivale a aprobación UX humana ni certificación WCAG.
- GitHub Actions: **NO EJECUTADO para estas correcciones**; workflow pendiente de publicación. Cada run registra el SHA bajo validación en el artefacto.

Rutas: `/precios`, `/foundation/listados`, `/foundation/formularios`, `/foundation/estados`, `/foundation/pricing`. Las muestras S02–S05 no guardan/importan datos comerciales. No hay backend requerido para ejecutar.

## Archivos y evidencia

[Reporte y detalle de archivos](docs/VALIDACION_FOUNDATION.md), [guía shared](docs/COMPONENTES_FOUNDATION.md). Cambios acotados a `src/theme`, `src/app`, EntityTable, ListDemo/fixture extenso, CurrentPricePage, pruebas, workflow y documentación. Evidencia en `docs/evidencias/`, incluido `fnd-05-table-1440.png`. Docs/Backend permanecen sin modificaciones.

## Pendientes antes del merge

- Publicar el commit local de correcciones en `vera` y verificar el run de Actions sobre ese head.
- Nuevo visto bueno técnico independiente de Axel o revisor designado por el líder y revisión UX de Vera. La auditoría inicial solicitó cambios; no se marca como aprobación.
- Q-013-01/02, integración HTTP, escritura comercial, histórico S06 y ampliaciones graduales de accesibilidad/datos corresponden a sus owners/issues posteriores. No se añade un alcance nuevo para cerrar Foundation.

No mergear ni cerrar #1 hasta cumplir las revisiones requeridas.
