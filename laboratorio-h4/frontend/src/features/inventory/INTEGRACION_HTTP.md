# Inventario — integración HTTP (MK-015 / MK-016, issue #104)

Estado: **PARTIAL**. El adaptador HTTP está implementado y probado contra el
contrato vigente con un transporte inyectado. La aplicación **no** está
conectada al Gateway porque el composition root compartido (#45/#109) y su
cliente todavía no existen, y `CommercialModeGate` mantiene `/inventario`
bloqueado en modo API (`TAC-P0-03`). Ninguna operación se declara integrada de
extremo a extremo.

Corte **Hito 4 (2026-10-20, iteración 2)**: además de la sincronización con
`master` (`6e0448a`), la normalización de `"all"`, la carga parcial del
dashboard (`Promise.allSettled`) y el mapeo de `porUbicacion` con `null` en
datos ausentes (`TAC-P0-04`), se resolvieron los dos hallazgos P0 de recepción
de traslados (`TAC-P0-01` y `TAC-P0-02`):

1. **`TAC-P0-01` — Solicitud inmutable en reintentos idempotentes:**
   `ReceiveTransferModal.tsx` y `services/transferReceptionAttempt.ts`
   construyen y congelan una solicitud inmutable (`operationId`, `receivedAt`,
   `quantityReceived`, `disposition`, `finalReceipt` y `note`) en el primer
   intento. Cualquier reintento de la misma operación reutiliza **exactamente**
   los mismos valores contractuales (idéntico cuerpo JSON e idéntica
   `Idempotency-Key`), alineado con el fingerprint de `traslados.service.ts`
   (`traslado_id`, `received_quantity`, `disposition`, `final_receipt`,
   `received_at`, `note`, `intention`). Cualquier cambio de cantidad,
   disposición, cierre final **o nota** tras un rechazo definitivo (`4xx`)
   genera una nueva identidad de operación y un nuevo timestamp.
2. **`TAC-P0-02` — Protección de operaciones con resultado incierto:**
   `apiInventoryAdapter.ts` separa explícitamente tres estados por traslado:
   `IN_FLIGHT` (escritura en curso), `UNCERTAIN` (respuesta perdida o fallo
   `>=500`) y `RECONCILED` (confirmada mediante respuesta autoritativa del
   servidor). `GET /api/v1/inventario/traslados` **no** elimina el estado
   `UNCERTAIN` porque `TrasladoInventario` solo expone el acumulado del traslado
   y no el `operation_id` de `inventory_operations`; la lectura deja constancia
   explícita (`reconciliation: "UNVERIFIABLE_BY_LIST_CONTRACT"`). Cerrar y
   reabrir `ReceiveTransferModal` restaura el snapshot inmutable retenido por
   `transferId` y bloquea la edición de campos hasta que el reintento idéntico
   confirme el resultado durable.

Corte **Hito 4 (2026-10-21, iteración 3)**: se resolvieron los hallazgos de la
segunda auditoría de Marco:

3. **`TAC-P0-05` — Confirmación separada del enriquecimiento:** `receiveTransfer()`
   registra `RECONCILED` y cachea el DTO confirmado **antes** de `present()`; un
   fallo del resolvedor de presentación no reabre la operación ni repite el POST.
4. **`TAC-P1-07` — Matriz de transición ante errores:** estando en `UNCERTAIN`,
   ningún error (`400/401/403/404/409/422/5xx`, red o DTO inválido) libera el
   bloqueo; solo lo hace un `200` con DTO válido.
5. **`TAC-P0-06` — Pérdida en refresh:** persistencia implementada en
   `sessionStorage` (por pestaña) para operaciones inciertas y confirmaciones con
   refresco pendiente, con restauración conservadora de `IN_FLIGHT` como
   `UNCERTAIN`, hidratación del adaptador tras recreación y persistencia del DTO
   confirmado. Solo por pestaña; no garantiza conciliación entre pestañas,
   dispositivos ni tras borrar manualmente/cerrar sesión. Ver sección dedicada.

Corte **Hito 4 (2026-10-21, iteración 4)**: se resolvieron los dos P0 de la
tercera auditoría de Marco:

6. **`TAC-P0-08` — `WRITE_CONFIRMED` vs `PRESENTATION_FAILED`:** un fallo del
   resolvedor de presentación después de un `200` válido se propaga como
   `InventoryPresentationFailedError`, no como fallo transaccional. El
   formulario queda bloqueado con el snapshot confirmado, el hook refresca la
   bandeja y **no se genera una segunda intención** hasta que un listado
   completo, presentable y coherente con el agregado confirmado actualice el
   traslado.
7. **`TAC-P0-09` — Caché con identidad e intención:** el caché de confirmaciones
   guarda el snapshot inmutable junto al DTO. Un `operationId` reutilizado con
   otro `transferId`, cantidad, disposición, cierre final, fecha o nota se
   rechaza con `IDEMPOTENCY_CONFLICT`; un `200` con `operation_id` o
   `traslado_id` ajenos **no** declara la confirmación y preserva `UNCERTAIN`.
8. **`TAC-P1-10` — Frescura demostrable por agregado:** un `GET` presentable con
   el saldo anterior ya **no** libera el bloqueo. Solo lo hace un listado
   completo cuyo `traslado_id`, `sku`, `quantity_shipped`,
   `quantity_received`, `missing_quantity`, `source_location_id`,
   `target_location_id` y `estado` coincidan exactamente con el DTO del `POST`
   confirmado. Si el listado presentable no coincide, registra
   `UNVERIFIABLE_BY_AGGREGATE` (`BLOQUEADO_ESPECÍFICO`); si el GET o el
   resolvedor falla antes de comparar, conserva `AWAITING`. En ambos casos el
   bloqueo permanece.
9. **`TAC-P0-11` — Aborto del transporte en una recepción:** una cancelación
   verificablemente anterior al despacho HTTP no crea `UNCERTAIN`. Si el
   transporte ya fue invocado, cualquier error de un `POST` (incluido
   `AbortError`) se convierte en `RESULTADO_INCIERTO`: se conserva el snapshot
   inmutable completo y solo se permite reintentar con la misma
   `Idempotency-Key` y el mismo cuerpo JSON. No se libera la identidad ni se
   genera otro `operationId` sin conciliación.

10. **`TAC-P0-12` - Excepciones tipadas del transporte:** en una escritura,
    cualquier excepcion posterior a la invocacion de `transport.request()` (incluidas
    `InventoryError` emitidas por el transporte, ademas de `AbortError`, `TypeError`
    y errores de red) se clasifica como `RESULTADO_INCIERTO`. Las respuestas HTTP
    recibidas efectivamente (`400/401/403/404/409/422`) conservan su rechazo
    definitivo en el primer intento; en un reintento `UNCERTAIN` ningun error libera
    el bloqueo.

## Fuentes normativas

- OpenAPI `0.6.0-rc.1` (`docs/contratos/http/openapi.yaml`), operaciones de
  Inventario: `obtenerUmbralesInventario`, `actualizarUmbralGlobal`,
  `establecerUmbralSku`, `obtenerDashboardInventario`,
  `listarTrasladosInventario`, `obtenerTrasladoInventario`,
  `registrarRecepcionTrasladoInventario`.
- `docs/contratos/http/catalogo-errores.md`: `TRASLADO_NO_ENCONTRADO`,
  `TRASLADO_NO_RECIBIBLE`, `IDEMPOTENCY_CONFLICT`,
  `CANTIDAD_RECIBIDA_EXCEDE_TRASLADO`, `DISPOSICION_RECEPCION_INVALIDA`,
  `TOKEN_INVALIDO`, `SCOPE_INSUFICIENTE`, `SERVICIO_NO_DISPONIBLE`.
- `backend/apps/inventory-svc/src/traslados/traslados.service.ts`: cálculo de
  fingerprint sobre `traslado_id`, `received_quantity`, `disposition`,
  `final_receipt`, `received_at`, `note ?? null` e `intention`.
- `AGENTS.md` §9: no se inventan endpoints, payloads, campos ni estados.

## Archivos de esta entrega

| Archivo | Cambio |
|---|---|
| `services/transferReceptionAttempt.ts` | Coordinador inmutable de intentos de recepción (`createTransferReceptionFormSession`, `freezeReceiveTransferPayload`, `areSameReceiveTransferPayloads`, `TransferReceptionWriteRecord`). Preserva `operationId`, `receivedAt` y `note` entre reintentos y a través de cierres/reaperturas del modal cuando el intento queda en `UNCERTAIN`. Mantiene `confirmedAwaitingRefresh` (`TAC-P0-08`/`TAC-P1-10`): una recepción confirmada cuya vista no pudo actualizarse bloquea nuevas intenciones hasta un listado completo y coherente. `recordSuccess()` ya no libera ese bloqueo; añade el diagnóstico `presentationRefresh` (`AWAITING`, `REFRESHED`, `UNVERIFIABLE_BY_AGGREGATE`). |
| `components/ReceiveTransferModal.tsx` | Usa `createTransferReceptionFormSession(transfer.id)`. Reutiliza la solicitud inmutable en reintentos idénticos, genera nueva identidad si cambia cantidad/disposición/cierre/nota tras un `4xx`, y bloquea la edición mostrando aviso explícito cuando existe una operación `UNCERTAIN`. Tras `TAC-P0-08`, un fallo de presentación se muestra como "Recepción registrada — vista pendiente de actualizar" y bloquea el formulario sin repetir el POST. `TAC-P1-10` añade un guard en `handleSubmit` para que ni un `requestSubmit` programático reenvíe el formulario confirmado; `UNCERTAIN` conserva su reintento. |
| `adapters/apiInventoryAdapter.ts` | Separa los estados `IN_FLIGHT`, `UNCERTAIN` y `RECONCILED` (`getTransferWriteRecord`). Hidrata `transferWrites` y `confirmedReceptions` desde `sessionStorage` tras recreación. Rechaza nuevas intenciones si hay `CONFIRMED_AWAITING_REFRESH` sin coincidencia de identidad. En `readTransfers()` registra `UNVERIFIABLE_BY_LIST_CONTRACT` para `UNCERTAIN` y, desde `TAC-P1-10`, solo libera `confirmedAwaitingRefresh` si el agregado del listado coincide exactamente con el DTO confirmado; en caso contrario registra `UNVERIFIABLE_BY_AGGREGATE`. Rechaza cualquier cambio de `operationId` o contenido mientras el traslado esté en `UNCERTAIN`. El caché de confirmaciones (`TAC-P0-09`) almacena `{ payload, dto }` y compara el fingerprint completo antes de devolverlo; el `200` debe traer el `operation_id` y `traslado_id` solicitados. Desde `TAC-P0-11`, un `AbortError` posterior a la invocación del transporte en un `POST` se clasifica como `RESULTADO_INCIERTO`; una señal ya abortada antes del despacho no crea `UNCERTAIN`. Desde `TAC-P0-12`, cualquier excepción tipada o de transporte posterior a la invocación del transporte en un `POST` se clasifica como `RESULTADO_INCIERTO`; las respuestas HTTP recibidas efectivamente conservan su rechazo definitivo. |
| `hooks/useTransfers.ts` | Distingue el fallo de presentación del fallo transaccional: expone `presentationError`, dispara `notifyInventoryChanged()` para refrescar la vista y nunca marca la recepción como fallida. |
| `pages/TransfersPage.tsx` | Muestra el aviso de presentación (`FeedbackAlert` warning) y limpia el feedback al abrir el modal de otro traslado. |
| `services/inventoryMappers.ts` | Validadores/mappers del contrato: `toThresholdConfig`, `toDashboardKpiSummary`, `toLocationDistributionList`, `validateTrasladoDto`, `validateTrasladoListDto`, `validateRecepcionResponse` (devuelve `operationId` para verificar identidad), `validateTransferPresentation`. |
| `services/inventoryErrors.ts` | Códigos de protocolo/estado y `InventoryPresentationFailedError` (`TAC-P0-08`): separa `WRITE_CONFIRMED` de `PRESENTATION_FAILED` sin inventar códigos HTTP del provider. |
| `services/inventoryTypes.ts` | `LocationDistribution.locationName` y `blockedTotal` admiten `null` cuando el contrato no publica el dato. |
| `services/inventoryProvider.ts` | Punto de inyección `configureInventoryApi(factory)`. Sin factory, el modo API mantiene un fallo controlado bajo demanda; nunca cae al mock. |
| `hooks/useInventoryDashboard.ts` | Resuelve cada sección con `Promise.allSettled`: un bloqueo de contrato o fallo parcial no borra los KPIs que sí respondieron. Distingue `error` de `blockedReason`. |
| `components/DashboardKpiGrid.tsx`, `DashboardAlerts.tsx`, `LocationDistributionTable.tsx` | Estados "no verificable" (warning) separados del error de transporte; `null` se muestra como "Sin datos", nunca como `0`. |
| `adapters/apiInventoryAdapter.spec.ts` | **82 pruebas unitarias y de flujo formulario+adaptador** (incluye los casos obligatorios de `TAC-P0-01`/`TAC-P0-02`, `TAC-P0-05`, `TAC-P1-07`, `TAC-P0-08`, los **6 casos explícitos** de `TAC-P0-09`, los **5 casos de `TAC-P1-10`**, los **5 casos TAC-T11-01…05 de `TAC-P0-11`**, los **5 casos TAC-T12-01…05 de `TAC-P0-12`**, las **3 pruebas de rehidratación `TAC-P0-06-R1…R3`**, la **persistencia atómica de confirmaciones sin estado intermedio vacío**, las 4 pruebas de persistencia fail-closed, las 4 pruebas de umbrales con resultado incierto, las 4 pruebas de filtros y frescura del dashboard y las **4 pruebas de `toTransferItem` distinguiendo faltante de pendiente**). |
| `tests/inventory-presentation.spec.ts` | Prueba Playwright de `TAC-P0-08`/`TAC-P1-10`: `POST 200` confirmado → fallo de presentación → formulario bloqueado → intento de reenvío sin segundo POST → GET obsoleto que tampoco libera → GET coherente que actualiza la bandeja → nueva intención legítima con otro `operationId`. |
| `tests/harness/inventory-http.html` / `tests/harness/inventory-http.tsx` | Harness de navegador que compone el **adaptador HTTP real** con un transporte de prueba y un resolutor de presentación controlable; no inventa endpoints ni DTO (usa la forma del contrato ya validada). Añade `setStaleRead()` y `refresh()` para simular la lectura atrasada y la señal interna de refresco. |
| `package.json` / `adapters/vitest.config.ts` | `npm test` incorpora `test:unit:inventory`, de modo que el CI del PR ejecuta las regresiones del adaptador de inventario junto con Combos y Bulk. |
| `INTEGRACION_HTTP.md` | Este documento. |

No se editaron `src/main.tsx`, `src/app/config/CommercialModeGate.tsx`, el
transporte compartido ni otros features.

## Operaciones implementadas

| `operationId` | Método y ruta | Mapeo |
|---|---|---|
| `obtenerUmbralesInventario` | `GET /api/v1/inventario/umbrales` | `umbralGlobal → globalThreshold`; `overrides[] → skuOverrides` |
| `actualizarUmbralGlobal` | `PUT /api/v1/inventario/umbrales/global` | body `{ umbral }`; respuesta `UmbralInventario` |
| `establecerUmbralSku` | `PUT /api/v1/inventario/umbrales/skus/{sku}` | SKU codificado; body `{ umbral }` |
| `obtenerDashboardInventario` (KPIs) | `GET /api/v1/inventario/dashboard?locationId&categoriaId&marcaId` | mapea los 6 KPIs autoritativos de `DashboardInventario` e informa `null` ("Sin datos", nunca `0`) en los 6 no publicados |
| `obtenerDashboardInventario` (distribución) | `GET /api/v1/inventario/dashboard?locationId&categoriaId&marcaId` | mapea `porUbicacion[]`; `locationName` y `blockedTotal` quedan en `null` porque el contrato no los publica |
| `listarTrasladosInventario` | `GET /api/v1/inventario/traslados?estado&target_location_id&pagina&tamanio` | pagina con `tamanio=100` hasta cubrir `total` (sin truncar) |
| `obtenerTrasladoInventario` | (mapeador `validateTrasladoDto` disponible) | — |
| `registrarRecepcionTrasladoInventario` | `POST /api/v1/inventario/traslados/{trasladoId}/recepciones` | `Idempotency-Key = operation_id`; body `RecepcionTrasladoInventarioRequest` inmutable entre reintentos |

## Ciclo de estados de recepción e idempotencia (`TAC-P0-01`, `TAC-P0-02`, `TAC-P0-05`, `TAC-P1-07`)

`receiveTransfer()` separa cuatro fases para no confundir la confirmación
autoritativa de Inventory con el enriquecimiento de presentación (`TAC-P0-05`):

1. **Fase A — envío autoritativo:** `POST .../recepciones`. Un fallo de red o
   `5xx` no acredita si la mutación se aplicó.
2. **Fase B — validar el DTO de confirmación:** `validateRecepcionResponse()`.
   Si el `200` trae un DTO incompatible, el resultado no se puede determinar.
3. **Fase C — registrar la confirmación:** se marca `RECONCILED` **antes** de
   tocar el resolvedor de presentación y se cachea el DTO confirmado por
   `operationId`. La confirmación no depende del enriquecimiento.
4. **Fase D — enriquecimiento de presentación:** `present()` (resolvedor de
   Catálogo/ubicaciones). Si falla, la mutación **ya está confirmada**; el
   estado permanece `RECONCILED` y el reintento con la misma identidad devuelve
   el cache **sin repetir el POST**.

### `WRITE_CONFIRMED` vs `PRESENTATION_FAILED` (`TAC-P0-08`)

Un fallo de `present()` **no** es un fallo de la mutación. El adaptador lo
envuelve en `InventoryPresentationFailedError`, que conserva el motivo real
(`CONTRATO_BLOQUEADO`/`RESPUESTA_INCOMPATIBLE`/`PRESENTACION_FALLIDA`) e
identifica `transferId` y `operationId`. Consecuencias verificadas:

- `useTransfers` expone `presentationError` (no `submitError`), dispara
  `notifyInventoryChanged()` y propaga el error.
- `ReceiveTransferModal` llama a `session.recordConfirmed(payload)`, hidrata el
  formulario con el snapshot confirmado, deshabilita todos los campos y el botón
  de envío, y muestra "Recepción registrada — vista pendiente de actualizar".
- `transferReceptionAttempt.ts` mantiene `confirmedAwaitingRefresh` por
  `transferId`. `prepareSubmission()` rechaza cualquier contenido distinto al
  confirmado hasta que `readTransfers()` complete un listado completo,
  presentable y con el agregado coherente con la confirmación.
- El reintento exacto devuelve el DTO cacheado y **no** emite un segundo POST.
- `recordSuccess()` **no** libera `confirmedAwaitingRefresh`: un reintento
  cacheado presentado con éxito no es un listado y no demuestra frescura.

### Liberación condicionada por agregado (`TAC-P1-10`)

La regla anterior (“listado exitoso”) era insuficiente: un `GET` puede ser
`200`, paginado completo y presentable, y aun así devolver el saldo **anterior**
a la recepción. Por eso `readTransfers()` solo libera el bloqueo cuando el DTO
del listado coincide exactamente con el DTO autoritativo del `POST`:

`traslado_id`, `sku`, `quantity_shipped`, `quantity_received`,
`missing_quantity`, `source_location_id`, `target_location_id` y `estado`.

No se usa `updated_at` como prueba de frescura ni se inventa `stockVersion`: el
contrato `TrasladoInventario` no publica una versión de stock. Tampoco se acepta
un agregado mayor por una operación externa: si no coincide, el bloqueo
permanece y se registra `UNVERIFIABLE_BY_AGGREGATE` (estado local equivalente a
`BLOQUEADO_ESPECÍFICO`), a la espera de la conciliación que decida Marco.

Matriz de refresco:

| Situación del listado | `presentationRefresh` | ¿Libera? |
|---|---|---|
| Todavía no hay listado presentable | `AWAITING` | No |
| Agregado exactamente igual al confirmado | `REFRESHED` | Sí |
| Agregado distinto, traslado ausente, GET fallido o resolvedor fallido | `UNVERIFIABLE_BY_AGGREGATE` / `AWAITING` | No |
| `UNCERTAIN` (sin confirmación) | No aplica | No; sigue `UNVERIFIABLE_BY_LIST_CONTRACT` |

### Identidad del caché de confirmaciones (`TAC-P0-09`)

`confirmedReceptions` almacena `{ payload, dto }` por `operationId`. Antes de
devolver un resultado cacheado:

1. Se compara el fingerprint completo con `areSameReceiveTransferPayloads()`
   (`transferId`, `quantityReceived`, `disposition`, `finalReceipt`,
   `receivedAt` y `note` normalizada).
2. Se exige `dto.traslado_id === payload.transferId`.
3. Cualquier diferencia lanza `IDEMPOTENCY_CONFLICT` sin devolver el resultado
   anterior y sin emitir petición.

Además, tras un `200`, `validateRecepcionResponse()` exige que
`operation_id === payload.operationId` y `traslado.traslado_id ===
payload.transferId`. Si no coinciden, **no se declara confirmación**: se lanza
`RESPUESTA_INCOMPATIBLE` y la operación permanece `UNCERTAIN`.

### Matriz de transición de estados (`TAC-P1-07`)

| Estado previo | Desenlace del `POST` | Estado siguiente |
|---|---|---|
| `IN_FLIGHT` (primer intento) | `200` + DTO válido | `RECONCILED` (confirmación antes de presentación) |
| `IN_FLIGHT` (primer intento) | red / `5xx` / `200` ilegible | `UNCERTAIN` |
| `IN_FLIGHT` (primer intento) | `200` + DTO incompatible | `UNCERTAIN` |
| `IN_FLIGHT` (primer intento) | `4xx` definitivo (`400/401/403/404/409/422`) | registro eliminado (el backend rechazó sin persistir) |
| `UNCERTAIN` (reintento idéntico) | `200` + DTO válido | `RECONCILED` (`CONFIRMED_BY_IDEMPOTENT_RETRY`) |
| `UNCERTAIN` (reintento idéntico) | **cualquier otro** (`400/401/403/404/409/422/5xx`, red, `200` ilegible o DTO incompatible) | **permanece `UNCERTAIN`** |

Regla de seguridad: **estando en `UNCERTAIN`, la única salida es un `200` con
DTO de confirmación válido.** En particular, un `409 IDEMPOTENCY_CONFLICT`
durante la recuperación no libera el bloqueo ni habilita otra identidad, porque
el resultado original sigue desconocido.

### Estado `UNCERTAIN` — qué permite / qué bloquea

- Bloquea cualquier otro `operationId` y cualquier cambio de `quantityReceived`,
  `disposition`, `finalReceipt`, `receivedAt` o `note`.
- Al cerrar/reabrir `ReceiveTransferModal`, la UI restaura el snapshot inmutable
  y deshabilita la edición hasta que el reintento idéntico recupere el resultado.
- `GET /inventario/traslados` marca `reconciliation: "UNVERIFIABLE_BY_LIST_CONTRACT"`
  y **no** libera el bloqueo.

Limitación contractual registrada (`TAC-P0-02`):
- `GET /api/v1/inventario/traslados` y `GET /api/v1/inventario/traslados/{trasladoId}` devuelven `TrasladoInventario` (`quantity_shipped`, `quantity_received`, `missing_quantity`, `estado`), sin historial de recepciones ni `operation_id`.
- `GET /api/v1/inventario/operaciones/{operationId}` (`consultarOperacionInventario`, OpenAPI L20309) es de uso exclusivo M2M para `modulo-ventas` con `serviceBearer` y scope `inventario:operaciones:leer`, no para el navegador.
- En consecuencia, la única conciliación concluyente disponible dentro del contrato vigente para el navegador es el **reintento idempotente con la misma solicitud inmutable** (`Idempotency-Key` y body idénticos), ante el cual `traslados.service.ts` devuelve el `result_payload` persistido en `inventory_operations` sin duplicar el movimiento.

## Recuperación tras refresh/crash (`TAC-P0-06`)

`transferReceptionAttempt.ts` persiste `sessionStorage` (clave
`inventory.transferReceptionAttempts.v1`, versión 2) por pestaña: `UNCERTAIN`,
`IN_FLIGHT` (promovido conservadoramente a `UNCERTAIN`), `confirmedAwaiting`
(payload) y `confirmedAwaitingWithDto` ({payload, dto}). `apiInventoryAdapter`
hidrata `transferWrites` y `confirmedReceptions` al recrear la instancia tras un
refresh. Si el almacenamiento cae a memoria (ephemeral) o falla la escritura,
el envío inicial se bloquea con `CONTRATO_BLOQUEADO`. La restauración es
conservadora: en caso de corrupción parcial solo se bloquean los traslados
afectados.

**Limitación:** solo por pestaña. No garantiza conciliación entre pestañas,
dispositivos ni tras borrar manualmente los datos del navegador o cerrar la
sesión. No se implementa `GET /inventario/operaciones/{operationId}`; ese
contrato está reservado a Ventas/Postventa.

## Operaciones bloqueadas por contrato (`TAC-P0-04`)

| Método del puerto | Campos / capacidad faltante | Documento contractual verificado | Owner responsable | Condición de desbloqueo |
|---|---|---|---|---|
| `getStockItems(filters)` | 1) `consultarDisponibilidad` (`GET /inventario/disponibilidad`, OpenAPI L3615) exige `skus` obligatorio (`minItems: 1`, `maxItems: 50`) para Ventas/Postventa; no enumera el catálogo de stock.<br>2) `DisponibilidadStock` (OpenAPI L21367) no incluye `productName`, `categoryName`, `brandName`, `locationName`, `stockVersion` ni `updatedAt`. | `docs/contratos/http/openapi.yaml` (L3615–3695, L21367–21403) y `SPEC-015` | Marco (arquitectura/contratos) + Poma (`catalog-svc`) + Taco (`inventory-svc`) | Publicar operación de listado administrativo de existencias o acordar composición con Catálogo/ubicaciones en el composition root |
| `getStockDetail(sku, locationId)` | `DisponibilidadStock` no publica `productName`, `categoryName`, `brandName`, `locationName`, `stockVersion` ni `updatedAt` exigidos por el drawer MK-015-S03. | `docs/contratos/http/openapi.yaml` (L21367–21403) | Marco + Poma (`catalog-svc`) + Taco (`inventory-svc`) | Enriquecer contrato o inyectar resolvedor autoritativo de ficha de producto/ubicación y metadatos de versión |
| `getDashboardAlerts(filters)` | No existe operación HTTP de alertas operativas en el tag `Inventario`. | `docs/contratos/http/openapi.yaml` (`/inventario/*`) y `SPEC-016` | Marco (contratos) + Taco (`inventory-svc`) | Definir y publicar schema/endpoint de alertas en OpenAPI (prohibido recalcularlas en cliente) |
| `getCategories()` | Operación pertenece a Taxonomía/Catálogo (`/taxonomia/categorias`), fuera del contrato de `inventory-svc`; falta acuerdo de paginación/adaptador común para poblar filtros de inventario. | `docs/contratos/http/openapi.yaml` (`/taxonomia/*`) | López (`taxonomy-svc`) + Castilla (composición #45/#109) | Conectar `ApiInventoryCatalogAdapter` al cliente compartido |
| `getBrands()` | Operación pertenece a Catálogo (`/catalogo/marcas`), fuera de `inventory-svc`; pendiente de composición compartida. | `docs/contratos/http/openapi.yaml` (`/catalogo/*`) | Poma (`catalog-svc`) + Castilla (composición #45/#109) | Conectar `ApiInventoryCatalogAdapter` al cliente compartido |
| `getLocations()` | No existe endpoint HTTP publicado para listar `inventory.locations` con `name`/`code`/`type`. | `docs/contratos/http/openapi.yaml` y `docs/datos/inventory-svc/migration.sql` | Marco (contratos) + Taco (`inventory-svc`) | Publicar operación de lectura de ubicaciones en OpenAPI y exponerla en Gateway |
| `DashboardInventario` (6 de 12 KPIs y 2 campos de `porUbicacion`) | `DashboardInventario` (OpenAPI L23646–23720) publica 6 KPIs (`totalAvailable`, `totalOnHand`, `totalReserved`, `skusDisponibles`, `skusStockBajo`, `skusAgotados`), pero no publica `blockedUnits`, `totalVendibleSkus`, los 4 KPIs de traslados ni `locationName`/`blockedTotal` en `porUbicacion`. | `docs/contratos/http/openapi.yaml` (L23646–23720) y `SPEC-016` | Marco (contratos) + Taco (`inventory-svc`) | Ampliar schema `DashboardInventario` en OpenAPI; mientras tanto la UI muestra `null` ("Sin datos"), nunca `0` |

## Punto exacto de integración (`TAC-P0-03`, #45/#109)

```ts
import {
  createHttpInventoryRepository,
} from "./adapters/apiInventoryAdapter";
import { configureInventoryApi } from "./services/inventoryProvider";

configureInventoryApi(() =>
  createHttpInventoryRepository({
    transport: sharedGatewayTransport, // inyectado por el composition root (#45/#109)
    resolveTransferPresentation: authoritativeTransferPresentation,
  }),
);
```

Mientras `CommercialModeGate` (`src/app/config/CommercialModeGate.tsx`) mantenga
bloqueada la ruta `/inventario` en modo `api`, la feature no se monta en ese
modo. Ese desbloqueo corresponde a la composición compartida de Castilla/Marco.

## Validaciones ejecutadas

| Comando | Resultado |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npx vitest run --config src/features/inventory/adapters/vitest.config.ts` | **82/82 PASS** (incluye regresiones `TAC-P0-05`, `TAC-P1-07`, `TAC-P0-08`, `TAC-P1-10`, `TAC-P0-11`, `TAC-P0-12`, los 6 casos de `TAC-P0-09`, rehidratación `TAC-P0-06-R1…R3`, persistencia atómica de confirmaciones, umbrales inciertos, filtros/frescura de dashboard y distinción de faltante frente a pendiente) |
| `npm test` | `test:unit:combos` 56 PASS; `test:unit:bulk` 51 PASS; `test:unit:inventory` 82 PASS; `test:unit:pricing` 155 PASS (**344/344 total PASS**) |
| `npx playwright test tests/inventory.spec.ts tests/inventory-dashboard.spec.ts tests/inventory-adapter.spec.ts tests/inventory-presentation.spec.ts --reporter=line` | **47/47 PASS** |
| `npx playwright test --reporter=line` | **360/360 PASS** (suite completa, 11.3 min) |
| `npm run build` con `VITE_DATA_MODE=mock` | PASS |
| `npm run build` con `VITE_DATA_MODE=api` | PASS |
| `node scripts/verify-production.mjs mock` (1440 px) | **58 vistas PASS** |
| `node scripts/verify-production.mjs api` (1440 px) | **53 vistas PASS** |

## Evidencia de la iteración 4 (TAC-P0-08 / TAC-P0-09)

- Rama: `taco`.
- Commit de implementación y pruebas: `e315060` (padre `db7c2e6`).
- Archivos: `apiInventoryAdapter.ts`, `apiInventoryAdapter.spec.ts`,
  `ReceiveTransferModal.tsx`, `useTransfers.ts`, `TransfersPage.tsx`,
  `inventoryErrors.ts`, `inventoryMappers.ts`,
  `transferReceptionAttempt.ts` e `INTEGRACION_HTTP.md`.
- Casos nuevos:
  - `TAC-P0-08`: `POST 200` válido → confirmación → fallo de presentación →
    cambio de cantidad/nota → intento de confirmar. Resultado: **PASS**; un solo
    POST, operación `RECONCILED`, sin segunda recepción ni stock adicional.
  - `TAC-P0-09`: mismo `operationId` con payload idéntico (cacheado, sin POST);
    distinta cantidad, nota, disposición, cierre final, fecha o `transferId`
    (rechazo `IDEMPOTENCY_CONFLICT`); `200` con `operation_id` o `traslado_id`
    ajenos (no declara confirmación, preserva `UNCERTAIN`). Resultado: **PASS**.
- Estado: **PARTIAL** (sin integración React→Gateway→PostgreSQL; ver `TAC-P0-03`
  y dependencias #45/#109).

## Evidencia de la iteración 5 (prueba de navegador TAC-P0-08 y casos explícitos TAC-P0-09)

- Rama: `taco`.
- Commit de pruebas: `91db964`.
- Archivos: `tests/inventory-presentation.spec.ts`,
  `tests/harness/inventory-http.html`, `tests/harness/inventory-http.tsx` y
  `src/features/inventory/adapters/apiInventoryAdapter.spec.ts`.
- `TAC-P0-08` en navegador (Playwright, adaptador HTTP real):
  - `POST 200` válido → confirmación → el resolvedor de presentación falla.
  - La UI muestra "Recepción registrada — vista pendiente de actualizar" y no
    "No se pudo registrar la recepción".
  - Cantidad, nota y botón de confirmación quedan bloqueados con el snapshot
    confirmado; un reenvío del formulario no emite un segundo `POST`.
  - La bandeja conserva la vista desactualizada hasta que un listado completo y
    presentable la refresca; solo entonces se habilita una nueva intención, con
    un `operationId` distinto. (En esta iteración se aceptaba un listado
    exitoso; `TAC-P1-10` endurece la condición a agregado coherente.)
- `TAC-P0-09` separado en 6 pruebas explícitas: (1) payload idéntico cacheado;
  (2) distinta cantidad; (3) distinta nota; (4) distinta disposición, cierre
  final, fecha o traslado; (5) `operation_id` ajeno; (6) `traslado_id` ajeno.
- Resultado local: **40/40** pruebas del adaptador y **47/47** pruebas
  Playwright de inventario. `typecheck`, `lint`, `npm test` (54 + 51 + 40),
  builds `mock`/`api` y `verify-production` (58/53 vistas) **PASS**.
- `npm test` ejecuta `test:unit:inventory`, por lo que el job `quick` del CI
  también corre las 40 pruebas del adaptador (no solo las de Playwright).
- Estado: **PARTIAL** (sin integración React→Gateway→PostgreSQL; ver `TAC-P0-03`
  y dependencias #45/#109). El PR y su CI quedan para la revisión del owner.

## Evidencia de la iteración 6 (TAC-P1-10)

- Rama: `taco`.
- Commit de implementación y pruebas: `7775fa8` (padre `fab5f43`).
- Archivos: `apiInventoryAdapter.ts`, `apiInventoryAdapter.spec.ts`,
  `ReceiveTransferModal.tsx`, `transferReceptionAttempt.ts`,
  `tests/inventory-presentation.spec.ts`,
  `tests/harness/inventory-http.tsx` e `INTEGRACION_HTTP.md`.
- Cambios:
  - `readTransfers()` solo libera `confirmedAwaitingRefresh` cuando el agregado
    del listado coincide exactamente con el DTO confirmado. Si no coincide,
    registra `UNVERIFIABLE_BY_AGGREGATE` y conserva el bloqueo.
  - `recordSuccess()` ya no limpia el bloqueo; un reintento cacheado no es un
    listado.
  - `handleSubmit` del modal ignora un `requestSubmit` programático cuando la
    recepción confirmada sigue bloqueada; `UNCERTAIN` conserva su reintento.
  - El fixture distingue estado previo (0/10/`EN_TRANSITO`) de confirmado
    (4/6/`RECIBIDO_PARCIAL`).
- Casos nuevos: cinco pruebas `TAC-P1-10` (GET obsoleto, GET coherente, GET
  fallido, resolvedor fallido y `recordSuccess` sin liberación) y la fase de
  lectura obsoleta en la prueba de navegador.
- Resultado local: **45/45** pruebas del adaptador y **47/47** pruebas
  Playwright de inventario. `typecheck`, `lint`, `npm test` (54 + 51 + 45),
  builds `mock`/`api` y `verify-production` (58/53 vistas) **PASS**. Suite
  Playwright completa: **360/360 PASS**.
- `npm test` ejecuta `test:unit:inventory`, por lo que el job `quick` del CI
  también corre las 45 pruebas del adaptador.
- Estado: **PARTIAL** (sin integración React→Gateway→PostgreSQL; ver `TAC-P0-03`
  y dependencias #45/#109). TAC-P0-06 permanece `BLOQUEADO_ESPECÍFICO`. El PR y
  su CI quedan para la revisión del owner; **no se declara merge ni despliegue**.

## Evidencia de la iteración 7 (TAC-P0-11)

- Rama: `taco`.
- Commit de implementación y pruebas: `48d5d43`.
- Archivos: `adapters/apiInventoryAdapter.ts`,
  `adapters/apiInventoryAdapter.spec.ts` e `INTEGRACION_HTTP.md`.
- Cambios:
  - `send()` mantiene `throwIfAborted()` antes de invocar al transporte. Una
    señal ya abortada es una cancelación anterior al despacho y no crea
    `UNCERTAIN`.
  - Si el transporte ya fue invocado, cualquier error de un `POST` (incluido
    `AbortError`) se convierte en `InventoryError("RESULTADO_INCIERTO")`. El
    snapshot inmutable completo se conserva y solo se permite el reintento con
    la misma `Idempotency-Key` y el mismo cuerpo.
  - El adaptador HTTP acepta un `AbortSignal` opcional en `receiveTransfer()`
    únicamente para distinguir el aborto previo al despacho. No cambia el
    contrato OpenAPI, el DTO, el fingerprint ni `InventoryRepository`.
- Casos nuevos: `TAC-T11-01` (aborto posterior conserva `UNCERTAIN`),
  `TAC-T11-02` (otra cantidad/nota/`operationId` se rechaza sin segundo POST),
  `TAC-T11-03` (reintento idéntico recupera la confirmación sin duplicar el
  efecto), `TAC-T11-04` (aborto previo al despacho no crea `UNCERTAIN`) y
  `TAC-T11-05` (cerrar/reabrir conserva el intento y bloquea cambios).
- Resultado local: **55/55** pruebas del adaptador; `typecheck`, `lint`,
  `npm test` (54 + 51 + 55), **47/47** Playwright de inventario, builds
  `mock`/`api` y `verify-production` (58/53 vistas) **PASS**. Suite Playwright
  completa: **360/360 PASS**.
- `npm test` ejecuta `test:unit:inventory`, por lo que el job `quick` del CI
  también corre las 55 pruebas del adaptador.
- Estado: **PARTIAL** (sin integración React→Gateway→PostgreSQL; ver `TAC-P0-03`
  y dependencias #45/#109). `TAC-P0-06` permanece `BLOQUEADO_ESPECÍFICO`; no se
  implementa persistencia en navegador ni consulta de operaciones. El PR y su CI
  quedan para la revisión del owner; **no se declara merge ni despliegue**.


## Evidencia de la iteracion 8 (TAC-P0-12)

- Rama: 	aco.
- Commit de implementacion y pruebas: `a9bf662`.
- Archivos: dapters/apiInventoryAdapter.ts,
  dapters/apiInventoryAdapter.spec.ts e INTEGRACION_HTTP.md.
- Cambios:
  - En send(), la ruta de escritura clasifica como RESULTADO_INCIERTO
    cualquier excepcion posterior a la invocacion del transporte, incluidas
    InventoryError emitidas por el transporte, AbortError, TypeError y
    errores de red.
  - Se mantiene la distincion entre cancelacion verificablemente anterior al
    despacho (senal ya abortada) y fallo posterior a la invocacion.
  - Las respuestas HTTP recibidas efectivamente (400/401/403/404/409/422)
    conservan su rechazo definitivo en el primer intento; en un reintento
    UNCERTAIN ningun error libera el bloqueo.
- Casos nuevos: TAC-T12-01 (error tipado conserva UNCERTAIN),
  TAC-T12-02 (otra cantidad/nota/operationId se rechaza sin segundo POST),
  TAC-T12-03 (reintento idempotico recupera la confirmacion sin duplicar),
  TAC-T12-04 (400/409 recibidos siguen siendo rechazo definitivo) y
  TAC-T12-05 (error tipado durante UNCERTAIN no libera el bloqueo).
- Resultado local: **55/55** pruebas del adaptador; 	ypecheck, lint,
  
pm test (54 + 51 + 55), builds mock/pi y erify-production
  (58/53 vistas) **PASS**. Suite Playwright completa: **360/360 PASS**.
- 
pm test ejecuta 	est:unit:inventory, por lo que el job quick del CI
  tambien corre las 55 pruebas del adaptador.
- Estado: **PARTIAL** (sin integracion React->Gateway->PostgreSQL; ver TAC-P0-03
  y dependencias #45/#109). TAC-P0-06 permanece BLOQUEADO_ESPECIFICO; no se
  implementa persistencia en navegador ni consulta de operaciones. El PR y su CI
  quedan para la revision del owner; **no se declara merge ni despliegue**.

## Evidencia de la iteracion 9 (correcciones auditoria PR #55)

- Rama: 	aco.
- Commit de implementacion: b9a535.
- Archivos: services/transferReceptionAttempt.ts, components/ReceiveTransferModal.tsx,
  pages/TransfersPage.tsx, services/inventoryMappers.ts,
  dapters/apiInventoryAdapter.ts, services/inventoryErrors.ts.
- Cambios:
  - TAC-P0-06: persistencia por pestana en sessionStorage para operaciones
    inciertas y confirmaciones con refresco pendiente, con restauracion
    conservadora de IN_FLIGHT como UNCERTAIN.
  - Reconciliacion de recepciones aunque el traslado este terminal, usando el
    snapshot persistido y sin modificarlo.
  - Validacion completa de operation_id, 	raslado_id, eceived_quantity y
    disposition en la confirmacion HTTP.
  - Bloqueo sincrono de doble envio concurrente y codigo local OPERACION_EN_CURSO.
  - Validacion de paginacion: pagina solicitada, duplicados y total consistente.
  - Mensajes y recuperacion separados para escrituras PUT de umbrales.
- Resultado local: **55/55** pruebas del adaptador; 	ypecheck, lint,
  
pm test (54 + 51 + 55), **47/47** Playwright de inventario, builds
  mock/pi **PASS**.
- Estado: **PARTIAL** (sin integracion React->Gateway->PostgreSQL). TAC-P0-06
  queda resuelto solo para la pestana actual; no garantiza conciliacion entre
  dispositivos ni tras borrar manualmente los datos del navegador. No se declara
  merge ni despliegue.

## Evidencia de la iteración 10 (auditoría PR #57 / MK-015 y MK-016 Hito 4)

- Rama: `taco`.
- Archivos involucrados:
  - `src/features/inventory/services/transferReceptionAttempt.ts`
  - `src/features/inventory/adapters/apiInventoryAdapter.ts`
  - `src/features/inventory/hooks/useThresholds.ts`
  - `src/features/inventory/hooks/useInventoryDashboard.ts`
  - `src/features/inventory/pages/InventoryDashboardPage.tsx`
  - `src/features/inventory/services/inventoryTypes.ts`
  - `src/features/inventory/services/inventoryMappers.ts`
  - `src/features/inventory/adapters/mockInventoryAdapter.ts`
  - `src/features/inventory/adapters/apiInventoryAdapter.spec.ts`
  - `src/features/inventory/INTEGRACION_HTTP.md`
- Cambios realizados:
  1. **[P0] CI y calidad de código:**
     - Eliminada asignación inicial innecesaria de `rawToParse` en `transferReceptionAttempt.ts:295`, resolviendo la advertencia de ESLint `no-useless-assignment` en el job `quick`/`validate` sin deshabilitar reglas ni añadir excepciones.
  2. **[P0] Persistencia fail-closed de recepciones:**
     - `persistState()` no devuelve éxito cuando la escritura falla y solo restaura `lastGoodPersistedState`. Comportamiento fail-closed verificado mediante re-lectura `storage.getItem(STORAGE_KEY) === serialized`. Si falla o no coincide, lanza `CONTRATO_BLOQUEADO`.
     - `setInFlightTransferReception()` solo habilita el despacho HTTP cuando el snapshot nuevo quedó persistido y verificado. Si falla la persistencia, ejecuta rollback de los mapas en memoria (`uncertainReceptionsByTransferId`, `inFlightReceptionsByTransferId`, confirmaciones) preservando el bloqueo de cualquier operación previamente `UNCERTAIN` y abortando el envío.
     - `restoreFromStorage()` no elimina silenciosamente registros corruptos durante la recarga: si se detectan registros corruptos o traslados bloqueados, aborta la reescritura conservando el contenido íntegro en `sessionStorage` para no perder el bloqueo en recargas subsiguientes.
     - No se genera automáticamente otro `operationId` para operaciones cuyo resultado sigue siendo incierto.
  3. **[P1] Confirmación incierta de umbrales:**
     - En `apiInventoryAdapter.ts`, cuando un PUT recibe HTTP 200 pero el DTO no supera `toThresholdConfig()`, se clasifica como `RESULTADO_INCIERTO` (no como escritura definitivamente fallida).
     - Se clasifica también HTTP 408 como `RESULTADO_INCIERTO` para escrituras (`POST`/`PUT`).
     - En `useThresholds.ts`, se realiza lectura autoritativa mediante `getThresholds()` antes de acreditar el nuevo valor en la UI. Si la lectura no confirma el valor solicitado o falla, se expone el estado incierto y no se genera reenvío automático.
  4. **[P1] Filtros contractuales y frescura del dashboard:**
     - En `useInventoryDashboard.ts`, se separan los filtros contractuales del agregado (`category`, `brand`, `locationId`) pasados a `getDashboardKpis` y `getLocationDistribution`, de los filtros exclusivos de la tabla por SKU (`search`, `status`) pasados a `getStockItems` y `getDashboardAlerts`.
     - Una búsqueda de SKU o filtro de status no bloquea ni invalida los KPIs ni la distribución geográfica cuando esas operaciones admiten consultar el agregado.
     - Se conserva y expone `generatedAt` de `DashboardInventario` en el hook y en `InventoryDashboardPage.tsx` como fecha/hora de generación de los datos, sin umbrales arbitrarios de obsolescencia.
  5. **[P1] Pruebas de recuperación reales:**
     - Se sustituyó la prueba `TAC-P0-06` (que borraba el almacenamiento con `resetUncertainTransferReceptions()`) por pruebas de rehidratación auténticas (`TAC-P0-06-R1`, `TAC-P0-06-R2`, `TAC-P0-06-R3`) que conservan `sessionStorage` y reconstruyen el repositorio/módulo (`rehydrateTransferReceptionsForTesting()`).
     - Cubre `IN_FLIGHT → UNCERTAIN`, `UNCERTAIN` persistido y `RECONCILED` pendiente de refresco, verificando conservación exacta de `operationId`, `receivedAt`, nota y cantidades, sin duplicación de POST.
     - Se agregaron regresiones para cuota agotada con estado previo existente, restauración fallida, registros corruptos y ausencia de POST cuando el intento no quedó persistido.
- Resultados de validación:
  - `npm run lint`: **PASS** (0 errores, 0 advertencias).
  - `npm run typecheck`: **PASS** (0 errores).
  - `test:unit:inventory`: **77/77 PASS**.
  - `npm test`: **339/339 PASS** (combos: 54, bulk: 51, inventory: 77, pricing: 157).
  - `tests/inventory*.spec.ts` (Playwright): **61/61 PASS** (23 en `inventory.spec.ts` + 38 en `inventory-adapter`, `inventory-dashboard`, `inventory-presentation`, `inventory-idempotency`).
  - `npm run build` (`VITE_DATA_MODE=mock` y `VITE_DATA_MODE=api`): **PASS**.
- Estado: **PARTIAL** (sin integración React→Gateway→PostgreSQL; endpoints pendientes de Gateway y composición compartida; issues #17/#18 continúan abiertos).

## Evidencia de la iteración 11 (auditoría PR #58 / MK-015 y MK-016 Hito 4)

- Rama: `taco`.
- Archivos involucrados:
  - `src/features/inventory/services/transferReceptionAttempt.ts`
  - `src/features/inventory/adapters/apiInventoryAdapter.ts`
  - `src/features/inventory/services/inventoryTypes.ts`
  - `src/features/inventory/services/inventoryMappers.ts`
  - `src/features/inventory/mocks/inventoryFixtures.ts`
  - `src/features/inventory/adapters/mockInventoryAdapter.ts`
  - `src/features/inventory/pages/TransfersPage.tsx`
  - `src/features/inventory/adapters/apiInventoryAdapter.spec.ts`
  - `src/features/inventory/INTEGRACION_HTTP.md`
- Cambios realizados:
  1. **[P0] Persistencia atómica de confirmaciones:**
     - En `apiInventoryAdapter.ts`, se eliminó la secuencia intermedia de borrado de `IN_FLIGHT` previo a persistir la confirmación con DTO.
     - Se implementó una **transición persistente única y atómica** de `IN_FLIGHT/UNCERTAIN` a confirmación pendiente de refresco (`transitionToConfirmedAwaitingRefreshWithDto`), evitando persistir un estado intermedio que deje al traslado sin identidad recuperable.
     - Si la persistencia de la confirmación falla (ej. `QuotaExceededError` en `sessionStorage`):
       - Se conserva la confirmación autoritativa en memoria para la sesión activa; no se presenta el fallo local de almacenamiento como rechazo de la operación acreditada con HTTP 200 en el backend.
       - En `sessionStorage`, `lastGoodPersistedState` mantiene intacto el snapshot previo (`IN_FLIGHT` con `operationId` y payload inmutable).
       - Al recargar la pestaña, `restoreFromStorage()` promueve dicho `IN_FLIGHT` a `UNCERTAIN`, conservando el bloqueo contra nuevas intenciones o alteraciones de datos, y garantizando que nunca se produzca un segundo POST con otro `operationId`.
     - Se añadió prueba de regresión específica que simula un fallo en `sessionStorage.setItem` únicamente durante la confirmación tras HTTP 200, verificando la conservación del bloqueo tras recarga y la ausencia de segundos POSTs con otra identidad.
  2. **[P1] Cantidad pendiente frente a faltante:**
     - En `inventoryTypes.ts`, se añadió `missingQuantity?: number` a `TransferItem`.
     - En `inventoryMappers.ts` (`toTransferItem`), para traslados con estado terminal `COMPLETADO_CON_DISCREPANCIA`, se asigna `quantityPending: 0` (el traslado cerrado ya no tiene unidades pendientes de recepción) y se mapea `missingQuantity: dto.missing_quantity`. Para traslados activos (`EN_TRANSITO`, `RECIBIDO_PARCIAL`), se calcula `quantityPending` de forma regular y `missingQuantity: 0`.
     - En `TransfersPage.tsx`, la columna "Pendiente" distingue visualmente los traslados con discrepancia, mostrando `0 pend.` y el faltante explícito (`X faltantes` en color de alerta), diferenciándolo de las cantidades pendientes de recepción en traslados abiertos.
     - En `mockInventoryAdapter.ts` e `inventoryFixtures.ts`, se alineó el fixture y la mutación para asignar `missingQuantity` y `quantityPending: 0` en recepciones finales incompletas.
     - Se agregaron cuatro pruebas unitarias para `toTransferItem` que validan la distinción contractual entre faltante y cantidad pendiente.
  3. **[P1] Trazabilidad y CI:**
     - Estado formal: **`PARTIAL`**. La aplicación no está conectada de extremo a extremo al Gateway (composition root compartido #45/#109 pendiente y `CommercialModeGate` bloqueando la ruta en modo API).
     - No se declaran cerrados los issues #17/#18.
- Resultados de validación:
  - `npm run lint`: **PASS** (0 errores, 0 advertencias).
  - `npm run typecheck`: **PASS** (0 errores).
  - `test:unit:inventory`: **82/82 PASS**.
  - `npm test`: **344/344 PASS** (combos: 56, bulk: 51, inventory: 82, pricing: 155).
  - `tests/inventory*.spec.ts` (Playwright): **61/61 PASS**.
  - `npm run build` (`VITE_DATA_MODE=mock` y `VITE_DATA_MODE=api`): **PASS**.

## Evidencia de la iteración 12 (auditoría PR #59 / MK-015 y MK-016 Hito 4)

- Rama: `taco`.
- Archivos involucrados:
  - `src/features/inventory/hooks/useThresholds.ts`
  - `src/features/inventory/adapters/thresholdReconciliation.spec.ts`
  - `src/features/inventory/INTEGRACION_HTTP.md`
- Cambios realizados:
  1. **[P1] useThresholds.ts — Acreditación directa ante PUT 200 y conciliación ante RESULTADO_INCIERTO:**
     - En `updateGlobal` y `updateSku`, cuando el PUT devuelve una respuesta contractual válida (`ThresholdConfig`), se utiliza directamente esa configuración para actualizar el estado, confirmar el éxito (`"Umbral global actualizado correctamente."` / `"Umbral para SKU {sku} actualizado correctamente."`) y notificar el cambio con `notifyInventoryChanged()`. Se elimina la dependencia previa de un GET posterior para reconocer una escritura confirmada (cero peticiones GET tras un PUT 200 exitoso).
     - Cuando el PUT devuelva `RESULTADO_INCIERTO` (por ejemplo tras HTTP 408, 503, 504, abort o timeout de transporte), se consultan los umbrales autoritativos mediante `getThresholds()`.
     - Si el valor autoritativo coincide con el solicitado (`authoritative.globalThreshold === val` o `authoritative.skuOverrides[sku] === val`), se comunica que el valor deseado está verificado (`"El valor deseado fue verificado en el servidor."`) sin afirmar necesariamente que esta solicitud particular produjo el cambio, se actualiza el estado, se notifica el cambio y se confirma la operación (`return true`).
     - Si el GET de conciliación falla o devuelve un valor distinto, se conserva íntegro el estado incierto (`RESULTADO_INCIERTO`), se expone en `saveError` y **no se realiza ningún reintento automático de escritura** (`return false`).
  2. **[P1] Pruebas unitarias de conciliación y transporte HTTP:**
     - Se crearon 14 pruebas unitarias en `src/features/inventory/adapters/thresholdReconciliation.spec.ts` que validan:
       - Umbral global: PUT 200 válido sin dependencia de un GET posterior (`expect(getThresholds).not.toHaveBeenCalled()`).
       - Umbral global: PUT incierto seguido de GET coincidente (comunica verificación en el servidor sin reintento de escritura).
       - Umbral global: PUT incierto seguido de GET no coincidente (conserva estado incierto y no reintenta la escritura).
       - Umbral global: PUT incierto seguido de GET fallido (conserva estado incierto y no reintenta la escritura).
       - Umbral por SKU: los 4 casos análogos para `updateSkuThresholdWithReconciliation`.
       - Integración con `createHttpInventoryRepository` sobre el transporte HTTP para ambos tipos de umbral, verificando que ante fallos 503 o 504 no se despache un segundo PUT y que tras un PUT 200 no se ejecute un GET.
  3. **[P1] Alcance y delimitación del estado:**
     - Estado formal: **`PARTIAL`**. Se distingue claramente la implementación aislada del adaptador HTTP y las pruebas automatizadas frente a la integración real con el Gateway, la cual permanece pendiente del composition root compartido (#45/#109) y el desbloqueo de `CommercialModeGate`. No se declaran completas las historias MK-015 ni MK-016 de extremo a extremo, ni se cierran los issues #17 y #18.
- Resultados de validación:
  - `npm run lint`: **PASS** (0 errores, 0 advertencias).
  - `npm run typecheck`: **PASS** (0 errores).
  - `test:unit:inventory`: **96/96 PASS** (82 en `apiInventoryAdapter.spec.ts` + 14 en `thresholdReconciliation.spec.ts`).
  - `npm test`: **358/358 PASS** (combos: 56, bulk: 51, inventory: 96, pricing: 155).
  - `tests/inventory*.spec.ts` (Playwright): **61/61 PASS**.
  - `npm run build` (`VITE_DATA_MODE=mock` y `VITE_DATA_MODE=api`): **PASS**.

## Evidencia de la iteración 13 (auditoría PR #60 / MK-015 y MK-016 Hito 4)

- Rama: `taco`.
- Archivos involucrados:
  - `src/features/inventory/hooks/useThresholds.ts`
  - `src/features/inventory/pages/ThresholdsPage.tsx`
  - `src/features/inventory/components/ThresholdConfigForm.tsx`
  - `src/features/inventory/hooks/useThresholds.spec.ts` (nuevo)
  - `src/features/inventory/hooks/vitest.config.ts` (nuevo)
  - `src/features/inventory/adapters/thresholdReconciliation.spec.ts`
  - `tests/inventory.spec.ts`
  - `package.json` / `package-lock.json` (jsdom + Testing Library solo para pruebas)
- Cambios realizados:
  1. **[P1-01] Confirmación real del resultado de umbrales:**
     - Se elimina la confirmación local duplicada de `ThresholdConfigForm` (`localFeedback`/"Cambio aplicado"). El mensaje de resultado proviene exclusivamente del hook mediante `feedback`.
     - `CONFIRMED` se presenta como «Escritura confirmada»; `VERIFIED` como «Valor verificado, escritura no atribuida» (no atribuye el cambio al PUT); `RESULTADO_INCIERTO` como advertencia «Resultado no confirmado»; el resto de fallos como error.
     - El feedback anterior se limpia al iniciar cada operación y se reemplaza cuando la operación falla.
  2. **[P1-02] Una lectura posterior ya no invalida la escritura confirmada:**
     - Se conserva el último `ThresholdConfig` acreditado en un `ref`; un fallo del `GET` disparado por `notifyInventoryChanged()` mantiene la configuración y el éxito, exponiendo solo `refreshWarning`. La notificación se conserva para el resto de vistas y las recargas por cambios externos siguen actualizando la pantalla.
     - Si la recarga derivada de la propia mutación devuelve un valor que aún no refleja la escritura (consistencia eventual), tampoco se revierte el resultado confirmado.
  3. **[P1-03] Validación semántica del DTO del PUT:**
     - Antes de declarar `CONFIRMED` se exige `globalThreshold === val` o `skuOverrides[sku] === val`. Un `200` contradictorio se trata como resultado no acreditado: una única lectura autoritativa de conciliación; si confirma el valor se presenta como `VERIFIED`; si no, se propaga `RESULTADO_INCIERTO` sin reintentar la escritura.
  4. **Pruebas:**
     - `thresholdReconciliation.spec.ts`: presentación de los tres resultados, `VERIFIED` ante `200` contradictorio con lectura coincidente y no acreditación sin reintento cuando la lectura tampoco coincide (global y SKU).
     - `useThresholds.spec.ts`: hook real montado con React + jsdom; `PUT 200` confirmado seguido de fallo del `GET` propio conserva umbrales, éxito y ausencia de error; recargas externas siguen actualizando; `RESULTADO_INCIERTO` + lectura coincidente se presenta como `VERIFIED`; recarga con dato atrasado no revierte lo confirmado.
     - `tests/inventory.spec.ts`: MK-015-S02 verifica el mensaje real y la ausencia de la confirmación duplicada.
- Resultados de validación:
  - `npm run lint`: **PASS** (0 errores, 0 advertencias).
  - `npm run typecheck`: **PASS** (0 errores).
  - `test:unit:inventory`: **108/108 PASS** (104 adaptadores + 4 hooks).
  - `npm test`: **370/370 PASS** (combos: 56, bulk: 51, inventory: 108, pricing: 155).
  - `tests/inventory*.spec.ts` (Playwright): **61/61 PASS**.
  - `npm run build` (`VITE_DATA_MODE=mock` y `VITE_DATA_MODE=api`): **PASS**.
- Estado de integración: **`PARTIAL`** sin cambios. No se añadieron endpoints ni se modificó el cliente HTTP compartido; `configureInventoryApi()` sigue siendo el único punto de integración.


