import { test } from 'node:test';
import { strict as assert } from 'node:assert';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Contrato: CSS do Google Fonts é dinâmico (varia por User-Agent e ao longo do tempo).
// SRI (integrity) nesse recurso é inviável: bloqueia fontes válidas e quebra o app.
// O controle real é o allowlist CSP style-src (vercel.json + meta).
// Aqui garantimos que nenhum integrity quebrado volte a ser inserido em links de fontes.
// Este app usa fonte de sistema (-apple-system, Segoe UI), NÃO Google Fonts.
// Se no futuro houver links de fonts.googleapis.com, as asserções abaixo entram em vigor.
test('Google Fonts stylesheet links do NOT carry integrity attributes (infeasible SRI)', () => {
  const fontLinks = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*fonts\.googleapis\.com[^>]*>/g) || [];
  // Este app não usa Google Fonts; se houver links no futuro, nenhum deve ter integrity
  for (const link of fontLinks) {
    assert.equal(link.includes('integrity='), false, `Google Fonts link must not use integrity (infeasible): ${link.slice(0, 80)}...`);
  }
});

test('Google Fonts stylesheet links remain allowlisted in CSP style-src (meta)', () => {
  const metaCsp = (html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  // Se houver links de Google Fonts no HTML, o meta CSP deve permitir fonts.googleapis.com em style-src
  const hasGoogleFontsLinks = html.includes('fonts.googleapis.com');
  if (hasGoogleFontsLinks) {
    assert.match(metaCsp, /style-src[^;]*fonts\.googleapis\.com/);
  }
});

test('XLSX lazy-load script keeps its SRI hash (static CDN resource)', () => {
  assert.match(html, /cdn\.jsdelivr\.net[\s\S]{0,200}?integrity=['"]sha384-[A-Za-z0-9+/=]+['"]/);
});
