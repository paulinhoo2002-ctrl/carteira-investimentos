<#
.SYNOPSIS
Agent Bootstrap for Codex operations on carteira-investimentos repository.
Short, reusable bootstrap that runs the identity gate and orients the agent.

.DESCRIPTION
This script implements the AGENT STARTUP PROTOCOL from AGENTS.md:
1. PROJECT_IDENTITY_GATE (mandatory)
2. Shows branch/HEAD/status
3. Points to mandatory documents
4. Shows available check commands
5. Shows critical constraints

Does NOT load large files automatically - agent reads them on demand.

.OUTPUTS
- Exit code from PROJECT_IDENTITY_GATE
- Console orientation for agent

.NOTES
Author: Codex Infrastructure Governance Mission
Version: 1.0
#>

param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipIdentityGate = $false
)

$ErrorActionPreference = "Stop"

# Colors
$Green = [ConsoleColor]::Green
$Red = [ConsoleColor]::Red
$Yellow = [ConsoleColor]::Yellow
$Cyan = [ConsoleColor]::Cyan
$Magenta = [ConsoleColor]::Magenta
$White = [ConsoleColor]::White

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor $Cyan
    Write-Host $Text -ForegroundColor $Cyan
    Write-Host ("=" * 70) -ForegroundColor $Cyan
}

function Write-Item {
    param([string]$Label, [string]$Value, [ConsoleColor]$LabelColor = $Yellow, [ConsoleColor]$ValueColor = $White)
    Write-Host ("  {0,-30} {1}" -f $Label, $Value) -ForegroundColor $ValueColor
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("-" * 60) -ForegroundColor $Magenta
    Write-Host $Title -ForegroundColor $Magenta
    Write-Host ("-" * 60) -ForegroundColor $Magenta
}

# Run PROJECT_IDENTITY_GATE first (unless skipped)
if (-not $SkipIdentityGate) {
    $gateScript = "$PSScriptRoot\project-identity-gate.ps1"
    if (Test-Path $gateScript) {
        Write-Host "Running PROJECT_IDENTITY_GATE..." -ForegroundColor $Cyan
        & $gateScript
        $gateExitCode = $LASTEXITCODE
        if ($gateExitCode -ne 0) {
            Write-Host ""
            Write-Host "BOOTSTRAP ABORTED: Identity gate failed." -ForegroundColor $Red
            exit $gateExitCode
        }
        Write-Host "Identity gate passed. Continuing bootstrap..." -ForegroundColor $Green
    } else {
        Write-Host "WARNING: Identity gate script not found at $gateScript" -ForegroundColor $Yellow
    }
}

Write-Header "CODEX AGENT BOOTSTRAP - carteira-investimentos"

# 1. Show Branch/HEAD/Status
Write-Section "REPOSITORY STATUS"
try {
    $branch = git branch --show-current 2>&1
    $head = git rev-parse HEAD 2>&1
    $originMain = git rev-parse origin/main 2>&1
    $status = git status --short 2>&1
    
    Write-Item "Branch:" $branch
    Write-Item "HEAD:" $head
    Write-Item "origin/main:" $originMain
    Write-Item "Working tree:" (if ($status.Trim()) { "DIRTY ($($status.Split("`n").Count) files)" } else { "CLEAN" })
} catch {
    Write-Item "Error:" "Could not read git status"
}

# 2. Mandatory Documents
Write-Section "MANDATORY DOCUMENTS (read in order)"
$mandatoryDocs = @(
    "AGENTS.md                           - Governance, identity gate, protected areas",
    "docs/ai/PROJECT_MEMORY.md           - Canonical project memory & history",
    "docs/ai/NEXT_STEP.md                - Current phase & next actionable gate",
    "docs/ai/DECISIONS.md                - Permanent decisions & precedents",
    "docs/ai/SKILLS_ROUTING.md           - Skill routing table & mission patterns",
    "docs/ai/PROJECT_STATE.md            - Current project state snapshot",
    "docs/ai/VISUAL_CANON.md             - Visual reference (if UI work)",
    "docs/ai/ARCHITECTURE_MAP.md         - Architecture map (if code work)",
    "docs/ai/PRODUCT_CONTRACTS.md        - Financial data contracts (if finance)",
    "docs/ai/TESTING_AND_RELEASE.md      - Testing/release gates (if PR work)",
    "docs/ai/FINANCIAL_RULES.md          - Financial semantics rules (if finance)",
    "docs/ai/PROJECT_CONTINUITY_POLICY.md - Continuity & memory policy"
)

foreach ($doc in $mandatoryDocs) {
    $parts = $doc -split '\s{2,}'
    $path = $parts[0].Trim()
    $desc = if ($parts.Count -gt 1) { $parts[1].Trim() } else { "" }
    $exists = if (Test-Path "C:/Projetos/carteira-investimentos/$path") { "EXISTS" } else { "MISSING" }
    $color = if ($exists -eq "EXISTS") { $Green } else { $Red }
    Write-Item "$path [$exists]" $desc
}

# 3. Quick/Full Check Commands
Write-Section "VALIDATION COMMANDS"
Write-Item "Quick check (fast):" "npm.cmd test  (runs legacy 249 + modern 815)"
Write-Item "Full check (critical):" "npm.cmd run build && npm.cmd run build:modern && npm.cmd run qa:all"
Write-Item "Legacy tests:" "npm.cmd run test:finance && npm.cmd run test:persistence && npm.cmd run test:backup-restore && npm.cmd run test:load && npm.cmd run test:roundtrip"
Write-Item "Modern tests:" "npm.cmd run test:modern"
Write-Item "Browser smoke:" "npm.cmd run qa:smoke"
Write-Item "Diff check:" "git diff --check"

# 4. Critical Constraints
Write-Section "CRITICAL CONSTRAINTS (NON-NEGOTIABLE)"
$constraints = @(
    "NO FORCE PUSH - ever",
    "NO GIT CLEAN / RESET --HARD / RESTORE without authorization",
    "NO MERGE / AUTO-MERGE / PUSH TO MAIN without human approval",
    "NO FINANCIAL SEMANTICS CHANGES without dedicated phase",
    "NO PERSISTENCE/SCHEMA/FIREBASE changes without authorization",
    "NO CARTEIRA-2.0 ACCESS - forbidden project",
    "NO REAL FINANCIAL DATA in tests - synthetic only",
    "VISUAL_PHASE=DEFERRED - UI visual skills FORBIDDEN",
    "FINANCIAL TRUTH: UNKNOWN!=ZERO, PARTIAL!=COMPLETE, ESTIMATE!=RECEIVED",
    "MANUAL RF AUTHORITY PRESERVED - auto values never overwrite manual",
    "SAVE() FAILURE = QUARANTINE - blocks subsequent financial writes",
    "EXPLICIT CONFIRMATION REQUIRED for all financial mutations",
    "CANCEL/CLOSE MUST WRITE 0 - verified by tests"
)

foreach ($c in $constraints) {
    Write-Host "  [BLOCK] $c" -ForegroundColor $Red
}

# 5. Tiered Testing Strategy
Write-Section "TOKEN OPTIMIZATION - TIERED TESTING"
Write-Host "  TIER 1 (FAST) - docs, small fixes, CSS:     quick-check (legacy + modern unit)" -ForegroundColor $Green
Write-Host "  TIER 2 (NORMAL) - features, refactors:       related tests + required build" -ForegroundColor $Yellow
Write-Host "  TIER 3 (CRITICAL) - backup, import, finance: full-check + deep review + HUMAN_GATE" -ForegroundColor $Red
Write-Host ""
Write-Host "  Record HEAD/hash when full-check passes to avoid re-running unchanged code." -ForegroundColor $Cyan

# 6. Skills Policy
Write-Section "SKILLS POLICY"
Write-Host "  MANDATORY_FIRST_SKILL = Superpowers (always load first)" -ForegroundColor $Cyan
Write-Host "  MINIMUM_RELEVANT_SKILLS = true (smallest sufficient set)" -ForegroundColor $Cyan
Write-Host "  Mission type determines required skills (see SKILLS_ROUTING.md)" -ForegroundColor $Cyan
Write-Host "  FINANCIAL_TRUTH missions: +doubt-driven, +systematic-debugging, +TDD" -ForegroundColor $Cyan
Write-Host "  BROWSER_QA: select ONE primary browser skill, not all 3" -ForegroundColor $Cyan

Write-Header "BOOTSTRAP COMPLETE - READY FOR MISSION"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Cyan
Write-Host "  1. Read mandatory documents in order (start with AGENTS.md, PROJECT_MEMORY.md)" -ForegroundColor $White
Write-Host "  2. Select mission type from SKILLS_ROUTING.md" -ForegroundColor $White
Write-Host "  3. Load Superpowers + minimum relevant skills" -ForegroundColor $White
Write-Host "  4. Execute with controlled scope, preserve protected areas" -ForegroundColor $White
Write-Host "  5. Validate with appropriate tier of tests" -ForegroundColor $White
Write-Host "  6. Update PROJECT_MEMORY.md / NEXT_STEP.md with durable decisions" -ForegroundColor $White
Write-Host ""
Write-Host "Remember: Repository documentation is source of truth, not chat history." -ForegroundColor $Yellow
