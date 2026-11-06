$ErrorActionPreference = 'Stop'
$labRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$repoRoot = (Resolve-Path (Join-Path $labRoot '..\..')).Path
$backend = Join-Path $labRoot 'backend'
$frontend = Join-Path $labRoot 'frontend'
$node = Join-Path $env:LOCALAPPDATA 'npm-cache\_npx\ca3942424f2c6fc5\node_modules\node\bin\node.exe'
$openssl = 'C:\Program Files\Git\usr\bin\openssl.exe'
if (!(Test-Path $node)) { $node = (Get-Command node.exe).Source }
foreach ($port in @(3000,3004,5173,15432)) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listener) { throw "Port $port is already occupied (PID $($listener.OwningProcess)); stop only the known lab process and retry." }
}
if (!(Test-Path $openssl)) { throw 'OpenSSL de Git no está disponible.' }
$temporary = Join-Path $env:TEMP ("g6-h4-interactive-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
$container = 'g6-h4-lab-' + [guid]::NewGuid().ToString('N').Substring(0,12)
$adminPassword = [guid]::NewGuid().ToString()
$runtimePassword = [guid]::NewGuid().ToString()
$logDir = Join-Path $temporary 'logs'; New-Item -ItemType Directory -Path $logDir | Out-Null
try {
  $certProcess = Start-Process -FilePath $openssl -ArgumentList @('req','-x509','-newkey','rsa:2048','-nodes','-days','2','-subj','/CN=g6-h4-interactive-lab','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-addext','basicConstraints=critical,CA:TRUE','-keyout',(Join-Path $temporary 'server.key'),'-out',(Join-Path $temporary 'server.crt')) -Wait -PassThru -WindowStyle Hidden -RedirectStandardError (Join-Path $temporary 'openssl.log')
  if ($certProcess.ExitCode -ne 0) { throw 'TLS_CERTIFICATE_GENERATION_FAILED' }
  $env:POSTGRES_PASSWORD = $adminPassword
  docker run --detach --name $container --publish '127.0.0.1:15432:5432' --env POSTGRES_PASSWORD --mount "type=bind,source=$temporary,target=/test-tls,readonly" postgres:17-alpine sh -c 'cp /test-tls/server.key /tmp/server.key && cp /test-tls/server.crt /tmp/server.crt && chmod 600 /tmp/server.key && chmod 644 /tmp/server.crt && chown postgres /tmp/server.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'POSTGRES_CONTAINER_START_FAILED' }
  $env:H4_PG_PORT = '15432'; $env:H4_PG_ADMIN_PASSWORD = $adminPassword; $env:H4_PG_RUNTIME_PASSWORD = $runtimePassword; $env:PGSSLROOTCERT = Join-Path $temporary 'server.crt'
  $ready = $false
  for ($i=0; $i -lt 60; $i++) { docker exec $container pg_isready -U postgres -d postgres *> $null; if ($LASTEXITCODE -eq 0) { $ready=$true; break }; Start-Sleep -Milliseconds 500 }
  if (!$ready) { throw 'POSTGRES_READINESS_TIMEOUT' }
  Push-Location $backend
  try { & $node (Join-Path $labRoot 'scripts\interactive\prepare-disposable-db.mjs'); if ($LASTEXITCODE -ne 0) { throw 'OFFICIAL_MIGRATIONS_FAILED' } } finally { Pop-Location }

  $baseEnv = @{
    NODE_ENV='development'; AUTH_ISSUER='https://g7-auth-service.onrender.com/api/v1/auth'; AUTH_JWKS_URL='https://g7-auth-service.onrender.com/api/v1/auth/.well-known/jwks.json';
    PGHOST='127.0.0.1'; PGPORT='15432'; PGDATABASE='postgres'; PGUSER='promotions_lab_login'; PGPASSWORD=$runtimePassword; PGSSLMODE='verify-full'; PGSSLROOTCERT=$env:PGSSLROOTCERT; G6_DATABASE_SCHEMA='promotions'; G6_CONNECTION_MODE='session'; RABBITMQ_URL='amqp://lab:lab@127.0.0.1:1/lab';
    PROMOTIONS_SVC_PORT='3004'; PROMOTIONS_DEPENDENCY_PROBES_ENABLED='false'; PROMOTIONS_COUPON_RUNTIME_ENABLED='false'; GATEWAY_DEMO_NO_AUTH_ENABLED='false'; G6_READ_ONLY_DEMO_ENABLED='false'; G6_SECURITY_MODE='G7_AUTHENTICATED'; GATEWAY_PROMOTIONS_SVC_URL='http://127.0.0.1:3004'; API_GATEWAY_PORT='3000'
  }
  foreach ($key in $baseEnv.Keys) { Set-Item "Env:$key" $baseEnv[$key] }
  $gw = Start-Process -FilePath $node -ArgumentList 'dist/apps/api-gateway/main.js' -WorkingDirectory $backend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'gateway.out.log') -RedirectStandardError (Join-Path $logDir 'gateway.err.log')
  $promo = Start-Process -FilePath $node -ArgumentList 'dist/apps/promotions-svc/main.js' -WorkingDirectory $backend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'promotions.out.log') -RedirectStandardError (Join-Path $logDir 'promotions.err.log')

  $frontendEnv = Join-Path $frontend '.env.local'
  Set-Content -LiteralPath $frontendEnv -Value "VITE_DATA_MODE=api`nVITE_GATEWAY_ORIGIN=http://127.0.0.1:5173`nVITE_G7_API_BASE=https://g7-auth-service.onrender.com/api/v1`nVITE_H4_LAB_PROXY=true" -Encoding ascii
  $env:VITE_DATA_MODE = 'api'; $env:VITE_GATEWAY_ORIGIN = 'http://127.0.0.1:5173'; $env:VITE_G7_API_BASE = 'https://g7-auth-service.onrender.com/api/v1'; $env:VITE_H4_LAB_PROXY = 'true'
  $vite = Start-Process -FilePath $node -ArgumentList 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort' -WorkingDirectory $frontend -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $logDir 'react.out.log') -RedirectStandardError (Join-Path $logDir 'react.err.log')
  $state = [ordered]@{ container=$container; temporary=$temporary; gatewayPid=$gw.Id; promotionsPid=$promo.Id; reactPid=$vite.Id; startedAt=(Get-Date).ToUniversalTime().ToString('o') }
  $statePath = Join-Path $temporary 'state.json'; $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding ascii
  $env:H4_LAB_STATE_FILE = $statePath

  foreach ($entry in @(@{name='Gateway';url='http://127.0.0.1:3000/health';expected=200},@{name='Promotions';url='http://127.0.0.1:3004/health';expected=200},@{name='React';url='http://127.0.0.1:5173/cupones';expected=200})) {
    $ok=$false; for ($i=0; $i -lt 40; $i++) { try { $response=Invoke-WebRequest -Uri $entry.url -TimeoutSec 3 -UseBasicParsing; if ([int]$response.StatusCode -eq $entry.expected) {$ok=$true;break} } catch { Start-Sleep -Milliseconds 500 } }
    if (!$ok) { throw "$($entry.name)_READINESS_FAILED" }
    Write-Output "$($entry.name): PASS HTTP $($response.StatusCode)"
  }
  $denied = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/api/v1/cupones' -Method Get -SkipHttpErrorCheck -UseBasicParsing
  if ([int]$denied.StatusCode -ne 401) { throw "Unauthenticated coupon request expected 401, got $($denied.StatusCode)" }
  Write-Output 'Gateway protected operation: PASS HTTP 401 without token'
  $state | ConvertTo-Json -Compress
  Write-Output "Local state: $statePath"
  Write-Output 'Stack persists in background. Stop with scripts\interactive\stop-interactive-lab.ps1.'
} catch {
  Write-Output ("STARTUP_ERROR: " + $_.Exception.Message)
  Write-Output "Diagnostic files retained at: $temporary"
  throw
} finally {
  Remove-Item Env:POSTGRES_PASSWORD,Env:H4_PG_ADMIN_PASSWORD,Env:H4_PG_RUNTIME_PASSWORD -ErrorAction SilentlyContinue
}
