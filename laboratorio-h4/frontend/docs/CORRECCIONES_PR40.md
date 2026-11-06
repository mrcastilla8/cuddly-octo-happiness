# Correcciones de auditoría del PR #40

Revisión de `4cda065d4b9d112b785e52ee4e72618a19ad7e3a`, rama `poma`.
Fecha local: 01/11/2026 (los registros de red usan UTC 02/11).
Estado: **PARCIAL**, #5/#6 incompletos; no merge ni cierre de issues.

## Fuentes verificadas

- Frontend: AGENTS.md, README.md, package.json, router, adapters, fixtures y pruebas reales del árbol.
- Docs `master`, SHA `5124eeae4ec65b22ea9146cd7b1ce3888c617c10`:
  `contratos/http/openapi.yaml` **0.6.0-rc.2**, blob
  `54164d48c7919854ac4636a27162ab880cb202aa`;
  `ux/mockups/DESIGN.md` 1.1.0, blob `ae1e41fc787d398ecb5ccbff8d5af46e803320b8`;
  `ux/mockups/ux/ux-guidelines.md` y `ux-decisions.md` 2.0;
  `ux/mockups/MK-003/component-spec.md` y `MK-004/component-spec.md`, ambos En revisión.
- Backend `poma`: `apps/catalog-svc/INTEGRACION-50.md`, blob
  `9db0812331b4a62542c2de4d19cfb7d9f912a8c9`, sección «Consumidor React y fronteras pendientes».
- Evidencia previa de Pricing 500: `docs/evidencias/demo-g6/local-ui.json`.
  Se conserva sin alterar ni presentar como validación de esta revisión.

## 1. Dependencia de lectura administrativa

**BLOCKED_CONTRACT: CATALOG_ADMIN_READ**. No se publicó una operación nueva.
OpenAPI rc.2 sigue asociando `listarProductos` con `PaginaProductosComercial` /
`ProductoResumenComercial`, y `obtenerProducto` con `ProductoDetalleComercial`.
Que exista `ProductoDetalle` como respuesta de mutación no publica un GET administrativo.

| Falta confirmar/publicar | Impacto frontend | Responsable de coordinación |
|---|---|---|
| Operación y permisos de listado/detalle que incluyan borradores e inactivos | `list()` no puede proyectar resultados comerciales como `ProductView`; `getById()` no confirma ausencia administrativa con 404 comercial | Marco/arquitectura y owner de contratos, con Poma/Backend #50 |
| Estado administrativo y `catalog_version` autoritativos | Edición y acciones no pueden calcular una versión ni estado a partir de disponibilidad comercial | Poma + Marco/contratos |
| `tiene_variantes`, SKU nullable, asociaciones por ID y metadatos para los valores | Padre requerido por #6 y formulario de #5 | Poma + López/Taxonomía |
| Perfil físico administrativo completo/parcial/null y evidencia de publicación para Q-06 | No convertir ausencia de campos en valores ni autorizar cambio estructural sin evidencia | Poma + Marco/contratos |
| Filtros y paginación administrativos (incluido tipo/modelo si se aprueban) | No transformar paginación comercial en administrativa ni filtrar una página como si fuese el total | Marco/contratos + Poma |

Solicitud concreta para coordinar con Backend: publicar operación, DTO, nulabilidad,
permisos y ejemplos para borrador/simple/padre con variantes/inactivo; demostrar
200/404/401/403 y versión tras PATCH. Luego conectar ambos métodos y ejecutar el
recorrido lista → detalle → edición por Gateway con SHA de Frontend y Backend.
Esta solicitud queda preparada en el PR; no se afirma aprobación ni entrega del owner.
El reporte Backend #50 ya reconoce la misma frontera. No se editaron contratos ni
se enviaron mensajes a terceros. #5/#6 **no están completos**.

## 2. Correcciones propias del frontend

- `sku_base: null` y campo opcional ausente se representan como `skuBase: null`,
  tanto en simples como padres. El formulario usa vacío solo como valor de input;
  las vistas muestran «Sin SKU base». Los selectores omiten un SKU inexistente;
  no transforman productId en SKU ni crean un código. Se conservan strings opacos.
- La bandera demo agrega únicamente `/demo/g6/*` al router existente. No reemplaza
  `AppRoutes`, no anida un segundo BrowserRouter y conserva filtros al regresar.
  `/productos`, `/precios` y los demás módulos conservan sus rutas.
- Pricing conserva el GET publicado `/precios/productos/{productoId}`. La instancia
  del adapter comparte una cola de **máximo 3 consultas activas**, incluyendo detalle.
  Las pendientes canceladas salen sin enviar HTTP y se libera cupo ante error.
  No hay retry ni caché de precios. Una página aún puede necesitar N consultas:
  no se sustituye precio base de producto por un batch de SKU con otra semántica.
- Se retira el rewrite externo `/api/v1/:path*` de `vercel.json` y el proxy Vite
  de destino público implícito. La demo requiere origen explícito, con el mismo
  validador de origen del transporte Catalog. Solo hay fallback SPA en Vercel;
  una ruta API local no se reenvía a Oracle y su HTML se rechaza como respuesta API.
  El origen público en Vite no contiene secretos. CORS y guards siguen siendo
  responsabilidad de Gateway; no se añade un bypass ni un proxy de escrituras.

## 3. HTTP simulado y cobertura de éxitos

`tests/catalog-http.spec.ts` usa un transporte inyectado que devuelve `Response`
explícitas. No conecta Gateway, PostgreSQL, Supabase, G7 ni AMQP.

| Operaciones del puerto | Resultado simulado verificable |
|---|---|
| list/getById | Página vacía válida; contenido comercial bloqueado; 404 comercial no acredita ausencia administrativa. No hay éxito administrativo ficticio |
| create/update/activate/deactivate/reactivate | 201/200, ID/versión/estado y composición con preparación; regresión de SKU null |
| getPreparation/retryPreparation | 200 y 202, flags autoritativos; admisión separada de finalización |
| listVariants/getVariantById | 200, paginación, metadata y preparación por ID/SKU |
| createVariant/updateVariant | 201/200 y versión/SKU conservados |
| activateVariant/deactivateVariant/reactivateVariant | 200 con estado de variante; no deriva estado del padre |
| retryVariantPreparation | 202 y operationId; no lo convierte en COMPLETED |

`tests/g6-demo-adapter.spec.ts` comprueba el límite de concurrencia, cancelación en
cola, liberación ante 500, ausencia de retry, DTO y configuración Vercel.
`verification/g6-demo-isolation.spec.ts` corre la bandera activada, con HTTP
interceptado explícitamente, a 1440×900: lista/detalle/regreso con filtros, precio,
SKU null y acceso a las rutas administrativas. La aceptación LIVE está separada
en `verification/g6-read-demo.spec.ts`; no se renombra una fixture como integración real.

## 4. Diagnóstico Gateway REAL, solo lectura

Archivo: `docs/evidencias/catalogo-h4/gateway-auditoria.json`, generado por
`scripts/verify-catalog-gateway.mjs`. Son tres GET HTTPS sin tokens, sin escrituras,
sin modificar guards y sin acceso directo a la base. Se usa un product_id ya
presente en la evidencia histórica, no un SKU inferido. Resultado: **BLOCKED_EXTERNAL**.

| Consulta real | Resultado | Dependencia / responsable |
|---|---|---|
| GET /categorias | 200 JSON | Solo acredita respuesta de esa lectura |
| GET /productos?canal=MARKETPLACE&estado=BORRADOR&pagina=1&tamanio=20&orden=NOMBRE_ASC | 400 VALIDACION | Marco/Gateway + Poma/Catálogo: localizar rechazo mediante correlación y confirmar operación/entorno de lectura demo |
| GET /precios/productos/32a4172c-81b2-b643-1d0f-ae66f627f2ef | 503 text/plain | Marco/Gateway + Vera/Pricing: publicar/reparar ruta y servicio, demostrar 200 PrecioProducto y errores Problem |

El 503 actual no demuestra que los 500 históricos estén resueltos. El resultado
se conserva visible; no hay precio de fallback. El diagnóstico Node no acredita
CORS ni navegación real de navegador, persistencia ni preparación externa.
E2E real de escritura por Gateway restringido: **NO EJECUTADO**, pendiente del
entorno/actor/datos autorizados de Marco/infra y owners. Prueba CORS y aceptación
LIVE de lectura: pendientes de resolver los fallos anteriores; no desplegado.

Repetir diagnóstico (PowerShell, Node 22):

```powershell
$env:G6_VERIFY_GATEWAY_ORIGIN='https://g6-productos-ofertas.duckdns.org'
$env:G6_VERIFY_PRODUCT_ID='32a4172c-81b2-b643-1d0f-ae66f627f2ef'
node scripts/verify-catalog-gateway.mjs
```

## Validación de esta revisión

Inventario completo de archivos creados/modificados respecto a `4cda065`:
`docs/evidencias/catalogo-h4/archivos-auditoria.txt`. Los grupos de cambio son:
modelo/mapper nullable y consumidores; router/demo; transporte/cola Pricing;
configuración de despliegue; pruebas/harness de aislamiento; documentación y evidencia.

Los resultados finales y comandos están en
`docs/evidencias/catalogo-h4/auditoria-validacion.txt`. Los resultados CI antiguos
de `4cda065` no se atribuyen al nuevo SHA. Ninguna prueba simulada cierra #5/#6.

Repetir pruebas focalizadas:

```powershell
npm run typecheck
npm run lint
npm test
npx playwright test tests/catalog-http.spec.ts tests/catalog-http-ui.spec.ts tests/g6-demo-adapter.spec.ts --reporter=line
npx playwright test --config playwright.g6-isolation.config.ts --reporter=line
$env:VITE_DATA_MODE='mock'; $env:VITE_G6_READ_DEMO='false'; npm run build
$env:VITE_DATA_MODE='api'; npm run build
$env:VITE_G6_READ_DEMO='true'; $env:VITE_GATEWAY_ORIGIN='https://gateway.example.org'; npm run build
```
