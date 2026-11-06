# Demo de consulta real — G6 Productos y Ofertas

> Corrección de auditoría del 01/11/2026: las rutas y el proxy descritos en las
> secciones históricas siguientes quedan reemplazados por este párrafo. La demo
> vive en `/demo/g6/productos`, `/demo/g6/productos/:id` y `/demo/g6/categorias`.
> Requiere `VITE_G6_READ_DEMO=true`, `VITE_DATA_MODE=api` y un
> `VITE_GATEWAY_ORIGIN` explícito con CORS aprobado. Se retiraron el rewrite
> externo incondicional de Vercel y el proxy Vite con destino público implícito.
> El resto de las rutas se conserva con la demo activada. Pricing tiene una cola
> cancelable de máximo tres solicitudes activas, sin retry ni caché de precios.
> La evidencia histórica de 500 se conserva. La nueva comprobación real obtuvo
> categorías 200, productos 400/VALIDACION y Pricing 503; el E2E real sigue pendiente.
> Ver [correcciones PR #40](CORRECCIONES_PR40.md).

Tarea aprobada el 2026-10-17, rama existente `poma`, frontend PR #40;
backend PR #125. Alcance: S01/S04 de Catálogo adaptados a consulta interna,
categorías y precio base. No hay pantalla ni integración de Marketplace.

## Configuración que se publica solo con aprobación final

```dotenv
VITE_DATA_MODE=api
VITE_G6_READ_DEMO=true
```

El selector se aplica una vez en la composición de App. En la demo muestra solo
`/productos`, `/productos/:id` y `/categorias`. El resto de la aplicación mantiene
sus implementaciones anteriores cuando el selector está apagado; no se convierten
otros módulos a API ni se habilitan escrituras. No se configuran secretos en VITE_*.

El adaptador usa los GET publicados de categorías, productos, detalle y precio base,
valida las respuestas y conserva los fallos de API visibles sin retry/fallback mock.
La lista consulta BORRADOR inicialmente porque los 20 registros existentes están en ese
estado; los filtros de estado son explícitos. La consulta interna no acredita venta,
preparación de Inventory ni elegibilidad de un canal. El parámetro `canal=MARKETPLACE`
es compatibilidad del contrato GET existente, no una interfaz Marketplace.

Vercel reescribe `/api/v1/:path*` a `https://g6-productos-ofertas.duckdns.org/api/v1/:path*`
antes del fallback SPA. Así las peticiones del navegador son del mismo origen.
El proxy de desarrollo es equivalente; para un Gateway local se puede definir
`G6_DEMO_GATEWAY_TARGET=http://127.0.0.1:43100` en el proceso Vite (no es una variable
expuesta al bundle). Gateway y Catálogo requieren `G6_READ_ONLY_DEMO_ENABLED=true`.

## Fuentes consultadas

AGENTS/README de ambos repositorios; frontend #5 y backend #50/#51/#107/#109;
SPEC/HU/FLOW-003 y SPEC-004; OpenAPI rc.1 blob
`f64bfe9a097b2a0f74c2600988305443d92f640e`; DESIGN 1.1, UXG/UXD 2.0 y
component-spec MK-003. Se reutilizan Mantine, theme, PageHeader, FeedbackAlert y
EntityTable. La autorización del usuario limita la demo a lecturas sin login,
sin inferir permisos de escritura ni cambiar contratos compartidos.

## Validaciones y límites

- Typecheck, lint y build `api` con selector demo: ejecutados PASS.
- `tests/g6-demo-adapter.spec.ts`: tres pruebas de adapter unitarias PASS; estas usan
  fixtures explícitas para DTO/errores, no acreditan integración real.
- `verification/g6-read-demo.spec.ts`: aceptación LIVE; no intercepta peticiones ni
  sustituye respuestas. Se ejecuta por separado del conjunto mock de regresión.
- La ejecución contra Vercel previa a publicación falló porque no existe allí el
  encabezado de la vista nueva. No se modifica la aserción para simular un PASS.
- Supabase contiene 20 precios positivos en PEN. El precio mostrado se leerá de
  Pricing: el frontend no accede directamente a tablas ni usa un importe de muestra.
- Quince productos tienen fotos reales accesibles. Cinco históricos carecen de una
  foto acreditada; se muestra ausencia, sin placeholders. Ver la matriz backend.
- No se hizo merge, publicación en Vercel/Oracle ni escritura en Supabase.

## Aceptación después de publicar la versión aprobada

```powershell
$env:G6_DEMO_BASE_URL='https://g6-productos-ofertas.vercel.app'
npx playwright test --config playwright.g6-demo.config.ts --reporter=line
```

Chromium / un worker / 1440x900; red real, solo GET, imágenes cargadas, precios PEN,
detalle/categorías y ausencia de 4xx/5xx. Las evidencias de red se adjuntan al resultado;
las capturas solo se generan al fallar. El PASS integral requiere publicar también las
rutas de Gateway/Taxonomy/Pricing y completar las cinco fotografías faltantes.

Verificación Chromium local adicional: UI nueva -> Gateway/Catálogo reales locales -> Supabase existente: 20 productos y 15 fotos cargadas; cero errores JavaScript. Pricing público permanece sin publicar y el Gateway local expone su fallo HTTP, sin reemplazar precios. Evidencia: `docs/evidencias/demo-g6/local-ui.json`.
