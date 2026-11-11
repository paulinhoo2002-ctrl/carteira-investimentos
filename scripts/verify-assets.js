'use strict';
// Guarda de assets referenciados: garante que todo arquivo local citado por
// src/href no index.html existe no repositório (e, portanto, é entregue).
// Ignora URLs externas, data:/blob:, referências dinâmicas (template/JS) e
// hash-only. Query string e hash são removidos antes da checagem.

const fs = require('fs');
const path = require('path');

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;
const DYNAMIC = /[${}]|\+|`|'\s*\+|"\s*\+/;
const REF = /<(?:script|link|img|source|iframe)\b[^>]*?\s(?:src|href)\s*=\s*(["'])([^"']*)\1/gi;

function collectLocalRefs(html) {
  const refs = [];
  const skipped = [];
  let match;
  REF.lastIndex = 0;
  while ((match = REF.exec(html)) !== null) {
    const raw = match[2].trim();
    if (raw === '' || raw.startsWith('#')) continue;
    if (EXTERNAL.test(raw)) { skipped.push({ ref: raw, reason: 'externo' }); continue; }
    if (DYNAMIC.test(raw)) { skipped.push({ ref: raw, reason: 'dinâmico' }); continue; }
    refs.push(raw.split('#')[0].split('?')[0].replace(/^\.\//, '').replace(/^\//, ''));
  }
  return { refs: [...new Set(refs)], skipped };
}

function checkAssets(html, rootDir) {
  const { refs, skipped } = collectLocalRefs(html);
  const missing = refs.filter((ref) => !fs.existsSync(path.join(rootDir, ref)));
  return { checked: refs.length, missing, skipped };
}

function main() {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const result = checkAssets(html, root);
  if (result.missing.length > 0) {
    console.error('Asset guard FALHOU: ' + result.missing.length + ' arquivo(s) referenciado(s) pelo index.html não existem:');
    result.missing.forEach((m) => console.error('  - ' + m));
    console.error('Adicione o arquivo ao repositório (git add) ou corrija o caminho no HTML.');
    process.exit(1);
  }
  console.log('Asset guard OK: ' + result.checked + ' referências locais presentes, ' + result.skipped.length + ' dinâmicas/externas ignoradas.');
}

if (require.main === module) main();

module.exports = { checkAssets, collectLocalRefs };
