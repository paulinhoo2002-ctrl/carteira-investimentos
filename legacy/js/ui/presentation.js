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
