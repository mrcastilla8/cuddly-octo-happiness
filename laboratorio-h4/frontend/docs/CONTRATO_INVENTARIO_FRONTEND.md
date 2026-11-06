# Contrato Frontend — Módulo de Inventario (MK-015 / MK-016)

**Versión de referencia:** `1.2.0`
**Repositorio oficial de especificaciones y contratos:** `Taller-SW-Web/G6-Productos-Ofertas-docs`
**Documentos contractuales de referencia:**
- `requisitos/specs/SPEC-015-control-stock-disponibilidad.md` (Control de stock, umbrales y recepciones de traslados)
- `requisitos/specs/SPEC-016-dashboard-alertas-stock.md` (Dashboard analítico, indicadores clave y alertas)
- `contratos/http/openapi.yaml` (OpenAPI `0.6.0-rc.1` canónico)
- `ux/mockups/DESIGN.md` (Directrices de diseño visual y accesibilidad)
- `contratos/http/catalogo-errores.md` (Catálogo canónico de errores de la plataforma)

---

## 1. Arquitectura de Adaptadores y Desacople

El frontend de inventario implementa el patrón de puertos y adaptadores (Arquitectura Hexagonal):

```text
[ Vistas / Componentes Mantine ]
                │
                ▼
[ Hooks de Negocio ]
(useInventoryStock, useThresholds, useTransfers, useInventoryDashboard)
                │
                ▼
[ Puerto: InventoryRepository (Contrato puro sin lógica de mocks) ]
                │
        ┌────────────┴────────────┐
        ▼                         ▼
[ MockInventoryAdapter ]   [ ApiInventoryAdapter (HTTP) ]
(Solo Desarrollo/Demo)      (Producción / BLOCKED_CONTRACT)
        ▲
        │ (Decorado solo en DEV)
[ ScenarioInventoryAdapter ]
(loading / empty / error vía DevScenarioSelector)
```

### Reglas arquitecturales implementadas

1. **Contrato de negocio puro:** `InventoryRepository` no contiene referencias a `InventoryScenario` ni parámetros de desarrollo.
2. **Selección centralizada mediante variable global única:**
   - `VITE_DATA_MODE=mock|api` es la única configuración global de la aplicación (eliminando variables prioritarias ad-hoc).
   - En desarrollo (`DEV`) se utiliza `mock` como valor predeterminado si no se especifica.
   - En producción, `VITE_DATA_MODE` debe ser explícito (`mock` o `api`). En modo `api`, Inventario permanece protegido por `CommercialModeGate` y `ApiPendingRepository` devuelve rechazos asíncronos controlados; no existe ningún fallback silencioso a mocks.
   - La integración HTTP real de Inventario permanece como `BLOCKED_CONTRACT`, operando actualmente con adapter mock para demostración.
3. **Mecanismo único de sincronización y refresco:**
   - Centralizado en `src/features/inventory/services/inventoryEvents.ts`.
   - Consumido internamente por el hook reactivo `useInventoryChangeSignal()`.
   - Disparado automáticamente en mutaciones (umbrales, recepciones) o cambios de escenario simulado.
4. **Independencia demostrada de mocks (MOCK_REPLACEABLE):**
   - Validada mediante `tests/adapters/alternateInventoryRepository.ts` y harness `tests/harness/inventory-adapter.html`.
   - La suite `tests/inventory-adapter.spec.ts` verifica lectura, filtros, vacío, errores, recepciones y refresco sin depender de fixtures ni `MockInventoryAdapter`.
5. **Ejecución de pruebas automatizadas:**
   - Suite integrada (`npm run test:ci` / `npm run test:e2e`): ejecuta las pruebas unitarias de Vitest y la suite E2E de Playwright, incluyendo las pruebas de idempotencia y validación de contrato (`tests/inventory-idempotency.spec.ts`), las pruebas de sustitución de adaptador (`tests/inventory-adapter.spec.ts` sobre `tests/harness/inventory-adapter.html`), el dashboard (`tests/inventory-dashboard.spec.ts`) y las pruebas de interfaz y navegación E2E (`tests/inventory.spec.ts`).

---

## 2. Matriz de Correspondencia Contractual

| Operación / Recurso | Endpoint OpenAPI / Fuente | Estado | Estado de Integración | Brechas y Tratamiento |
|---|---|---|---|---|
| **Existencias de stock** (`getStockItems`) | `GET /inventario/disponibilidad` (L3611) | **PREPARADO** (Adaptador) / **IMPLEMENTADO** (Mock & Alternate) | `BLOCKED_CONTRACT` para HTTP directo | El endpoint `/inventario/disponibilidad` exige arreglo de `skus` (1..100) y no acepta paginación general ni filtros por categoría/marca/estado. Nombres de producto y categoría no vienen en `DisponibilidadStock`; se resuelven vía catálogo. En `0.6.0-rc.1` el esquema añade `blocked` y `status` (consumidos por el adapter), pero continúa sin exponer nombres ni `stock_version`. |
| **Detalle de saldo por SKU** (`getStockDetail`) | `GET /inventario/disponibilidad?skus={sku}&location_id={loc}` | **PREPARADO** / **IMPLEMENTADO** | `BLOCKED_CONTRACT` para HTTP | Requiere joins de catálogo para nombres legibles y versión de stock. |
| **Configuración de umbrales** (`getThresholds`) | `GET /inventario/umbrales` (L17585) | **PREPARADO** / **IMPLEMENTADO** | Listo para conectar | Mapeo exacto con `UmbralInventario`: `{ umbralGlobal, overrides }`. |
| **Actualizar umbral global** (`updateGlobalThreshold`) | `PUT /inventario/umbrales/global` (L17688) | **PREPARADO** / **IMPLEMENTADO** | Listo para conectar | Valida entero positivo o cero. Código de error: `VALIDACION`. |
| **Actualizar umbral por SKU** (`updateSkuThreshold`) | `PUT /inventario/umbrales/skus/{sku}` (L17817) | **PREPARADO** / **IMPLEMENTADO** | Listo para conectar | Valida entero positivo y SKU válido. |
| **Bandeja de traslados** (`getTransfers`) | `GET /inventario/traslados` (L19703) | **PREPARADO** / **IMPLEMENTADO** | `BLOCKED_CONTRACT` nombres | `TrasladoInventario` carece de nombres de ubicación y producto; frontend resuelve presentación mediante catálogos. |
| **Confirmar recepción de traslado** (`receiveTransfer`) | `POST /inventario/traslados/{id}/recepciones` (L19866) | **PREPARADO** / **IMPLEMENTADO** | Listo para conectar | Cumple RFC UUID para `operation_id`, validación de `note <= 500`, rechazo con `VALIDACION` y detección de `IDEMPOTENCY_CONFLICT` (409). Cierre con discrepancia emite alerta operativa. |
| **KPIs del Dashboard** (`getDashboardKpis`) | `GET /inventario/dashboard` (L18086) | **PREPARADO** / **IMPLEMENTADO** | `BLOCKED_CONTRACT` campos faltantes | El esquema actual carece de `blockedUnits` totales y conteos de traslados pendientes (`inTransit`, `partiallyReceived`, `withDiscrepancy`). El frontend los deriva con precisión desde los datos autoritativos. |
| **Alertas operativas de stock** (`getDashboardAlerts`) | *Derivado en Frontend / BFF* | **IMPLEMENTADO** (Dinámico) | `BLOCKED_CONTRACT` backend | No existe endpoint `/inventario/alertas` en OpenAPI `0.6.0-rc.1`. El frontend calcula dinámicamente las alertas sobre saldos y traslados activos, eliminando automáticamente alertas resueltas. |
| **Distribución por ubicación** (`getLocationDistribution`) | Campo `porUbicacion` en `/inventario/dashboard` | **PREPARADO** / **IMPLEMENTADO** | Listo para conectar | Mapeo directo por `locationId`. |
| **Catálogo de categorías** (`getCategories`) | `GET /categorias` (L20140) | **PREPARADO** / **IMPLEMENTADO** | Listo para conectar | Integrado en `useInventoryFilterOptions` mediante `Promise.allSettled`. |
| **Catálogo de marcas** (`getBrands`) | `GET /marcas` (L20160) | **PREPARADO** / **IMPLEMENTADO** | Listo para conectar | Integrado en `useInventoryFilterOptions` mediante `Promise.allSettled`. |
| **Catálogo de ubicaciones** (`getLocations`) | *Sin endpoint en OpenAPI `0.6.0-rc.1`* | **BLOCKED_CONTRACT** | `BLOCKED_CONTRACT` | Owner: Inventory (`inventory.locations` es interno). Se mantiene catálogo tipado temporal en frontend. Su ausencia no bloquea categorías ni marcas gracias al aislamiento con `Promise.allSettled`. |

> **Novedades de `0.6.0-rc.1` fuera de alcance del mock:** el contrato incorpora `GET /inventario/disponibilidad/comercial` y `GET /inventario/operaciones/{operationId}`. Inventario no las integra (pertenecen a disponibilidad comercial y a la consulta de operaciones); se registran aquí para evitar su uso especulativo.

---

## 3. Estados de Clasificación Contractual

- **IMPLEMENTADO:** Funcionalidad completa en cliente, hooks, validaciones, mapeos, herramientas dev y pruebas automatizadas (Playwright).
- **PREPARADO:** Adaptador HTTP tipado (`ApiInventoryAdapter`, `ApiInventoryCatalogAdapter`) y mappers preparados para consumir los endpoints tan pronto como backend los habilite en el entorno integrado.
- **BLOCKED_CONTRACT:** Ausencia de endpoint, brecha de esquema o atributos faltantes en el contrato oficial OpenAPI `0.6.0-rc.1`. No se inventan endpoints ni estructuras ficticias; se aísla y documenta formalmente.

---

## 4. Idempotencia y Manejo de Errores

Alineado estrictamente con `catalogo-errores.md` y `openapi.yaml`:

| Código de Error | HTTP Status | Causa y Validación Frontend |
|---|---|---|
| `VALIDACION` | 400 | `operation_id` con formato no UUID v4, o `note` superior a 500 caracteres, o umbral negativo. |
| `IDEMPOTENCY_CONFLICT` | 409 | Reutilización del mismo `operation_id` con parámetros o intención diferente. |
| `TRASLADO_NO_RECIBIBLE` | 409 | Intento de recepcionar un traslado en estado terminal (`COMPLETADO` o `COMPLETADO_CON_DISCREPANCIA`). |
| `TRASLADO_NO_ENCONTRADO` | 404 | El identificador del traslado no existe en el sistema. |
| `CANTIDAD_INVALIDA` | 422 | Cantidad recibida ≤ 0 o no entera. |
| `CANTIDAD_RECIBIDA_EXCEDE_TRASLADO` | 422 | Cantidad recibida mayor que la cantidad pendiente del traslado. |
| `DISPOSICION_RECEPCION_INVALIDA` | 422 | Disposición distinta de `REINGRESAR_DISPONIBLE`, `REINGRESAR_BLOQUEADO` o `CONFIRMAR_MERMA`. |

---

## 5. Validación Automatizada

La conformidad de este contrato se valida mediante los siguientes comandos. Los resultados sólo pueden declararse como exitosos si el comando fue ejecutado y produjo salida real sin errores.

| Comando | Propósito |
|---|---|
| `npm run typecheck` | Validación estricta de tipos TypeScript sin parámetros de escenario en contratos. |
| `npm run lint` | Cero advertencias ni errores bajo ESLint y reglas de hooks React 19. |
| `$env:VITE_DATA_MODE = 'mock'; npm run build` | Compilación exitosa del bundle de demostración (`VITE_DATA_MODE=mock`). |
| `$env:VITE_DATA_MODE = 'api'; npm run build` | Compilación exitosa del bundle de producción (`VITE_DATA_MODE=api`). |
| `npm run test:ci` | Pruebas unitarias (Vitest: Combos y Bulk) + suite E2E Playwright completa, incluyendo las pruebas de Inventario (`tests/inventory-idempotency.spec.ts`, `tests/inventory-adapter.spec.ts`, `tests/inventory-dashboard.spec.ts` y `tests/inventory.spec.ts`). |
| `node scripts/verify-production.mjs <mock\|api>` | Verificación en preview de producción (`1440 × 900`) para ambos modos sin errores ni carga de mocks en modo `api`. |

> **Regla de evidencia:** no declarar `PASS` sin haber ejecutado el comando correspondiente y obtenido salida libre de errores. Si no se ejecutó, registrar `NO EJECUTADO`.
