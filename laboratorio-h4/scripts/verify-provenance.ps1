$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -Raw (Join-Path $root 'MANIFIESTO-SHAS.json') | ConvertFrom-Json
$bad = @()
foreach ($repo in $manifest.repositories) {
  $base = Join-Path (Split-Path -Parent $root) $repo.path
  $seen = 0
  foreach ($file in $repo.files) {
    $path = Join-Path $base ($file.path -replace '/', '\')
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { $bad += "$($repo.name): missing $($file.path)"; continue }
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
    if ($actual -ne $file.sha256) { $bad += "$($repo.name): hash mismatch $($file.path)" }
    $seen++
  }
  Write-Output "$($repo.name): checked=$seen expected=$($repo.file_count)"
}
if ($manifest.contract_source) {
  $contractPath = Join-Path (Split-Path -Parent $root) $manifest.contract_source.file
  if (-not (Test-Path -LiteralPath $contractPath -PathType Leaf)) {
    $bad += "contract snapshot missing: $($manifest.contract_source.file)"
  } else {
    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $contractPath).Hash.ToLowerInvariant()
    if ($actual -ne $manifest.contract_source.sha256) { $bad += 'contract snapshot SHA-256 mismatch' }
    Write-Output "OpenAPI snapshot: SHA-256 checked"
  }
}
if ($bad.Count) { $bad | ForEach-Object { Write-Error $_ }; exit 1 }
Write-Output 'PASS provenance file inventory and SHA-256 checks'
