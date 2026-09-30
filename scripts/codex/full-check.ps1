<#
.SYNOPSIS
Full validation check for Codex operations on carteira-investimentos.
Critical tier (TIER 3) - comprehensive validation.

.DESCRIPTION
Runs complete validation suite:
1. PROJECT_IDENTITY_GATE
2. QUICK_CHECK (TIER 1)
3. Detects and runs all officially existing scripts from package.json:
   - npm test (legacy + modern integrated)
   - npm run test:modern (modern test suite)
   - npm run build (legacy build)
   - npm run build:modern (modern TypeScript build)
   - lint/typecheck if officially defined
   - integration/smoke if officially defined
4. Validation cache awareness (HEAD/diff hash tracking)

Does NOT invent scripts - only runs what exists in package.json.

.USAGE
powershell -File scripts/codex/full-check.ps1

.EXIT CODES
0 = All checks passed
1 = One or more checks failed
2 = Identity gate failed

.NOTES
This is the required check for critical financial/infrastructure changes.
For documentation/small fixes, use quick-check (TIER 1).
For features/refactors, use related tests + required build (TIER 2).
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,
    [Parameter(Mandatory=$false)]
    [switch]$SkipCache = $false
)

$ErrorActionPreference = "Stop"

$Green = [ConsoleColor]::Green
$Red = [ConsoleColor]::Red
$Yellow = [ConsoleColor]::Yellow
$Cyan = [ConsoleColor]::Cyan
$White = [ConsoleColor]::White

$overallSuccess = $true
$warnings = @()
$checkResults = @()
$startTime = Get-Date

# Cache file path (in .codex-local which should be gitignored)
$cacheDir = Join-Path (Get-Location) ".codex-local"
$cacheFile = Join-Path $cacheDir "last-full-check.json"

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
    $cmdStart = Get-Date
    try {
        $originalLocation = Get-Location
        # Temporarily relax error action to prevent stderr warnings from throwing
        $oldEAP = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $result = Invoke-Expression $Command 2>&1
            $exitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $oldEAP
        }
        Set-Location $originalLocation
        $duration = (Get-Date) - $cmdStart
        
        $checkResult = @{
            CHECK = $Description
            COMMAND = $Command
            EXIT_CODE = $exitCode
            DURATION = $duration.TotalSeconds.ToString("0.0") + "s"
        }
        
        if ($exitCode -eq 0) {
            Write-Success "  PASS: $Description (${duration.TotalSeconds.ToString('0.0')}s)"
            $checkResult.RESULT = "PASS"
            $script:checkResults += $checkResult
            return $true
        } else {
            Write-Fail "  FAIL: $Description (exit $exitCode, ${duration.TotalSeconds.ToString('0.0')}s)"
            Write-Host "  Output: $($result | Select-Object -Last 5)" -ForegroundColor $Red
            $checkResult.RESULT = "FAIL"
            $script:checkResults += $checkResult
            return $false
        }
    } catch {
        $duration = (Get-Date) - $cmdStart
        Write-Fail "  ERROR: $Description - $($_.Exception.Message) (${duration.TotalSeconds.ToString('0.0')}s)"
        $checkResult = @{
            CHECK = $Description
            COMMAND = $Command
            EXIT_CODE = -1
            DURATION = $duration.TotalSeconds.ToString("0.0") + "s"
            RESULT = "ERROR"
        }
        $script:checkResults += $checkResult
        return $false
    }
}

function Get-RepoStateHash {
    try {
        $head = git rev-parse HEAD 2>&1
        $diffHash = git diff HEAD --stat 2>&1 | Get-FileHash -Algorithm SHA256 | Select-Object -ExpandProperty Hash
        return @{
            HEAD = $head.Trim()
            DIFF_HASH = $diffHash
        }
    } catch {
        return @{ HEAD = ""; DIFF_HASH = "" }
    }
}

function Check-Cache {
    if ($SkipCache -or $Force) { return $false }
    if (-not (Test-Path $cacheFile)) { return $false }
    
    try {
        $cache = Get-Content $cacheFile -Raw | ConvertFrom-Json -ErrorAction Stop
        $currentState = Get-RepoStateHash
        
        if ($cache.HEAD -eq $currentState.HEAD -and $cache.DIFF_HASH -eq $currentState.DIFF_HASH) {
            Write-Host ""
            Write-Host "CACHE HIT: Repository state unchanged since last full-check." -ForegroundColor $Green
            Write-Host "  Previous result: $($cache.OVERALL_RESULT) at $($cache.TIMESTAMP)" -ForegroundColor $Cyan
            Write-Host "  Use --Force or --SkipCache to re-run anyway." -ForegroundColor $Yellow
            return $true
        }
    } catch {
        # Cache corrupted or unreadable, continue with full check
    }
    return $false
}

function Save-Cache {
    if (-not (Test-Path $cacheDir)) {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
    }
    $state = Get-RepoStateHash
    $cache = @{
        TIMESTAMP = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        HEAD = $state.HEAD
        DIFF_HASH = $state.DIFF_HASH
        OVERALL_RESULT = if ($overallSuccess) { "PASS" } else { "FAIL" }
        CHECKS = $checkResults
    }
    $cache | ConvertTo-Json -Depth 4 | Set-Content $cacheFile -Encoding UTF8
    
    # Ensure .codex-local is in .gitignore
    $gitignore = Join-Path (Get-Location) ".gitignore"
    if (Test-Path $gitignore) {
        $content = Get-Content $gitignore -Raw
        if ($content -notmatch ".codex-local") {
            Add-Content $gitignore "`n# Codex local cache (not committed)`n.codex-local/"
        }
    }
}

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "FULL CHECK - TIER 3 (Comprehensive validation)" -ForegroundColor $Cyan
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "Started: $($startTime.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor $White
Write-Host ""

# Check cache first
if (Check-Cache) {
    exit 0
}

# 1. PROJECT_IDENTITY_GATE
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

# 2. QUICK_CHECK (TIER 1)
$quickScript = Join-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) "quick-check.ps1"
if (Test-Path $quickScript) {
    Write-Step "QUICK_CHECK (TIER 1 pre-flight)"
    try {
        & $quickScript
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) {
            Write-Success "  PASS: QUICK_CHECK"
        } else {
            Write-Fail "  FAIL: QUICK_CHECK (exit $exitCode)"
            $overallSuccess = $false
        }
    } catch {
        Write-Fail "  ERROR: QUICK_CHECK - $($_.Exception.Message)"
        $overallSuccess = $false
    }
}

# 3. Detect package.json scripts and run valid ones
Write-Step "Discovering package.json scripts"
try {
    if (Test-Path "package.json") {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        $scripts = $pkg.scripts
        
        # Core validation commands (expected to exist)
        # Use ScriptKey that matches package.json keys exactly (handles colons in keys)
        $coreCommands = @(
            @{ ScriptKey = "test"; Name = "npm.cmd run test"; Desc = "Full test suite (legacy + modern integrated)"; Timeout = 300 },
            @{ ScriptKey = "test:modern"; Name = "npm.cmd run test:modern"; Desc = "Modern test suite"; Timeout = 180 },
            @{ ScriptKey = "build"; Name = "npm.cmd run build"; Desc = "Legacy build"; Timeout = 120 },
            @{ ScriptKey = "build:modern"; Name = "npm.cmd run build:modern"; Desc = "Modern build (TypeScript compile)"; Timeout = 120 }
        )
        
        foreach ($cmd in $coreCommands) {
            # Use PSObject.Properties to handle keys with special characters like colons
            $scriptExists = $false
            if ($scripts.PSObject.Properties[$cmd.ScriptKey]) {
                $scriptExists = $true
            }
            if ($scriptExists) {
                Run-Command $cmd.Name $cmd.Desc
            } else {
                Write-Warn "  SKIPPED: $($cmd.Desc) - script '$($cmd.ScriptKey)' not found in package.json"
                $checkResults += @{
                    CHECK = $cmd.Desc
                    COMMAND = $cmd.Name
                    EXIT_CODE = -1
                    DURATION = "0.0s"
                    RESULT = "SKIPPED"
                }
            }
        }
        
        # Optional commands
        $optionalCommands = @(
            @{ ScriptKey = "lint"; Name = "npm.cmd run lint"; Desc = "Lint check"; Timeout = 60 },
            @{ ScriptKey = "typecheck"; Name = "npm.cmd run typecheck"; Desc = "TypeScript typecheck"; Timeout = 60 },
            @{ ScriptKey = "test:integration"; Name = "npm.cmd run test:integration"; Desc = "Integration tests"; Timeout = 180 },
            @{ ScriptKey = "qa:smoke"; Name = "npm.cmd run qa:smoke"; Desc = "QA smoke tests"; Timeout = 60 }
        )
        
        foreach ($cmd in $optionalCommands) {
            $scriptExists = $false
            if ($scripts.PSObject.Properties[$cmd.ScriptKey]) {
                $scriptExists = $true
            }
            if ($scriptExists) {
                Run-Command $cmd.Name $cmd.Desc
            } else {
                Write-Warn "  SKIPPED: $($cmd.Desc) - script '$($cmd.ScriptKey)' not found in package.json"
                $checkResults += @{
                    CHECK = $cmd.Desc
                    COMMAND = $cmd.Name
                    EXIT_CODE = -1
                    DURATION = "0.0s"
                    RESULT = "SKIPPED"
                }
            }
        }
    } else {
        Write-Fail "  FAIL: package.json not found"
    }
} catch {
    Write-Fail "  ERROR: Failed to parse package.json - $($_.Exception.Message)"
}

# Summary
$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "FULL CHECK SUMMARY" -ForegroundColor $Cyan
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "Elapsed: $($elapsed.TotalSeconds.ToString('0.0'))s" -ForegroundColor $White
Write-Host ""

# Print check results table
Write-Host "CHECK RESULTS:" -ForegroundColor $Cyan
foreach ($r in $checkResults) {
    $color = switch ($r.RESULT) {
        "PASS" { $Green }
        "FAIL" { $Red }
        "ERROR" { $Red }
        "SKIPPED" { $Yellow }
        default { $White }
    }
    Write-Host ("  [{0,-40}] {1,6}  {2,6}  {3}" -f $r.CHECK, $r.RESULT, $r.DURATION, $r.COMMAND) -ForegroundColor $color
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNINGS DETECTED:" -ForegroundColor $Yellow
    foreach ($w in $warnings) {
        Write-Host "  - $w" -ForegroundColor $Yellow
    }
    Write-Host "WARNING_DETECTED=YES" -ForegroundColor $Yellow
}

# Save cache
Save-Cache

if ($overallSuccess) {
    Write-Host ""
    Write-Host "FULL_CHECK=PASS" -ForegroundColor $Green
    Write-Host "All mandatory checks passed. Safe to proceed with critical work." -ForegroundColor $Green
    exit 0
} else {
    Write-Host ""
    Write-Host "FULL_CHECK=FAIL" -ForegroundColor $Red
    Write-Host "One or more mandatory checks failed. Do not proceed until resolved." -ForegroundColor $Red
    exit 1
}