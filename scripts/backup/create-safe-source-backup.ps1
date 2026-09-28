<#
.SYNOPSIS
    Creates a safe, deterministic SOURCE_BACKUP of Carteira Investimentos.
    Excludes .git, node_modules, worktrees, QA artifacts, secrets, and sensitive data.

.DESCRIPTION
    This script implements the V277T hardened backup model:
    - Uses explicit allowlist derived from git ls-files
    - Validates PROJECT_IDENTITY_GATE
    - Validates SAFE_BACKUP_ROOT
    - Excludes all sensitive/financial/credential data
    - Includes modern/ source correctly
    - Dry-run mode for verification
    - Archive integrity check
    - SHA256 output

.NOTES
    - Run from the project root or invoke this script by its repository-relative path.
    - Output: CarteiraInvestimentos-Source-YYYYMMDD-HHMMSS.zip
    - Does NOT modify source files
    - Does NOT upload anywhere
    - SENSITIVE_LOCAL_BACKUP is a separate manual process

.PARAMETER DryRun
    If specified, prints what would be included/excluded without creating ZIP.

.PARAMETER SafeBackupRoot
    Override the locally configured safe backup root. Must be pre-validated.
    When omitted, CARTEIRA_SAFE_BACKUP_ROOT is used; otherwise a sibling
    private backup location is derived from the shared Git repository path.
#>

param(
    [switch]$DryRun,
    [string]$SafeBackupRoot = $env:CARTEIRA_SAFE_BACKUP_ROOT
)

# ═══════════════════════════════════════════════════════════════════
# PROJECT IDENTITY GATE
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot 'backup-security-policy.ps1')

$ProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$ExpectedRemote = "https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git"
$CommonGitDir = git -C $ProjectRoot rev-parse --path-format=absolute --git-common-dir 2>$null
if ($LASTEXITCODE -ne 0 -or -not $CommonGitDir) {
    Write-Error "Unable to resolve the shared Git directory for the selected project."
    exit 1
}
$CommonRepoRoot = Split-Path -Parent $CommonGitDir.Trim()
$SiblingRoot = Split-Path -Parent $CommonRepoRoot
$ForbiddenPath = Join-Path $SiblingRoot 'carteira-2.0'
$WorktreesRoot = Join-Path $SiblingRoot ((Split-Path -Leaf $CommonRepoRoot) + '.worktrees')
$AllowedBackupRoot = $env:CARTEIRA_SAFE_BACKUP_ROOT
if ([string]::IsNullOrWhiteSpace($AllowedBackupRoot)) {
    $AllowedBackupRoot = Join-Path (Join-Path $SiblingRoot '_backups') (Split-Path -Leaf $CommonRepoRoot)
}
if ([string]::IsNullOrWhiteSpace($SafeBackupRoot)) {
    $SafeBackupRoot = $AllowedBackupRoot
}

Write-Host "=== PROJECT IDENTITY GATE ==="
Write-Host "Project Root: $ProjectRoot"

if (-not (Test-Path $ProjectRoot)) {
    Write-Error "Project root not found: $ProjectRoot"
    exit 1
}

Set-Location $ProjectRoot

$GitRoot = Resolve-Path -Path (git rev-parse --show-toplevel 2>$null) -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0 -or -not $GitRoot -or $GitRoot.ProviderPath -ne $ProjectRoot) {
    Write-Error "Git root mismatch. Expected: $ProjectRoot, Got: $GitRoot"
    exit 1
}

$RemoteUrl = git remote get-url origin 2>$null
if ($RemoteUrl -ne $ExpectedRemote) {
    Write-Error "Remote URL mismatch. Expected: $ExpectedRemote, Got: $RemoteUrl"
    exit 1
}

$Branch = git branch --show-current
$Head = git rev-parse HEAD
$OriginMain = git rev-parse origin/main 2>$null
$UntrackedCount = (git status --short | Measure-Object).Count

Write-Host "Branch:      $Branch"
Write-Host "HEAD:        $Head"
Write-Host "Origin/main: $OriginMain"
Write-Host "Untracked:   $UntrackedCount files"
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# SAFE BACKUP ROOT VALIDATION
# ═══════════════════════════════════════════════════════════════════

Write-Host "=== SAFE BACKUP ROOT VALIDATION ==="
Write-Host "Requested: $SafeBackupRoot"

if (-not (Test-Path -LiteralPath $AllowedBackupRoot -PathType Container)) {
    Write-Error "Approved backup root is missing: $AllowedBackupRoot"
    exit 1
}

$knownReparsePoints = @()
$candidateFull = $null
try { $candidateFull = [System.IO.Path]::GetFullPath([string]$SafeBackupRoot) } catch {
    Write-Error "Invalid backup destination path."
    exit 1
}

$probe = $candidateFull
while ($probe -and (Test-BackupPathWithinRoot -Path $probe -Root $AllowedBackupRoot)) {
    if (Test-Path -LiteralPath $probe) {
        $item = Get-Item -LiteralPath $probe -Force
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            $knownReparsePoints += $probe
        }
    }
    if ($probe.TrimEnd('\').Equals($AllowedBackupRoot.TrimEnd('\'), [System.StringComparison]::OrdinalIgnoreCase)) { break }
    $parent = Split-Path -Parent $probe
    if (-not $parent -or $parent -eq $probe) { break }
    $probe = $parent
}

$destinationPolicy = Test-BackupDestinationPolicy `
    -Candidate ([string]$SafeBackupRoot) `
    -AllowedRoot $AllowedBackupRoot `
    -ProjectRoot $ProjectRoot `
    -WorktreesRoot $WorktreesRoot `
    -ForbiddenProject $ForbiddenPath `
    -KnownReparsePoints $knownReparsePoints
if (-not $destinationPolicy.Allowed) {
    Write-Error "SAFE_BACKUP_ROOT_BLOCKED: $($destinationPolicy.Reason)"
    exit 1
}
$SafeBackupRootFull = $destinationPolicy.FullPath

$OutputDir = $SafeBackupRootFull
Write-Host "Resolved:  $SafeBackupRootFull"
Write-Host "OUTPUT_WITHIN_SAFE_ROOT=true"
Write-Host "DESTINATION_CREATED_BEFORE_VALIDATION=false"
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# BUILD ALLOWLIST FROM GIT TRACKED FILES (using exclusion helper)
# ════════════════════════════════════════════════════════════════════

Write-Host "=== BUILDING ALLOWLIST FROM GIT TRACKED FILES ==="

$TrackedFiles = git ls-files 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "git ls-files failed"
    exit 1
}

$TrackedList = $TrackedFiles -split "`r?`n" | Where-Object { $_ -ne '' }
Write-Host "Git tracked files: $($TrackedList.Count)"

# Filter tracked files using normalized relative path exclusion helper
$IncludedFiles = @()
$ExcludedFiles = @()
$SensitiveBlockers = @()
$ExclusionCounts = @{}
$archivePlan = Get-BackupArchivePathPlan -Paths $TrackedList
$IncludedFiles = @($archivePlan.Included)
$ExcludedFiles = @($archivePlan.Excluded)
$SensitiveBlockers = @($archivePlan.SensitiveBlockers)
foreach ($file in $ExcludedFiles) {
    $pathPolicy = Get-BackupArchivePathPolicy -RelativePath $file
    $ExclusionCounts[$pathPolicy.Reason] = ($ExclusionCounts[$pathPolicy.Reason] + 1)
}

Write-Host "Included (tracked):  $($IncludedFiles.Count)"
Write-Host "Excluded (tracked):  $($ExcludedFiles.Count)"
Write-Host "Sensitive blockers:  $($SensitiveBlockers.Count)"

if ($SensitiveBlockers.Count -gt 0) {
    Write-Error "SENSITIVE_BLOCKERS=$($SensitiveBlockers.Count); refusing archive creation."
    exit 1
}

# Print exclusion counts by rule
$ExclusionCounts.GetEnumerator() | Sort-Object Name | ForEach-Object {
    Write-Host "  EXCLUDED_$($_.Key)=$($_.Value)"
}
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# VERIFY MODERN/ INCLUSION
# ════════════════════════════════════════════════════════════════════

$ModernTracked = $TrackedList | Where-Object { $_ -like 'modern/**' -and $_ -notlike 'modern/dist/**' }
$ModernIncluded = $IncludedFiles | Where-Object { $_ -like 'modern/**' }
$ModernMissing = $ModernTracked | Where-Object { $IncludedFiles -notcontains $_ }

Write-Host "=== MODERN/ VERIFICATION ==="
Write-Host "MODERN_TRACKED_COUNT:  $($ModernTracked.Count)"
Write-Host "MODERN_INCLUDED_COUNT: $($ModernIncluded.Count)"
Write-Host "MODERN_MISSING_COUNT:  $($ModernMissing.Count)"

if ($ModernMissing.Count -gt 0) {
    Write-Host "Missing modern files:"
    $ModernMissing | ForEach-Object { Write-Host "  $_" }
    Write-Error "MODERN_MISSING_COUNT > 0 -- BLOCKER"
    exit 1
}
Write-Host "MODERN_MISSING_COUNT=0 OK"
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# JUNCTION/SYMLINK CHECK
# ════════════════════════════════════════════════════════════════════

Write-Host "=== JUNCTION/SYMLINK CHECK ==="

$IncludedDirs = $IncludedFiles | Split-Path -Parent | Where-Object { $_ -ne '' } | Sort-Object -Unique
$JunctionFindings = @()

foreach ($dir in $IncludedDirs) {
    if (Test-Path $dir -PathType Container) {
        $Item = Get-Item $dir
        if ($Item.LinkType) {
            $Target = $Item.Target
            $TargetFull = Resolve-Path -Path $Target -ErrorAction SilentlyContinue
            if ($TargetFull) {
                $TargetFull = $TargetFull.ProviderPath
                if (-not (Test-BackupPathWithinRoot -Path $TargetFull -Root $ProjectRoot)) {
                    $JunctionFindings += @{ Dir = $dir; Target = $Target; TargetFull = $TargetFull }
                }
            }
        }
    }
}

if ($JunctionFindings.Count -gt 0) {
    Write-Host "JUNCTION FINDINGS (excluded from archive):"
    $JunctionFindings | ForEach-Object { Write-Host "  $($_.Dir) -> $($_.TargetFull) [OUTSIDE PROJECT]" }
    # Remove files under junction dirs from inclusion
    foreach ($j in $JunctionFindings) {
        $IncludedFiles = $IncludedFiles | Where-Object { $_ -notlike "$($j.Dir)/**" }
    }
    Write-Host "Adjusted included files: $($IncludedFiles.Count)"
} else {
    Write-Host "No external junctions found in included paths."
}
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# OVERWRITE PROTECTION
# ════════════════════════════════════════════════════════════════════

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ZipName = "CarteiraInvestimentos-Source-$Timestamp.zip"
$ZipPath = Join-Path $OutputDir $ZipName

if (Test-Path $ZipPath) {
    Write-Error "OVERWRITE PROTECTION: $ZipPath already exists. Aborting."
    exit 1
}

Write-Host "=== ARCHIVE NAMING ==="
Write-Host "Output: $ZipPath"
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# DRY RUN MODE
# ════════════════════════════════════════════════════════════════════

if ($DryRun) {
    Write-Host "=== DRY RUN MODE ==="
    Write-Host "CANDIDATE_FILES=$($TrackedList.Count)"
    Write-Host "INCLUDED_FILES=$($IncludedFiles.Count)"
    Write-Host "EXCLUDED_FILES=$($ExcludedFiles.Count)"
    Write-Host "SENSITIVE_BLOCKERS=$($SensitiveBlockers.Count)"

    # Exclusion counts by rule
    $ExclusionCounts.GetEnumerator() | Sort-Object Name | ForEach-Object {
        Write-Host "  EXCLUDED_$($_.Key)=$($_.Value)"
    }

    # Assert critical exclusions are working
    $GitIncluded = @($IncludedFiles | Where-Object { $_ -like '.git/**' }).Count
    $NodeModulesIncluded = @($IncludedFiles | Where-Object { $_ -like 'node_modules/**' -or $_ -like '*/node_modules/**' }).Count
    $QaStateIncluded = @($IncludedFiles | Where-Object { $_ -like '.qa-state/**' }).Count
    $ModernDistIncluded = @($IncludedFiles | Where-Object { $_ -like 'modern/dist/**' }).Count
    $LocalImportsIncluded = @($IncludedFiles | Where-Object { $_ -like 'local-imports/**' }).Count
    $SafeBackupsIncluded = @($IncludedFiles | Where-Object { $_ -like '_backups-seguros/**' -or $_ -like 'backups/**' }).Count
    $EnvIncluded = @($IncludedFiles | Where-Object { $_ -ieq '.env' -or $_ -like '.env.*' }).Count

    Write-Host ""
    Write-Host "=== EXCLUSION ASSERTIONS ==="
    Write-Host "GIT_FILES_INCLUDED=$GitIncluded"
    Write-Host "NODE_MODULES_FILES_INCLUDED=$NodeModulesIncluded"
    Write-Host "QA_STATE_FILES_INCLUDED=$QaStateIncluded"
    Write-Host "MODERN_DIST_FILES_INCLUDED=$ModernDistIncluded"
    Write-Host "LOCAL_IMPORTS_FILES_INCLUDED=$LocalImportsIncluded"
    Write-Host "SAFE_BACKUPS_FILES_INCLUDED=$SafeBackupsIncluded"
    Write-Host "ENV_FILES_INCLUDED=$EnvIncluded"

    if ($GitIncluded -gt 0 -or $NodeModulesIncluded -gt 0 -or $QaStateIncluded -gt 0 -or $ModernDistIncluded -gt 0 -or $LocalImportsIncluded -gt 0 -or $SafeBackupsIncluded -gt 0 -or $EnvIncluded -gt 0) {
        Write-Error "EXCLUSION ASSERTION FAILED: Critical exclusions not working"
        exit 1
    }
    Write-Host "ALL_CRITICAL_EXCLUSIONS_PASS=true"

    if ($SensitiveBlockers.Count -gt 0) {
        Write-Host ""
        Write-Host "SENSITIVE BLOCKERS:"
        $SensitiveBlockers | ForEach-Object { Write-Host "  $($_.Path) -- $($_.Reason)" }
    }

    # Estimate size
    $TotalBytes = 0
    foreach ($f in $IncludedFiles) {
        if (Test-Path $f) {
            $TotalBytes += (Get-Item $f).Length
        }
    }
    $EstimatedMB = [math]::Round($TotalBytes / 1MB, 2)
    # Zip compression ~60-80% for source
    $EstimatedZipMB = [math]::Round($EstimatedMB * 0.3, 2)

    Write-Host ""
    Write-Host "ESTIMATED_UNCOMPRESSED_MB=$EstimatedMB"
    Write-Host "ESTIMATED_COMPRESSED_MB=$EstimatedZipMB"
    Write-Host "OUTPUT_PATH=$ZipPath"
    Write-Host ""
    Write-Host "DRY_RUN_STATUS=SUCCESS"
    Write-Host "DRY_RUN_FILE_COUNT=$($IncludedFiles.Count)"
    Write-Host "DRY_RUN_ESTIMATED_MB=$EstimatedZipMB"
    Write-Host "DRY_RUN_SENSITIVE_BLOCKERS=$($SensitiveBlockers.Count)"
    Write-Host ""
    Write-Host "=== DRY RUN COMPLETE (NO ZIP CREATED) ==="
    exit 0
}

if (-not (Test-Path -LiteralPath $OutputDir -PathType Container)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# ═══════════════════════════════════════════════════════════════════
# CREATE ARCHIVE (7-Zip with preserved directory structure)
# ═══════════════════════════════════════════════════════════════════

Write-Host "=== CREATING ARCHIVE ==="

$SevenZip = "C:\\Program Files\\7-Zip\\7z.exe"
if (-not (Test-Path $SevenZip)) {
    $SevenZip = "C:\\Program Files (x86)\\7-Zip\\7z.exe"
}
if (-not (Test-Path $SevenZip)) {
    Write-Error "7-Zip not found. Install 7-Zip or add to PATH."
    exit 1
}

# Write file list with RELATIVE paths to a known absolute location
$FileListPath = Join-Path $env:TEMP "source-backup-filelist-$([System.Guid]::NewGuid()).txt"
$IncludedFiles | ForEach-Object { $_ } | Set-Content -Path $FileListPath -Encoding UTF8
$FileListPathWin = $FileListPath.Replace('/', '\\')

try {
    # Run 7z FROM project root with relative paths to preserve directory structure
    $OldLocation = Get-Location
    Set-Location $ProjectRoot
    & $SevenZip a -tzip -mx=9 -ssw "$ZipPath" "@$FileListPathWin" 2>&1
    Set-Location $OldLocation

    $ExitCode = $LASTEXITCODE
    if ($ExitCode -ne 0) {
        Write-Error "7-Zip failed with exit code $ExitCode"
        exit $ExitCode
    }
} finally {
    if (Test-Path $FileListPath) { Remove-Item $FileListPath -Force }
}

Write-Host "Archive created: $ZipPath"
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# ARCHIVE INTEGRITY CHECK (7-Zip for test, SHA256 via PowerShell)
# ════════════════════════════════════════════════════════════════════

Write-Host "=== ARCHIVE INTEGRITY CHECK ==="

$SevenZip = "C:\\Program Files\\7-Zip\\7z.exe"
if (-not (Test-Path $SevenZip)) {
    $SevenZip = "C:\\Program Files (x86)\\7-Zip\\7z.exe"
}

if (Test-Path $SevenZip) {
    $TestResult = & $SevenZip t "$ZipPath" 2>&1
    $TestExitCode = $LASTEXITCODE
    if ($TestExitCode -ne 0) {
        Write-Error "Archive integrity test FAILED (7z t)"
        Write-Host $TestResult
        exit 1
    }
    Write-Host "7z t: PASS"
} else {
    # Fallback: try to open with .NET ZipArchive to validate
    try {
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
        $count = $zip.Entries.Count
        $zip.Dispose()
        Write-Host "ZipArchive validation: PASS ($count entries)"
    } catch {
        Write-Error "Archive integrity test FAILED (.NET ZipArchive): $($_.Exception.Message)"
        exit 1
    }
}
Write-Host ""

# ════════════════════════════════════════════════════════════════════
# SHA256 & MANIFEST SUMMARY
# ════════════════════════════════════════════════════════════════════

$Sha256 = Get-FileHash -Algorithm SHA256 -Path $ZipPath
$ZipSizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)

# Count files in archive
if (Test-Path $SevenZip) {
    $ListResult = & $SevenZip l -slt "$ZipPath" 2>&1
    $FileCount = ($ListResult | Select-String "Path = " | Measure-Object).Count
} else {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    $FileCount = $zip.Entries.Count
    $zip.Dispose()
}

Write-Host "=== BACKUP COMPLETE ==="
Write-Host "File:           $ZipPath"
Write-Host "Size:           $ZipSizeMB MB"
Write-Host "Files in ZIP:   $FileCount"
Write-Host "SHA256:         $($Sha256.Hash)"
Write-Host ""

# Top-level listing
Write-Host "=== TOP-LEVEL CONTENTS ==="
if (Test-Path $SevenZip) {
    & $SevenZip l "$ZipPath" | Select-String "^\d{4}-\d{2}-\d{2}" | ForEach-Object {
        $Line = $_
        if ($Line -match '^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+.*\s+(.+)$') {
            $Name = $matches[1]
            if ($Name -notmatch '/') { Write-Host "  $Name" }
        }
    }
} else {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    $zip.Entries | Where-Object { $_.FullName -notmatch '/' -and $_.FullName -ne '' } | ForEach-Object {
        Write-Host "  $($_.FullName)"
    }
    $zip.Dispose()
}

Write-Host ""
Write-Host "FILES_INCLUDED=$FileCount"
Write-Host "BACKUP_MB=$ZipSizeMB"
Write-Host "SHA256=$($Sha256.Hash)"
Write-Host ""
Write-Host "=== SOURCE_BACKUP CREATED SUCCESSFULLY ==="
