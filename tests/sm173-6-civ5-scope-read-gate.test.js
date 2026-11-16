'use strict';
// SM173.6B — leitura entre escopos: o civ5 só entra na memória exibida quando pertence à identidade atual.
// Escopo alheio = estado protegido (sem carteira, sem gravação, sem envio). Verificação estática do index.html.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const fnBody = (name) => {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} existe`);
  const end = html.indexOf('\n}\n', start);
  return html.slice(start, end + 3);
};

test('hydrate só carrega o civ5 depois do gate de escopo', () => {
  const body = fnBody('hydrateAuthorizedLocalState');
  const gate = body.indexOf('civ5Gate()');
  const load = body.indexOf('load();');
  assert.ok(gate >= 0 && load > gate, 'gate de escopo antes de load()');
  assert.match(body, /loadGate!=='ok'/);
  assert.match(body, /FB\.localPortfolioLoaded=false;\s*return false;/);
});

test('escopo alheio zera a carteira em memória antes de bloquear', () => {
  const body = fnBody('hydrateAuthorizedLocalState');
  assert.match(body, /S\.assets=\[\]; S\.wallets=\[\]; S\.aportes=\[\]; S\.proventos=\[\]; S\.rfEvents=\[\];/);
});

test('caminho de autenticação não libera acesso quando o civ5 está protegido', () => {
  const start = html.indexOf('FB.auth.onAuthStateChanged(async user=>{');
  const end = html.indexOf('if(!FB.authResolved){', start);
  const cb = html.slice(start, end);
  assert.match(cb, /hydrateAuthorizedLocalState\(\);\s*if\(FB\.accountMode==='REAL' && !FB\.localPortfolioLoaded\)\{\s*FB\.access\.allowed = false;\s*FB\.access\.reason = CIV5_PROTECTED_REASON;\s*render\(\);\s*return;/);
});

test('motivo de estado protegido não expõe identidades nem valores', () => {
  const m = /const CIV5_PROTECTED_REASON='([^']*)';/.exec(html);
  assert.ok(m, 'constante do motivo existe');
  assert.equal(/@|uid|UID|[0-9a-f]{20,}/i.test(m[1]), false);
});

test('gravação e envio continuam protegidos pelo mesmo gate (sem alteração)', () => {
  assert.match(fnBody('save'), /civ5Gate\(\)/);
  assert.match(html, /const civ5Status=civ5Gate\(\);\s*if\(civ5Status!=='ok'\)\{[\s\S]{0,300}?return \{pass:false,reason:civ5Status\};/);
});
