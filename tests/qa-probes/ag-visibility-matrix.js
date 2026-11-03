'use strict';
// Extrai a matriz de visibilidade (th/td) por viewport do probe ag-table.
const fs = require('node:fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
const blocks = raw.split(/===== viewport (\d+)px =====/).slice(1);
for (let i = 0; i < blocks.length; i += 2) {
  const w = blocks[i];
  const json = blocks[i + 1].trim();
  let snap; try { snap = JSON.parse(json); } catch { console.log(w + ' PARSE_FAIL'); continue; }
  if (snap.error) { console.log(w + ' ERROR ' + snap.error); continue; }
  const vis = snap.headers.map(h => `${h.idx}:${h.label}${h.thVisible ? '' : '[H]'}${h.tdVisible ? '' : '[T]'}`);
  console.log(`${w}px | ${vis.join(' | ')}`);
}
