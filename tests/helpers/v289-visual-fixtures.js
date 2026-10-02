const V289_VISUAL_SCENARIOS = Object.freeze([
  'baseline', 'no-data', 'unknown', 'partial', 'stale', 'valid-zero',
  'long-label-large-value', 'return-pair-mismatch', 'history-gap',
  'allocation-unknown', 'priority-zero', 'priority-one', 'priority-many', 'dense-reliability',
]);

function makeV289VisualFixture(scenario = 'baseline') {
  if (!V289_VISUAL_SCENARIOS.includes(scenario)) throw new RangeError(`Unknown V289 scenario: ${scenario}`);
  const assets = [
    { id:'QA_ASSET_A', ticker:'QAAA3', name:'Ativo sintético Alfa', product:'Ativo sintético Alfa', title:'Ativo sintético Alfa', type:'Ação', sector:'Setor sintético', qty:37, avg_price:113.27, current_price:128.43, dy:3.2 },
    { id:'QA_ASSET_B', ticker:'QAFI11', name:'Fundo sintético Beta', product:'Fundo sintético Beta', title:'Fundo sintético Beta', type:'FII', sector:'Setor sintético', qty:21, avg_price:82.13, current_price:87.91, dy:7.4 },
    { id:'QA_ASSET_RF', ticker:'QARF01', name:'Título sintético Gama', product:'Título sintético Gama', title:'Título sintético Gama', type:'Renda Fixa', subtype:'CDB', qty:1, avg_price:7311.29, current_price:7462.58, appliedValue:7311.29, currentValue:7462.58 },
  ];
  const aportes = [{ id:'QA_MOVE_A', date:'2026-05-06', ticker:'QAAA3', name:'Ativo sintético Alfa', product:'Ativo sintético Alfa', type:'Ação', asset_type:'Ação', sector:'Setor sintético', qty:37, price:113.27, operation:'compra', decision:'QA_MANUAL' }];
  const proventos = [{ id:'QA_INCOME_A', date:'2026-09-14', ticker:'QAFI11', assetName:'Fundo sintético Beta', type:'Rendimento', value:19.37, source:'QA_SYNTHETIC', note:'Evento sintético' }];
  const goals = { patrimonio:{target:0,aporte:0,annualVar:0}, ativos:{type:'Ação',ticker:'',aporte:0,annualVar:0,finalValue:0}, proventos:{types:['Ação','FII','ETF','Renda Fixa'],monthly:0} };
  const visual = {
    valueState:'AVAILABLE',
    returnPair:{ amount:318.47, percent:2.6, period:'12m', basis:'QA_BASIS_A', method:'QA_METHOD_A', sameBasis:true },
    history:[{date:'2026-06-01',value:10101.21},{date:'2026-07-01',value:10503.82},{date:'2026-08-01',value:10826.19}],
    allocationState:'AVAILABLE',
    priorities:[{id:'QA_PRIORITY_1',reason:'Fonte sintética sem atualização',impact:'Valor pode estar defasado',destination:'confiabilidade'}],
  };
  if (scenario === 'no-data') { assets.length = 0; aportes.length = 0; proventos.length = 0; visual.valueState = 'NO_DATA'; visual.history = []; visual.priorities = []; }
  if (scenario === 'unknown') { assets.length = 1; assets[0].current_price = null; visual.valueState = 'UNKNOWN'; }
  if (scenario === 'partial') { assets[1].current_price = null; visual.valueState = 'PARTIAL'; }
  if (scenario === 'stale') { visual.valueState = 'STALE'; assets[0].quoteUpdatedAt = '2026-01-01T12:00:00.000Z'; }
  if (scenario === 'valid-zero') { assets.length = 1; assets[0].current_price = 0; assets[0].currentValue = 0; }
  if (scenario === 'long-label-large-value') { assets[0].name = assets[0].product = assets[0].title = 'Ativo sintético Alfa com denominação extraordinariamente extensa para teste de leitura'; assets[0].qty = 1234567; assets[0].current_price = 98765.43; }
  if (scenario === 'return-pair-mismatch') { visual.returnPair.basis = 'QA_BASIS_B'; visual.returnPair.sameBasis = false; }
  if (scenario === 'history-gap') visual.history[1].value = null;
  if (scenario === 'allocation-unknown') { assets[1].current_price = null; visual.allocationState = 'UNKNOWN'; }
  if (scenario === 'priority-many') visual.priorities.push({id:'QA_PRIORITY_2',reason:'Cobertura sintética parcial',impact:'Comparação incompleta',destination:'confiabilidade'});
  if (scenario === 'dense-reliability') visual.priorities = Array.from({length:24},(_,i)=>({id:`QA_PRIORITY_${i+1}`,reason:`Questão sintética ${i+1}`,impact:'Cobertura incompleta',destination:'confiabilidade'}));

  if (scenario === 'priority-zero') {
    // Empty normal state produces no insights; no test hook controls the renderer.
    visual.priorities = [];
    assets.length = 0;
    aportes.length = 0;
    proventos.length = 0;
    visual.valueState = 'NO_DATA';
  }
  if (scenario === 'priority-one') {
    // A synthetic monthly income goal produces one real goal-gap insight.
    assets.length = 0;
    aportes.length = 0;
    proventos.length = 0;
    goals.proventos.monthly = 1200;
    visual.priorities = [{id:'QA_PRIORITY_1',reason:'Meta sintética sem renda recebida',impact:'Renda abaixo da meta',destination:'metas'}];
  }
  return { scenario, wallet:{id:'QA_WALLET_01',name:'Conta sintética'}, assets, aportes, proventos, rfEvents:[], goals, divGoal:0, lastUpdate: scenario === 'stale' ? '2026-01-01T12:00:00.000Z' : '2026-10-01T12:00:00.000Z', visual };
}

async function applyV289VisualFixture(page, scenario = 'baseline') {
  const url = new URL(page.url());
  if (!['127.0.0.1','localhost'].includes(url.hostname) || url.searchParams.get('testMode') !== '1') throw new Error('V289 fixture requires local test mode');
  const fixture = makeV289VisualFixture(scenario);
  await page.evaluate(data => {
    if (window.__LOCAL_TEST_MODE__ !== true || typeof S === 'undefined' || typeof render !== 'function') throw new Error('V289 local test mode runtime unavailable');
    const copy = value => JSON.parse(JSON.stringify(value));
    S.assets = copy(data.assets); S.aportes = copy(data.aportes); S.proventos = copy(data.proventos); S.rfEvents = copy(data.rfEvents); S.quotes = {};
    S.wallets = [{ ...copy(data.wallet), assets:copy(data.assets), aportes:copy(data.aportes), proventos:copy(data.proventos), rfEvents:copy(data.rfEvents), goals:copy(data.goals), divGoal:data.divGoal }];
    S.activeWalletId = data.wallet.id;
    S.goals = copy(data.goals); S.divGoal = data.divGoal;
    S.lastUpdate = new Date(data.lastUpdate);
    S.tab = 'dashboard'; S.hideValues = false;
    window.__V289_VISUAL_SCENARIO__ = copy(data.visual);
    const alias = () => document.querySelectorAll('.side-brand-sub').forEach(node => {
      const avatar = node.querySelector('.side-avatar');
      if (avatar && avatar.textContent !== 'QA') avatar.textContent = 'QA';
      for (const child of node.childNodes) if (child.nodeType === Node.TEXT_NODE && child.textContent !== ' Conta sintética') child.textContent = ' Conta sintética';
    });
    if (!window.__V289_ALIAS_OBSERVER__) {
      window.__V289_ALIAS_OBSERVER__ = new MutationObserver(alias);
      window.__V289_ALIAS_OBSERVER__.observe(document.getElementById('root'), {childList:true,subtree:true});
    }
    render(); alias();
  }, fixture);
  return fixture;
}

module.exports = { V289_VISUAL_SCENARIOS, makeV289VisualFixture, applyV289VisualFixture };
