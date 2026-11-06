# Estado y límites de carga masiva

Este documento registra el comportamiento del frontend en la revisión de esta rama. No sustituye el contrato del provider `bulk-svc` ni acredita integración backend.

## Selección del adapter

`src/features/bulk/services/bulkService.ts` exporta `mockBulkRepository` directamente. No consulta `VITE_DATA_MODE` ni selecciona un provider HTTP. La ruta `/carga-masiva` está registrada en `productRoutes.tsx`, pero no está entre las rutas que `CommercialModeGate` bloquea o trata según el modo. En consecuencia, el flujo continúa simulándose cuando `VITE_DATA_MODE=api`, aunque las demás rutas que sí tienen gates de modo presenten un bloqueo.

Esta diferencia es una corrección funcional pendiente e independiente. El README la declara para que `api` no se interprete como garantía global de que no se usan mocks; este informe no modifica el comportamiento.

## Validación local de XLSX

`src/features/bulk/utils/localFileCheck.ts` realiza una comprobación preliminar del contenedor XLSX como ZIP/OOXML. Revisa firmas básicas del ZIP, el directorio central y la presencia de entradas canónicas como `[Content_Types].xml` y `xl/workbook.xml`.

Esta comprobación no descomprime ni procesa completamente las hojas, celdas, filas o tipos de datos. La propia interfaz identifica esos aspectos como no verificados y deja su validación comercial al servicio que procese el lote. Por ello, un resultado local válido solo acredita que se reconoció una estructura de contenedor esperada; no valida los datos de negocio.

El cliente no puede obtener el número real de filas de un XLSX mediante esta revisión. En el adapter mock, el total de filas permanece desconocido y un lote sin filas verificadas permanece en `PROCESSING`; no se marca `COMPLETED` con cero filas como si el archivo se hubiera procesado. CSV y fixtures pueden tener cantidades conocidas, pero sus resultados siguen siendo demostraciones del adapter mock.

## Integración pendiente

La validación completa de hojas XLSX, la admisión comercial, los resultados de fila y el procesamiento/exportación reales requieren un provider backend configurado. Los estados del mock, los fixtures y la inspección local del ZIP no demuestran persistencia, conexión HTTP, publicación ni pruebas E2E.
