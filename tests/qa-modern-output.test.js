'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');

async function digestTree(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return (await Promise.all(entries.sort((a, b) => a.name.localeCompare(b.name)).map(async entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? digestTree(file) : [createHash('sha256').update(await fs.readFile(file)).digest('hex')];
  }))).flat();
}

test('real QA build emits every plugin artifact in isolated output and preserves modern/dist', async () => {
  const root = path.resolve(__dirname, '..');
  const protectedDir = path.join(root, 'modern/dist');
  const before = await digestTree(protectedDir);
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'legacy-modern-build-'));
  try {
    const { build } = await import('vite');
    await build({ configFile: path.join(root, 'modern/vite.qa.config.ts'), build: { outDir: output, emptyOutDir: false } });
    for (const file of ['host.html', 'index.html', 'assets/host-bootstrap.js', 'active-wallet-host.css', 'readonly-report-page-contract.js']) {
      assert.ok((await fs.stat(path.join(output, file))).size > 0, file + ' must be emitted');
    }
    assert.deepEqual(await digestTree(protectedDir), before, 'QA build must not touch protected output');
  } finally {
    await fs.rm(output, { recursive: true, force: true });
  }
});
