'use strict';
// SM173.6B — exceção QA explícita do guard: a conta proprietária definitiva pode entrar SOMENTE no projeto QA,
// com o UID autorizado pelas regras QA publicadas e e-mail verificado. Testes positivos e negativos.
// Nenhum UID ou e-mail real é literal aqui: o de produção é lido de firestore.rules; o QA vem de fixture sintética
// ou, se disponível localmente, do arquivo de regras publicado (SM173_QA_RULES; sem ele, o teste positivo real é pulado).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const guard = require('../scripts/homolog/guard');

const QA = guard.QA_PROJECT;
const PROD = guard.readOwnerIdentifiers();
const SYN_UID = 'SyntheticQaOwnerSm1736B01';
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sm173-6-qa-'));
const rulesText = (uid, extra = '') => `rules_version = '2';\nservice cloud.firestore { match /databases/{d}/documents {\n` +
  `  match /portfolios/{u} { allow read, write: if request.auth != null && request.auth.uid == "${uid}"${extra}; }\n} }\n`;
const writeRules = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };
const okRules = writeRules('ok.rules', rulesText(SYN_UID, ' && request.auth.token.email_verified == true'));
const okSha = sha(fs.readFileSync(okRules));

test('regra estrita preservada: conta de produção continua recusada sem exceção QA', () => {
  assert.throws(() => guard.validateIdentity(SYN_UID, PROD.email), /produção/);
  assert.throws(() => guard.validateIdentity(PROD.uid, 'outra@exemplo.com'), /produção/);
});

test('exceção: projeto diferente do QA é recusado antes de qualquer leitura', () => {
  assert.throws(() => guard.validateIdentity(SYN_UID, PROD.email, { projectId: 'carteira-de-investimento-16725', rulesPath: okRules }), /projeto diferente/);
  assert.throws(() => guard.validateIdentity(SYN_UID, PROD.email, { projectId: 'outro-projeto', rulesPath: okRules }), /projeto diferente/);
});

test('exceção: e-mail diferente do proprietário definitivo é recusado', () => {
  assert.throws(() => guard.validateIdentity(SYN_UID, 'outra@exemplo.com', { projectId: QA, rulesPath: okRules }), /conta proprietária definitiva/);
});

test('exceção: UID de produção não substitui o UID QA', () => {
  assert.throws(() => guard.validateIdentity(PROD.uid, PROD.email, { projectId: QA, rulesPath: okRules }), /UID de produção/);
});

test('exceção: regras QA com hash divergente das publicadas são recusadas (fail-closed)', () => {
  assert.throws(() => guard.validateIdentity(SYN_UID, PROD.email, { projectId: QA, rulesPath: okRules }), /SHA-256/);
});

test('readQaOwnerRules positivo: UID único e e-mail verificado com hash correto', () => {
  assert.deepEqual(guard.readQaOwnerRules(okRules, okSha), { uid: SYN_UID });
});

test('readQaOwnerRules negativos: sem e-mail verificado, com dois UIDs ou hash errado', () => {
  const noVerified = writeRules('noverified.rules', rulesText(SYN_UID));
  assert.throws(() => guard.readQaOwnerRules(noVerified, sha(fs.readFileSync(noVerified))), /e-mail verificado/);
  const two = writeRules('two.rules', rulesText(SYN_UID, ' && request.auth.token.email_verified == true') + rulesText('SyntheticOtherUidSm1736B02', ' && request.auth.token.email_verified == true'));
  assert.throws(() => guard.readQaOwnerRules(two, sha(fs.readFileSync(two))), /exatamente um UID/);
  assert.throws(() => guard.readQaOwnerRules(okRules, 'f'.repeat(64)), /SHA-256/);
  assert.throws(() => guard.readQaOwnerRules(path.join(tmp, 'inexistente.rules'), okSha), /ENOENT/);
});

test('regra estrita e exceção: formato de UID e e-mail continuam obrigatórios', () => {
  assert.throws(() => guard.validateIdentity('curto', PROD.email, { projectId: QA, rulesPath: okRules }), /UID sintético/);
  assert.throws(() => guard.validateIdentity(SYN_UID, 'sem-arroba', { projectId: QA, rulesPath: okRules }), /e-mail/);
});

// Teste positivo com as regras realmente publicadas no QA (somente se o arquivo local existir).
const REAL = process.env.SM173_QA_RULES || 'C:/Projetos/_mission-logs/sm173-3/qa-published-post-deploy.rules';
test('positivo real: conta proprietária no QA com UID publicado e hash das regras publicadas', { skip: !fs.existsSync(REAL) && 'regras QA publicadas ausentes localmente' }, () => {
  const realUid = guard.readQaOwnerRules(REAL).uid;
  assert.notEqual(realUid, PROD.uid);
  const r = guard.validateIdentity(realUid, PROD.email, { projectId: QA, rulesPath: REAL });
  assert.equal(r.qaException, true);
  assert.equal(r.email, PROD.email.toLowerCase());
  assert.throws(() => guard.validateIdentity(PROD.uid, PROD.email, { projectId: QA, rulesPath: REAL }), /UID de produção/);
});

// Distribuição: a exceção só relaxa o e-mail do proprietário; UID e projeto de produção continuam proibidos.
function fakeDist(html) {
  const dir = fs.mkdtempSync(path.join(tmp, 'dist-'));
  const idx = path.join(dir, 'index.html');
  fs.writeFileSync(idx, html);
  const manifestPath = dir + '.manifest.json';
  fs.writeFileSync(manifestPath, JSON.stringify({ sha: 'a'.repeat(40), files: [{ path: 'index.html', sha256: sha(fs.readFileSync(idx)) }] }));
  return { dir, manifestPath };
}
const baseHtml = (extra = '') => `<body>NÃO É A CARTEIRA DE PRODUÇÃO SHA aaaaaaaaaaaa\nprojectId: "${QA}"\nconst OWNER_FIREBASE_UID = '${SYN_UID}';\nconst OWNER_FIREBASE_EMAIL = '${PROD.email}';\napiKey: "KEYTEST"\n${extra}</body>`;
const expected = (dir, manifestPath, qaException) => ({ sha: 'a'.repeat(40), shortSha: 'aaaaaaaaaaaa', projectId: QA, uid: SYN_UID, email: PROD.email, cfg: { apiKey: 'KEYTEST' }, manifestPath, qaException });

test('distribuição com exceção QA aceita o e-mail do proprietário no QA', () => {
  const { dir, manifestPath } = fakeDist(baseHtml());
  assert.equal(guard.checkDistribution(dir, expected(dir, manifestPath, true)).ok, true);
});

test('distribuição sem exceção QA continua reprovando o e-mail de produção', () => {
  const { dir, manifestPath } = fakeDist(baseHtml());
  assert.throws(() => guard.checkDistribution(dir, expected(dir, manifestPath, false)), /produção/);
});

test('distribuição com exceção QA reprova UID de produção no HTML', () => {
  const { dir, manifestPath } = fakeDist(baseHtml(`<p>${PROD.uid}</p>`));
  assert.throws(() => guard.checkDistribution(dir, expected(dir, manifestPath, true)), /produção/);
});
