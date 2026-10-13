// TOAST
// ══════════════════════════════════════
let _toastTimer=null;
function toast(msg, cor='#6ee7b7'){
  const el=document.getElementById('toast-area');
  if(!el) return;
  const node=document.createElement('div');
  node.className='toast';
  node.style.borderColor=`${cor}33`;
  node.style.color=cor;
  node.textContent=String(msg ?? '');
  el.replaceChildren(node);
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>{ if(el) el.replaceChildren(); },2800);
}

// ══════════════════════════════════════

function dashboardMetricIcon(name){
  const paths={
    wallet:'<path d="M3 6.5h14v10H3z"/><path d="M3 6.5V5a2 2 0 0 1 2-2h9"/><path d="M13 11h4"/>',
    cash:'<rect x="3" y="5" width="14" height="10" rx="2"/><circle cx="10" cy="10" r="2"/><path d="M5 8h.01M15 12h.01"/>',
    trend:'<path d="M3 14l4-4 3 2 5-6"/><path d="M11 6h4v4"/>',
    percent:'<path d="M6 14L14 6"/><circle cx="6" cy="6" r="1.5"/><circle cx="14" cy="14" r="1.5"/>',
    bars:'<path d="M5 17V9M10 17V5M15 17v-8"/>',
    target:'<circle cx="10" cy="10" r="6"/><circle cx="10" cy="10" r="2"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3"/>',
    flag:'<path d="M5 17V3"/><path d="M5 4h9l-2 3 2 3H5"/>'
  };
  return `<span class="dashboard-metric-glyph" aria-hidden="true"><svg viewBox="0 0 20 20">${paths[name]||paths.wallet}</svg></span>`;
}
function quickMovementKindIcon(kind){
  const paths={
    compra:'<circle cx="10" cy="10" r="6.5"/><path d="M10 6v8M6 10h8"/>',
    venda:'<path d="M3.5 10h12M10 4.5l5.5 5.5L10 15.5"/>',
    provento:'<circle cx="10" cy="10" r="6.5"/><path d="M12.5 7.5c-.5-1-4-1-4 .8 0 2 4 1 4 3.2s-3.5 2.1-4.5.8M10 6v8"/>',
    'renda-fixa':'<path d="M3.5 16.5h13M5 16.5V8l5-4 5 4v8.5M8 16.5v-5h4v5"/>',
    outro:'<circle cx="5" cy="10" r="1"/><circle cx="10" cy="10" r="1"/><circle cx="15" cy="10" r="1"/>'
  };
  return `<span class="quick-movement-kind-icon" aria-hidden="true"><svg viewBox="0 0 20 20">${paths[normalizeQuickMovementKind(kind)]||paths.outro}</svg></span>`;
}
function waveBIcon(name){
  const map={
    income:'cash',
    history:'bars',
    trend:'trend',
    target:'target',
    ranking:'flag',
    concentration:'wallet',
    attention:'flag',
    analysis:'trend',
    allocation:'bars',
    readonly:'shield'
  };
  const paths={
    shield:'<path d="M10 2.5l6 2.2v4.1c0 3.7-2.4 6.6-6 8.2-3.6-1.6-6-4.5-6-8.2V4.7z"/><path d="M7.2 10l1.8 1.8 3.8-4"/>'
  };
  if(name==='readonly') return `<span class="wave-b-icon ds-icon-container" aria-hidden="true"><svg viewBox="0 0 20 20">${paths.shield}</svg></span>`;
  return dashboardMetricIcon(map[name]||name).replace('dashboard-metric-glyph','wave-b-icon ds-icon-container');
}

function dashboardInlineAction(handler,value,label){
  return `<button type="button" class="dashboard-context-cta" onclick="${handler}(${esc(JSON.stringify(value))})">${esc(label)}</button>`;
}

function dashboardConsultiveCard(title,status,text,action='',tone='muted',actionHtml=''){
  return `<div class="premium-consultive-card">
    <div class="premium-consultive-card-head">
      <div class="premium-consultive-card-title">${esc(title)}</div>
      <span class="premium-consultive-card-status ${esc(tone)}">${esc(status)}</span>
    </div>
    <div class="premium-consultive-card-text">${esc(text)}</div>
    ${action?`<div class="premium-consultive-card-action">${esc(action)}</div>`:''}
    ${actionHtml}
  </div>`;
}

function dashboardMetricCard(icon,label,value,note,tone='#edf3ff',glow='rgba(96,165,250,.12)'){
  return `<div class="premium-metric" style="--metric-color:${tone};--metric-glow:${glow}">
    <div class="premium-metric-top"><div class="premium-metric-icon">${icon}</div><div class="premium-metric-label">${esc(label)}</div></div>
    <div class="premium-metric-value">${esc(value)}</div>
    <div class="premium-metric-note">${esc(note)}</div>
  </div>`;
}

function dashboardRadarCard(title,rows,formatter,empty){
  const body=rows.length ? rows.map(row=>`<div class="premium-radar-item"><span class="premium-radar-ticker">${esc(row.ticker||'—')}</span><span class="premium-radar-value">${formatter(row)}</span></div>`).join('') : `<div class="premium-empty">${esc(empty)}</div>`;
  return `<div class="premium-radar-card"><div class="premium-radar-title">${esc(title)}</div>${body}</div>`;
}

function assetSummaryCard(title, value, subtitle, tone='muted'){
  return `<div class="analysis-summary-card ${esc(tone)}">
    <div class="analysis-summary-kicker">${esc(title)}</div>
    <div class="analysis-summary-value">${esc(value)}</div>
    <div class="analysis-summary-sub">${esc(subtitle)}</div>
  </div>`;
}

function assetRankingRowHtml(row, index){
  const typeLabel=`${row.type}${row.sector&&row.sector!=='—'?` · ${row.sector}`:''}`;
  const signal=assetContributionSignal(row);
  const profitClass=row.pct==null ? '' : row.pct>0 ? 'good' : row.pct<0 ? 'neg' : 'pos';
  const currentTxt=row.current>0 ? fmt(row.current) : '—';
  const shareTxt=row.share!=null ? `${row.share.toFixed(1)}%` : '—';
  const pctTxt=row.pct!=null ? fmtP(row.pct) : '—';
  return `<div class="analysis-ranking-row">
    <div class="analysis-ranking-main">
      <div class="analysis-ranking-ticker">#${index} ${esc(row.ticker)}</div>
      <div class="analysis-ranking-type">${esc(typeLabel)}</div>
    </div>
    <div class="analysis-ranking-stat">
      <div class="analysis-ranking-label">Valor atual</div>
      <div class="analysis-ranking-value pos">${esc(currentTxt)}</div>
    </div>
    <div class="analysis-ranking-stat">
      <div class="analysis-ranking-label">% carteira</div>
      <div class="analysis-ranking-value">${esc(shareTxt)}</div>
    </div>
    <div class="analysis-ranking-stat">
      <div class="analysis-ranking-label">Rentab.</div>
      <div class="analysis-ranking-value ${profitClass}">${esc(pctTxt)}</div>
    </div>
    <div class="analysis-ranking-signal">
      <span class="analysis-pill signal ${esc(signal.tone)}">${esc(signal.label)}</span>
    </div>
  </div>`;
}
function assetRankingListHtml(rows, mode){
  let listRows=[...rows];
  if(mode==='concentration'){
    listRows=listRows.filter(r=>r.share!=null && r.share>10).sort((a,b)=>b.share-a.share || b.current-a.current);
  }else if(mode==='best'){
    listRows=listRows.filter(r=>Number.isFinite(r.pct) && r.pct>0).sort((a,b)=>b.pct-a.pct || b.current-a.current);
  }else if(mode==='worst'){
    listRows=listRows.filter(r=>Number.isFinite(r.pct) && r.pct<0).sort((a,b)=>a.pct-b.pct || a.current-b.current);
  }else if(mode==='opportunity'){
    listRows=listRows.filter(r=>{
      const sig=assetContributionSignal(r);
      return sig.label==='Pode estudar aporte'
        && Number.isFinite(r.pct)
        && r.pct<0
        && r.share!=null
        && r.share<15
        && Number.isFinite(r.current)
        && r.current>0;
    }).sort((a,b)=>{
      const aModeration=Math.abs(Math.abs(a.pct)-8);
      const bModeration=Math.abs(Math.abs(b.pct)-8);
      return (a.share||0)-(b.share||0) || aModeration-bModeration || Math.abs(a.pct)-Math.abs(b.pct);
    });
  }else{
    listRows=listRows.filter(r=>Number.isFinite(r.current) || Number.isFinite(r.applied)).sort((a,b)=>b.current-a.current || (b.share||0)-(a.share||0));
  }
  listRows=listRows.slice(0,12);
  if(!listRows.length){
    const msg = mode==='concentration'
      ? 'Nenhum ativo acima do limite de atenção.'
      : mode==='opportunity'
        ? 'Nenhum ativo combina queda com concentração saudável no momento.'
        : 'Dados insuficientes para montar o ranking compacto.';
    return `<div class="analysis-ranking-empty">${esc(msg)}</div>`;
  }
  return `
    <div class="analysis-ranking-labels">
      <div>Ativo</div><div>Tipo / setor</div><div>Valor atual</div><div>% carteira</div><div>Rentab.</div><div>Sinalizador</div>
    </div>
    <div class="analysis-ranking-table">
      ${listRows.map((row,idx)=>assetRankingRowHtml(row, idx+1)).join('')}
    </div>`;
}

function dividendMonthlyHistoryYearMonthRow(month){
  const tone=month.kind || 'value';
  return `<div class="div-year-month ${esc(tone)}">
    <div class="div-year-month-label">${esc(month.label)}</div>
    <div class="div-year-month-value">${esc(month.valueText)}</div>
  </div>`;
}

function dividendMonthlyHistoryYearCard(year, compact=false, expanded=false){
  const bodyId=`div-year-${year.year}`;
  const open=compact ? expanded : true;
  const bestMonth=year.bestMonth ? `${esc(year.bestMonth.label)} · ${fmt(year.bestMonth.total)}` : 'Sem mês válido';
  return `<article class="div-year-card${year.isCurrent ? ' current' : ''}" data-open="${open ? 'true' : 'false'}">
    <div class="div-year-card-head">
      <div class="div-year-card-copy">
        <div class="div-year-card-year">${year.year}</div>
        <div class="div-year-card-meta">Média ${year.average===null?'—':fmt(year.average)} · Total recebido ${year.total===null?'—':fmt(year.total)} · Cobertura confirmada: ${year.validCount}/12 meses</div>
        <div class="div-year-card-sub">Melhor mês: ${bestMonth}</div>
      </div>
      ${compact ? `<button class="btn bgh div-year-card-toggle" type="button" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${esc(bodyId)}" onclick="dividendMonthlyHistoryToggleMonth('${esc(String(year.year))}')">${open ? 'Ocultar meses' : 'Ver meses'}</button>` : ''}
    </div>
    <div class="div-year-card-months${open ? '' : ' hidden'}" id="${esc(bodyId)}">
      ${year.months.map(month=>dividendMonthlyHistoryYearMonthRow(month)).join('')}
    </div>
  </article>`;
}


function renderDataQualityIssueCard(issue){
  const action=typeof dataQualityResolveAction==='function'
    ? dataQualityResolveAction(issue)
    : (()=>{
      const route=issue.route || dataQualityRouteForEntity(issue.entityType, issue.category);
      return route ? {level:3, route, label:issue.actionLabel||dataQualityActionLabel(route)} : {level:4, route:'', label:''};
    })();
  const actionHtml=action.level===4 ? `<div class="data-quality-action-level muted">Informativo</div>` : `<div class="data-quality-action"><span class="data-quality-action-level">${dataQualityActionLevelLabel(action.level)}</span><button class="btn bgh" aria-label="${esc(action.label)}: ${esc(issue.entityLabel)}" onclick="dataQualityRunAction(${esc(JSON.stringify(issue))})">${esc(action.label)}</button></div>`;
  return `<article class="data-quality-issue ${esc(issue.severity)}">
    <div class="data-quality-issue-top">
      <span class="data-quality-severity ${esc(issue.severity)}">${esc(dataQualitySeverityLabel(issue.severity))}</span>
      <span class="data-quality-category">${esc(issue.category)}</span>
    </div>
    <div class="data-quality-entity">${esc(issue.entityType)} · ${esc(issue.entityLabel)}</div>
    <div class="data-quality-identity">Identificacao: ${esc(issue.identitySummary || issue.entityLabel)}</div>
    <div class="data-quality-field">${esc(issue.field)}</div>
    <div class="data-quality-problem">${esc(issue.message)}</div>
    <div class="data-quality-recommendation">${esc(issue.recommendation)}</div>
    ${actionHtml}
  </article>`;
}
function renderDataQualityPriorityCard(issue){
  const action=typeof dataQualityResolveAction==='function'
    ? dataQualityResolveAction(issue)
    : {level:4,label:''};
  const actionHtml=action.level===4 ? `<div class="data-quality-action-level muted">Informativo</div>` : `<div class="data-quality-action"><span class="data-quality-action-level">${dataQualityActionLevelLabel(action.level)}</span><button class="btn bgh" aria-label="${esc(action.label)}: ${esc(issue.entityLabel)}" onclick="dataQualityRunAction(${esc(JSON.stringify(issue))})">${esc(action.label)}</button></div>`;
  return `<article class="data-quality-issue ${esc(issue.severity)}">
    <div class="data-quality-issue-top"><span class="data-quality-severity ${esc(issue.severity)}">${esc(dataQualitySeverityLabel(issue.severity))}</span><span class="data-quality-category">${esc(issue.category)}</span></div>
    <div class="data-quality-entity"><span class="data-quality-entity-type">${esc(issue.entityType)}</span><span class="data-quality-entity-label" title="${esc(issue.entityLabel)}">${esc(issue.entityLabel)}</span></div>
    <div class="data-quality-identity">Identificacao: ${esc(issue.identitySummary || issue.entityLabel)}</div>
    <div class="data-quality-problem">${esc(issue.message)}</div>
    ${actionHtml}
  </article>`;
}
function passiveIncomeMetricCard({tone='muted', kicker='', value='—', sub=''}){
  return `<div class="passive-goal-card ${tone}">
    <div class="passive-goal-kicker">${esc(kicker)}</div>
    <div class="passive-goal-value">${value}</div>
    <div class="passive-goal-sub">${sub}</div>
  </div>`;
}
function passiveIncomeProgressCard({tone='muted', kicker='', value='—', sub='', percent=0, barColor='#60a5fa'}){
  const width=Math.max(0, Math.min(100, Number(percent)||0)).toFixed(1);
  return `<div class="passive-goal-card ${tone}" style="min-height:88px">
    <div class="passive-goal-kicker">${esc(kicker)}</div>
    <div class="passive-goal-value">${value}</div>
    <div class="passive-goal-sub">${sub}</div>
    <div class="dbt" style="height:6px;margin-top:7px"><div class="dbf" style="width:${width}%;background:${barColor}"></div></div>
  </div>`;
}

function dataQualityTab(){
  const snapshot=dataQualitySnapshot();
  const remediationModel=v257QualityModel(snapshot);
  const monitoringModel=v258MonitoringModel(remediationModel);
  const severity=String(S.dataQualitySeverity || S.dataAuditSeverity || 'all');
  const category=String(S.dataQualityCategory || S.dataAuditArea || 'all');
  const entityType=String(S.dataQualityEntityType || 'all');
  const filtered=snapshot.issues.filter(issue=>
    (severity==='all' || issue.severity===severity) &&
    (category==='all' || issue.category===category) &&
    (entityType==='all' || issue.entityType===entityType)
  );
  const healthy=snapshot.summary.criticalRecords===0 && snapshot.summary.warningRecords===0 && snapshot.summary.infoRecords===0;
  const severityChips=[['all','Todos'],['critical','Criticos'],['warning','Atencao'],['info','Info']]
    .map(([value,label])=>`<button class="data-quality-chip ${severity===value?'on':''}" onclick="setDataQualitySeverity('${value}')">${esc(label)}</button>`).join('');
  const categoryChips=[['all','Todas'],...DATA_QUALITY_CATEGORIES.map(value=>[value,value])]
    .map(([value,label])=>`<button class="data-quality-chip ${category===value?'on':''}" onclick="setDataQualityCategory(${JSON.stringify(value)})">${esc(label)}</button>`).join('');
  const typeChips=[['all','Todos'],...DATA_QUALITY_ENTITY_TYPES.map(value=>[value,value])]
    .map(([value,label])=>`<button class="data-quality-chip ${entityType===value?'on':''}" onclick="setDataQualityEntityType(${JSON.stringify(value)})">${esc(label)}</button>`).join('');
  const activeFilterCount=[severity!=='all',category!=='all',entityType!=='all'].filter(Boolean).length;
  const runAt=S.dataQualityRunAt instanceof Date ? S.dataQualityRunAt : (S.dataAuditRunAt instanceof Date ? S.dataAuditRunAt : new Date());
  const integrityTone=snapshot.score>=90?'ok':snapshot.score>=70?'warning':'critical';
  const reviewableAssets=assetReviewQualityData(snapshot);
  const reviewAssetsAction=reviewableAssets.ids.length
    ? `<button class="btn bgh" onclick="openIncompleteAssetsReview()">Revisar ${reviewableAssets.ids.length} ativo${reviewableAssets.ids.length===1?'':'s'} com pendências</button>`
    : '';
  const priorityIssues=dataQualityPriorityIssues(filtered,5);
  const prioritySet=new Set(priorityIssues);
  const remainingIssues=filtered.filter(issue=>!prioritySet.has(issue));
  const mobilePriorityView=typeof window!=='undefined' && window.matchMedia('(max-width: 640px)').matches;
  const visiblePriorityIssues=mobilePriorityView && !S.dataQualityPriorityExpanded ? priorityIssues.slice(0,3) : priorityIssues;
  const hiddenPriorityCount=Math.max(0,priorityIssues.length-visiblePriorityIssues.length);
  const priorityToggle=mobilePriorityView && priorityIssues.length>3
    ? `<button type="button" class="data-quality-priority-more" onclick="toggleDataQualityPriorities()">${hiddenPriorityCount ? `Ver mais ${hiddenPriorityCount}` : 'Ver menos'}</button>`
    : '';
  const summaryCards=[
    ['Registros analisados', snapshot.summary.totalRecords, 'dados inspecionados'],
    ['Sem problemas', snapshot.summary.validRecords, 'registros sem achados relevantes'],
    ['Atencao', snapshot.summary.warningRecords, 'registros com observacoes'],
    ['Criticos', snapshot.summary.criticalRecords, 'registros que exigem revisao urgente'],
    ['Integridade', `${snapshot.score}%`, 'indice de registros validos']
  ].map(([label,value,sub],index)=>`<div class="data-quality-card ${index===2?'warning':index===3?'critical':index===4?integrityTone:'ok'}"><div class="data-quality-card-label wave-b-heading">${waveBIcon(index===2||index===3?'attention':index===1?'readonly':'analysis')}<span>${esc(label)}</span></div><div class="data-quality-card-value">${esc(String(value))}</div><div class="data-quality-card-sub">${esc(sub)}</div></div>`).join('');
  const healthyState=healthy
    ? `<div class="data-quality-empty-health"><div><div class="data-quality-empty-title">Dados consistentes</div><div class="data-quality-empty-note">Nenhum problema relevante foi encontrado nos registros analisados.</div></div></div>`
    : '';
  const emptyState=filtered.length
    ? `<section class="data-quality-priority" aria-labelledby="data-quality-priority-title">
        <div class="data-quality-priority-head"><div><div class="data-quality-priority-title" id="data-quality-priority-title">O que merece atenção</div><div class="data-quality-priority-sub">Críticos primeiro, seguidos pelos achados que pedem conferência.</div></div><span class="data-quality-area-pill">${priorityIssues.length} prioritário${priorityIssues.length===1?'':'s'}</span></div>
        <div class="data-quality-priority-list">${visiblePriorityIssues.map(renderDataQualityPriorityCard).join('')}</div>
        ${priorityToggle}
      </section>${remainingIssues.length ? `<details class="data-quality-full-queue"><summary>Ver todas as pendências <span>${remainingIssues.length} restante${remainingIssues.length===1?'':'s'}</span></summary><div class="data-quality-full-queue-body">${remainingIssues.map(renderDataQualityIssueCard).join('')}</div></details>` : ''}`
    : healthy
      ? healthyState
      : `<div class="data-quality-empty">Nenhum problema encontrado para os filtros selecionados.</div><div style="margin-top:8px"><button class="btn bgh" onclick="setDataQualitySeverity('all');setDataQualityCategory('all');setDataQualityEntityType('all')">Limpar filtros</button></div>`;
  return `<div class="data-quality-shell data-audit-shell">
    <section class="data-quality-hero">
      <div class="data-quality-head">
        <div>
          <div class="data-quality-title wave-b-heading">${waveBIcon('readonly')}<span>Auditoria</span></div>
          <div class="data-quality-sub">Rastreabilidade e integridade dos dados da carteira. Revise registros que podem comprometer relatórios e calculos. Nenhuma correcao e feita automaticamente.</div>
        </div>
        <div class="data-quality-actions">
          <button class="btn bgh" onclick="rerunDataQuality()">Reexecutar auditoria</button>
          ${reviewAssetsAction}
        </div>
      </div>
      <div class="data-quality-summary">
        ${summaryCards}
      </div>
    </section>
    ${v257DataQualityCenter(remediationModel)}
    ${v258MonitoringCenter(monitoringModel,remediationModel)}
    ${dataQualityRfReconciliationSection()}
    <div class="data-quality-filters">
      <div class="data-quality-filter-main">
        <div class="data-quality-filter-group"><span class="data-quality-filter-label">Severidade</span>${severityChips}</div>
        <span class="data-quality-filter-count">${activeFilterCount ? `${activeFilterCount} filtro${activeFilterCount===1?'':'s'} ativo${activeFilterCount===1?'':'s'}` : 'Filtros principais'}</span>
        ${activeFilterCount ? '<button class="data-quality-chip" onclick="clearDataQualityFilters()">Limpar</button>' : ''}
      </div>
      <details class="data-quality-more-filters">
        <summary>Mais filtros</summary>
        <div class="data-quality-more-filters-body">
          <div class="data-quality-filter-group"><span class="data-quality-filter-label">Categoria</span>${categoryChips}</div>
          <div class="data-quality-filter-group"><span class="data-quality-filter-label">Tipo de registro</span>${typeChips}</div>
        </div>
      </details>
    </div>
    <div class="data-quality-areas">
      ${snapshot.affected.length ? snapshot.affected.map(([name,count])=>`<span class="data-quality-area-pill">${esc(name)} · ${count}</span>`).join('') : '<span class="data-quality-area-pill">Nenhum problema encontrado</span>'}
      <span class="data-quality-area-pill">Executada às ${runAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
      <span class="data-quality-area-pill">${filtered.length} exibido${filtered.length===1?'':'s'}</span>
    </div>
    <div class="data-quality-list">
      ${emptyState}
    </div>
  </div>`;
}

function formatGoalMonths(months){
  if(months===0) return 'agora';
  if(months===null||months===undefined) return 'sem estimativa';
  const y=Math.floor(months/12);
  const m=months%12;
  const parts=[];
  if(y) parts.push(`${y} ano${y>1?'s':''}`);
  if(m) parts.push(`${m} ${m===1?'mês':'meses'}`);
  return parts.length?parts.join(' e '):'menos de 1 mês';
}
function renderDeferredScreenState(name,label){
  const failed=document.querySelector(`script[data-ui-screen="${name}"]`)?.dataset.failed==='true';
  return `<section class="premium-empty" role="${failed?'alert':'status'}" aria-busy="${!failed}"><h2>${failed?'Não foi possível abrir':'Carregando'} ${label}</h2><p>${failed?'O módulo da tela não carregou. Seus dados não foram alterados.':'A navegação continua disponível enquanto a tela carrega.'}</p>${failed?'<button type="button" class="btn bgh" onclick="location.reload()">Tentar novamente</button>':''}</section>`;
}
