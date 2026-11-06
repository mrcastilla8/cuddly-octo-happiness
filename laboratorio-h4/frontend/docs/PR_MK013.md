# PR #21 — MK-013 e integración de master

Descripción de la [PR #21 publicada](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/21). Su descripción y checks registran el SHA subido y resultado de Actions de la entrega actual.

Refs #15. Rama `vera` → `master`. PR abierta para última auditoría; no fusionar ni cerrar el issue.

Se integra `master@421951b30d506589e43dcc4c07b4194eea2026b8` sobre la entrega auditada de Pricing `00265438fe6b4a3802358574533db4691e79b872`. Se conservan las seis pantallas MK-013 y las 19 de MK-005/006/007 de Cueva, con sus servicios, formularios y selectores.

| Archivo compartido | Resolución |
|---|---|
| `productRoutes.tsx` | Unión de Pricing y Cupones/Promociones/Recomendaciones; una sola `/precios`; conserva hijos `alcance`/`productos` y layouts con borrador. |
| `productPages.tsx` | Conserva los 19 exports diferidos: seis de Pricing y trece componentes de los otros módulos. |
| `navigation.ts` | Grupos de master + cinco destinos, incluida importación con `matchPaths` para resultados. |
| `ApplicationNavigation.tsx` | Grupos de master + coincidencia del prefijo más específico; una sola entrada activa. |
| `AppRoutes.tsx` | Un único `createBrowserRouter`, shell común, redirección raíz, rutas anidadas y demos DEV. |
| `main.tsx` | Mantine/theme/assets + `PricingProvider`, factory único y modo explícito validado. |
| `README.md` | Inventario de las 25 pantallas, configuración, PR publicada, límites y evidencia actual. |

N03: producción exige `VITE_DATA_MODE=mock|api`; un valor ausente/inválido detiene el build. Solo desarrollo tiene default mock. En `api`, Pricing sin provider falla explícitamente; los tres módulos que todavía solo tienen mocks quedan deshabilitados antes de cargar sus páginas/adapters. La demo explícita mantiene sus funcionalidades. Actions configura `mock` explícitamente.

N05: el error de catálogo ofrece **Volver a cargar productos y SKU**; repite la lectura con el mismo runtime, conserva URL/aplicación y cancela solicitudes anteriores. La prueba verifica dos lecturas y el mismo `performance.timeOrigin`.

H01–H16 siguen cubiertos: coherencia Retail/resumen/desglose, referencia regular al programar oferta, moneda vinculada a la lectura, ámbito producto/SKU y superposiciones, catálogo por puerto, archivo/política por puerto, selección de adapter sin fallback, reloj inyectado, descarga abstraída, controles demo aislados y modelos normalizados. Fixtures de exposición explícitos para el 17 de octubre.

**MOCK_REPLACEABLE de Pricing continúa comprobado** con `AlternatePricingRepository`: cafetera, UUID y SKU distintos, CHF y lote independiente; usa el mismo App/páginas y no carga fixtures originales. No se atribuye este criterio a los adapters de Cueva.

**BLOCKED_CONTRACT: Q-013-01/02**. S04 no inventa parser, plantilla, endpoint o admisión; confirmación deshabilitada. También pendientes política de conversión de moneda, D-REC-01/02, providers administrativos/auth/grants y aprobación funcional/UX. Estado **MOCK_INTEGRATED / MOCK_ONLY**, sin API real ni persistencia comercial.

Validación local tras integrar: `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` con `VITE_DATA_MODE=mock`, `npm test` y `git diff --check` PASS. Suite completa **85 PASS** (48 anteriores de Foundation/Pricing + 29 de Cueva + 8 de integración), Chromium 1440×900, 3.3 min. Build con `api` PASS; sin configuración falla intencionalmente. `node scripts/verify-production.mjs api` y `mock` PASS sobre `npm run preview`: cuatro rutas por modo, cero errores y ninguna carga de mocks en API.

Capturas renovadas de las 25 pantallas en [docs/evidencias](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/tree/vera/docs/evidencias), sin overflow horizontal; inspección visual de los cuatro conjuntos. Suite incluye acceso directo, sidebar, navegación Atrás/Adelante, borradores y retorno desde selectores/formularios.

Fuentes: Docs `master@be5c2db16aca6d6d18b3005a2da4205f724038e3`, DESIGN 1.1.0, UX 2.0; fuentes de MK-013 y entregas MK-005/006/007 registradas. Docs y Backend no modificados.

Detalle y comandos en [INTEGRACION_VERA_MASTER.md](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/blob/vera/docs/INTEGRACION_VERA_MASTER.md); matriz histórica H01–H16 en [AUDITORIA_MK013.md](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/blob/vera/docs/AUDITORIA_MK013.md). El resultado remoto del nuevo commit se registra en la descripción/checks de esta PR antes de solicitar revisión.

CI del commit de integración `c0c4dc96c965f0381d7548206e7e8cf803fa0a84`: [push SUCCESS](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38193815806), [PR SUCCESS](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38193818780), **85 PASS (3.1 min)** y [evidencias](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/actions/runs/38193818780/artifacts/11722857789). La descripción remota vincula además los checks del commit de documentación enviado posteriormente. PR abierta, pendiente de última auditoría, sin merge.
