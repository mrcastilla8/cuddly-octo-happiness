# Sincronizar Cueva con master y unificar el modo mock/api de Promotions

La rama `cueva` incorpora `origin/master@9b0365c` mediante merge normal y conserva los cinco commits nuevos de Pricing. El conflicto de README se resolvió uniendo la documentación de ambas entregas. Pricing, rutas, navegación, shell, configuración global y evidencias versionadas coinciden con master; no se revierten implementaciones del equipo.

Promotions consume el único `VITE_DATA_MODE=mock|api` a través de `DataModeContext`. Se retiró la selección paralela `mock/backend`: la composición se crea bajo demanda, los avisos usan el mismo contexto y los escenarios DEV solo aplican en mock. `CommercialModeGate` permanece intacto y bloquea las 19 vistas en api mientras falten providers HTTP, sin cargar sus páginas ni mocks. Solicitar la composición API sin provider falla explícitamente; un fallo de provider nunca cae a mocks.

Los cuatro puertos podrán conectarse juntos en `services/promotionServices.ts` mediante la factory API cuando existan adapters oficiales. La futura habilitación del gate se hará entonces, sin reescribir pantallas/hooks/formularios. No se implementan HTTP, endpoints ni permisos ficticios.

Se conservan las correcciones de asociaciones/validaciones, los nueve avisos centralizados, guardas de borrador, selectores y las 19 pantallas MK-005/006/007. El alta de cupones no invoca `repository.read` sin identificador; la regresión verifica cero lecturas al crear y lectura de `run10` al editar.

### Validación local

- `npm run typecheck` y `npm run lint`: PASS.
- `npm run build` con `VITE_DATA_MODE=mock` y con `api`: ambos PASS.
- `npm test`, `VITE_DATA_MODE=mock`, `CI=true`: **112 PASS**, 3.7 min. Incluye Pricing, Foundation, rutas/sidebar conjuntos, 19 vistas de Promotions, formularios, selectores y estados.
- `node scripts/verify-production.mjs mock`: PASS, 19 vistas propias + Pricing S01 a 1440 px, controles DEV ignorados y cero errores de página.
- `node scripts/verify-production.mjs api`: PASS, las 19 vistas explícitamente bloqueadas; cero formularios/tablas/diálogos de negocio o avisos de simulación; Pricing sin provider conserva su error/reintento; cero carga de mocks.
- Recorrido visual automatizado de las 19 vistas a 1440×900: PASS. Inspección manual de MK-005-S02, MK-006-S04 y MK-007-S07.
- `git diff --check`: PASS. Sin conflictos pendientes ni diferencias frente a master en el código de Pricing, app/shared, configuración global y PNG versionados.

El workflow conserva build mock, smoke y suite completa, y añade build/smoke api. El resultado remoto del SHA publicado se confirma en los checks de esta PR.

### Límites

**MOCK_INTEGRATED / MOCK_ONLY**. Modo api bloqueado por providers ausentes. Contratos/adapters administrativos, auth/grants y D-REC-01/02 pendientes. Pricing conserva Q-013-01/02 y la política de moneda pendientes. Revisión técnica/UX independiente pendiente. Sin merge directo ni cierre de issues.

[Informe de sincronización, resolución e inventario](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/blob/cueva/docs/AVANCE_FRONTEND_CUEVA.md#sincronización-con-master-y-modo-global-mockapi--12-de-octubre).

Refs #7, #8, #9.
