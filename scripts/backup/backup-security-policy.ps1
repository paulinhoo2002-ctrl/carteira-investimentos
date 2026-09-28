function Test-BackupPathWithinRoot {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Root
    )

    $fullPath = [System.IO.Path]::GetFullPath($Path).TrimEnd('\')
    $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd('\')
    return $fullPath.Equals($fullRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
        $fullPath.StartsWith($fullRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)
}

function Test-BackupDestinationPolicy {
    param(
        [Parameter(Mandatory)][string]$Candidate,
        [Parameter(Mandatory)][string]$AllowedRoot,
        [Parameter(Mandatory)][string]$ProjectRoot,
        [Parameter(Mandatory)][string]$WorktreesRoot,
        [Parameter(Mandatory)][string]$ForbiddenProject,
        [string[]]$KnownReparsePoints = @()
    )

    if ([string]::IsNullOrWhiteSpace($Candidate)) {
        return [pscustomobject]@{ Allowed = $false; Reason = 'EMPTY_DESTINATION'; FullPath = $null }
    }
    if ($Candidate -match '(^|[\\/])\.\.([\\/]|$)') {
        return [pscustomobject]@{ Allowed = $false; Reason = 'PATH_TRAVERSAL'; FullPath = $null }
    }

    try {
        $fullCandidate = [System.IO.Path]::GetFullPath($Candidate)
        $fullAllowedRoot = [System.IO.Path]::GetFullPath($AllowedRoot)
    } catch {
        return [pscustomobject]@{ Allowed = $false; Reason = 'INVALID_PATH'; FullPath = $null }
    }

    if (-not (Test-BackupPathWithinRoot -Path $fullCandidate -Root $fullAllowedRoot)) {
        return [pscustomobject]@{ Allowed = $false; Reason = 'OUTSIDE_ALLOWED_ROOT'; FullPath = $fullCandidate }
    }

    foreach ($blockedRoot in @($ProjectRoot, $WorktreesRoot, $ForbiddenProject)) {
        if (Test-BackupPathWithinRoot -Path $fullCandidate -Root $blockedRoot) {
            return [pscustomobject]@{ Allowed = $false; Reason = 'FORBIDDEN_ROOT'; FullPath = $fullCandidate }
        }
    }

    foreach ($reparsePath in $KnownReparsePoints) {
        if ($reparsePath -and (Test-BackupPathWithinRoot -Path $fullCandidate -Root $reparsePath)) {
            return [pscustomobject]@{ Allowed = $false; Reason = 'REPARSE_POINT_IN_DESTINATION'; FullPath = $fullCandidate }
        }
    }

    return [pscustomobject]@{ Allowed = $true; Reason = 'ALLOWED'; FullPath = $fullCandidate }
}

function Get-BackupArchivePathPolicy {
    param([Parameter(Mandatory)][string]$RelativePath)

    $normalized = $RelativePath.Replace('\', '/').Trim('/')
    $segments = @($normalized -split '/')
    $leaf = $segments[-1]

    if ($segments | Where-Object { $_ -ieq 'local-imports' -or $_ -ieq '_backups-seguros' }) {
        return [pscustomobject]@{ Disposition = 'BLOCK'; Reason = 'SENSITIVE_FINANCIAL_DATA' }
    }
    if ($segments | Where-Object { $_ -match '(?i)(secret|token|credential|password|private[-_]?key)' }) {
        return [pscustomobject]@{ Disposition = 'BLOCK'; Reason = 'CREDENTIAL_LIKE_PATH' }
    }
    if ($leaf -ieq '.env' -or $leaf -match '(?i)^\.env\.') {
        return [pscustomobject]@{ Disposition = 'BLOCK'; Reason = 'ENV_FILE' }
    }
    if ($leaf -match '(?i)\.(key|pem|crt|p12|pfx)$') {
        return [pscustomobject]@{ Disposition = 'BLOCK'; Reason = 'PRIVATE_KEY_OR_CERTIFICATE' }
    }

    $excludedSegments = @(
        '.git', 'node_modules', '.qa-state', 'test-results', 'coverage',
        'playwright-report', 'blob-report', '.cache', 'tmp', 'temp',
        'scratch', 'logs', 'dist', '.vs', '.vscode', 'backups'
    )
    if ($segments | Where-Object { $excludedSegments -contains $_.ToLowerInvariant() }) {
        return [pscustomobject]@{ Disposition = 'EXCLUDE'; Reason = 'GENERATED_OR_LOCAL_ONLY' }
    }
    if ($leaf -match '(?i)\.log$') {
        return [pscustomobject]@{ Disposition = 'EXCLUDE'; Reason = 'LOG_FILE' }
    }

    return [pscustomobject]@{ Disposition = 'INCLUDE'; Reason = 'TRACKED_SOURCE' }
}

function Get-BackupArchivePathPlan {
    param([Parameter(Mandatory)][string[]]$Paths)

    $included = @()
    $excluded = @()
    $blockers = @()
    foreach ($path in $Paths) {
        $decision = Get-BackupArchivePathPolicy -RelativePath $path
        switch ($decision.Disposition) {
            'INCLUDE' { $included += $path }
            'EXCLUDE' { $excluded += $path }
            'BLOCK' { $blockers += [pscustomobject]@{ Path = $path; Reason = $decision.Reason } }
            default { throw "Unknown backup path disposition: $($decision.Disposition)" }
        }
    }

    return [pscustomobject]@{
        Included = @($included)
        Excluded = @($excluded)
        SensitiveBlockers = @($blockers)
        ArchiveAllowed = ($blockers.Count -eq 0)
    }
}
