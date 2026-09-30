<#
.SYNOPSIS
Project Identity Gate for Codex operations on carteira-investimentos repository.
Validates that the current environment is correctly configured for the target project.

.DESCRIPTION
This script enforces the PROJECT_IDENTITY_GATE as defined in AGENTS.md.
It validates:
- Current working directory
- Git root directory
- Remote origin URL
- Current branch and HEAD
- Worktree belongs to correct repository
- Forbidden project (carteira-2.0) is not being accessed

.OUTPUTS
- Exit code 0 = PASS (PROJECT_IDENTITY=PASS)
- Exit code 1 = FAIL (PROJECT_IDENTITY=FAIL, STATUS=HUMAN_BLOCKER_WRONG_PROJECT)
- Sets environment variable PROJECT_IDENTITY_STATUS for calling process

.NOTES
Author: Codex Infrastructure Governance Mission
Version: 1.0
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ExpectedProjectRoot = "C:\Projetos\carteira-investimentos",

    [Parameter(Mandatory=$false)]
    [string]$ExpectedRemote = "https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git",

    [Parameter(Mandatory=$false)]
    [string[]]$AllowedWorktreeRoots = @(
        "C:\Projetos\carteira-investimentos",
        "C:\Projetos\carteira-investimentos.worktrees",
        "C:\Projetos\carteira-investimentos\.worktrees",
        "C:\Users\Paulo Sergio\.codex\worktrees\carteira-investimentos"
    ),

    [Parameter(Mandatory=$false)]
    [string]$ForbiddenProjectPath = "C:\Projetos\carteira-2.0"
)

$ErrorActionPreference = "Stop"

# Colors for output
$Green = [ConsoleColor]::Green
$Red = [ConsoleColor]::Red
$Yellow = [ConsoleColor]::Yellow
$Cyan = [ConsoleColor]::Cyan
$White = [ConsoleColor]::White

function Write-Status {
    param([string]$Message, [ConsoleColor]$Color = $White)
    $originalColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Message
    $Host.UI.RawUI.ForegroundColor = $originalColor
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host $Title -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
}

function Test-PathExists {
    param([string]$Path, [string]$Label)
    if (Test-Path $Path) {
        Write-Status "  [OK] $Label exists: $Path" $Green
        return $true
    } else {
        Write-Status "  [FAIL] $Label NOT found: $Path" $Red
        return $false
    }
}

function Test-CommandOutput {
    param([string]$Command, [string]$ExpectedPattern, [string]$Label, [bool]$Required = $true)
    try {
        $output = Invoke-Expression $Command 2>&1
        if ($output -match $ExpectedPattern) {
            Write-Status "  [OK] $Label matches expected pattern" $Green
            return $true
        } else {
            Write-Status "  [FAIL] $Label unexpected output: $output" $Red
            return $false
        }
    } catch {
        if ($Required) {
            Write-Status "  [FAIL] $Label command failed: $($_.Exception.Message)" $Red
            return $false
        } else {
            Write-Status "  [SKIP] $Label not available (optional)" $Yellow
            return $true
        }
    }
}

# Track overall status
$allPassed = $true

Write-Section "PROJECT IDENTITY GATE - Codex Infrastructure Governance"

# 1. Current Working Directory
Write-Section "1. WORKING DIRECTORY VALIDATION"
$cwd = Get-Location
Write-Status "Current directory: $cwd" $Cyan

$cwdStr = $cwd.Path
$cwdValid = $false
foreach ($allowed in $AllowedWorktreeRoots) {
    if ($cwdStr.StartsWith($allowed, [StringComparison]::OrdinalIgnoreCase)) {
        $cwdValid = $true
        Write-Status "  [OK] Working directory under allowed root: $allowed" $Green
        break
    }
}
if (-not $cwdValid) {
    Write-Status "  [FAIL] Working directory NOT under any allowed root" $Red
    $allPassed = $false
}

# Check forbidden path
if ($cwdStr -like "*carteira-2.0*") {
    Write-Status "  [BLOCKED] Working directory contains forbidden path: carteira-2.0" $Red
    $allPassed = $false
}

# 2. Git Root
Write-Section "2. GIT ROOT VALIDATION"
try {
    $gitRoot = git rev-parse --show-toplevel 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Git root: $gitRoot" $Cyan
        
        if ($gitRoot -like "*carteira-investimentos*") {
            Write-Status "  [OK] Git root belongs to carteira-investimentos" $Green
        } else {
            Write-Status "  [FAIL] Git root does not belong to carteira-investimentos" $Red
            $allPassed = $false
        }
        
        if ($gitRoot -like "*carteira-2.0*") {
            Write-Status "  [BLOCKED] Git root contains forbidden path: carteira-2.0" $Red
            $allPassed = $false
        }
    } else {
        Write-Status "  [FAIL] Not inside a Git repository: $gitRoot" $Red
        $allPassed = $false
    }
} catch {
    Write-Status "  [FAIL] Git command failed" $Red
    $allPassed = $false
}

# 3. Remote Validation
Write-Section "3. REMOTE VALIDATION"
try {
    $remotes = git remote -v 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Remotes:" $Cyan
        $remotes.Split("`n") | ForEach-Object { Write-Status "  $_" $White }
        
        if ($remotes -match [regex]::Escape($ExpectedRemote)) {
            Write-Status "  [OK] Expected remote found: $ExpectedRemote" $Green
        } else {
            Write-Status "  [FAIL] Expected remote NOT found: $ExpectedRemote" $Red
            $allPassed = $false
        }
    } else {
        Write-Status "  [FAIL] git remote -v failed: $remotes" $Red
        $allPassed = $false
    }
} catch {
    Write-Status "  [FAIL] Git remote command failed" $Red
    $allPassed = $false
}

# 4. Branch and HEAD
Write-Section "4. BRANCH AND HEAD VALIDATION"
try {
    $branch = git branch --show-current 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Current branch: $branch" $Cyan
    } else {
        Write-Status "  [FAIL] Could not determine current branch: $branch" $Red
        $allPassed = $false
    }
    
    $head = git rev-parse HEAD 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "HEAD: $head" $Cyan
    } else {
        Write-Status "  [FAIL] Could not determine HEAD: $head" $Red
        $allPassed = $false
    }
    
    $originMain = git rev-parse origin/main 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "origin/main: $originMain" $Cyan
    } else {
        Write-Status "  [WARN] Could not determine origin/main" $Yellow
    }
} catch {
    Write-Status "  [FAIL] Git branch/HEAD commands failed" $Red
    $allPassed = $false
}

# 5. Git Status
Write-Section "5. GIT STATUS"
try {
    $status = git status --short 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($status.Trim()) {
            Write-Status "Working tree has changes:" $Yellow
            $status.Split("`n") | ForEach-Object { Write-Status "  $_" $White }
        } else {
            Write-Status "  [OK] Working tree clean" $Green
        }
    } else {
        Write-Status "  [FAIL] git status failed: $status" $Red
        $allPassed = $false
    }
} catch {
    Write-Status "  [FAIL] git status command failed" $Red
    $allPassed = $false
}

# 6. Worktree List
Write-Section "6. WORKTREE VALIDATION"
try {
    $worktreesRaw = git worktree list --porcelain 2>&1
    if ($LASTEXITCODE -eq 0) {
        # Parse porcelain format: each worktree has worktree, HEAD, branch lines
        $worktreeBlocks = $worktreesRaw -split "`nworktree " | Where-Object { $_ -match '^worktree ' }
        $wtCount = $worktreeBlocks.Count
        Write-Status "Registered worktrees: $wtCount" $Cyan
        
        $allValid = $true
        foreach ($block in $worktreeBlocks) {
            $lines = $block -split "`n"
            $wtPath = ""
            foreach ($line in $lines) {
                if ($line.StartsWith("worktree ")) {
                    $wtPath = $line.Substring(9).Trim()
                    break
                }
            }
            
            if ($wtPath) {
                $valid = $false
                # Normalize path separators for comparison
                $normalizedWtPath = $wtPath.Replace('/', '\')
                foreach ($allowed in $AllowedWorktreeRoots) {
                    $normalizedAllowed = $allowed.Replace('/', '\')
                    if ($normalizedWtPath.StartsWith($normalizedAllowed, [StringComparison]::OrdinalIgnoreCase)) {
                        $valid = $true
                        break
                    }
                }
                if ($valid) {
                    Write-Status "  [OK] $wtPath" $Green
                } else {
                    Write-Status "  [FAIL] Worktree outside allowed roots: $wtPath" $Red
                    $allPassed = $false
                    $allValid = $false
                }
            }
        }
        if ($allValid) {
            Write-Status "  [OK] All worktrees belong to allowed roots" $Green
        }
    } else {
        Write-Status "  [FAIL] git worktree list failed: $worktreesRaw" $Red
        $allPassed = $false
    }
} catch {
    Write-Status "  [FAIL] git worktree command failed" $Red
    $allPassed = $false
}

# 7. Forbidden Project Check
Write-Section "7. FORBIDDEN PROJECT CHECK"
if (Test-Path $ForbiddenProjectPath) {
    Write-Status "  [WARN] Forbidden project path EXISTS: $ForbiddenProjectPath" $Yellow
    Write-Status "  [INFO] This is acceptable IF not being accessed by current worktree" $Yellow
} else {
    Write-Status "  [OK] Forbidden project path does not exist: $ForbiddenProjectPath" $Green
}

# Final Result
Write-Section "FINAL RESULT"
if ($allPassed) {
    Write-Status "PROJECT_IDENTITY=PASS" $Green
    Write-Status "All identity checks passed. Safe to proceed." $Green
    $env:PROJECT_IDENTITY_STATUS = "PASS"
    exit 0
} else {
    Write-Status "PROJECT_IDENTITY=FAIL" $Red
    Write-Status "STATUS=HUMAN_BLOCKER_WRONG_PROJECT" $Red
    Write-Status "One or more identity checks failed. STOP IMMEDIATELY." $Red
    $env:PROJECT_IDENTITY_STATUS = "FAIL"
    exit 1
}