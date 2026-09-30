<#
.SYNOPSIS
Cloud environment health check for Codex Cloud readiness.
Determines if the project can run in a clean Codex Cloud environment.

.DESCRIPTION
Validates all requirements for running in a clean cloud environment:
- Project identity
- Runtime availability (Node.js, npm)
- Package.json and lock file
- Dependencies installability
- Required scripts existence
- Build and test commands
- Environment variable requirements
- Network dependencies
- Browser requirements (if any)

Does NOT require Firebase credentials or real secrets.

.USAGE
powershell -File scripts/codex/cloud-health-check.ps1

.EXIT CODES
0 = CLOUD_READY=YES
1 = CLOUD_READY=NO (blockers found)
2 = Identity gate failed

.OUTPUTS
Sets CLOUD_READY and CLOUD_BLOCKERS environment variables
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipIdentityGate = $false
)

$ErrorActionPreference = "Stop"

$Green = [ConsoleColor]::Green
$Red = [ConsoleColor]::Red
$Yellow = [ConsoleColor]::Yellow
$Cyan = [ConsoleColor]::Cyan
$White = [ConsoleColor]::White

$overallSuccess = $true
$blockers = @()
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
    $script:blockers += $Message
}

function Write-Warn {
    param([string]$Message)
    Write-Host ("[" + (Get-Date).ToString("HH:mm:ss") + "] ") -NoNewline -ForegroundColor $Cyan
    Write-Host $Message -ForegroundColor $Yellow
    $script:warnings += $Message
}

# Helper functions for robust script detection using PSObject.Properties
function Test-ScriptExists {
    param($scriptsObject, [string]$key)
    $prop = $scriptsObject.PSObject.Properties[$key]
    return $null -ne $prop
}

function Get-ScriptValue {
    param($scriptsObject, [string]$key)
    $prop = $scriptsObject.PSObject.Properties[$key]
    if ($null -ne $prop) {
        return $prop.Value
    }
    return $null
}

function Run-Command {
    param([string]$Command, [string]$Description, [bool]$Required = $true)
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
            if ($Required) {
                Write-Fail "  FAIL: $Description (exit $exitCode)"
                Write-Host "  Output: $($result | Select-Object -Last 3)" -ForegroundColor $Red
            } else {
                Write-Warn "  OPTIONAL: $Description not available (exit $exitCode)"
            }
            return $false
        }
    } catch {
        if ($Required) {
            Write-Fail "  ERROR: $Description - $($_.Exception.Message)"
        } else {
            Write-Warn "  OPTIONAL: $Description - $($_.Exception.Message)"
        }
        return $false
    }
}

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "CLOUD HEALTH CHECK - Codex Cloud Readiness" -ForegroundColor $Cyan
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
            if ($exitCode -ne 0) {
                Write-Fail "  FAIL: PROJECT_IDENTITY_GATE (exit $exitCode)"
                exit 2
            }
        } catch {
            Write-Fail "  ERROR: PROJECT_IDENTITY_GATE - $($_.Exception.Message)"
            exit 2
        }
    } else {
        Write-Fail "Identity gate script not found at $gateScript"
        exit 2
    }
}

# 2. Node.js Availability
Write-Step "NODE_AVAILABLE"
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  PASS: Node.js available - $nodeVersion"
        $env:NODE_VERSION = $nodeVersion.Trim()
    } else {
        Write-Fail "  FAIL: Node.js not found"
    }
} catch {
    Write-Fail "  FAIL: Node.js not available"
}

# 3. npm Availability
Write-Step "NPM_AVAILABLE"
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  PASS: npm available - $npmVersion"
        $env:NPM_VERSION = $npmVersion.Trim()
    } else {
        Write-Fail "  FAIL: npm not found"
    }
} catch {
    Write-Fail "  FAIL: npm not available"
}

# 4. package.json
Write-Step "PACKAGE_JSON"
if (Test-Path "package.json") {
    Write-Success "  PASS: package.json exists"
} else {
    Write-Fail "  FAIL: package.json not found"
}

# 5. package-lock.json
Write-Step "PACKAGE_LOCK"
if (Test-Path "package-lock.json") {
    Write-Success "  PASS: package-lock.json exists (deterministic installs)"
} else {
    Write-Warn "  WARNING: package-lock.json not found (non-deterministic installs possible)"
}

# 6. Dependencies State
Write-Step "DEPENDENCIES_STATE"
if (Test-Path "node_modules") {
    Write-Success "  PASS: node_modules exists (dependencies installed)"
} else {
    Write-Warn "  INFO: node_modules not found (will need 'npm ci' in clean environment)"
}

# 7. Required Scripts - using PSObject.Properties for keys with colons
Write-Step "REQUIRED_SCRIPTS"
if (Test-Path "package.json") {
    try {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        $scripts = $pkg.scripts
        
        $requiredScripts = @(
            "test",
            "test:modern",
            "build",
            "build:modern",
            "qa:smoke"
        )
        
        $missingScripts = @()
        foreach ($script in $requiredScripts) {
            if (Test-ScriptExists $scripts $script) {
                Write-Success "  PASS: Script '$script' defined"
            } else {
                Write-Fail "  FAIL: Required script '$script' not defined"
                $missingScripts += $script
            }
        }
        
        if ($missingScripts.Count -eq 0) {
            Write-Success "  PASS: All required scripts present"
        }
    } catch {
        Write-Fail "  FAIL: Could not parse package.json scripts"
    }
} else {
    Write-Fail "  FAIL: package.json not found"
}

# 8. Build Commands Validation
Write-Step "BUILD_COMMANDS"
if (Test-Path "package.json") {
    try {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        $scripts = $pkg.scripts
        
        $buildVal = Get-ScriptValue $scripts "build"
        if ($buildVal) {
            Write-Success "  PASS: 'build' script defined: $buildVal"
        } else {
            Write-Fail "  FAIL: 'build' script not defined"
        }
        
        $buildModernVal = Get-ScriptValue $scripts "build:modern"
        if ($buildModernVal) {
            Write-Success "  PASS: 'build:modern' script defined: $buildModernVal"
        } else {
            Write-Fail "  FAIL: 'build:modern' script not defined"
        }
    } catch {
        Write-Warn "  WARNING: Could not validate build commands"
    }
}

# 9. Test Commands Validation
Write-Step "TEST_COMMANDS"
if (Test-Path "package.json") {
    try {
        $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
        $scripts = $pkg.scripts
        
        $testVal = Get-ScriptValue $scripts "test"
        if ($testVal) {
            Write-Success "  PASS: 'test' script defined: $testVal"
        } else {
            Write-Fail "  FAIL: 'test' script not defined"
        }
        
        $testModernVal = Get-ScriptValue $scripts "test:modern"
        if ($testModernVal) {
            Write-Success "  PASS: 'test:modern' script defined: $testModernVal"
        } else {
            Write-Fail "  FAIL: 'test:modern' script not defined"
        }
        
        $qaSmokeVal = Get-ScriptValue $scripts "qa:smoke"
        if ($qaSmokeVal) {
            Write-Success "  PASS: 'qa:smoke' script defined: $qaSmokeVal"
        } else {
            Write-Fail "  FAIL: 'qa:smoke' script not defined"
        }
    } catch {
        Write-Warn "  WARNING: Could not validate test commands"
    }
}

# 10. Environment Variables Requirements
Write-Step "ENV_REQUIREMENTS"
$envRequirements = @(
    @{ Name = "FIREBASE_API_KEY"; Required = $false; Description = "Firebase configuration (optional for tests)" },
    @{ Name = "FIREBASE_AUTH_DOMAIN"; Required = $false; Description = "Firebase configuration" },
    @{ Name = "FIREBASE_PROJECT_ID"; Required = $false; Description = "Firebase configuration" },
    @{ Name = "FIREBASE_STORAGE_BUCKET"; Required = $false; Description = "Firebase configuration" },
    @{ Name = "FIREBASE_MESSAGING_SENDER_ID"; Required = $false; Description = "Firebase configuration" },
    @{ Name = "FIREBASE_APP_ID"; Required = $false; Description = "Firebase configuration" }
)

$missingRequiredEnv = @()
foreach ($req in $envRequirements) {
    # Use .NET method to avoid PowerShell env: drive parsing issues
    $value = [Environment]::GetEnvironmentVariable($req.Name)
    if ($value) {
        Write-Success "  PASS: $($req.Name) is set"
    } elseif ($req.Required) {
        Write-Fail "  FAIL: Required env $($req.Name) not set - $($req.Description)"
        $missingRequiredEnv += $req.Name
    } else {
        Write-Warn "  OPTIONAL: $($req.Name) not set - $($req.Description) (tests may use mocks)"
    }
}

# 11. Network Dependencies
Write-Step "NETWORK_REQUIREMENTS"
$networkDeps = @(
    @{ Name = "Firebase"; Host = "firebase.googleapis.com"; Required = $false; Notes = "Auth, Firestore, Hosting" },
    @{ Name = "BCB SGS (CDI)"; Host = "api.bcb.gov.br"; Required = $false; Notes = "CDI benchmark data" },
    @{ Name = "Yahoo Finance"; Host = "query1.finance.yahoo.com"; Required = $false; Notes = "Quote/dividend data" },
    @{ Name = "GitHub"; Host = "github.com"; Required = $true; Notes = "Repository access" }
)

foreach ($dep in $networkDeps) {
    Write-Host "  - $($dep.Name): $($dep.Host) ($($dep.Notes))" -ForegroundColor $Cyan
    if ($dep.Required) {
        Write-Warn "  REQUIRED NETWORK: $($dep.Name) - ensure cloud environment has internet access"
    }
}

# 12. Browser Requirements
Write-Step "BROWSER_REQUIREMENTS"
$browserReq = @(
    "Playwright/Chromium for browser tests (optional - only if qa:smoke runs)",
    "Headless Chrome for V84 asset detail smoke tests",
    "Viewport testing: 390, 430, 768, 1366, 1440, 1536, 1920"
)
foreach ($req in $browserReq) {
    Write-Host "  - $req" -ForegroundColor $Cyan
}
Write-Warn "  Browser tests are OPTIONAL and only run if explicitly invoked"

# 13. Validate core test runs (quick smoke)
Write-Step "CORE_TEST_VALIDATION (dry-run check)"
# We don't actually run tests here, just verify the structure
if (Test-Path "tests") {
    $testFiles = Get-ChildItem "tests" -Filter "*.test.js" -ErrorAction SilentlyContinue
    if ($testFiles.Count -gt 0) {
        Write-Success "  PASS: Test directory exists with $($testFiles.Count) test files"
    } else {
        Write-Warn "  WARNING: tests/ directory exists but no .test.js files found"
    }
} else {
    Write-Fail "  FAIL: tests/ directory not found"
}

# 14. Build Artifacts Check
Write-Step "BUILD_ARTIFACTS_CHECK"
if (Test-Path "modern/vite.config.ts") {
    Write-Success "  PASS: modern/vite.config.ts exists"
} else {
    Write-Fail "  FAIL: modern/vite.config.ts not found (needed for build:modern)"
}

if (Test-Path "index.html") {
    Write-Success "  PASS: index.html exists (legacy entry point)"
} else {
    Write-Fail "  FAIL: index.html not found (needed for legacy build)"
}

# Final Result
$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "CLOUD HEALTH CHECK SUMMARY" -ForegroundColor $Cyan
Write-Host ("=" * 70) -ForegroundColor $Cyan
Write-Host "Elapsed: $($elapsed.TotalSeconds.ToString('0.0'))s" -ForegroundColor $White
Write-Host ""

if ($warnings.Count -gt 0) {
    Write-Host "WARNINGS:" -ForegroundColor $Yellow
    foreach ($w in $warnings) {
        Write-Host "  - $w" -ForegroundColor $Yellow
    }
}

if ($blockers.Count -gt 0) {
    Write-Host ""
    Write-Host "BLOCKERS:" -ForegroundColor $Red
    foreach ($b in $blockers) {
        Write-Host "  - $b" -ForegroundColor $Red
    }
    $env:CLOUD_BLOCKERS = ($blockers -join "; ")
    Write-Host ""
    Write-Host "CLOUD_READY=NO" -ForegroundColor $Red
    $env:CLOUD_READY = "NO"
    exit 1
} else {
    Write-Host ""
    Write-Host "CLOUD_READY=YES" -ForegroundColor $Green
    $env:CLOUD_READY = "YES"
    $env:CLOUD_BLOCKERS = ""
    exit 0
}