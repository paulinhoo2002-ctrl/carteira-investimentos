// Regression: isActiveWalletHostMode preview-hostname guard must accept
// Vercel preview hosts whose team slug contains hyphens (e.g.
// paulinhoo2002-ctrls-projects) while still excluding production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');

function extractGuardRegex(source) {
  const m = source.match(/const isVercelPreview = (\/.*\/)\.test\(location\.hostname\)/);
  assert.ok(m, 'isVercelPreview guard must exist');
  // eslint-disable-next-line no-eval
  return eval(m[1]);
}

test('preview hostname guard accepts hyphenated team slugs and rejects production', () => {
  const indexHtml = read('index.html');
  const hostTsx = read('modern/src/host.tsx');

  for (const source of [indexHtml, hostTsx]) {
    const re = extractGuardRegex(source);

    // preview hosts (real deployment shapes, including hyphenated team slug)
    assert.equal(re.test('carteira-investimentos-6mxei3aqk-paulinhoo2002-ctrls-projects.vercel.app'), true);
    assert.equal(re.test('carteira-investimentos-eafuifhit-paulinhoo2002-ctrls-projects.vercel.app'), true);
    assert.equal(re.test('carteira-investimentos-ghnhe0kyf-paulinhoo2002-ctrls-projects.vercel.app'), true);
    // legacy 2-segment shape still accepted
    assert.equal(re.test('carteira-investimentos-abc123-someuser.vercel.app'), true);
    // production remains excluded
    assert.equal(re.test('carteira-investimentos-delta.vercel.app'), false);
    // arbitrary hosts excluded
    assert.equal(re.test('example.com'), false);
    assert.equal(re.test('evil-carteira-investimentos-abc-xyz.vercel.app'), false);
  }
});