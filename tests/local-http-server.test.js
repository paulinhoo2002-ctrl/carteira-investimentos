const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const { spawn } = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const { startLocalHttpServer, isUnsafeChromePort } = require('./local-http-server');

// Windows starts its ephemeral port range at 1024, so listen(0) can hand the
// shared QA harness a port Chromium refuses to navigate to (net::ERR_UNSAFE_PORT),
// breaking every browser test through no fault of the product code.
test('harness never allocates a Chromium-blocked ephemeral port', async () => {
  assert.equal(typeof isUnsafeChromePort, 'function', 'harness must expose the unsafe-port guard');
  for (const blocked of [1, 23, 25, 135, 465, 554, 2049, 3659, 4045, 5060, 6000, 6666, 6697]) {
    assert.equal(isUnsafeChromePort(blocked), true, `port ${blocked} must be treated as unsafe`);
  }
  for (const safe of [0, 80, 443, 4173, 8080, 9222, 59638]) {
    assert.equal(isUnsafeChromePort(safe), false, `port ${safe} must be treated as safe`);
  }
  const harness = await startLocalHttpServer(path.join(__dirname, '..'), 0, { syntheticQa: false });
  try {
    const port = Number(new URL(harness.url).port);
    assert.equal(isUnsafeChromePort(port), false, `allocated port ${port} must be browser-safe`);
  } finally {
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
});

test('missing generated asset returns 404 without crashing the QA server', async () => {
  const child = spawn(process.execPath, ['tests/local-http-server.js', '--port', '0', '--synthetic-qa'], {
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
    const html = await followupResponse.text();
    assert.match(html, /<html/i);
    assert.match(html, /Object\.defineProperty\(window,'__LOCAL_QA_RUNTIME__',\{value:'local-synthetic-v1',writable:false,configurable:false\}\)/);
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

test('Yahoo quote requests in the static QA harness receive only an empty synthetic response', async () => {
  const { startLocalHttpServer } = require('./local-http-server');
  const harness = await startLocalHttpServer(path.join(__dirname, '..'));
  try {
    const response = await fetch(new URL('/api/yahoo-quote?symbols=petr4,vale3', harness.url));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      source: 'synthetic-qa-empty', requested: ['PETR4', 'VALE3'], count: 0, results: [],
    });
  } finally {
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
});

test('runtime marker is server-controlled and absent unless synthetic QA was explicitly started', async () => {
  const { startLocalHttpServer } = require('./local-http-server');
  const root = path.join(__dirname, '..');
  const qa = await startLocalHttpServer(root, 0, { syntheticQa: true });
  const ordinary = await startLocalHttpServer(root, 0, { syntheticQa: false });
  try {
    assert.equal(qa.server.address().address, '127.0.0.1');
    const qaResponse = await fetch(qa.url);
    assert.match(await qaResponse.text(), /Object\.defineProperty\(window,'__LOCAL_QA_RUNTIME__',\{value:'local-synthetic-v1',writable:false,configurable:false\}\)/);

    const ordinaryResponse = await fetch(`${ordinary.url}&qaRuntime=1`, {
      headers: { 'x-local-qa-runtime': '1' },
    });
    const ordinaryHtml = await ordinaryResponse.text();
    assert.doesNotMatch(ordinaryHtml, /__LOCAL_QA_RUNTIME__/);
  } finally {
    for (const harness of [qa, ordinary]) {
      harness.server.closeAllConnections?.();
      await new Promise(resolve => harness.server.close(resolve));
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
