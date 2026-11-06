# Ejecución de integración H4 G6 ↔ G7

## Estado

Laboratorio base importado desde las ramas y SHAs de `MANIFIESTO-SHAS.json`. El E2E combinado permanece `BLOCKED`: en este punto no se ejecutó login real G7 con MFA ni cadena React → Gateway → Promotions → PostgreSQL. Ver `evidencias-integracion-g7/resumen.json`.

## Seguridad

No guardar `.env` reales, tokens, OTP, cookies, HAR, capturas de sesión o cuerpos confidenciales en Git. Usar configuración local ignorada. El secreto M2M nunca va al frontend.

## Reproducción pendiente

Los repositorios fuente traen instrucciones propias. Antes de una ejecución completa, confirmar el runner existente para Promotions, usar PostgreSQL descartable y validar el OpenAPI para seleccionar la operación. La evidencia debe actualizarse con timestamp y correlation IDs reales, además de separar pruebas G7, G6 local y E2E combinado.
