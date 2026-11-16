'use strict';
// SM185 — gera o catálogo local versionado de códigos B3 (b3-catalog.js) a partir do snapshot em data/b3-catalog/.
// Uso: node scripts/build-b3-catalog.js [caminho-do-snapshot]
// Atualização controlada: novo snapshot -> rodar este script -> revisar o diff -> testes de catálogo.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_SOURCE = path.join(ROOT, 'data', 'b3-catalog', 'source-2026-11-16.json');
const OUTPUT = path.join(ROOT, 'b3-catalog.js');
const CODE_FORMAT = /^[A-Z0-9]{4,7}$/;

function buildCatalog(source) {
  const rejected = [];
  const accepted = new Set();
  for (const raw of source.tickers || []) {
    const code = String(raw || '').trim().toUpperCase();
    // Formato de código B3 (letras + dígitos); sufixos como F (fracionário) e B são códigos válidos.
    if (CODE_FORMAT.test(code) && /[A-Z]/.test(code) && /\d/.test(code)) accepted.add(code);
    else rejected.push(String(raw));
  }
  return { tickers: [...accepted].sort(), rejected };
}

function render(source, catalog) {
  const meta = {
    version: `${source.capturedAt || 'sem-data'}-${catalog.tickers.length}`,
    source: source.source || 'desconhecida',
    capturedAt: source.capturedAt || '',
    count: catalog.tickers.length,
  };
  return [
    "'use strict';",
    '// Gerado por scripts/build-b3-catalog.js a partir de data/b3-catalog/. Não editar à mão.',
    '(function (root) {',
    `  const META = ${JSON.stringify(meta)};`,
    `  const TICKERS = new Set(${JSON.stringify(catalog.tickers)});`,
    '  root.B3Catalog = Object.freeze({',
    '    version: META.version,',
    '    source: META.source,',
    '    capturedAt: META.capturedAt,',
    '    count: META.count,',
    '    has(code) { return TICKERS.has(String(code || \'\').trim().toUpperCase()); },',
    '  });',
    "}(typeof globalThis === 'object' ? globalThis : this));",
    '',
  ].join('\n');
}

function main() {
  const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE;
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const catalog = buildCatalog(source);
  if (catalog.tickers.length === 0) throw new Error('catálogo vazio: abortado');
  fs.writeFileSync(OUTPUT, render(source, catalog));
  console.log(`b3-catalog.js: ${catalog.tickers.length} códigos; rejeitados: ${catalog.rejected.length}`);
  if (catalog.rejected.length) console.log('rejeitados:', catalog.rejected.join(', '));
}

if (require.main === module) main();

module.exports = { buildCatalog, render };
