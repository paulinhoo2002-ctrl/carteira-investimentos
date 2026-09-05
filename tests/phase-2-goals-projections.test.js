const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('goals keep the official projection helper and disclose its assumptions', () => {
  assert.match(source, /const metaPatTime=estimateGoalMonths\(tC,metaPatValor,metaPatAporte,metaPatVar\)/);
  assert.match(source, /Prazo estimado com aporte mensal/);
  assert.match(source, /simulação baseada nas premissas cadastradas/);
});

test('goals distinguish projected income from realized history', () => {
  assert.match(source, /renda projetada\/mês continua sendo uma estimativa da carteira/);
  assert.match(source, /média 12M usa proventos já recebidos/);
  assert.match(source, /Renda projetada\/mês/);
});

test('projection clarification remains presentation-only', () => {
  const start = source.indexOf('const metaProjectionNote=');
  const end = source.indexOf('return`<div class="metas-shell">', start);
  const snippet = source.slice(start, end);
  assert.doesNotMatch(snippet, /save\(|localStorage|FinanceCore|S\.goals\s*=/);
});
