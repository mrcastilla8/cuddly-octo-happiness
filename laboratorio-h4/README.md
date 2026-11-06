# Integración H4 G6 ↔ G7

## Alcance y estado

Esta rama es experimental y parte de `laboratorio/h4-base-actualizada`. No modifica repositorios oficiales. El reporte actual muestra F0 PASS, discovery/JWKS reales PASS, CORS real del login PASS, preflight opcional con `x-correlation-id` FAIL y Gateway local CORS bloqueado por conexión rechazada después de terminar el runner. El E2E combinado permanece BLOCKED hasta ejecutar login/MFA humano y mantener Gateway/Promotions disponibles para la petición posterior.

Operación protegida elegida con el OpenAPI fijado en la base: `GET /api/v1/cupones`, `operationId=listarCupones`, seguridad `userBearer`. La operación está registrada en el Gateway e implementada en Promotions.

## Diagnóstico reproducible en PowerShell

Desde la raíz de la pizarra, con internet para G7 discovery/JWKS:

```powershell
$node22 = npx --yes --package=node@22.22.3 -c "node -p process.execPath" | Select-Object -Last 1
$env:PATH = "$(Split-Path $node22);$env:PATH"
node --version
pwsh -NoProfile -File .\laboratorio-h4\scripts\verify-provenance.ps1
node .\laboratorio-h4\scripts\verify-protected-operation.mjs
node .\laboratorio-h4\scripts\diagnostico-http.mjs
node .\laboratorio-h4\scripts\validate-evidence.mjs
```

`diagnostico-http.mjs` comprueba versiones/configuración, G7 discovery, issuer y JWKS, preflight POST login con `Content-Type`, soporte separado de `X-Correlation-Id` y preflight del Gateway para `GET /api/v1/cupones`. Solo registra metadatos HTTP permitidos, IDs de correlación, status, duración, códigos de error y claves JSON. Cada ejecución genera timestamp UTC, `scenario_id`, resumen, matriz y JSONL.

## Build y pruebas locales aisladas

```powershell
Push-Location .\laboratorio-h4\backend
npm ci
npm run build:all
npm test -- apps/promotions-svc/src/http/promotions-identity.spec.ts apps/promotions-svc/src/http/http-validation.spec.ts apps/api-gateway/src/routing/routing.e2e-spec.ts
node apps/promotions-svc/test/gateway.isolated.smoke.mjs
Pop-Location

Push-Location .\laboratorio-h4\frontend
npm ci
npm run build
npx vitest run --config vitest.config.ts src/features/promotions
Pop-Location
```

`gateway.isolated.smoke.mjs` levanta Gateway, Promotions y PostgreSQL/TLS descartables con JWT/JWKS de fixture local; no representa autenticación G7 real. El runner limpia sus recursos al finalizar.

## Interacción humana G7

`frontend/.env.local` está ignorado por Git y contiene configuración no secreta para `VITE_DATA_MODE=api`, Gateway loopback y el API base G7. En un clon nuevo, créalo así (no añadas secretos):

```powershell
@'
VITE_DATA_MODE=api
VITE_GATEWAY_ORIGIN=http://127.0.0.1:3000
VITE_G7_API_BASE=https://g7-auth-service.onrender.com/api/v1
'@ | Set-Content -Encoding ascii .\laboratorio-h4\frontend\.env.local
git check-ignore .\laboratorio-h4\frontend\.env.local
```

Para iniciar React:

```powershell
Push-Location .\laboratorio-h4\frontend
npm run dev
Pop-Location
Start-Process 'http://127.0.0.1:5173/cupones'
```

La pantalla real de sesión está en `/cupones`. Introduce allí la cuenta de prueba y OTP. No pegues credenciales en terminal, chat, consola, scripts, HAR o evidencia. G7 permite el POST de login desde este origen con `Content-Type`. El Gateway del smoke aislado se cierra al terminar; si el login se completa antes de iniciar un Gateway persistente, el listado no completará el E2E y fallará por transporte.

## Evidencia

- `evidencias-integracion-g7/resumen.json`: F0/F1/F2 real, SHAs y correlaciones.
- `evidencias-integracion-g7/matriz-fronteras.json`: estados y diagnósticos por fase.
- `evidencias-integracion-g7/solicitudes-http.jsonl`: metadatos HTTP sanitizados.
- `evidencias-integracion-g7/prueba-local-sintetica.json`: Gateway/Promotions/PostgreSQL local, separado de G7.
- `evidencias-integracion-g7/diagnostico.md`: causa, owner y siguiente comprobación.

No hay login humano, OTP, JWT G7 auténtico, autorización de rol real ni respuesta de cupones obtenida con sesión humana; por ello F3–F8 del E2E combinado no pasan. El rechazo CORS de `X-Correlation-Id` aplica al probe explícito de ese encabezado; el login comprobado no lo necesita. El Gateway CORS requiere una instancia persistente; el runner aislado sí comprobó routing/auth con fixtures.
