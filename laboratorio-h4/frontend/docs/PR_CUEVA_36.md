# fix(frontend): integrar Catálogo con Promociones y actualizar datos de cupones

Los selectores de Promociones/Recomendaciones leían un catálogo fijo independiente:
editar o desactivar un producto/SKU en Productos no cambiaba los candidatos.
Además, un cupón conservaba el nombre y la vigencia anteriores de su promoción
después de editarla. Ambas discrepancias se reprodujeron con pruebas antes de
corregirlas.

La composición mock de la aplicación ahora adapta los puertos públicos existentes
de Catálogo, conserva IDs/SKU, recorre sus páginas, filtra estados activos y
propaga errores/cancelaciones sin fallback a fixtures aislados. Las campañas y
reglas iniciales referencian el catálogo existente; no se duplica su estado ni se
modifican los contratos del proveedor. Las lecturas de cupones consultan su
promoción actual sin alterar límites/usos ni el historial que restringe modalidad.

Refs #7, #8, #9, #36. **MOCK_INTEGRATED / MOCK_ONLY**. No cerrar automáticamente:
faltan revisión UX/técnica, compatibilidad de owners y validación de merge/CI.

## Base y preservación

- Rama: `cueva`, sin ramas nuevas. Base auditada:
  `2759c8d031b35e665432a9ca0f2a45c87943f072`.
- La rama incorporó los 65 commits pendientes de master por fast-forward.
- El diff se limita a Promociones, pruebas propias, README y evidencia/reporte.
  No cambia Catálogo/Taxonomía/Pricing/Combos, shared, main, rutas, CI o dependencias.
- `tests/catalog.spec.ts` recibe esperas por los resultados visibles de filtros:
  la prueba anterior falló 2/3 veces en repetición aislada y pasó 3/3 después.
  Conserva todas sus aserciones originales; el código de Catálogo no cambia.
- Docs oficial `master@c36bd9a18f4fdb188df0d7e5158a431cf4b4ea7b`;
  DESIGN 1.1.0; inventario de 19 vistas Sxx comprobado.
- HEAD final: commit que publica esta propuesta. El candidato de merge y la CI
  remota se registrarán en la PR después de publicarla. Si master avanza, esta
  base requiere revalidación.

## Validación

Con Node 22.23.3: typecheck, lint y builds mock/API PASS; suite completa final
**259 PASS, cero fallos (8.0 minutos)**. Verificación de producción local: mock
48 vistas y API 44 vistas; smoke de cinco rutas y revisión visual a 1440 px PASS.

Los comandos, resultados y capturas finales se registran en
[CORRECCIONES_CUEVA_36.md](CORRECCIONES_CUEVA_36.md) y
`docs/evidencias/cueva-20261016/`. La evidencia local no sustituye CI remota.

Las pruebas nuevas cubren edición y desactivación de producto/SKU desde la UI,
altas en borrador, activación posterior de variante, paginación, error/cancelación,
referencias rechazadas al guardar, campaña/cupón/recomendaciones y actualización
de nombre/vigencia en listado/detalle de cupones. Se conservan los escenarios DEV
y el gate de las 19 vistas API sin provider ni carga de mocks.

## Revisión requerida y límites

Poma revisa el consumidor de Catálogo; Vera revisa UX y Castilla la integración
coordinada, conforme #33/#36. No se realizaron solicitudes en nombre del usuario.
No hay cambios al contrato compartido; las integraciones posteriores de Taxonomía,
Pricing e Inventario siguen bajo sus owners.

D-REC-01/02 mantienen precio/disponibilidad como no disponibles. No se implementan
HTTP, permisos reales, stock, checkout, consumo/restauración ni persistencia
comercial. En API siguen los bloqueos visibles sin fallback; producción permanece
en mock. La entrega no acredita aprobación documental de los MK ni despliegue
de este diff. El merge requiere autorización del coordinador y base/HEAD vigentes.
