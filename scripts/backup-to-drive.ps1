param(
  [string]$SourcePath = "C:\Projetos\carteira-investimentos",
  [string]$DestinationPath = "G:\Meu Drive\Codex\carteira-investimentos"
)

$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) {
  Write-Host $Message -ForegroundColor Cyan
}

function Write-Warn([string]$Message) {
  Write-Host $Message -ForegroundColor Yellow
}

function Write-Ok([string]$Message) {
  Write-Host $Message -ForegroundColor Green
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Pasta de origem nao encontrada: $SourcePath"
}

$destinationDrive = Split-Path -Path $DestinationPath -Qualifier
if (-not (Test-Path -LiteralPath $destinationDrive)) {
  throw "Unidade do Google Drive nao encontrada ou indisponivel: $destinationDrive"
}

Write-Info "Origem:      $SourcePath"
Write-Info "Destino:     $DestinationPath"
Write-Info "Exclusoes:   node_modules, .git, .vercel, .agents, *.log, *.tmp, *.temp, *.bak, *~"
Write-Warn "Aviso: este backup e espelhado. Arquivos removidos da origem tambem serao removidos do destino."

if (-not (Test-Path -LiteralPath $DestinationPath)) {
  New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
}

$robocopyArgs = @(
  $SourcePath,
  $DestinationPath,
  '/MIR',
  '/R:2',
  '/W:2',
  '/MT:8',
  '/XJ',
  '/XD', 'node_modules', '.git', '.vercel', '.agents',
  '/XF', '*.log', '*.tmp', '*.temp', '*.bak', '*~',
  '/NFL',
  '/NDL',
  '/NJH',
  '/NJS',
  '/NP'
)

Write-Info "Iniciando copia..."
& robocopy @robocopyArgs
$exitCode = $LASTEXITCODE

if ($exitCode -ge 8) {
  throw "O backup falhou. Robocopy retornou o codigo $exitCode."
}

Write-Ok "Backup concluido com sucesso."
exit 0
