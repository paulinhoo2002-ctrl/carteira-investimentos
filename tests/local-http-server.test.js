const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const { spawn } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

test('missing generated asset returns 404 without crashing the QA server', async () => {
  const child = spawn(process.execPath, ['tests/local-http-server.js', '--port', '0'], {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });

  try {
    const baseUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('QA server did not start')), 3000);
      child.stdout.on('data', () => {
        const line = stdout.split(/\r?\n/).find(value => value.startsWith('QA server listening: '));
        if (line) {
          clearTimeout(timeout);
          resolve(line.slice('QA server listening: '.length));
        }
      });
      child.once('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', code => {
        clearTimeout(timeout);
        reject(new Error(`QA server exited during startup (${code}): ${stderr}`));
      });
    });
    const missingUrl = new URL('/generated/missing.js', baseUrl);
    const response = await fetch(missingUrl);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), '');
    assert.equal(child.exitCode, null, 'QA server should remain available after a 404');

    const followupResponse = await fetch(new URL('/index.html', baseUrl));
    assert.equal(followupResponse.status, 200, 'QA server should serve a valid request after a 404');
    assert.match(await followupResponse.text(), /<html/i);
    assert.equal(child.exitCode, null, 'QA server should remain available after the follow-up request');
  } finally {
    if (child.exitCode === null) {
      await new Promise(resolve => {
        child.once('exit', resolve);
        child.kill();
      });
    }
  }
});

test('does not serve a sibling path whose name shares the document root prefix', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qa-static-root-'));
  const sibling = `${root}-outside`;
  await fs.mkdir(sibling);
  await fs.writeFile(path.join(sibling, 'marker.txt'), 'outside root');
  const child = spawn(process.execPath, [path.join(__dirname, 'local-http-server.js'), '--port', '0'], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });

  try {
    const baseUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('QA server did not start')), 3000);
      child.stdout.on('data', () => {
        const line = stdout.split(/\r?\n/).find(value => value.startsWith('QA server listening: '));
        if (line) {
          clearTimeout(timeout);
          resolve(line.slice('QA server listening: '.length));
        }
      });
      child.once('error', error => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('exit', code => {
        clearTimeout(timeout);
        reject(new Error(`QA server exited during startup (${code}): ${stderr}`));
      });
    });
    const traversalPath = `/%2e%2e%2f${encodeURIComponent(path.basename(sibling))}%2fmarker.txt`;
    const response = await fetch(new URL(traversalPath, baseUrl));
    assert.equal(response.status, 403);
    assert.equal(await response.text(), '');
  } finally {
    if (child.exitCode === null) {
      await new Promise(resolve => {
        child.once('exit', resolve);
        child.kill();
      });
    }
    await fs.rm(sibling, { recursive: true, force: true });
    await fs.rm(root, { recursive: true, force: true });
  }
});
