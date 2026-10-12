const fs = require('node:fs');
const path = require('node:path');

function readLegacyHtml(indexPath = path.resolve(__dirname, '..', '..', 'index.html')) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const root = path.dirname(indexPath);
  const headStart = html.indexOf('<head');
  const headEnd = html.indexOf('</head>', headStart);
  const head = html.slice(headStart, headEnd);
  const links = [...head.matchAll(/<link\b(?=[^>]*\bdata-legacy-css\b)[^>]*\bhref="([^"]+)"[^>]*>/gi)];
  if (!links.length) return html;

  const segments = new Map();
  for (const [, href] of links) {
    const cssPath = path.resolve(root, href.replace(/^\.\//, ''));
    const css = fs.readFileSync(cssPath, 'utf8');
    const markers = [...css.matchAll(/\/\* LEGACY_STYLE_SEGMENT:(\d+):(\d+):attrs=([^*]*) \*\//g)];
    for (let index = 0; index < markers.length; index++) {
      const marker = markers[index];
      const start = marker.index + marker[0].length;
      const end = markers[index + 1]?.index ?? css.length;
      const block = Number(marker[1]);
      if (!segments.has(block)) segments.set(block, []);
      segments.get(block).push({ part: Number(marker[2]), attrs: marker[3].trim(), css: css.slice(start, end) });
    }
  }

  const restored = [...segments.entries()].sort(([a], [b]) => a - b).map((entry) => {
    const parts = entry[1].sort((a, b) => a.part - b.part);
    const attrs = parts[0].attrs ? ' ' + parts[0].attrs : '';
    return '<style' + attrs + '>' + parts.map(part => part.css).join('') + '</style>';
  }).join('\n');
  const first = links[0].index;
  const last = links[links.length - 1];
  const end = last.index + last[0].length;
  return html.slice(0, headStart + first) + restored + html.slice(headStart + end);
}

module.exports = { readLegacyHtml };
