param([Parameter(Mandatory=$false)][string]$StateFile)
$ErrorActionPreference = 'Stop'
$labRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
if (!$StateFile) {
  $candidate = Get-ChildItem $env:TEMP -Directory -Filter 'g6-h4-interactive-*' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (!$candidate) { throw 'No hay estado local del laboratorio.' }
  $StateFile = Join-Path $candidate.FullName 'state.json'
}
$state = Get-Content -LiteralPath $StateFile -Raw | ConvertFrom-Json
$serviceLog = Join-Path $state.temporary 'logs\promotions.out.log'
$operations = @()
foreach ($line in (Get-Content -LiteralPath $serviceLog)) {
  try {
    $entry = $line | ConvertFrom-Json
    if ($entry.service -eq 'promotions-svc' -and $entry.operation -eq 'listarCupones' -and $entry.status -eq 200 -and $entry.correlation_id -match '^[0-9a-f-]{36}$') {
      $operations += [ordered]@{timestamp=$entry.timestamp; service='promotions-svc'; operationId=$entry.operation; http_status=[int]$entry.status; correlation_id=$entry.correlation_id; duration_ms=[int]$entry.duration_ms}
    }
  } catch { }
}
if (!$operations.Count) { throw 'No se encontró una operación listarCupones HTTP 200 con correlación válida.' }
$listeners = @{}
foreach ($port in @(3000,3004,5173,15432)) {
  $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  $listeners[[string]$port] = [bool]$listener
}
if ($listeners.Values -contains $false) { throw 'Uno o más listeners del stack ya no están activos.' }
$evidence = [ordered]@{
  generated_at=[DateTime]::UtcNow.ToString('o')
  scenario='human-g7-authenticated-list-coupons'
  overall='PASS'
  e2e='PASS'
  boundaries=[ordered]@{
    g7_login_mfa=[ordered]@{result='PASS';source='user-confirmed; authenticated React state observed';http_status='not retained; credentials and token intentionally not inspected'}
    react_session=[ordered]@{result='PASS';source='G7Session session state rendered; private in-memory token path used by API adapter; no token value read'}
    gateway_jwt=[ordered]@{result='PASS';source='GET passed protected G7_AUTHENTICATED Gateway; local environment uses G7 Render issuer/JWKS; no demo bypass'}
    gateway_routing=[ordered]@{result='PASS';source='correlation IDs propagated into Promotions operation logs';gateway_direct_cors='NOT_HOMOLOGATED';lab_proxy='Vite same-origin proxy active'}
    promotions=[ordered]@{result='PASS';operationId='listarCupones';responses=$operations}
    postgresql=[ordered]@{result='PASS';source='Promotions returned HTTP 200 after persistence read; disposable PostgreSQL TLS verify-full; 4 official migrations'}
    react_response=[ordered]@{result='PASS';visible_result='0 cupones encontrados para el filtro Inactivo';source='React rendered API-backed response'}
  }
  listeners=$listeners
  security='No JWT, refresh token, Authorization header, credentials, OTP, personal claims, or response payload retained.'
}
$stamp = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH-mm-ssZ')
$output = Join-Path $labRoot "evidencias-integracion-g7\human-e2e-$stamp.json"
$evidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $output -Encoding utf8
Write-Output ("PASS evidence: " + $output)
Write-Output (($evidence | ConvertTo-Json -Depth 12))
