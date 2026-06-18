param(
  [int]$IntervalMinutes = 60
)

$ErrorActionPreference = 'Stop'

$projectRoot = "C:\Projetos\carteira-investimentos"
$backupScript = Join-Path $projectRoot 'backup-to-drive.ps1'
$destinationDrive = 'G:\'

if ($IntervalMinutes -lt 15) {
  $IntervalMinutes = 15
}

while ($true) {
  try {
    if (Test-Path -LiteralPath $destinationDrive) {
      & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $backupScript
    }
  } catch {
    # Mantem o loop vivo mesmo se o Drive estiver temporariamente indisponivel.
  }

  Start-Sleep -Seconds ($IntervalMinutes * 60)
}
