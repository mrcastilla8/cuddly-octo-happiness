# Recorrido integrado de Productos y Ofertas

Este recorrido corresponde a la demo local en modo `mock`. Sus resultados no acreditan integración HTTP, mensajería ni persistencia del backend.

La ficha Oxford fue retirada del catálogo inicial y sustituida por **Camiseta Running Endurance**: producto `PROD-RUN-001`, base `CAM-RUN`, variante blanca M `CAM-RUN-BLA-M`. Sus materiales, imagen, tipo y referencias iniciales corresponden a una camiseta deportiva. Las variantes conservan los casos activo, inactivo y sin saldo necesarios para validar el comportamiento comercial.

## Guion de 17 pasos

| Paso | Responsable | Acción y resultado esperado |
| --- | --- | --- |
| 1 | Leonardo López | Crear una categoría, por ejemplo «Ropa de entrenamiento». Esperar la comprobación del slug y confirmar. |
| 2 | Leonardo López | Crear una marca, por ejemplo «Endurance Sport». |
| 3 | Gabriel | Abrir Gestión de productos → Camiseta Running Endurance → Editar. |
| 4 | Gabriel | Cambiar el nombre a «Camiseta Running Integrada» y seleccionar la categoría y marca nuevas. |
| 5 | Gabriel | Guardar y verificar los tres datos en el detalle. |
| 6 | Miguel | En Control de stock, buscar `CAM-RUN-BLA-M`: nombre y clasificación actualizados, disponible **8**. |
| 7 | Marco | Abrir Conjunto Trail Esencial: contiene `CAS-COR-001` y `CAM-RUN-BLA-M`, una unidad de cada uno; disponibilidad inicial **4**. |
| 8 | Leonardo Vera | Consultar el SKU `CAM-RUN-BLA-M` en Precios: precio regular **S/ 139.90**. |
| 9 | Leonardo Vera | Editar el precio regular a **S/ 149.90**, indicar motivo, guardar y confirmar. Volver a consultar. |
| 10 | Marco | Volver al combo: el componente muestra **S/ 149.90**, sin editar su definición. |
| 11 | Miguel | En Traslados, recepcionar **5** unidades de `TR-2026-101` y **5** de `TR-2026-100`, con reingreso a disponible. Los disponibles quedan en **13** y **9**, respectivamente. |
| 12 | Marco | Volver al combo: disponibilidad estimada **9**. |
| 13 | Axel | Crear una promoción: Con cupón, Inactivo, prioridad 2, porcentaje 15, canal Marketplace y fechas válidas. Para reproducir la prueba: 18/10/2026 a 10/11/2026. |
| 14 | Axel | Seleccionar el SKU `CAM-RUN-BLA-M` como alcance; guardar y comprobar nombre actualizado y SKU en el detalle. |
| 15 | Gabriel | Desactivar Camiseta Running Integrada y confirmar. |
| 16 | Axel | Verificar que una promoción nueva ya no ofrece ese SKU. Volver a la promoción guardada: su referencia y nombre siguen visibles. |
| 17 | Marco | Abrir el combo: muestra Componente inactivo y deja de presentarse disponible para nuevas ventas; mantiene su definición. |

## Auditoría y pruebas

- Inventario consulta los metadatos actuales de Catálogo por SKU; mantiene cantidades, versiones, ubicaciones y movimientos propios.
- Precios conserva sus identidades e importes y consulta la selección y nombres actuales del catálogo. Un alta pendiente no recibe un precio inventado.
- Promociones mantiene las referencias previas a productos inactivos y las excluye de los selectores de nuevas asociaciones.
- Combos consulta estado, nombres, precios y saldos actuales. Las lecturas independientes se ejecutan en paralelo.
- Los controles de fallos de Precios se montan exclusivamente desde `tests/harness/pricing-review.html`; no aparecen en las rutas comerciales.
- `tests/g6-mock-integration.spec.ts` recorre el guion dentro de un mismo documento, sin recargar para sincronizar los módulos.
- `tests/g6-mock-projections.spec.ts` comprueba metadatos, filtros, dashboard, traslados, renombrados de Taxonomía y conservación de referencias inactivas.
- `scripts/verify-production.mjs` comprueba las rutas comerciales y rechaza notas técnicas visibles; en modo API también comprueba que no se carguen mocks.
