const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');
const { readLegacyHtml } = require('./helpers/read-legacy-html.cjs');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const head = html.slice(html.indexOf('<head'), html.indexOf('</head>'));
const links = [...head.matchAll(/<link\b(?=[^>]*\bdata-legacy-css\b)[^>]*\bhref="([^"]+)"[^>]*>/gi)];

test('legacy CSS is extracted into ordered external modules and pre-cached offline', () => {
  assert.ok(links.length >= 10, 'Expected named external CSS modules in the document head');
  assert.equal([...head.matchAll(/<style\b/gi)].length, 0, 'The main document should no longer embed screen CSS');

  const segments = [];
  for (const [, href] of links) {
    const cssPath = path.resolve(root, href.replace(/^\.\//, ''));
    assert.ok(cssPath.startsWith(path.join(root, 'legacy', 'css') + path.sep));
    assert.ok(fs.existsSync(cssPath), 'Missing linked stylesheet ' + href);
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.ok(css.trim().length > 0, 'Empty linked stylesheet ' + href);
    for (const match of css.matchAll(/LEGACY_STYLE_SEGMENT:(\d+):(\d+):attrs=([^*]*)\*\//g)) {
      segments.push({ block: Number(match[1]), part: Number(match[2]), attrs: match[3].trim(), href });
    }
    const relative = href.replace(/^\.\//, '');
    assert.ok(sw.includes("'./" + relative + "'"), 'Service worker must pre-cache ' + relative);
  }
  assert.deepEqual([...new Set(segments.map(({ block }) => block))], Array.from({ length: 22 }, (_, index) => index), 'Every original style block must be represented');
  assert.deepEqual(segments.map(({ block, part }) => [block, part]), segments.slice().sort((a, b) => a.block - b.block || a.part - b.part).map(({ block, part }) => [block, part]));

  const reconstructed = readLegacyHtml();
  const reconstructedHead = reconstructed.slice(reconstructed.indexOf('<head'), reconstructed.indexOf('</head>'));
  assert.equal([...reconstructedHead.matchAll(/<style\b/gi)].length, 22, 'Static tests can reconstruct original style block boundaries');
  assert.ok(reconstructedHead.includes('<style id="apple-pass-wave-1">'));
  assert.ok(sw.includes("'./legacy/js/ui/presentation.js'"), 'Service worker must pre-cache extracted presentation helpers');
});

test('local synthetic server serves extracted stylesheets with CSS MIME type', async () => {
  assert.ok(links.length > 0, 'The document must link at least one extracted stylesheet');
  const { server, url } = await startLocalHttpServer(root, 0, { syntheticQa: true });
  try {
    const cssHref = links[0][1].replace(/^\.\//, '');
    const response = await fetch(new URL('/' + cssHref, url));
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/css; charset=utf-8$/i);
    assert.ok((await response.text()).length > 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
