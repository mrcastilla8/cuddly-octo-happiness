$ErrorActionPreference = 'Stop'
$statePath = $env:H4_LAB_STATE_FILE
if (!$statePath) { throw 'Define H4_LAB_STATE_FILE con la ruta Local state indicada por el script de inicio.' }
if (!(Test-Path -LiteralPath $statePath)) { throw 'No se encontró el estado local del laboratorio.' }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
foreach ($id in @($state.reactPid,$state.gatewayPid,$state.promotionsPid)) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $id" -ErrorAction SilentlyContinue
  if ($process -and $process.ExecutablePath -like '*\node.exe' -and ($process.CommandLine -match 'vite\.js' -or $process.CommandLine -match 'dist/apps/api-gateway/main\.js' -or $process.CommandLine -match 'dist/apps/promotions-svc/main\.js')) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
}
$container = [string]$state.container
if ($container -match '^g6-h4-lab-[a-f0-9]{12}$') { docker rm -f $container *> $null }
$directory = [string]$state.temporary
$tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
$absolute = [IO.Path]::GetFullPath($directory)
if ($absolute.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -and (Split-Path $absolute -Leaf).StartsWith('g6-h4-interactive-')) {
  Remove-Item -LiteralPath $absolute -Recurse -Force
}
Remove-Item Env:H4_LAB_STATE_FILE -ErrorAction SilentlyContinue
Write-Output 'Interactive H4 lab stopped; only recorded lab processes and disposable database were removed.'
