'use strict';
// Extrai do probe: largura da tabela, scrollWidth e largura/minWidth por coluna.
const fs = require('node:fs');
const raw = fs.readFileSync(process.argv[2], 'utf8');
const parts = raw.split(/===== viewport (\d+)px =====/);
for (let i = 1; i < parts.length; i += 2) {
  const j = JSON.parse(parts[i + 1].trim());
  console.log(`${parts[i]}px | w=${j.tableWidth} scroll=${j.scrollWidth} | ` +
    j.headers.map(h => `${h.idx}:${h.width}px/${h.minWidth}`).join(' '));
}
