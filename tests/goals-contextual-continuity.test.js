import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const metasStart = source.indexOf('function metasTab()');
const metasEnd = source.indexOf('\nfunction rentabilidadeTab()', metasStart);
const metas = source.slice(metasStart, metasEnd);
const passiveStart = source.indexOf('function passiveIncomeGoalBlock');
const passiveEnd = source.indexOf('\nfunction proventoAuditMonthKey', passiveStart);
const passive = source.slice(passiveStart, passiveEnd);

test('goal blocks expose contextual navigation without financial prefill', () => {
  assert.match(metas, /go\('aportes'\)/);
  assert.match(metas, />Registrar aporte</);
  assert.match(passive, /go\('dividendos'\)/);
  assert.match(passive, />Ver Dividendos</);
  assert.match(metas, /go\('ajudar'\)/);
  assert.match(metas, />Ver Rebalancear</);
  assert.doesNotMatch(metas, /go\('(aportes|dividendos|ajudar)'\)\s*[,;]/);
});

test('contextual actions remain limited to one action per goal block', () => {
  const patrimony = metas.slice(metas.indexOf('Meta de Patrimônio'), metas.indexOf('Distribuição da carteira'));
  const allocation = metas.slice(metas.indexOf('Distribuição da carteira'));
  assert.equal((patrimony.match(/Registrar aporte/g) || []).length, 1);
  assert.equal((passive.match(/Ver Dividendos/g) || []).length, 1);
  assert.equal((allocation.match(/Ver Rebalancear/g) || []).length, 1);
});

test('feature does not touch protected financial or persistence modules', () => {
  assert.doesNotMatch(metas + passive, /finance-core\.js|persistence-core\.js|localStorage|indexedDB|save\(/i);
});
