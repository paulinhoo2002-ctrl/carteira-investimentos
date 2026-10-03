const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Dividendos mantém o contrato canônico, fontes oficiais e bloqueios visuais', () => {
  const source = read('index.html');
  const canon = read('docs/ai/VISUAL_CANON.md');
  const refs = read('Refs/visual-canon/CANON_INDEX.md');

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
  assert.match(source, /class="dividend-calendar-primary"/);
  assert.match(source, /class="dividend-secondary-disclosure"/);
  assert.match(source, /aria-label="Modos de Dividendos"/);
  assert.match(source, /\['overview','Calendário'\]/);
  assert.match(source, /\['timeline','Evolução'\]/);
  assert.match(source, /\['monthly','Histórico'\]/);
  assert.match(source, /function setDividendYearFilter\(year\)/);
  assert.match(source, /onclick="exportBackup\(\)"/);
  assert.match(source, /Renda recebida/);

  assert.match(canon, /VISUAL_DIRECTION=PREMIUM_DARK_EXECUTIVE/);
  assert.match(canon, /DIVIDENDOS/);
  assert.match(refs, /No image is currently asserted as a public canonical asset/);
  assert.match(refs, /synthetic, independently/);
  assert.doesNotMatch(refs, /\.png|SHA-256/i);
});
