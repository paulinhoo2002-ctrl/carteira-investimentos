# scripts/setup-ai.ps1
# This script validates the AI infrastructure setup without modifying anything.
# Assumes it is run from the project root.

Write-Host "=== AI Infrastructure Validation ===" -ForegroundColor Cyan
Write-Host ""

# Define paths based on current directory (project root)
$projectRoot = Get-Location
$docsAiPath = Join-Path $projectRoot "docs/ai"
$agentsMdPath = Join-Path $projectRoot "AGENTS.md"
$skillsLockPath = Join-Path $docsAiPath "skills.lock.json"
$agentsSkillsPath = Join-Path $projectRoot ".agents/skills"
$requiredSkills = @(
    "archify",
    "frontend-design",
    "interface-design",
    "impeccable",
    "playwright",
    "caveman",
    "caveman-review",
    "caveman-commit",
    "caveman-compress",
    "caveman-help",
    "caveman-stats",
    "cavecrew",
    "ui-ux-pro-max"
)
$requiredDocs = @(
    "AI_BASELINE.md",
    "ARCHITECTURE.md",
    "FINANCIAL_RULES.md",
    "PROJECT_CONTEXT.md",
    "PROJECT_MEMORY.md",
    "SKILLS.md",
    "UI_GUIDELINES.md",
    "WORKFLOW.md",
    "PROJECT_RULES.md",
    "DECISIONS.md",
    "AI_CHANGELOG.md",
    "README.md",
    "architecture-version.json",
    "skills.lock.json"
)

# Function to check existence and report
function Check-Path {
    param([string]$path, [string]$description)
    if (Test-Path $path) {
        Write-Host "[OK] $description exists: $path" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[MISSING] $description MISSING: $path" -ForegroundColor Red
        return $false
    }
}

# Function to check if a required command is available
function Check-CommandRequired {
    param([string]$command, [string]$description)
    if (Get-Command $command -ErrorAction SilentlyContinue) {
        Write-Host "[OK] $description available" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[MISSING] $description not available" -ForegroundColor Red
        return $false
    }
}

# Function to check if an optional command is available (only warns)
function Check-CommandOptional {
    param([string]$command, [string]$description)
    if (Get-Command $command -ErrorAction SilentlyContinue) {
        Write-Host "[OK] $description available" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[WARN] $description not available" -ForegroundColor Yellow
        return $true  # optional, not a failure
    }
}

# Check main components
Write-Host "Checking main components:" -ForegroundColor Yellow
$allGood = $true

if (-not (Check-Path $docsAiPath "docs/ai directory")) { $allGood = $false }
if (-not (Check-Path $agentsMdPath "AGENTS.md")) { $allGood = $false }
if (-not (Check-Path $skillsLockPath "docs/ai/skills.lock.json")) { $allGood = $false }
if (-not (Check-Path $agentsSkillsPath ".agents/skills directory")) { $allGood = $false }
Write-Host ""

# Check required tools
Write-Host "Checking required tools:" -ForegroundColor Yellow
if (-not (Check-CommandRequired "git" "Git")) { $allGood = $false }
if (-not (Check-CommandRequired "node" "Node.js")) { $allGood = $false }
if (-not (Check-CommandRequired "npm" "npm")) { $allGood = $false }
# Optional tools
Write-Host "Checking optional tools:" -ForegroundColor Yellow
Check-CommandOptional "playwright" "Playwright CLI"
Check-CommandOptional "hermes" "Hermes"
Write-Host ""

# Check required skills in .agents/skills
if (Test-Path $agentsSkillsPath) {
    Write-Host "Checking required skills:" -ForegroundColor Yellow
    foreach ($skill in $requiredSkills) {
        $skillPath = Join-Path $agentsSkillsPath $skill
        $skillMdPath = Join-Path $skillPath "SKILL.md"
        if (Test-Path $skillMdPath) {
            Write-Host "[OK] Skill '$skill' has SKILL.md" -ForegroundColor Green
        } else {
            Write-Host "[MISSING] Skill '$skill' MISSING SKILL.md" -ForegroundColor Red
            $allGood = $false
        }
    }
    Write-Host ""
} else {
    Write-Host "[MISSING] .agents/skills directory not found, skipping skill checks." -ForegroundColor Red
    $allGood = $false
}

# Check required documentation in docs/ai
if (Test-Path $docsAiPath) {
    Write-Host "Checking required documentation:" -ForegroundColor Yellow
    foreach ($doc in $requiredDocs) {
        $docPath = Join-Path $docsAiPath $doc
        if (Test-Path $docPath) {
            Write-Host "[OK] Documentation '$doc' exists" -ForegroundColor Green
        } else {
            Write-Host "[MISSING] Documentation '$doc' MISSING" -ForegroundColor Red
            $allGood = $false
        }
    }
    Write-Host ""
} else {
    Write-Host "[MISSING] docs/ai directory not found, skipping documentation checks." -ForegroundColor Red
    $allGood = $false
}

# Validate skills.lock.json content if it exists
if (Test-Path $skillsLockPath) {
    Write-Host "Validating skills.lock.json:" -ForegroundColor Yellow
    try {
        $jsonContent = Get-Content $skillsLockPath -Raw | ConvertFrom-Json
        if ($jsonContent -and $jsonContent.version -is [int] -and $jsonContent.skills -is [array]) {
            Write-Host "[OK] skills.lock.json has valid structure (version and skills array)" -ForegroundColor Green
            # Check that listed skills match required skills (optional)
            $listedSkills = $jsonContent.skills
            $missingInLock = $requiredSkills | Where-Object { $_ -notin $listedSkills }
            $extraInLock = $listedSkills | Where-Object { $_ -notin $requiredSkills }
            if ($missingInLock.Count -eq 0 -and $extraInLock.Count -eq 0) {
                Write-Host "[OK] skills.lock.json lists exactly the required skills" -ForegroundColor Green
            } else {
                if ($missingInLock.Count -gt 0) {
                    Write-Host "[MISSING] skills.lock.json missing skills: $($missingInLock -join ', ')" -ForegroundColor Red
                    $allGood = $false
                }
                if ($extraInLock.Count -gt 0) {
                    Write-Host "[WARNING] skills.lock.json has extra skills: $($extraInLock -join ', ')" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "[MISSING] skills.lock.json structure invalid (expected version number and skills array)" -ForegroundColor Red
            $allGood = $false
        }
    } catch {
        Write-Host "[MISSING] Failed to parse skills.lock.json: $($_.Exception.Message)" -ForegroundColor Red
        $allGood = $false
    }
    Write-Host ""
}

# Validate architecture-version.json if it exists
if (Test-Path (Join-Path $docsAiPath "architecture-version.json")) {
    Write-Host "Validating architecture-version.json:" -ForegroundColor Yellow
    try {
        $jsonContent = Get-Content (Join-Path $docsAiPath "architecture-version.json") -Raw | ConvertFrom-Json
        if ($jsonContent -and $jsonContent.version -is [int] -and $jsonContent.baseline -is [string] -and $jsonContent.documents -is [array]) {
            Write-Host "[OK] architecture-version.json has valid structure (version, baseline, documents array)" -ForegroundColor Green
        } else {
            Write-Host "[MISSING] architecture-version.json structure invalid (expected version number, baseline string, documents array)" -ForegroundColor Red
            $allGood = $false
        }
    } catch {
        Write-Host "[MISSING] Failed to parse architecture-version.json: $($_.Exception.Message)" -ForegroundColor Red
        $allGood = $false
    }
    Write-Host ""
}

# Final result
if ($allGood) {
    Write-Host "=== ALL CHECKS PASSED ===" -ForegroundColor Green
    Write-Host "AI infrastructure is valid and ready." -ForegroundColor Green
    exit 0
} else {
    Write-Host "=== SOME CHECKS FAILED ===" -ForegroundColor Red
    Write-Host "Please address the missing items above." -ForegroundColor Red
    exit 1
}
