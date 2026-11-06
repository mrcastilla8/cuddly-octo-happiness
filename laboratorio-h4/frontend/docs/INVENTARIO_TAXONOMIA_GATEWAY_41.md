# Inventario de integración Taxonomía — #41

Referencia: OpenAPI 0.6.0-rc.2, Gateway y taxonomy-svc de Backend `606e36ce668b46b01a8681ea6028d93e0b02f7e5`. La presencia de una ruta en el catálogo Gateway no acredita despliegue ni grants.

| Pantalla / interacción | Operaciones contractuales y estado |
| --- | --- |
| MK-008 categorías: lecturas comerciales | HTTP disponible: `listarCategorias` GET `/categorias`; devuelve solo activas y requiere identidad de servicio. No cubre el árbol administrativo. |
| MK-008 categorías: crear, editar, reactivar | HTTP disponible en el servicio: `crearCategoria`, `actualizarCategoria`, `reactivarCategoria`; requieren usuario y verificación de sesión/Gateway. |
| MK-008 árbol, detalle y baja | Mock transitorio explícito en modo mock. Bloqueado en API: no se confirmó implementación de las lecturas administrativas o del flujo de baja para esta pantalla. |
| MK-009 características y reactivaciones | Mock transitorio explícito en modo mock. Bloqueado en API: falta gestión HTTP completa de características y reactivación; valores específicos sí tienen lectura, creación, edición y baja en el servicio. |
| MK-010 tipos: listado | HTTP contractual: `listarTiposProducto` GET `/tipos-producto`; el adapter valida DTO, enum, identidad y paginación, y propaga errores sin fallback. Límites y conteos de características no los entrega este endpoint. |
| MK-010 esquema, creación, asociación y baja | HTTP disponible en el servicio para lectura de esquema, creación, asociación, cambio de obligatoriedad y admisión de baja; la UI correspondiente queda bloqueada en API hasta conectar y probar cada recorrido. Reactivación permanece en mock. |
| MK-011 marcas: lecturas comerciales | HTTP disponible: `listarMarcas` GET `/marcas`; devuelve solo activas y requiere identidad de servicio. No cubre la lista administrativa completa. |
| MK-011 marcas: crear, editar y reactivar | HTTP disponible en el servicio; multipart y JWT humano requieren adaptación contractual y prueba. El detalle y la baja administrativa permanecen bloqueados en API. |
| MK-012 SEO | Mock transitorio explícito en modo mock; bloqueado en API mientras el servicio no implemente las operaciones necesarias. |

El único selector es `VITE_DATA_MODE`. En API no se recurre a fixtures ante errores; las operaciones no conectadas fallan cerradas. La integración usa la sesión G7 humana existente; el transporte inyectable de Taxonomía es provisional hasta disponer del cliente compartido (#109). No se exponen credenciales de servicio al navegador. Los grants de Seguridad, homologación externa y recorrido Gateway real no quedan acreditados por este inventario.

## Interacciones y frontera de ejecución

- **MK-008, HTTP disponible en el servicio:** `listarCategorias`, `crearCategoria`, `actualizarCategoria`, `reactivarCategoria`. **Bloqueadas en API:** `obtenerArbolCategoriasAdmin`, `obtenerCategoriaAdmin`, `listarCategoriasAdmin`, `solicitarDesactivacionCategoria` y seguimiento administrativo; las pantallas conservan el mock solo en modo mock.
- **MK-009, HTTP disponible en el servicio:** `listarValoresCaracteristica`, `crearValorCaracteristica`, `actualizarValorCaracteristica`, `solicitarDesactivacionValorCaracteristica`. **Bloqueadas en API:** listado, creación, consulta, edición y cambio de estado de características, y reactivación de valor.
- **MK-010, HTTP disponible en el servicio:** `listarTiposProducto`, `obtenerTipoProducto`, `crearTipoProducto`, `obtenerEsquemaTipoProducto`, `asociarCaracteristicaTipoProducto`, `actualizarAsociacionTipoCaracteristica`, `solicitarDesactivacionTipoProducto`, `solicitarDesasociacionTipoCaracteristica`. Solo el listado tiene adaptador y gate habilitado en este avance. **Bloqueada en API:** `reactivarTipoProducto` y las pantallas sin adaptador.
- **MK-011, HTTP disponible en el servicio:** `listarMarcas`, `crearMarca`, `actualizarMarca`, `reactivarMarca`. **Bloqueadas en API:** `listarMarcasAdmin`, `obtenerMarcaAdmin` y `solicitarDesactivacionMarca`.
- **MK-012, bloqueada en API:** `obtenerSeoCategoriaAdmin`, `actualizarSeoCategoria`, `listarHistorialSlugCategoria`; se conserva mock explícito en modo mock.

La disponibilidad HTTP describe rutas y controladores inspeccionados, no su conexión desde React ni evidencia de extremo a extremo. El listado usa páginas de 200 (máximo publicado), valida `meta.pagina`, `meta.tamanio`, `meta.total`, `meta.totalPaginas`, cardinalidad y duplicados; las características asignadas y sus límites quedan como no disponibles. Cada consulta tiene timeout acotado y cancelación. Un `401 TOKEN_INVALIDO` puede renovar la sesión G7 y repetir el GET una sola vez; otros 401, 403, 5xx y errores de red no se reintentan. Si no hay sesión, se informa que debe iniciarse en Promociones. La sustitución por el cliente transversal y una experiencia de sesión compartida siguen pendientes de #109.

Pruebas focalizadas: `npx vitest run --config src/features/taxonomy/adapters/vitest.config.ts`. Las respuestas de esas pruebas son simuladas y no acreditan Gateway real.
