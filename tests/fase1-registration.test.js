'use strict';
// Proteção permanente: os testes da Fase 1 não podem existir "soltos". Todo teste da Fase 1 presente
// em tests/ precisa estar em `test:fase1` (ou ser a comparação histórica `test:fase1a-baseline`), e o
// script `test` precisa chamar `test:fase1` — que é o que o CI executa (`npm test`).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repo = path.join(__dirname, '..');
const scripts = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).scripts;
const listed = script => new Set((scripts[script] || '').match(/tests\/[\w.-]+\.test\.js/g) || []);

const PHASE1_PATTERNS = [/^fase1[\w-]*\.test\.js$/, /^api-yahoo-quote\.test\.js$/, /^csp-brapi-fallback\.browser\.test\.js$/, /^chrome-path-helper\.test\.js$/];
const phase1Files = fs.readdirSync(__dirname).filter(name => PHASE1_PATTERNS.some(pattern => pattern.test(name))).map(name => `tests/${name}`);

test('o script `test` (executado pelo CI) chama test:fase1', () => {
  assert.match(scripts.test, /(^|&&\s*)npm run test:fase1(\s|$)/);
});

test('todo teste da Fase 1 existente está registrado em test:fase1 (ou na comparação histórica)', () => {
  assert.ok(phase1Files.length >= 3, `testes da Fase 1 encontrados: ${phase1Files.join(', ')}`);
  const registered = new Set([...listed('test:fase1'), ...listed('test:fase1a-baseline')]);
  const missing = phase1Files.filter(file => !registered.has(file));
  assert.deepEqual(missing, [], `testes não registrados: ${missing.join(', ')}`);
});

test('a comparação histórica (origin/main) fica fora do npm test e dentro do verify:full', () => {
  assert.ok(listed('test:fase1a-baseline').has('tests/fase1a-financial-equivalence.test.js'));
  assert.ok(!listed('test:fase1').has('tests/fase1a-financial-equivalence.test.js'));
  const verify = fs.readFileSync(path.join(repo, 'scripts', 'verify.js'), 'utf8');
  assert.match(verify, /test:fase1a-baseline/);
  assert.match(verify, /test:fase1/);
});

test('verify (rápido) e verify:full existem e chamam o script de verificação', () => {
  assert.equal(scripts.verify, 'node scripts/verify.js');
  assert.equal(scripts['verify:full'], 'node scripts/verify.js --full');
});
