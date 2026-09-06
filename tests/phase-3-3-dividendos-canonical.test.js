const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Dividendos mantém o contrato canônico, fontes oficiais e bloqueios visuais', () => {
  const source = read('index.html');
  const canon = read('docs/ai/VISUAL_CANON.md');
  const refs = read('docs/ai/VISUAL_REFERENCE_INDEX.md');

  assert.match(source, /function dividendExecutiveKpis\(\)/);
  for (const label of ['Recebido', 'Média mensal', 'Último mês', 'Projeção anual', 'Yield atual']) assert.match(source, new RegExp(label));
  assert.match(source, /passiveIncomeGoalStats\(\)/);
  assert.match(source, /function dividendAnnualMatrixData\(rows\)/);
  assert.match(source, /const monthNames=\['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'\]/);
  assert.match(source, /mat-future/);
  assert.match(source, /mat-absent/);
  assert.match(source, /mat-zero/);
  assert.match(source, /function dividendMonthlyTimeline\(rows=filteredDividendRows\(\)\)/);
  assert.match(source, /function canonDividendYearSummary\(rows\)/);
  for (const block of ['canon-div-history', 'canon-div-evolution', 'canon-div-top', 'canon-div-yearsum']) assert.match(source, new RegExp(`class="[^"]*${block}`));
  assert.match(source, /function setDividendYearFilter\(year\)/);
  assert.match(source, /onclick="exportBackup\(\)"/);
  assert.match(source, /Phase 3\.3: keep Dividendos visually faithful/);

  assert.match(canon, /CANONICAL_REFERENCE_DIVIDENDS=Refs\/visual-canon\/dividendos-canonical\.png/);
  assert.match(canon, /DIVIDENDOS_VISUAL=FROZEN/);
  assert.match(refs, /dividendos-canonical\.png/);
  assert.match(refs, /Classification: `PRIMARY_CANON`/);
});
