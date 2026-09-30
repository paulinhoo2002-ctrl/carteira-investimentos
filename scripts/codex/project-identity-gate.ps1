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
- Current workspace and registered worktrees are outside the forbidden project

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
$isWindowsRuntime = [System.Environment]::OSVersion.Platform -eq [System.PlatformID]::Win32NT

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

function Test-IsPathAtOrUnderRoot {
    param([string]$Candidate, [string]$Root)

    if ([string]::IsNullOrWhiteSpace($Candidate) -or [string]::IsNullOrWhiteSpace($Root)) {
        return $false
    }

    # Lexical comparison only: neither path is probed or resolved.
    $candidatePath = $Candidate.Replace('/', '\').TrimEnd([char]92)
    $rootPath = $Root.Replace('/', '\').TrimEnd([char]92)
    return $candidatePath.Equals($rootPath, [StringComparison]::OrdinalIgnoreCase) -or
        $candidatePath.StartsWith($rootPath + '\', [StringComparison]::OrdinalIgnoreCase)
}

function Test-IsLinuxPathAtOrUnderRoot {
    param([string]$Candidate, [string]$Root)

    if ([string]::IsNullOrWhiteSpace($Candidate) -or [string]::IsNullOrWhiteSpace($Root)) {
        return $false
    }
    if (-not [System.IO.Path]::IsPathRooted($Candidate) -or -not [System.IO.Path]::IsPathRooted($Root)) {
        return $false
    }
    $candidatePath = [System.IO.Path]::GetFullPath($Candidate).TrimEnd('/')
    $rootPath = [System.IO.Path]::GetFullPath($Root).TrimEnd('/')
    if ($rootPath -eq '') { $rootPath = '/' }
    return $candidatePath.Equals($rootPath, [StringComparison]::Ordinal) -or
        $candidatePath.StartsWith($rootPath.TrimEnd('/') + '/', [StringComparison]::Ordinal)
}

function ConvertTo-CanonicalGitHubRemote {
    param([string]$Remote)

    if ([string]::IsNullOrWhiteSpace($Remote)) { return $null }
    $value = $Remote.Trim()
    if ($value -cnotmatch '^(?:https://github\.com/|git@github\.com:)([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?)(?:\.git)?$') {
        return $null
    }
    return $Matches[1].ToLowerInvariant()
}

function Test-IsForbiddenProjectPath {
    param([string]$Candidate)

    if ([string]::IsNullOrWhiteSpace($Candidate)) { return $false }
    if (Test-IsPathAtOrUnderRoot -Candidate $Candidate -Root $ForbiddenProjectPath) {
        return $true
    }
    # Lexical only: never probe the forbidden project on disk.
    return $Candidate.Replace('\', '/') -match '(^|/)carteira-2\.0(?=/|$)'
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
    if (-not $isWindowsRuntime) { break }
    if (Test-IsPathAtOrUnderRoot -Candidate $cwdStr -Root $allowed) {
        $cwdValid = $true
        Write-Status "  [OK] Working directory under allowed root: $allowed" $Green
        break
    }
}
if (-not $isWindowsRuntime) {
    # The Git root is resolved below; validate Linux containment there.
    $cwdValid = $true
}
if (-not $cwdValid) {
    Write-Status "  [FAIL] Working directory NOT under any allowed root" $Red
    $allPassed = $false
}

# Check forbidden path
if (Test-IsForbiddenProjectPath $cwdStr) {
    Write-Status "  [BLOCKED] Working directory contains forbidden path: carteira-2.0" $Red
    $allPassed = $false
}

# 2. Git Root
Write-Section "2. GIT ROOT VALIDATION"
try {
    $gitRoot = git rev-parse --show-toplevel 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Git root: $gitRoot" $Cyan
        
        if ($isWindowsRuntime) {
            $normalizedGitRoot = $gitRoot.Replace('/', '\').TrimEnd([char]92)
            $normalizedExpectedRoot = $ExpectedProjectRoot.Replace('/', '\').TrimEnd([char]92)
            $gitRootValid = $normalizedGitRoot.Equals($normalizedExpectedRoot, [StringComparison]::OrdinalIgnoreCase)
            if (-not $gitRootValid) {
                foreach ($allowed in $AllowedWorktreeRoots) {
                    if (Test-IsPathAtOrUnderRoot -Candidate $gitRoot -Root $allowed) {
                        $gitRootValid = $true
                        break
                    }
                }
            }
        } else {
            $gitRootValid = Test-IsLinuxPathAtOrUnderRoot -Candidate $cwdStr -Root $gitRoot
        }
        if ($gitRootValid) {
            Write-Status "  [OK] Git root and current directory satisfy platform path policy" $Green
        } else {
            Write-Status "  [FAIL] Git root and current directory violate platform path policy" $Red
            $allPassed = $false
        }

        if (Test-IsForbiddenProjectPath $gitRoot) {
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
    $remote = @(git remote get-url origin 2>&1)
    $expectedIdentity = ConvertTo-CanonicalGitHubRemote -Remote $ExpectedRemote
    $actualIdentity = if ($LASTEXITCODE -eq 0 -and $remote.Count -eq 1) {
        ConvertTo-CanonicalGitHubRemote -Remote $remote[0]
    } else { $null }
    if ($null -ne $expectedIdentity -and $actualIdentity -ceq $expectedIdentity) {
        Write-Status "  [OK] origin identifies $expectedIdentity" $Green
    } else {
        Write-Status "  [FAIL] origin does not identify the expected GitHub repository" $Red
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
    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        if ($null -ne $status -and $status.Trim()) {
            Write-Status "Working tree has changes:" $Yellow
            $status.Split("`n") | ForEach-Object { Write-Status "  $_" $White }
        } else {
            Write-Status "  [OK] Working tree clean" $Green
        }
    } else {
        Write-Status "  [FAIL] git status failed (exit $exitCode): $status" $Red
        $allPassed = $false
    }
} catch {
    Write-Status "  [FAIL] git status command failed" $Red
    $allPassed = $false
}

# 6. Worktree List
Write-Section "6. WORKTREE VALIDATION"
try {
    $worktreesRaw = @(git worktree list --porcelain 2>&1)
    if ($LASTEXITCODE -eq 0) {
        $worktreePaths = @(
            $worktreesRaw |
                Where-Object { $_ -is [string] -and $_.StartsWith("worktree ", [StringComparison]::Ordinal) } |
                ForEach-Object { $_.Substring(9).Trim() }
        )
        $wtCount = $worktreePaths.Count
        Write-Status "Registered worktrees: $wtCount" $Cyan

        if ($wtCount -eq 0) {
            Write-Status "  [FAIL] No worktree paths found in Git porcelain output" $Red
            $allPassed = $false
        }

        $allValid = $true
        $currentRootRegistered = $false
        $validatedCount = 0
        foreach ($wtPath in $worktreePaths) {
            $validatedCount++
            if ([string]::IsNullOrWhiteSpace($wtPath)) {
                Write-Status "  [FAIL] Empty worktree path in Git porcelain output" $Red
                $allPassed = $false
                $allValid = $false
                continue
            }

            if (Test-IsForbiddenProjectPath $wtPath) {
                Write-Status "  [FAIL] Registered worktree is under forbidden project: $wtPath" $Red
                $allPassed = $false
                $allValid = $false
                continue
            }

            if ($isWindowsRuntime) {
                $valid = $false
                foreach ($allowed in $AllowedWorktreeRoots) {
                    if (Test-IsPathAtOrUnderRoot -Candidate $wtPath -Root $allowed) {
                        $valid = $true
                        break
                    }
                }
            } else {
                $valid = [System.IO.Path]::IsPathRooted($wtPath)
                if ($valid -and (Test-IsLinuxPathAtOrUnderRoot -Candidate $wtPath -Root $gitRoot) -and
                    (Test-IsLinuxPathAtOrUnderRoot -Candidate $gitRoot -Root $wtPath)) {
                    $currentRootRegistered = $true
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
        if (-not $isWindowsRuntime -and -not $currentRootRegistered) {
            Write-Status "  [FAIL] Git root is not a registered worktree" $Red
            $allPassed = $false
            $allValid = $false
        }
        Write-Status "Validated worktrees: $validatedCount" $Cyan
        if ($allValid -and $wtCount -gt 0 -and $validatedCount -eq $wtCount) {
            Write-Status "  [OK] All registered worktrees belong to allowed roots" $Green
        }
    } else {
        Write-Status "  [FAIL] git worktree list failed: $worktreesRaw" $Red
        $allPassed = $false
    }
} catch {
    Write-Status "  [FAIL] git worktree command failed: $($_.Exception.Message)" $Red
    $allPassed = $false
}

# 7. Forbidden Project Check
Write-Section "7. FORBIDDEN PROJECT CHECK"
$forbiddenCurrentPath = $false
foreach ($currentPath in @($cwdStr, $gitRoot)) {
    if (Test-IsForbiddenProjectPath $currentPath) {
        Write-Status "  [FAIL] Current workspace identity is under forbidden project: $currentPath" $Red
        $allPassed = $false
        $forbiddenCurrentPath = $true
    }
}
if (-not $forbiddenCurrentPath) {
    Write-Status "  [OK] Current directory and Git root are outside the forbidden project" $Green
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
