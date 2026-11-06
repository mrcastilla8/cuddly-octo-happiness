# Propuesta de metadatos para PR #40

Texto autorizado expresamente por el usuario el 01/11/2026 para actualizar título y
descripción con los resultados finales. No cambia base, estado, revisores ni issues.

Título propuesto: `feat(catalogo): conectar HTTP y corregir productos/SKU MK-003/004 (#5, #6, #35)`

Descripción propuesta:

Catálogo/SKU conecta las 17 operaciones de su puerto a HTTP por Gateway configurado,
exige SKU explícito y conserva errores, entradas y preparación sin fallback a mocks
ni reintentos automáticos de escritura. Incluye correcciones de integración mock #35.

La integración administrativa es parcial: falta la lectura aprobada de borradores
con estado/versión/perfil; Taxonomía conserva bloqueos por roles y límites ausentes.
La preparación se consulta independientemente. Sesión/JWT G7 y pruebas reales por
Gateway siguen pendientes; no se acredita E2E real, homologación ni despliegue.

Validación de d4a5769: Node 22, lockfile, typecheck/lint, builds mock/API, 370 unitarias,
78 pruebas de Catálogo/Variantes y 23 comprobaciones finales HTTP/UI PASS.
Preview API: 53 vistas a 1440 px, sin carga de mocks. Suite completa/CI en seguimiento.

Informe: docs/INTEGRACION_CATALOGO_H4.md. Capturas: docs/evidencias/catalogo-h4/.
Rama exclusiva poma; master e171a20 ya incluido. PR abierto, sin cierre de issues.

Refs #5, #6, #35.
