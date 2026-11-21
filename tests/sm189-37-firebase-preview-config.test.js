// SM189.37 — Preview usa Firebase QA isolado; produção permanece no domínio de produção.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const vercel = fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8');

function readConfig(name) {
  const marker = `const ${name} = {`;
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `${name} must exist`);
  const body = html.slice(start, html.indexOf('};', start));
  const out = {};
  for (const m of body.matchAll(/^\s*(\w+):\s*"([^"]*)"/gm)) out[m[1]] = m[2];
  return out;
}

const prod = readConfig('firebaseConfig');
const qa = readConfig('firebaseQaPreviewConfig');

const fnSrc = html.slice(html.indexOf('const FIREBASE_QA_PROJECT_ID'), html.indexOf('let FB = {'));

function selectFor(hostname) {
  // Código-fonte fixo do próprio index.html (sem dados externos); só o hostname é variável.
  const factory = new Function('firebaseConfig', 'firebaseQaPreviewConfig', 'location',
    `${fnSrc}\nreturn activeFirebaseConfig();`);
  return factory(prod, qa, { hostname });
}

test('produção mantém o projeto de produção intacto', () => {
  assert.equal(prod.projectId, 'carteira-de-investimento-16725');
  assert.equal(prod.authDomain, 'carteira-de-investimento-16725.firebaseapp.com');
});

test('configuração QA aponta apenas para o projeto v316 isolado', () => {
  assert.equal(qa.projectId, 'carteira-invest-qa-v316');
  assert.equal(qa.authDomain, 'carteira-invest-qa-v316.firebaseapp.com');
  assert.ok(qa.appId.startsWith('1:571302584960:web:'));
  assert.notEqual(qa.projectId, prod.projectId);
});

test('domínio de produção usa Firebase de produção', () => {
  assert.equal(selectFor('carteira-investimentos-delta.vercel.app'), prod);
});

test('somente o host do Preview QA usa o Firebase QA', () => {
  assert.equal(selectFor('carteira-homolog-c5785e6-jd01eb6md-paulinhoo2002-ctrls-projects.vercel.app'), qa);
  assert.equal(selectFor('carteira-homolog-c5785e6.vercel.app'), qa);
});

test('hosts desconhecidos falham fechados sem cair para produção', () => {
  assert.equal(selectFor('localhost'), null);
  assert.equal(selectFor(''), null);
  assert.equal(selectFor('exemplo.com.br'), null);
  assert.equal(selectFor('carteira-investimentos-git-sm189-paulinhoo2002-ctrls-projects.vercel.app'), null);
});

test('CSP libera apenas o authDomain QA exato em frame-src, sem curinga', () => {
  const frameSrc = html.match(/frame-src [^;"]+/)[0];
  assert.ok(frameSrc.includes('https://carteira-invest-qa-v316.firebaseapp.com'));
  assert.ok(!/\*/.test(frameSrc), 'frame-src não pode usar curinga');
  const headerFrames = vercel.match(/frame-src [^;"]+/g);
  assert.equal(headerFrames.length, 2);
  for (const f of headerFrames) assert.ok(f.includes('https://carteira-invest-qa-v316.firebaseapp.com'));
});
