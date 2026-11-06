# Coordinación contractual — Pricing (MK-013) y Auditoría (MK-014)

Fecha: 2026-10-17 · Rama: `vera` · [Issue #38](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/issues/38) · [PR #46](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/46).

## 1. Fuente y alcance

Fuente oficial: [contratos/http/openapi.yaml, versión **0.6.0-rc.1**](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-docs/blob/c36bd9a18f4fdb188df0d7e5158a431cf4b4ea7b/contratos/http/openapi.yaml). Docs `master@c36bd9a18f4fdb188df0d7e5158a431cf4b4ea7b`; blob `f64bfe9a097b2a0f74c2600988305443d92f640e`. El archivo local `../Productos-y-Ofertas-docs/api/openapi.yaml` contiene 0.5.0 y no es autoridad de esta matriz. Docs se consultó solo para lectura.

Las rutas son relativas a `servers.url: /api/v1`. `stable` y `provisional-internal` transcriben `x-status` por operación. **Figurar en OpenAPI no acredita implementación, publicación ni disponibilidad operativa en Gateway**, incluso para operaciones `stable`. Esa comprobación con infraestructura/proveedor sigue pendiente.

El puerto vigente es `src/features/pricing/services/pricingRepository.ts`; sus modelos internos no son DTO HTTP. El adapter debe resolver `targetId`, mapear DTO → presentación y respetar los parámetros publicados, sin equiparar productId y SKU.

## 2. Matriz HTTP y firmas del puerto real

En las firmas: `signal: AbortSignal`; `targetId`, `id`, `at` son `string`; `page` es `number`. Nombres y orden de argumentos corresponden al puerto existente.

| Firma / retorno del puerto | Operación publicada | `x-status` / restricciones |
|---|---|---|
| `listTargets(signal): Promise<PriceTarget[]>` | Sin endpoint agregado de targets de Pricing. Requiere contexto de Catálogo acordado. | No prometer una URL de selección ni derivar SKU desde un ID. Hoy usa fixtures en mock. |
| `read(query: PriceQuery, signal): Promise<PriceSnapshot \| null>` | SKU: `GET /precios/skus/{sku}`, `canal` opcional. Producto: `GET /precios/productos/{productoId}`. | SKU **stable**; producto **provisional-internal**. `PriceQuery` contiene `targetId` y `channel`, sin `at`: histórico se expresa con `readHistorical`. GET de producto no publica `at` ni canal. `breakdown` es presentación, no un campo prometido del DTO. |
| `readEditable(target: WriteTarget, signal): Promise<PriceView \| null>` | GET SKU o producto según el objetivo real de escritura, rutas anteriores. | Misma clasificación; leer versión del objetivo/alcance que se editará, sin usar una versión ajena. |
| `update(change: PriceChange, signal): Promise<PriceView>` | `PATCH /precios/skus/{sku}` o `PATCH /precios/productos/{productoId}`, body `PrecioUpdateRequest`. | SKU **stable**; producto **provisional-internal**. `change.version` → `priceVersion`; mapear `draft` a `accionPrecioOferta`, `moneda`, `motivoCambio`, importes y `channelId` cuando corresponda. No es PUT. |
| `listSchedules(targetId, page, signal): Promise<SchedulePage>` | `GET /precios/skus/{sku}/programaciones` o `GET /precios/productos/{productoId}/programaciones`, `pagina`/`tamanio`. | Ambas **provisional-internal**. Los aliases YAML del GET SKU remiten a esos parámetros. El tamaño no es argumento de este puerto: lo configura el adapter conforme al contrato. |
| `schedule(targetId, draft: ScheduleDraft, signal): Promise<ScheduleView>` | `POST` de las dos rutas `/programaciones`, body `ProgramacionPrecioRequest`. | Ambas **provisional-internal**. Mapear tipo, importe, moneda, canal, inicio/fin y motivo; no agregar `priceVersion` al request por analogía con PATCH. |
| `readHistorical(query: PriceQuery, at, signal): Promise<{ price: PriceView; validityId: string } \| null>` | `GET /precios/skus/{sku}?at={instante}`, `canal` opcional. | **stable**. Es `at`, no `asOf`. Para un producto se necesita su SKU de referencia o el SKU vendible seleccionado; no añadir `at` al GET de producto. |
| `prevalidate(input: ImportInput, signal): Promise<PrevalidationView>` | `POST /precios/importaciones/prevalidar`, multipart `archivo` y `allow_partial`. | **provisional-internal**. `input.file`/`input.allowPartial` son internos. Q-013-01/02 siguen abiertos para contenido de archivo y admisión con errores; no inventar parser/política. |
| `readBatch(id, signal): Promise<BatchView \| null>` | `GET /precios/importaciones/{batchId}`. | **provisional-internal**. Conservar estados/contadores recibidos; admisión no equivale a finalización. |
| `report(id, signal): Promise<ReportFile>` | `GET /precios/importaciones/{batchId}/reporte`. | **provisional-internal**. Respuesta 200 documentada como **CSV (`text/csv`)**. No recibe `format`. `ReportDownloader.save(file)` es separado; no publica CSV/PDF para importaciones. |

`POST /precios/importaciones` también figura como **provisional-internal**, pero `PricingRepository` no expone un método de admisión/importación. No se inventa una firma ni se atribuye esa capacidad a `prevalidate`. CSV/PDF pertenecen a la exportación de **Auditoría**, separada del reporte CSV de importaciones de Pricing.

La matriz no crea scopes ni headers. El GET SKU publica `userBearer`/`serviceBearer` y `precios:leer` con registro pendiente en Seguridad; no es un permiso ya habilitado. PATCH SKU publica `userBearer`, rol `GESTOR_COMERCIAL` e introspección. Las demás operaciones declaran su seguridad en el OpenAPI; no se propaga un supuesto scope `precios:escribir` a todas ellas. La infraestructura coordina autenticación/introspección y credenciales, fuera de la UI.

## 3. Demo híbrida: objetivo y límite actual

Objetivo: **Pricing por API real y Auditoría simulada**, con simulación visible. **No está implementado ni validado en este PR.**

`createPricingRuntime("api", { api })` permite inyectar un provider compatible con `PricingRepository`; sin él falla cerrado mediante `unavailableApiPricingRepository`. No incluye un adapter HTTP real por defecto. Solo `createDemoPricingRuntime` conecta `createMockPricingRepository(clock, mockPricingAudit.record)`: el registro simulado recibe las ediciones confirmadas de ese repositorio **mock**. Un provider API no notifica automáticamente a `mockPricingAudit`.

`AuditLayout` sigue el modo global salvo inyección explícita de `AuditRuntimeContext`. En `api`, `createAuditRuntime("api")` sin provider falla cerrado; **no continúa automáticamente en mock**. Cambiar solo el modo global no configura una demo híbrida ni autoriza fallback silencioso. Un fallo de `onUpdated` conserva el precio confirmado, pero puede dejar incompleta la traza simulada; no acredita auditoría real.

### Punto de integración a acordar con Castilla

1. En la composición coordinada por Castilla, proporcionar el `PricingRuntime.service` respaldado por el adapter HTTP real y un `AuditRuntimeContext` de demo **explícitamente inyectado**, con aviso permanente de simulación. Reutilizar los contextos existentes, sin flags paralelos por componente ni ocultar errores API.
2. Acordar una notificación en el límite del servicio/adapter de Pricing **después de una actualización confirmada**. Puede envolverse el provider preservando el puerto existente; esa conexión no existe hoy. El consumo actual `mockPricingAudit.record(target, before, after, reason)` requiere `PriceTarget`, lectura anterior autorizada, `PriceView` confirmado y motivo; no es un evento HTTP/AsyncAPI nuevo.
3. Acordar procedencia de SKU/productId, antes/después, versión y fecha confirmada con el provider. No convertir una petición o un timeout en un hecho confirmado ni inventar campos faltantes. Actor simulado explícito, sin inferir email/IP o identidad real. Un fallo de la notificación secundaria no debe convertir un guardado confirmado en fallo comercial ni causar reenvío; debe señalarse la eventual ausencia de traza de demo.
4. Probar provider real → registro simulado: solo confirmaciones generan asiento; conflicto/rechazo/resultado incierto no generan un éxito ficticio; comprobar nulos, versión, identidad, fallo de notificación y reset de sesión. Estas pruebas están **PENDIENTES** y no se sustituyen por un doble que imite el adapter real.

Esta entrega documenta el límite y el punto de integración; **no modifica `main.tsx`, Gateway ni composition root**, ni implementa login/JWT o almacenamiento de credenciales. Coordinar cableado y decisiones con Castilla antes de habilitar la demo híbrida. No se modifican contratos oficiales.

## 4. Compatibilidad y regresiones pendientes

### Castilla — PR #43, `PricingCombosAdapter`

Al revisar, [#43](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/43) sigue abierto y sin integrar. Su [implementación real en castilla@4d31173](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/blob/4d31173b1df3a59d176514b93df745fe2a13a326/src/features/combos/adapters/pricingCombosAdapter.ts) se consultó solo para lectura; no está en el árbol de `vera` y no se copió.

La anterior VER-02-B construía un `liveCombosAdapter` ficticio con `Math.round(Number(...))`; no probaba esa implementación y podía aceptar importes que su parser rechaza. Se retiraron esa imitación y la afirmación de interoperabilidad comprobada. VER-02 conserva su prueba de aislamiento; VER-02-B ahora comprueba **solo Pricing**: relectura tras edición, decimales sin conversión, retiro de oferta, versión y objetivo inexistente.

Después de integrar #43, ejecutar **sobre la clase real importada**, sin duplicar su mapper/parser:

- Inyectar el mismo `PricingRuntime.service`/reloj; leer un SKU, editar con versión/motivo y releer mediante `PricingCombosAdapter.readCurrent`. Comprobar importes menores exactos, retiro de oferta, versión y vigencia.
- Cubrir producto por `referenceSku`, variante por `sku` y herencia. SKU sin precio/identidad se omite, nunca se vuelve cero; referencias ambiguas y moneda incompatible se rechazan según la implementación real.
- Usar su validación estricta: hasta dos decimales y enteros seguros; rechazar precisión superior, valores inválidos o fuera de rango **sin redondear silenciosamente**. Que Pricing admita strings de mayor precisión no acredita que Combos pueda consumirlas.
- Conservar cancelación/errores y ejecutar suites de ambos consumidores y CI del árbol combinado. Hasta entonces: **interoperabilidad real PENDIENTE DE VALIDACIÓN**.

### Poma — PR #40, Catálogo MK-003/004

[#40](https://github.com/Taller-SW-Web/G6-Productos-Ofertas-frontend/pull/40) sigue sin integrar. Que los cambios previstos alcancen `service` y `updates` en `createDemoPricingRuntime.ts` no garantiza coexistencia semántica. **No existe una prueba del árbol combinado con estos cambios; compatibilidad PENDIENTE DE VALIDACIÓN.**

Tras integración autorizada: revisar que se conserve el callback de auditoría y la suscripción real de Catálogo/DemoControl; probar altas/cambios de Catálogo → selección de Pricing, edición → asiento simulado, identidad producto/SKU, refresco/desuscripción y ausencia de precios inventados. Ejecutar regresiones de Poma/Vera y CI completa sobre ese árbol; una fusión textual sin conflictos no basta.

### Callback `onUpdated`

Se conserva la corrección de `9315210`: el callback secundario está protegido por `try...catch`; si falla, el precio confirmado queda guardado, se devuelve su versión nueva y no se fuerza reenvío. VER-05 comprueba ese comportamiento; no es una garantía de entrega de Auditoría.

## 5. Adaptador HTTP preparado en `vera`

La rama `vera` incorpora `src/features/pricing/adapters/httpPricingRepository.ts` y su mapper explícito DTO → modelo de Pricing. El adapter usa únicamente un transporte inyectado que recibe rutas `/api/v1/...`, `AbortSignal`, método, headers y body; no crea otro cliente HTTP, no reintenta escrituras y no recurre a fixtures cuando el servidor falla. Las respuestas 404 solo se convierten en ausencia para `PRECIO_NO_ENCONTRADO` o `LOTE_NO_ENCONTRADO`. Las respuestas de precio conservan importe, null de oferta, moneda, canal, versión y vigencia; el desglose queda vacío cuando el contrato no devuelve sus filas. `readEditable` exige una definición SKU propia en el canal exacto y bloquea la escritura si la lectura solo devuelve herencia/fallback; Pricing no crea overrides desde esta integración.

La composición de Castilla (#45/#109) puede inyectarlo mediante el factory ya existente:

```ts
createPricingRuntime("api", {
  api: async () =>
    createHttpPricingRepository({
      transport: sharedGatewayTransport,
      listCatalogTargets: authoritativeCatalogPricingTargets,
      channelIds: canonicalPricingChannelIds,
    }),
});
```

`sharedGatewayTransport` debe adaptar el cliente compartido a `PricingHttpTransport.request(path, { method, signal, headers, body }): Promise<Response>` y tratar la ruta recibida como ya versionada con `/api/v1`. `authoritativeCatalogPricingTargets` debe entregar `PriceTarget[]` desde un provider real de Catálogo y validar estado/elegibilidad; sin ese provider, `listTargets` falla explícitamente. No se debe conectar el repositorio mock ni derivar IDs de fixtures. `canonicalPricingChannelIds.retail` debe ser el `channelId` real del provider para escrituras/programaciones Retail; no se asigna el texto `RETAIL` por analogía. La dependencia opcional `onUpdated` solo se ejecuta tras validar un PATCH confirmado y cuando exista la lectura previa exacta/versionada; su error secundario no altera el resultado del precio.

La composición global permanece pendiente de Castilla: `main.tsx`, `src/app/config/**`, selección hybrid y `AuditRuntimeContext` no se modificaron. Auditoría continúa usando su runtime mock explícito cuando ese composition root se integre.

### Límites contractuales observados

| Fuente | Regla observada | Problema | Propuesta | Owner de decisión |
|---|---|---|---|---|
| Docs `contratos/http/openapi.yaml` (`PrecioUpdateRequest`/`ProgramacionPrecioRequest`) y Backend `apps/pricing-svc/src/domain/price.ts`, `src/persistence/pricing.schema.ts` | OpenAPI tipa importes como `number` sin escala; Pricing persiste `numeric(12,2)` y acepta como máximo diez dígitos enteros y dos decimales. | El adapter no puede enviar con seguridad más precisión que la soportada por el provider. Rechaza esos valores sin redondear; la precisión anunciada y la ejecutada no están homologadas. | Documentar escala y límite en el contrato aprobado, o acordar otro formato decimal compatible. | Backend Pricing + Docs/arquitectura |
| Docs `contratos/http/openapi.yaml` (`Precio.channel_id`, `PrecioUpdateRequest.channelId`) y Backend `apps/pricing-svc/src/persistence/pricing.schema.ts` | La respuesta SKU publica `channel_id` como `Canal`; la escritura acepta `channelId: string | null`; la persistencia guarda `channel_id` como texto. | No hay mapeo publicado desde `PriceChannel = "retail"` al identificador de canal que esperan las escrituras. El adapter exige inyección de un ID canónico y rechaza otros canales de respuesta. | Publicar/confirmar el catálogo de IDs por canal y el formato de `channel_id` para lectura/escritura. | Backend Pricing + Catálogo + Docs |

### Estado de la integración de esta revisión

| Operación | Estado de handler en Backend `vera` | Estado desde React |
|---|---|---|
| `consultarPrecios` | `BLOCKED_CONTRACT`: falta contexto autoritativo de Catálogo | `BLOCKED_CONTRACT` |
| `obtenerPrecioSku` | `BLOCKED_CONTRACT`: falta contexto/elegibilidad de Catálogo | Implementado en adapter; handler pendiente |
| `actualizarPrecioSku` | `BLOCKED_CONTRACT`: handler y payload Outbox P-PRI-02 | Implementado en adapter; no habilitado por provider |
| `listarProgramacionesPrecioSku` | Handler existente; provisional interno | Implementado en adapter |
| `programarPrecioSku` | `BLOCKED_CONTRACT`: handler y payload Outbox P-PRI-02 | Implementado en adapter; no habilitado por provider |
| `prevalidarImportacionPrecios` | `BLOCKED_CONTRACT`: P-PRI-01 | `BLOCKED_CONTRACT`; no envía el archivo |
| `crearImportacionPrecios` | `BLOCKED_CONTRACT`: P-PRI-01/P-PRI-02 | Sin método en `PricingRepository` |
| `obtenerImportacionPrecios` | Handler existente; provisional interno | Implementado en adapter |
| `descargarReporteImportacionPrecios` | `BLOCKED_CONTRACT`: P-PRI-01 | Implementado como GET CSV real; handler pendiente |
| `obtenerPrecioBaseProducto` | Handler existente; provisional interno | Implementado en adapter |
| `actualizarPrecioBaseProducto` | `BLOCKED_CONTRACT`: handler y payload Outbox P-PRI-02 | Implementado en adapter; no habilitado por provider |
| `listarProgramacionesPrecioProducto` | Handler existente; provisional interno | Implementado en adapter |
| `programarPrecioBaseProducto` | `BLOCKED_CONTRACT`: handler y payload Outbox P-PRI-02 | Implementado en adapter; no habilitado por provider |

“Implementado en adapter” solo acredita la construcción del cliente para la forma publicada; no acredita que Gateway o `pricing-svc` sirvan esa ruta. La suite focalizada del adapter usa transporte de prueba. El E2E React → cliente compartido → Gateway → Pricing → PostgreSQL sigue pendiente hasta que Castilla integre el transporte/composición, Catálogo provea objetivos elegibles y Backend desbloquee las operaciones requeridas.
