<#
.SYNOPSIS
Quick validation check for Codex operations on carteira-investimentos.
Fast tier (TIER 1) - target <10 seconds.

.DESCRIPTION
Runs only fast, essential pre-flight checks:
- PROJECT_IDENTITY_GATE
- Git status and diff check
- Merge conflict markers detection
- package.json validity
- Required governance files presence
- Project isolation via PROJECT_IDENTITY_GATE
- Optional: minimal smoke test if officially exists in project

Does NOT run by default:
- npm test / npm run test:modern
- npm run build / npm run build:modern
- Browser harness / Playwright

.USAGE
powershell -File scripts/codex/quick-check.ps1

.EXIT CODES
0 = All checks passed
1 = One or more checks failed
2 = Identity gate failed

.NOTES
This is the recommended check for documentation, small fixes, CSS changes.
For features/refactors, run related tests + required build (TIER 2).
For critical financial/infrastructure changes, run full-check (TIER 3).
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipIdentityGate = $false,
    [Parameter(Mandatory=$false)]
    [switch]$IncludeSmokeTest = $false
)

$ErrorActionPreference = "Stop"

$Green = [ConsoleColor]::Green
$Red = [ConsoleColor]::Red
$Yellow = [ConsoleColor]::Yellow
$Cyan = [ConsoleColor]::Cyan
$White = [ConsoleColor]::White

$overallSuccess = $true
$warnings = @()
$startTime = Get-Date

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host ("[" + (Get-Date).ToString("HH:mm:ss") + "] ") -NoNewline -ForegroundColor $Cyan
    Write-Host $Message -ForegroundColor $White
}

function Write-Success {
    param([string]$Message)
    Write-Host ("[" + (Get-Date).ToString("HH:mm:ss") + "] ") -NoNewline -ForegroundColor $Cyan
    Write-Host $Message -ForegroundColor $Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host ("[" + (Get-Date).ToString("HH:mm:ss") + "] ") -NoNewline -ForegroundColor $Cyan
    Write-Host $Message -ForegroundColor $Red
    $script:overallSuccess = $false
}

function Write-Warn {
    param([string]$Message)
    Write-Host ("[" + (Get-Date).ToString("HH:mm:ss") + "] ") -NoNewline -ForegroundColor $Cyan
    Write-Host $Message -ForegroundColor $Yellow
    $script:warnings += $Message
}

function Run-Command {
    param([string]$Command, [string]$Description)
    Write-Step $Description
    try {
        $originalLocation = Get-Location
        $result = Invoke-Expression $Command 2>&1
        $exitCode = $LASTEXITCODE
        Set-Location $originalLocation
        
        if ($exitCode -eq 0) {
            Write-Success "  PASS: $Description"
            return $true
        } else {
            Write-Fail "  FAIL: $Description (exit $exitCode)"
            Write-Host "  Output: $($result | Select-Object -Last 5)" -ForegroundColor $Red
            return $false
        }
    } catch {
        Write-Fail "  ERROR: $Description - $($_.Exception.Message)"
        return $false
    }
}

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "QUICK CHECK - TIER 1 (Fast pre-flight validation)" -ForegroundColor $Cyan
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "Started: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor $White
Write-Host ""

# 1. PROJECT_IDENTITY_GATE
if (-not $SkipIdentityGate) {
    $gateScript = Join-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) "project-identity-gate.ps1"
    if (Test-Path $gateScript) {
        Write-Step "PROJECT_IDENTITY_GATE"
        try {
            & $gateScript
            $exitCode = $LASTEXITCODE
            if ($exitCode -eq 0) {
                Write-Success "  PASS: PROJECT_IDENTITY_GATE"
            } else {
                Write-Fail "  FAIL: PROJECT_IDENTITY_GATE (exit $exitCode)"
                $overallSuccess = $false
                exit 2
            }
        } catch {
            Write-Fail "  ERROR: PROJECT_IDENTITY_GATE - $($_.Exception.Message)"
            $overallSuccess = $false
            exit 2
        }
    } else {
        Write-Fail "Identity gate script not found at $gateScript"
        exit 2
    }
} else {
    Write-Host "Skipping identity gate (--SkipIdentityGate)" -ForegroundColor $Yellow
}

# 2. Git status
Run-Command "git status --short" "Git status check"

# 3. Git diff whitespace check
Write-Step "Git diff whitespace check"
try {
    $originalLocation = Get-Location
    # Use $ErrorActionPreference = "Continue" to prevent stderr warnings from throwing
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $result = git diff --check 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $oldEAP
    }
    Set-Location $originalLocation
    
    # git diff --check exits 0 on success, non-zero on actual whitespace errors
    # The LF/CRLF warning on stderr is NOT an error - it's just a warning
    if ($exitCode -eq 0) {
        Write-Success "  PASS: Git diff whitespace check"
    } else {
        Write-Fail "  FAIL: Git diff whitespace check (exit $exitCode)"
        Write-Host "  Output: $($result | Select-Object -Last 5)" -ForegroundColor $Red
        $overallSuccess = $false
    }
} catch {
    Write-Fail "  ERROR: Git diff whitespace check - $($_.Exception.Message)"
    $overallSuccess = $false
}

# 4. Detect merge conflict markers
Write-Step "Merge conflict markers check"
try {
    $conflicts = git diff --name-only 2>&1
    $hasConflicts = $false
    if ($conflicts -and $conflicts.Trim()) {
        $conflicts.Split("`n") | ForEach-Object {
            $file = $_.Trim()
            if ($file -and (Test-Path $file)) {
                $content = Get-Content $file -Raw -ErrorAction SilentlyContinue
                if ($content -and $content -match '(?m)^[ 	]*(?:<{7}(?:[ 	].*)?|={7}|>{7}(?:[ 	].*)?)?$') {
                    Write-Fail "  FAIL: Merge conflict markers found in $file"
                    $hasConflicts = $true
                    $overallSuccess = $false
                }
            }
        }
    }
    if (-not $hasConflicts) {
        Write-Success "  PASS: No merge conflict markers"
    }
} catch {
    Write-Warn "  WARNING: Could not check merge conflict markers - $($_.Exception.Message)"
}

# 5. package.json validity
Write-Step "package.json validity"
try {
    if (Test-Path "package.json") {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json -ErrorAction Stop
        Write-Success "  PASS: package.json is valid JSON"
    } else {
        Write-Fail "  FAIL: package.json not found"
    }
} catch {
    Write-Fail "  FAIL: package.json invalid JSON - $($_.Exception.Message)"
}

# 6. Required governance files
Write-Step "Required governance files check"
$requiredFiles = @(
    "AGENTS.md",
    "docs/ai/PROJECT_MEMORY.md",
    "docs/ai/SKILLS_ROUTING.md"
)
$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    }
}
if ($missingFiles.Count -eq 0) {
    Write-Success "  PASS: All required governance files present"
} else {
    Write-Fail "  FAIL: Missing governance files: $($missingFiles -join ', ')"
}

# Project isolation is validated by PROJECT_IDENTITY_GATE above.

# 8. Optional minimal smoke test
if ($IncludeSmokeTest) {
    Write-Step "Minimal smoke test (--IncludeSmokeTest)"
    # Check if project has an official quick smoke test script
    if (Test-Path "package.json") {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        if ($pkg.scripts -and $pkg.scripts["test:smoke"]) {
            Run-Command "npm.cmd run test:smoke" "Smoke test (official script)"
        } else {
            Write-Warn "  SKIPPED: No official 'test:smoke' script in package.json"
        }
    }
}

# Summary
$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "QUICK CHECK SUMMARY" -ForegroundColor $Cyan
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "Elapsed: $($elapsed.TotalSeconds.ToString('0.0'))s" -ForegroundColor $White

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNINGS DETECTED:" -ForegroundColor $Yellow
    foreach ($w in $warnings) {
        Write-Host "  - $w" -ForegroundColor $Yellow
    }
    Write-Host "WARNING_DETECTED=YES" -ForegroundColor $Yellow
}

if ($overallSuccess) {
    Write-Success "ALL CHECKS PASSED"
    Write-Host ""
    Write-Host "Quick check completed successfully. Safe to continue with TIER 1 work." -ForegroundColor $Green
    exit 0
} else {
    Write-Fail "ONE OR MORE CHECKS FAILED"
    Write-Host ""
    Write-Host "Review failures above. Do not proceed until resolved." -ForegroundColor $Red
    exit 1
}