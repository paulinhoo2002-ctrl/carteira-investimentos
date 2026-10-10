'use strict';

// V407: pre-test Firebase emulator orphan check for the LEGACY QA suite.
// Verifies ports 8080/9099/4400/4500 and, for each listener, resolves
// ownership via PID -> CommandLine + ParentProcessId. Only processes whose
// command line matches the QA emulator jar AND whose parent is dead AND whose
// rules path points into this repository's worktrees are reported as confirmed
// orphans. Unknown processes are never killed by this utility: it only REPORTS.
//
// Usage: node scripts/qa/firebase-precheck.js [--kill-confirmed]
// Exit codes: 0 = all ports free or only confirmed orphans (killed if flag),
//             1 = unknown process occupying an emulator port (manual review).

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const EMULATOR_PORTS = [8080, 9099, 4400, 4500];
// V416: the only QA project identity this utility may act on.
const QA_PROJECT_ID = 'demo-carteira-qa-emulator';

function netstatListeners() {
  // netstat -ano output columns: Proto, Local, Foreign, State, PID.
  let out;
  try {
    out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
  } catch (error) {
    throw new Error(`netstat failed: ${error.message}`);
  }
  const listeners = [];
  for (const line of out.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || cols[0] !== 'TCP') continue;
    const local = cols[1] || '';
    const port = Number(local.split(':').pop());
    const state = cols[3] || '';
    const pid = Number(cols[4]);
    if (!EMULATOR_PORTS.includes(port) || !state.includes('LISTENING')) continue;
    if (!Number.isFinite(pid) || pid <= 0) continue;
    if (!listeners.some(item => item.port === port)) listeners.push({ port, pid });
  }
  return listeners;
}

function processInfo(pid) {
  // PowerShell CIM query; returns null when the process no longer exists.
  const script = [
    '$p = Get-CimInstance Win32_Process -Filter "ProcessId=' + pid + '"',
    'if (-not $p) { exit 1 }',
    '$parentAlive = [bool](Get-CimInstance Win32_Process -Filter ("ProcessId=" + $p.ParentProcessId))',
    'Write-Output ("ParentAlive=" + $parentAlive)',
    'Write-Output ("ParentPid=" + $p.ParentProcessId)',
    'Write-Output ("CommandLine=" + $p.CommandLine)',
  ].join('; ');
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' });
    const info = {};
    for (const line of out.split(/\r?\n/)) {
      const eq = line.indexOf('=');
      if (eq > 0) info[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    return { parentAlive: info.ParentAlive === 'True', parentPid: Number(info.ParentPid), commandLine: info.CommandLine || '' };
  } catch {
    return null;
  }
}

function commandLineArgs(commandLine) {
  return [...String(commandLine).matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)]
    .map(([, doubleQuoted, singleQuoted, bare]) => doubleQuoted ?? singleQuoted ?? bare);
}

function isConfirmedOrphan(info, repoRoot = REPO_ROOT, qaProjectId = QA_PROJECT_ID) {
  if (!info) return false;
  const cmd = String(info.commandLine || '');
  const args = commandLineArgs(cmd);
  // V416 fail-closed security fix: every condition below is mandatory.
  // Match the actual Java -jar invocation and exact values, not incidental text.
  const jarIndex = args.indexOf('-jar');
  if (path.win32.basename(args[0] || '').toLowerCase() !== 'java.exe') return false;
  if (jarIndex < 0 || !/^cloud-firestore-emulator.*\.jar$/i.test(path.win32.basename(args[jarIndex + 1] || ''))) return false;
  const projectIndex = args.indexOf('--project_id');
  if (projectIndex < 0 || args[projectIndex + 1] !== qaProjectId) return false;
  const rulesIndex = args.indexOf('--rules');
  if (rulesIndex < 0 || !args[rulesIndex + 1]) return false;
  const expectedRules = path.win32.resolve(repoRoot, 'tests', 'fixtures', 'v311-firestore.rules');
  const actualRules = path.win32.resolve(repoRoot, args[rulesIndex + 1]);
  if (actualRules.toLowerCase() !== expectedRules.toLowerCase()) return false;
  // Parent must be dead (orphan signature of firebase-tools exiting first).
  if (info.parentAlive !== false) return false;
  return true;
}

function main() {
  const killConfirmed = process.argv.includes('--kill-confirmed');
  const listeners = netstatListeners();
  const report = { checkedPorts: EMULATOR_PORTS, listeners, confirmedOrphans: [], unknownProcesses: [], killed: [] };

  for (const item of listeners) {
    const info = processInfo(item.pid);
    const entry = { port: item.port, pid: item.pid, info };
    if (isConfirmedOrphan(info)) {
      report.confirmedOrphans.push(entry);
      if (killConfirmed) {
        // V416: revalidate identity + PID immediately before killing, so a
        // recycled PID or vanished process is never targeted.
        const freshInfo = processInfo(item.pid);
        if (freshInfo && freshInfo.parentPid === info.parentPid && freshInfo.commandLine === info.commandLine && isConfirmedOrphan(freshInfo)) {
          try {
            execFileSync('taskkill', ['/PID', String(item.pid), '/F'], { encoding: 'utf8' });
            report.killed.push(entry.pid);
          } catch (error) {
            entry.killError = error.message;
          }
        } else {
          entry.killError = 'identity changed between check and kill; process left untouched';
          report.unknownProcesses.push(entry);
        }
      }
    } else {
      report.unknownProcesses.push(entry);
    }
  }

  console.log(JSON.stringify(report, null, 2));

  if (report.unknownProcesses.length > 0) {
    console.error('HUMAN_BLOCKER_PROCESS_IDENTITY: unknown process on emulator port; do not kill blindly.');
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
}

if (require.main === module) main();

module.exports = { netstatListeners, processInfo, isConfirmedOrphan, main, EMULATOR_PORTS, QA_PROJECT_ID, REPO_ROOT };
