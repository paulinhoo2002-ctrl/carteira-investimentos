const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const fixedNow = new Date('2026-10-08T12:00:00Z');
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : [fixedNow])); } static now() { return fixedNow.getTime(); } }
function runtime(rows, coverage = {}) {
  const context = {
    Date: FixedDate,
    globalThis: { DividendIntelligence: { classifyIncomeState: row => row.state || 'PAID' } },
    S: { divGoal: 1000, goals: { proventos: { monthly: 1000 } } },
    dividendPremiumRows: () => rows,
    passiveIncomeCombinedRows: () => rows,
    passiveIncomeTopPayers: () => [],
    passiveIncomeGoalTarget() { return 1000; },
    passiveIncomeMonthKey: date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,
    passiveIncomeRollingMonthKeys(base, count) { const d = new Date(base.getFullYear(), base.getMonth(), 1); return Array.from({length:count}, (_,i) => { const m = new Date(d.getFullYear(), d.getMonth()-count+1+i, 1); return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}`; }); },
    passiveIncomeTopPayers: () => [],
  };
  vm.createContext(context);
  const from = source.indexOf('function dividendAnnualMatrixData(');
  const to = source.indexOf('function dividendAnnualMatrixToggleButton(');
  vm.runInContext(source.slice(from, to), context);
  const statsStart = source.indexOf('function passiveIncomeGoalStats(');
  const statsEnd = source.indexOf('function passiveIncomeGoalBlock(', statsStart);
  vm.runInContext(source.slice(statsStart, statsEnd), context);
  const dashboardIncomeStart = source.lastIndexOf('function dashboardIncomePanel(');
  const dashboardIncomeEnd = source.indexOf('function dashboardReceiptsPanel(', dashboardIncomeStart);
  vm.runInContext(source.slice(dashboardIncomeStart, dashboardIncomeEnd), context);
  const dashboardGoalsStart = source.indexOf('function dashboardFinancialGoalsPanel(');
  const dashboardGoalsEnd = source.indexOf('function setDashboardHighlightsTab(', dashboardGoalsStart);
  if (dashboardGoalsEnd > dashboardGoalsStart) vm.runInContext(source.slice(dashboardGoalsStart, dashboardGoalsEnd), context);
  context.coverage = coverage;
  context.passiveIncomeValue = value => value == null || !Number.isFinite(Number(value)) ? '—' : `R$ ${Number(value).toFixed(2)}`;
  context.passiveIncomeMonthSummary = key => ({ month:key, total:null, count:0, coverage:'UNKNOWN' });
  context.dashboardMetricIcon = () => '';
  context.dashboardMetricCard = (...args) => args.join(' ');
  context.esc = value => String(value ?? '');
  context.fmt = value => `R$ ${Number(value).toFixed(2)}`;
  context.normalizeGoals = () => ({ patrimonio:{target:0}, proventos:{monthly:1000} });
  context.goalProgressMetrics = (current,target) => ({ hasCurrent:current!=null, hasTarget:target>0, current, target, percent:current==null?null:current/target*100, barPercent:current==null?0:Math.min(100,current/target*100), missing:current==null?null:Math.max(0,target-current), excess:null, reached:current!=null&&current>=target });
  context.financialGoalsTone = metrics => metrics?.hasCurrent?'ok':'muted';
  context.financialGoalsBar = () => '';
  return context;
}
const complete = { state:'COMPLETE', fullMonthConfirmed:true, source:'QA_SYNTHETIC' };
const keys = ['2025-11','2025-12','2026-01','2026-02','2026-03','2026-04','2026-05','2026-06','2026-07','2026-08','2026-09','2026-10'];
const covered = count => Object.fromEntries(keys.slice(0,count).map(key => [key, complete]));
const row = (monthKey,value,state='PAID') => ({ monthKey, value, state, dt:new FixedDate(`${monthKey}-15T12:00:00Z`) });

test('12 months complete: average and goal progress are confirmed', () => {
  const ctx = runtime(keys.map(k => row(k, 100)), covered(12));
  const stats = ctx.passiveIncomeGoalStats(ctx.coverage);
  assert.equal(stats.monthlyAvg, 100);
  assert.equal(stats.monthlyAverageStatus, 'COMPLETE');
  assert.equal(stats.percent, 10);
  assert.equal(stats.annualProjection, 1200);
});
test('8 complete and 4 unknown: average uses only complete months, goal progress stays uncertified', () => {
  const ctx = runtime(keys.slice(0,8).map(k => row(k, 100)), covered(8));
  const stats = ctx.passiveIncomeGoalStats(ctx.coverage);
  assert.equal(stats.monthlyAvg, 100);
  assert.equal(stats.monthlyAverageStatus, 'PARTIAL');
  assert.equal(stats.completeMonthCount, 8);
  assert.equal(stats.percent, null);
  assert.equal(stats.missing, null);
  assert.equal(stats.annualProjection, null);
  assert.equal(Number.isNaN(stats.monthlyAvg), false);
  assert.equal(Number.isFinite(stats.percent), false);
});
test('no complete months: empty months and current month remain unavailable', () => {
  const stats = runtime([]).passiveIncomeGoalStats();
  assert.equal(stats.monthlyAvg, null);
  assert.equal(stats.percent, null);
  assert.equal(stats.currentMonthTotal, null);
  assert.equal(stats.currentMonthCoverage, 'UNKNOWN');
  assert.ok(stats.byMonth.every(month => month.total === null));
});
test('complete empty month is confirmed zero; unknown and partial empty months are not', () => {
  const ctx = runtime([],{ '2026-08':complete, '2026-09':{state:'PARTIAL'} });
  const stats=ctx.passiveIncomeGoalStats(ctx.coverage);
  assert.equal(stats.byMonth.find(m=>m.key==='2026-08').total,0);
  assert.equal(stats.byMonth.find(m=>m.key==='2026-09').total,null);
  assert.equal(stats.byMonth.find(m=>m.key==='2026-10').total,null);
});
test('current month received subtotal remains explicitly partial without full coverage', () => {
  const stats=runtime([row('2026-10',250)]).passiveIncomeGoalStats();
  assert.equal(stats.currentMonthTotal,250);
  assert.equal(stats.currentMonthCoverage,'PARTIAL');
  assert.equal(stats.currentMonthCount,1);
});
test('announced and expected entries do not contribute to received totals', () => {
  const stats=runtime([row('2026-10',250),row('2026-10',900,'EXPECTED'),row('2026-09',700,'DECLARED')]).passiveIncomeGoalStats();
  assert.equal(stats.currentMonthTotal,250);
  assert.equal(stats.total12,250);
  assert.equal(stats.monthlyAvg,null);
  assert.ok(Number.isFinite(stats.currentMonthTotal));
  assert.equal(Number.isNaN(stats.percent),false);
});
test('Dashboard income panel preserves unknown month and average instead of rendering zero', () => {
  const ctx=runtime([]);
  ctx.passiveIncomeGoalStats=()=>({target:1000,monthlyAvg:null,monthlyAverageStatus:'UNKNOWN',completeMonthCount:0});
  const html=ctx.dashboardIncomePanel({income:ctx.passiveIncomeGoalStats(),recent:{month:'2026-10',total:null,count:0,coverage:'UNKNOWN'}});
  assert.match(html,/Cobertura desconhecida/);
  assert.match(html,/Meses completos: 0\/12/);
  assert.match(html,/Indisponível · exige 12 meses completos/);
  assert.doesNotMatch(html,/R\$ 0\.00/);
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});
test('Dashboard goal card refuses progress when current month coverage is unknown', () => {
  const ctx=runtime([]);
  ctx.passiveIncomeGoalStats=()=>({monthlyAvg:null,monthlyAverageStatus:'UNKNOWN',completeMonthCount:0});
  const html=ctx.dashboardFinancialGoalsPanel({financialGoals:{hasPortfolioData:false,currentIncome:null,currentIncomeCoverage:'UNKNOWN',currentIncomeCount:0,currentMonthGroup:null,historySummary:{monthCount:0},goals:{},portfolioCurrent:null}});
  assert.match(html,/Cobertura mensal não confirmada/);
  assert.match(html,/Progresso indisponível sem cobertura completa do mês/);
  assert.doesNotMatch(html,/R\$ 0\.00 recebidos neste mês/);
  assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});
test('Metas screen gates progress on a complete 12-month average', () => {
  assert.ok(source.includes("passiveGoal?.monthlyAverageStatus==='COMPLETE'"));
  assert.ok(source.includes('progresso indisponível · cobertura ${passiveGoal.completeMonthCount}/12'));
  assert.ok(source.includes('passiveIncomeValue(passiveGoal.monthlyAvg)'));
});

test('income analysis does not claim goal achievement without certified coverage', () => {
  const context = {
    passiveIncomeGoalStats: () => ({
      hasData: true,
      target: 1000,
      total12: 250,
      monthlyAvg: null,
      monthlyAverageStatus: 'PARTIAL',
      completeMonthCount: 8,
      missing: null,
      topPayers: [],
    }),
    proventoHistoricoOficial: () => ({ summary: { monthCount: 2 } }),
    proventoResumoPorAtivo: () => [],
    passiveIncomeValue: () => '—',
    fmt: value => `R$ ${value}`,
  };
  vm.createContext(context);
  const start = source.indexOf('function generateIncomeAnalysis(){');
  const end = source.indexOf('function generateRebalanceAnalysis(){', start);
  vm.runInContext(source.slice(start, end), context);

  const result = context.generateIncomeAnalysis();
  assert.ok(result.warnings.some(message => message.includes('Progresso da meta indisponível')));
  assert.ok(result.priority.includes('cobertura'));
  assert.ok(result.warnings.every(message => !message.includes('Meta alcançada ou superada')));
});
