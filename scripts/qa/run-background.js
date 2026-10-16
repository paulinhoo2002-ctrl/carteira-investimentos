'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const runs = path.join(root, '.qa-state', 'background-runs');
const [mode, scriptArg, runDir] = process.argv.slice(2);

function resolveScript(arg) {
  const script = path.resolve(root, arg || '');
  if (!script.startsWith(root + path.sep) || !script.endsWith('.js') || !fs.statSync(script).isFile()) {
    throw new Error('QA script must be an existing .js file in this repository');
  }
  return script;
}

async function worker(script, dir) {
  let code = 1;
  try {
    const child = spawn(process.execPath, [script], {
      cwd: root,
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
    code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', value => resolve(value ?? 1));
    });
  } catch (error) {
    console.error(`QA script failed to start: ${error.message}`);
  } finally {
    fs.writeFileSync(path.join(dir, 'exit-code.txt'), `${code}\n`);
  }
  process.exitCode = code;
}

try {
  if (mode === '--worker') {
    worker(resolveScript(scriptArg), runDir).catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  } else {
    const script = resolveScript(mode);
    fs.mkdirSync(runs, { recursive: true });
    const dir = fs.mkdtempSync(path.join(runs, 'run-'));
    const out = fs.openSync(path.join(dir, 'stdout.log'), 'w');
    const err = fs.openSync(path.join(dir, 'stderr.log'), 'w');
    try {
      const child = spawn(process.execPath, [__filename, '--worker', script, dir], {
        cwd: root,
        detached: true,
        stdio: ['ignore', out, err],
        windowsHide: true,
      });
      child.once('error', error => console.error(`QA background launch failed: ${error.message}`));
      fs.writeFileSync(path.join(dir, 'pid.txt'), `${child.pid}\n`);
      child.unref();
      console.log(dir);
    } finally {
      fs.closeSync(out);
      fs.closeSync(err);
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
