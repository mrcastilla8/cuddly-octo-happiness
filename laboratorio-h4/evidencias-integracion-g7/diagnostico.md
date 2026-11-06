# Diagnóstico de fronteras — 2026-11-06

Ejecución real F0–F2: `2026-11-06T12:29:29Z`–`12:29:32Z`; SHAs fuente frontend `4d1b85969816f2879a6f6f17b3553cccba0ab764`, backend `f00448279210b33125484773069f466b39c37ee4`.

| Fase | Estado | Evidencia | Causa / owner |
|---|---|---|---|
| F0 entorno | PARTIAL | Toolchain PASS: Node 22.22.3, npm 11.4.2, Docker CLI/daemon; frontend `.env.local` ignorado. Backend sin configuración privada local | Faltan configuración de Gateway/Promotions para proceso persistente; sin secretos en el proceso |
| F1 G7 discovery | PASS | HTTP 200 en 698 ms; JWKS 200 en 206 ms; RSA compatible; corr `1f55fc2a-16fa-44e1-8ed1-e9d2a6d6ad98`, JWKS corr `5dee4329-9881-4e7d-9440-7f65675e86da` | G7 responde; issuer HTTPS y JWKS disponibles |
| F2 G7 login CORS | PASS | OPTIONS POST, `Content-Type`; HTTP 200; corr `29a2a348-f5e6-4a84-8f09-36b3e9ed7ce2` | El origen local está permitido para el login; no se enviaron credenciales |
| F2 G7 correlation header | FAIL | OPTIONS GET HTTP 200, pero `Access-Control-Allow-Headers` no incluye `x-correlation-id`; corr `13d7faf5-075d-4853-9f76-190c36a0e258` | G7: solo afecta clientes que envíen ese encabezado al origen G7. El login React observado no lo requiere. Solicitar inclusión únicamente si se decide propagar correlation a llamadas G7. |
| F2 Gateway local CORS | BLOCKED | `ECONNREFUSED`, corr `beeef19c-d691-4f01-b938-6a175dd16677` | El Gateway no estaba escuchando en `127.0.0.1:3000` tras completar el runner aislado. Owner G6 laboratorio: mantener el stack iniciado para preflight navegador. No es evidencia de una política CORS incorrecta. |
| Operación contractual | PASS | OpenAPI `GET /cupones`, `listarCupones`, `userBearer`; Gateway ruta, controller Promotions y contrato generado coinciden | Lectura protegida, sin escritura. Rol real aún no evaluado. |
| Gateway → Promotions → PostgreSQL local | PASS (fixture local separado) | `gateway.isolated.smoke.mjs`, Node 22.22.3, exit 0; Gateway/Promotions reales y PostgreSQL TLS descartable; 12×200, 2×400 negativos, 5×503 fail-closed; corr incluidos en `prueba-local-sintetica.json` | JWT/JWKS G7 y upstreams comerciales son fixtures explícitos. Los 503 son fail-closed de dependencias comerciales aisladas, no fallo G7. |
| Login humano / F3 | NOT_RUN | La app React está abierta en `/cupones`, pantalla de login visible | Requiere que la persona escriba contraseña y OTP directamente. No se capturan esos datos. CORS de login y disponibilidad G7 ya comprobados antes de solicitarlo. |
| F4–F8 combinado | BLOCKED | Sin JWT humano real ni Gateway persistente tras el smoke | No afirmar validación de token real, rol, routing con sesión humana ni respuesta contractual del E2E.

## Incidencias y responsables

- **G7 / CORS opcional:** G7 no autoriza `x-correlation-id` en su allowlist. No bloquea el POST de login probado (solo Content-Type). Si el requisito incluye correlación en peticiones a G7, owner G7 debe autorizar el header y el mismo OPTIONS debe devolverlo en `Access-Control-Allow-Headers`.
- **G6 / disponibilidad local:** el runner levanta el stack descartable y lo elimina al terminar. Por eso el preflight posterior a `127.0.0.1:3000` recibió `ECONNREFUSED`. Mantener Gateway + Promotions + PostgreSQL disponibles durante la sesión real; comprobar OPTIONS de `/api/v1/cupones` y respuesta 200/401/403 antes del E2E.
- **G6 / comercial:** operaciones de evaluación que dependan de servicios comerciales devuelven `503 SERVICIO_NO_DISPONIBLE` en escenarios aislados cuando el proveedor de fixture se apaga. Se verificó fail-closed; no se atribuye a G7 ni se cambia el contrato.

No se ha observado todavía un fallo de autenticación real G7. El E2E global sigue BLOCKED.
