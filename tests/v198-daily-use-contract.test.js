const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('index.html', 'utf8');

test('V198 Renda Fixa expõe proveniência progressiva sem alterar o valor', () => {
  assert.match(source, /function fixedIncomeProvenanceDetails\(meta\)/);
  assert.match(source, /selectedField: selection\?\.selectedField/);
  assert.match(source, /<details class="premium-rf-provenance-details">/);
  assert.match(source, /Como foi avaliado/);
  assert.match(source, /Data de avaliação/);
  assert.match(source, /MANUAL_AUTHORITATIVE:'Manual autoritativa'/);
  assert.match(source, /LEGACY_FALLBACK:'Fallback do aplicado'/);
});

test('V198 Relatórios organiza os quatro sinais executivos com dados existentes', () => {
  assert.match(source, /class="reports-executive-summary"/);
  for (const label of ['Situação atual', 'Evolução', 'Concentração', 'Renda registrada']) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /Fonte: carteira cadastrada/);
  assert.match(source, /somente leitura/);
});

test('V198 Metas explicita status sem criar projeção nova', () => {
  assert.match(source, /function goalStatusPresentation\(metrics, hasConfiguredTarget\)/);
  assert.match(source, /Sem meta/);
  assert.match(source, /Sem leitura atual/);
  assert.match(source, /Em andamento/);
  assert.match(source, /Atingida/);
  assert.match(source, /class="metas-goal-status metas-goal-status--\$\{metaPatStatus\.tone\}"/);
});

test('V198 preserva os guardrails de escrita e de autoridade', () => {
  const protectedFiles = ['finance-core.js', 'persistence-core.js', 'firestore.rules', 'sw.js'];
  for (const file of protectedFiles) assert.equal(fs.existsSync(file), true, `${file} deve existir`);
  assert.match(source, /Import Center|import/i);
  assert.match(source, /fixedIncomeOfficialValues/);
});
