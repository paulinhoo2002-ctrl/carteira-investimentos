'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const powershell = process.env.POWERSHELL_EXE || 'powershell.exe';
const policyPath = path.resolve(__dirname, '../scripts/backup/backup-security-policy.ps1');
const backupScript = path.resolve(__dirname, '../scripts/backup/create-safe-source-backup.ps1');
const windowsOnly = process.platform !== 'win32' && !process.env.POWERSHELL_EXE;

test('backup destination and archive-path security policy blocks unsafe cases', {
  skip: windowsOnly
}, () => {
  const ps = [
    "$ErrorActionPreference='Stop'",
    `. '${policyPath.replaceAll("'", "''")}'`,
    "$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('v278q-policy-' + [guid]::NewGuid().ToString('N'))",
    "$allowed = Join-Path $tempRoot 'approved'",
    "$project = Join-Path $tempRoot 'project-root'",
    "$worktrees = Join-Path $tempRoot 'feature-worktrees'",
    "$forbidden = Join-Path $tempRoot 'separate-project'",
    "$destinationCases = @(",
    "  @{Name='SAFE_DESTINATION'; Candidate=$allowed; Reparse=@()},",
    "  @{Name='OUTSIDE_SAFE_ROOT'; Candidate=(Join-Path $tempRoot 'outside'); Reparse=@()},",
    "  @{Name='INSIDE_PROJECT'; Candidate=(Join-Path $project 'backup'); Reparse=@()},",
    "  @{Name='FORBIDDEN_PROJECT'; Candidate=(Join-Path $forbidden 'backup'); Reparse=@()},",
    "  @{Name='PATH_TRAVERSAL'; Candidate=($allowed + '\\..\\escape'); Reparse=@()},",
    "  @{Name='JUNCTION_ESCAPE'; Candidate=($allowed + '\\redirect\\backup'); Reparse=@($allowed + '\\redirect')}",
    ')',
    '$destinationResults = foreach ($case in $destinationCases) {',
    '  $result = Test-BackupDestinationPolicy -Candidate $case.Candidate -AllowedRoot $allowed -ProjectRoot $project -WorktreesRoot $worktrees -ForbiddenProject $forbidden -KnownReparsePoints $case.Reparse',
    '  [pscustomobject]@{ Name=$case.Name; Allowed=[bool]$result.Allowed; Reason=$result.Reason }',
    '}',
    "$archivePaths = @('.env','.env.local','local-imports\\broker.pdf','_backups-seguros\\snapshot.json','docs\\credentials\\service-token.json','index.html','modern/src/main.tsx')",
    '$plan = Get-BackupArchivePathPlan -Paths $archivePaths',
    '$archiveResults = foreach ($item in $archivePaths) {',
    '  $result = Get-BackupArchivePathPolicy -RelativePath $item',
    '  [pscustomobject]@{ Path=$item; Disposition=$result.Disposition }',
    '}',
    '[pscustomobject]@{ Destinations=@($destinationResults); ArchivePaths=@($archiveResults); ArchiveAllowed=[bool]$plan.ArchiveAllowed; SensitiveBlockerCount=$plan.SensitiveBlockers.Count; Included=@($plan.Included) } | ConvertTo-Json -Depth 5 -Compress'
  ].join('\n');

  const output = execFileSync(powershell, [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps
  ], { encoding: 'utf8', windowsHide: true });
  const result = JSON.parse(output.trim().split(/\r?\n/).at(-1));

  const expectedDestinations = {
    SAFE_DESTINATION: true,
    OUTSIDE_SAFE_ROOT: false,
    INSIDE_PROJECT: false,
    FORBIDDEN_PROJECT: false,
    PATH_TRAVERSAL: false,
    JUNCTION_ESCAPE: false
  };
  for (const entry of result.Destinations) {
    assert.equal(entry.Allowed, expectedDestinations[entry.Name], entry.Name);
  }

  const dispositions = Object.fromEntries(result.ArchivePaths.map(item => [item.Path, item.Disposition]));
  for (const candidate of ['.env', '.env.local', 'local-imports\\broker.pdf', '_backups-seguros\\snapshot.json', 'docs\\credentials\\service-token.json']) {
    assert.equal(dispositions[candidate], 'BLOCK', candidate);
  }
  assert.equal(result.ArchiveAllowed, false, 'a sensitive candidate must hard-block archive creation');
  assert.equal(result.SensitiveBlockerCount, 5);
  assert.equal(result.Included.includes('index.html'), true);
  assert.equal(result.Included.includes('modern/src/main.tsx'), true);
  assert.equal(dispositions['index.html'], 'INCLUDE');
  assert.equal(dispositions['modern/src/main.tsx'], 'INCLUDE');
});

test('backup dry-run creates no archive and rejected destination is not created', {
  skip: windowsOnly
}, () => {
  const dryRun = execFileSync(powershell, [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', backupScript, '-DryRun'
  ], { encoding: 'utf8', windowsHide: true });
  const outputPath = dryRun.match(/^OUTPUT_PATH=(.+)$/m)?.[1];
  assert.ok(outputPath, 'dry-run should report the candidate archive path');
  assert.equal(fs.existsSync(outputPath), false, 'dry-run must not create a ZIP');
  assert.match(dryRun, /DESTINATION_CREATED_BEFORE_VALIDATION=false/);

  const rejectedDestination = path.join(os.tmpdir(), `v278c-unsafe-backup-${process.pid}-${Date.now()}`);
  assert.equal(fs.existsSync(rejectedDestination), false, 'test destination must start absent');
  const rejected = spawnSync(powershell, [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', backupScript,
    '-DryRun', '-SafeBackupRoot', rejectedDestination
  ], { encoding: 'utf8', windowsHide: true });
  assert.notEqual(rejected.status, 0, 'outside destination must be blocked');
  assert.match(`${rejected.stdout}\n${rejected.stderr}`, /SAFE_BACKUP_ROOT_BLOCKED:\s*OUTSIDE_ALLOWED_ROOT/);
  assert.equal(fs.existsSync(rejectedDestination), false, 'blocked destination must not be created');
});
