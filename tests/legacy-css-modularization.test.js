const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');
const { readLegacyHtml } = require('./helpers/read-legacy-html.cjs');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const sharedCss = fs.readFileSync(path.join(root, 'legacy/css/responsive-layout.css'), 'utf8');
const compactCss = fs.readFileSync(path.join(root, 'legacy/css/dividends-compact.css'), 'utf8');
const head = html.slice(html.indexOf('<head'), html.indexOf('</head>'));
const links = [...head.matchAll(/<link\b(?=[^>]*\bdata-legacy-css\b)[^>]*\bhref="([^"]+)"[^>]*>/gi)];

test('legacy CSS is extracted into ordered external modules and pre-cached offline', () => {
  assert.ok(links.length >= 10, 'Expected named external CSS modules in the document head');
  assert.equal([...head.matchAll(/<style\b/gi)].length, 0, 'The main document should no longer embed screen CSS');
  assert.equal([...html.matchAll(/<style\b/gi)].length, 2, 'Only runtime-generated print document CSS remains as markup text');

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
  assert.deepEqual([...new Set(segments.map(({ block }) => block))], Array.from({ length: 27 }, (_, index) => index), 'Every original style block must be represented');
  assert.deepEqual(segments.map(({ block, part }) => [block, part]), segments.slice().sort((a, b) => a.block - b.block || a.part - b.part).map(({ block, part }) => [block, part]));

  const reconstructed = readLegacyHtml();
  const reconstructedHead = reconstructed.slice(reconstructed.indexOf('<head'), reconstructed.indexOf('</head>'));
  assert.equal([...reconstructedHead.matchAll(/<style\b/gi)].length, 27, 'Static tests can reconstruct original style block boundaries');
  assert.ok(reconstructedHead.includes('<style id="apple-pass-wave-1">'));
  assert.ok(sw.includes("'./legacy/js/ui/presentation.js'"), 'Service worker must pre-cache extracted presentation helpers');
  assert.ok(html.includes('<script src="legacy/js/ui/charts.js"></script>'), 'Extracted chart renderer must load from index.html');
  assert.ok(sw.includes("'./legacy/js/ui/charts.js'"), 'Service worker must pre-cache the chart renderer');
  assert.ok(html.includes('<script src="legacy/js/ui/portfolio-search.js"></script>'), 'Search renderer must load before application callers');
  assert.ok(sw.includes("'./legacy/js/ui/portfolio-search.js'"), 'Service worker must pre-cache the search renderer');
  assert.ok(html.includes('<script src="legacy/js/screens/settings.js"></script>'), 'Settings screen must load before application callers');
  assert.ok(sw.includes("'./legacy/js/screens/settings.js'"), 'Service worker must pre-cache the settings screen');
  assert.ok(html.includes('<script src="legacy/js/screens/dashboard-executive-kpis.js"></script>'), 'Dashboard KPI renderer must load before application callers');
  assert.ok(sw.includes("'./legacy/js/screens/dashboard-executive-kpis.js'"), 'Service worker must pre-cache the dashboard KPI renderer');
  assert.doesNotMatch(html, /function executiveKPIs\(data\)/, 'Dashboard KPI renderer must not remain inline');
  assert.doesNotMatch(html, /function settingsTab\(\)/, 'Settings renderer must not remain inline');
});

test('functional movement and backup guidance text stays readable on mobile', () => {
  assert.match(sharedCss, /\.note-pill\{font-size:12px/);
  assert.match(sharedCss, /\.quick-movement-preview-label\{font-size:12px/);
  assert.match(compactCss, /\.note-title p\{[^}]*font-size:12px/s);
  assert.match(compactCss, /\.note-pill\{font-size:12px/);
  assert.match(compactCss, /\.note-foot \.hint\{[^}]*font-size:12px/s);
  assert.match(compactCss, /\.backup-warning\{font-size:12px/);
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
