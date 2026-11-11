// Verificador de assets locais referenciados pelo index.html.
// Garante que todo <script src="arquivo.js"> local exista no disco antes do build.
// Diferencia recursos externos (http/https/CDN) e dinâmicos (gerados em tempo de execução).
// Falha com mensagem explicativa quando um asset local está ausente.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const HTML = path.join(ROOT, 'index.html');

// Padrões que indicam recurso externo ou dinâmico (não verificado).
const EXTERNAL_PATTERNS = [
  /^https?:\/\//i,           // URL absoluta
  /^cdn\./i,                 // CDN
  /^data:/i,                 // Data URI
  /^blob:/i,                 // Blob URI
  /\{\{.*\}\}/,              // Template dinâmico
  /<%.*%>/,                  // Template EJS-like
];

// Arquivos que são gerados dinamicamente pelo build (não precisam existir antes).
const DYNAMIC_GENERATED = new Set([
  'sw.js',                   // Service worker pode ser injetado pelo build
]);

function extractLocalScriptSrcs(htmlContent) {
  const srcs = [];
  const regex = /<script\s+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(htmlContent)) !== null) {
    srcs.push(match[1]);
  }
  return srcs;
}

function isExternalOrDynamic(src) {
  return EXTERNAL_PATTERNS.some(p => p.test(src)) || DYNAMIC_GENERATED.has(src);
}

function verifyLocalAssets({ htmlFile = HTML, root = ROOT, failOnMissing = true } = {}) {
  if (!fs.existsSync(htmlFile)) {
    throw new Error(`Asset guard: HTML file not found: ${htmlFile}`);
  }

  const htmlContent = fs.readFileSync(htmlFile, 'utf8');
  const allSrcs = extractLocalScriptSrcs(htmlContent);

  const localSrcs = allSrcs.filter(src => !isExternalOrDynamic(src));
  const missing = [];
  const present = [];

  for (const src of localSrcs) {
    // Remove query strings / fragments used for cache-busting before checking disk.
    const cleanSrc = src.replace(/[?#].*$/, '');
    const fullPath = path.join(root, cleanSrc);
    if (fs.existsSync(fullPath)) {
      present.push(src);
    } else {
      missing.push(src);
    }
  }

  const result = {
    total: allSrcs.length,
    externalOrDynamic: allSrcs.length - localSrcs.length,
    local: localSrcs.length,
    present,
    missing,
    ok: missing.length === 0,
  };

  if (!result.ok && failOnMissing) {
    const missingList = missing.map(m => `  - ${m}`).join('\n');
    throw new Error(
      `Asset guard: ${missing.length} local script(s) referenced in ${htmlFile} are missing on disk:\n${missingList}\n` +
      `Ensure these files exist before building, or mark them as dynamic/generated.`
    );
  }

  return result;
}

if (require.main === module) {
  const result = verifyLocalAssets();
  console.log(
    `Asset guard OK: ${result.local} local script(s) verified, ` +
    `${result.externalOrDynamic} external/dynamic skipped, ${result.missing} missing.`
  );
  process.exit(result.ok ? 0 : 1);
}

module.exports = { verifyLocalAssets, extractLocalScriptSrcs, isExternalOrDynamic };
