param(
  [int]$IntervalMinutes = 60
)

$ErrorActionPreference = 'Stop'

$scriptRoot = $PSScriptRoot
if (-not $scriptRoot) {
  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$loopScript = Join-Path $scriptRoot 'backup-auto-loop.ps1'

if (-not (Test-Path -LiteralPath $loopScript)) {
  throw "Script de automacao nao encontrado: $loopScript"
}

$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$valueName = 'CarteiraInvestimentosBackup'
$command = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}" -IntervalMinutes {1}' -f $loopScript, $IntervalMinutes

New-ItemProperty -Path $runKey -Name $valueName -Value $command -PropertyType String -Force | Out-Null

Write-Host "Automacao ativada com sucesso."
Write-Host "Ela vai iniciar ao fazer login e manter o backup rodando a cada $IntervalMinutes minutos."
