function rendaFixaTab(){
  const data=rfIntelligenceSnapshot();
  if(typeof globalThis.V262FixedIncomeDiagnostics?.build!=='function'&&!globalThis.__V262FixedIncomeDiagnosticsLoading){
    globalThis.__V262FixedIncomeDiagnosticsLoading=true;
    import('/modern/dist/assets/v262-legacy-diagnostics.js').catch(()=>{
      globalThis.__V262FixedIncomeDiagnosticsLoadFailed=true;
      if(typeof window!=='undefined')window.dispatchEvent(new Event('v262:diagnostics-ready'));
    });
  }
  const ipcaDiagnosticsApi=globalThis.V262FixedIncomeDiagnostics;
  const ipcaDiagnostics=typeof ipcaDiagnosticsApi?.build==='function'
    ? ipcaDiagnosticsApi.build(Array.isArray(S.assets)?S.assets:[])
    : null;
  const ipcaDiagnosticsHtml=ipcaDiagnostics===null&&!globalThis.__V262FixedIncomeDiagnosticsLoadFailed
    ? '<section class="premium-rf-panel ds-panel ds-panel--readonly" aria-labelledby="rf-ipca-diagnostics-title"><div class="premium-rf-panel-head"><div><div class="premium-rf-panel-title" id="rf-ipca-diagnostics-title">Diagnóstico IPCA</div><div class="premium-rf-panel-sub" role="status">Carregando diagnóstico de cobertura e frescor…</div></div></div></section>'
    : ipcaDiagnostics===null
    ? '<section class="premium-rf-panel ds-panel ds-panel--readonly" aria-labelledby="rf-ipca-diagnostics-title"><div class="premium-rf-panel-head"><div><div class="premium-rf-panel-title" id="rf-ipca-diagnostics-title">Diagnóstico IPCA</div><div class="premium-rf-panel-sub" role="status">Diagnóstico indisponível neste ambiente.</div></div></div></section>'
    : ipcaDiagnostics.length===0
      ? ''
    : `<section class="premium-rf-panel premium-rf-ipca-diagnostics ds-panel ds-panel--readonly" aria-labelledby="rf-ipca-diagnostics-title"><div class="premium-rf-panel-head"><div><div class="premium-rf-panel-title" id="rf-ipca-diagnostics-title">Diagnóstico da série IPCA</div><div class="premium-rf-panel-sub">Diagnóstico do índice; não calcula o valor do título.</div></div><span class="ds-badge">${ipcaDiagnostics.length} posição${ipcaDiagnostics.length===1?'':'ões'}</span></div><div class="premium-income-list">${ipcaDiagnostics.map(item=>`<div class="premium-income-row"><div class="premium-row-main"><div class="premium-row-title">${esc(item.ticker||item.name||'Título IPCA')}</div><div class="premium-row-sub">Valuation: não suportado · valor manual continua sendo a autoridade</div></div><div class="premium-row-value"><span class="ds-badge">Cobertura ${esc(item.coverageStatus==='UNAVAILABLE'?'indisponível':item.coverageStatus==='PARTIAL'?'parcial':'completa')}${item.coveragePercent===null?'':` · ${esc(String(item.coveragePercent))}%`}</span><div class="premium-row-sub">Frescor ${esc(item.freshness==='UNKNOWN'?'desconhecido':item.freshness==='STALE'?'desatualizado':'atual')} · fonte até ${esc(item.sourceAsOf||'indisponível')}</div></div></div>`).join('')}</div></section>`;
  const count=data.assets.length;
  const {overdue, soon30, soon90, soon12m, longTerm, missingDue, missingRate}=data;
  const trustSummary=data.trustSummary||{};
  const trustApi=globalThis.FixedIncomeTrust;
  const trustFiltered=trustApi?.filterRows ? trustApi.filterRows(data.tableRows,S.rfSearch,S.rfTrustFilter) : data.tableRows;
  const sortParts=String(S.rfSort||'name-asc').split('-');
  const trustRows=trustApi?.sortRows ? trustApi.sortRows(trustFiltered,sortParts[0]==='value'?'value':sortParts[0]==='maturity'?'maturity':sortParts[0]==='issuer'?'issuer':'name',sortParts[1]==='desc'?'desc':'asc') : trustFiltered;
  const attentionBadges=count ? [
    overdue>0 ? `<span class="note-pill" style="color:#fecaca;background:#3f1d24;border-color:rgba(248,113,113,.24)">${overdue} vencido${overdue===1?'':'s'}</span>` : '',
    soon30>0 ? `<span class="note-pill" style="color:#fde68a;background:#3d2f12;border-color:rgba(251,191,36,.24)">${soon30} em até 30 dias</span>` : '',
    missingDue>0 ? `<span class="note-pill">Sem vencimento: ${missingDue}</span>` : '',
    missingRate>0 ? `<span class="note-pill">Sem taxa: ${missingRate}</span>` : '',
  ].filter(Boolean).join('') : '';
  const summaryStrip=count ? `
    <div class="rf-spotlight">
      <div>
        <div class="rf-spotlight-title">O que merece atenção</div>
        <div class="rf-spotlight-sub">${overdue>0 ? 'Priorize os títulos vencidos.' : soon30>0 ? 'Revise os vencimentos próximos.' : 'Nenhum evento imediato para revisar.'}</div>
      </div>
      <div class="rf-spotlight-badges">
        ${attentionBadges || '<span class="note-pill">Nenhum evento próximo.</span>'}
      </div>
    </div>` : '';
  const nextMaturity=data.maturityRows[0]||null;
  const resultTone=data.totalProfit>0?'#34d399':data.totalProfit<0?'#f87171':'#94a3b8';
  const kpis=[
    ['Valor atual RF',fmt(data.totalCurrent),data.explicitCount===count?'Valores atuais informados':`${data.explicitCount}/${count} explícitos`,'#34d399'],
    ['Total aplicado',fmt(data.totalApplied),count?'Capital principal cadastrado':'Cadastre títulos','#a78bfa'],
    ['Resultado',count?fmt(data.totalProfit):'—',count?`${fmtP(data.totalPct)} estimado`:'Sem posições',resultTone],
    ['Próximo vencimento',nextMaturity?(nextMaturity.days===0?'Hoje':nextMaturity.days===1?'Amanhã':`${nextMaturity.days} dias`):'—',nextMaturity?(nextMaturity.ticker||'Título RF'):'Nenhum vencimento futuro','#fbbf24'],
    ['Posições abertas',String(count),count?'Títulos acompanhados':'Carteira vazia','#60a5fa']
  ].map(([label,value,note,tone])=>`<div class="premium-rf-kpi ds-kpi" style="--rf-kpi-tone:${tone}"><div class="premium-rf-kpi-label ds-kpi__label">${esc(label)}</div><div class="premium-rf-kpi-value ds-kpi__value" style="color:${tone}">${esc(value)}</div><div class="premium-rf-kpi-note ds-kpi__context">${esc(note)}</div></div>`);

  function maturityBadge(days){
    if(days===null || days===undefined) return '<span class="premium-rf-maturity-badge ds-badge muted">Sem data</span>';
    if(days<0) return '<span class="premium-rf-maturity-badge ds-badge danger">Vencido</span>';
    if(days<=30) return '<span class="premium-rf-maturity-badge ds-badge warn ds-badge--warning">≤30 dias</span>';
    if(days<=90) return '<span class="premium-rf-maturity-badge ds-badge warn ds-badge--warning">≤90 dias</span>';
    if(days<=365) return '<span class="premium-rf-maturity-badge ds-badge info ds-badge--info">≤12 meses</span>';
    return '<span class="premium-rf-maturity-badge ds-badge ok ds-badge--positive">>12 meses</span>';
  }

  const positionRows=trustRows.length ? trustRows.map(row=>{
    const asset=(S.assets||[]).find(a=>String(a?.ticker||'').trim().toUpperCase()===String(row.ticker||'').trim().toUpperCase()) || data.assets.find(a=>a.ticker===row.ticker);
    const getAssetEventId = (typeof rfAssetEventId === 'function') ? rfAssetEventId : (a)=>String(a?.id||a?.assetId||a?.rf_asset_id||'').trim();
    const assetId=asset?getAssetEventId(asset):null;
    const display=row.explicit===false
      ? {kind:'missing', appliedText:fmt(row.applied), currentText:'Atualização necessária', currentNote:'Valor atual não informado', maturityText:row.due?row.due.toLocaleDateString('pt-BR'):'não informado', resultClass:'neutral', resultText:'—', rentabilityText:'—'}
      : {kind:'current', appliedText:fmt(row.applied), currentText:fmt(row.current), currentNote:(globalThis.FixedIncomeDisplay?.describe(row.currentMeta)?.note || row.currentMeta?.source || 'Valor atual informado'), provenance:(globalThis.FixedIncomeDisplay?.describe(row.currentMeta) || {label:'Valor informado',tone:'ok'}), maturityText:row.due?row.due.toLocaleDateString('pt-BR'):'não informado', resultClass:row.profit>0?'pos':row.profit<0?'neg':'neutral', resultText:assetSignedMoneyText(row.profit), rentabilityText:fmtP(row.pct)};
    const provenanceDetails=display.kind==='current' ? fixedIncomeProvenanceDetails(row.currentMeta) : null;
    return `
    <div class="premium-rf-position-row">
      <div class="premium-rf-row-main">
        <div class="premium-rf-row-title">${esc(row.ticker)}${row.name&&row.name!==row.ticker?` · ${esc(row.name)}`:''}</div>
        <div class="premium-rf-row-meta">${esc(row.category)} · ${esc(row.indexer)} · ${esc(row.rate||'taxa não informada')}</div>
        <div class="premium-rf-row-meta premium-rf-row-issuer">Instituição: ${esc(row.issuer||'não informada')}</div>
      </div>
      <div class="premium-rf-row-value">
        <div class="premium-rf-row-financial"><span class="premium-rf-row-financial-label">Atual</span>${display.currentText}</div>
        <div class="premium-rf-row-meta">Valor aplicado ${display.appliedText}</div>
        <div class="premium-rf-row-meta"><span class="premium-rf-provenance ${esc(display.provenance?.tone||'muted')}">${esc(display.provenance?.label||'Valor informado')}</span> ${esc(display.currentNote)}</div>
        ${provenanceDetails?.rows?.length ? `<details class="premium-rf-provenance-details"><summary>Como foi avaliado</summary><div class="premium-rf-provenance-grid">${provenanceDetails.rows.map(([key,value])=>`<span>${esc(key)}</span><strong>${esc(value)}</strong>`).join('')}</div></details>` : ''}
        <div class="premium-rf-row-meta">Vencimento ${esc(display.maturityText)}</div>
        <div class="premium-rf-row-results">
          <span class="premium-rf-row-meta ${display.resultClass}">Resultado ${display.kind==='fallback-applied' ? '—' : display.resultText}</span>
          <span class="premium-rf-row-meta ${display.resultClass}">Rentab. ${display.rentabilityText}</span>
        </div>
      </div>
      ${assetId ? `
      <div class="premium-rf-row-actions">
        <button type="button" class="asset-detail-link" onclick='openAssetDetail(${JSON.stringify(assetId)})'>Detalhes</button>
        <button type="button" class="btn bsv asset-action" onclick='openRfMovementEditor(${JSON.stringify(assetId)}, "aporte")'>Movimentar</button>
        <button type="button" class="btn bgh asset-action" onclick='openRfMovementEditor(${JSON.stringify(assetId)}, "resgate_parcial")'>Resgatar</button>
        <button type="button" class="btn bgh asset-action" aria-label="Editar ${esc(row.ticker)}" onclick='edA(${JSON.stringify(assetId)})'>✎ Editar</button>
      </div>` : ''}
    </div>`}).join('') : '<div class="premium-rf-empty ds-empty-state">Nenhum título de renda fixa cadastrado.</div>';

  const maturityRows=data.maturityRows.length ? data.maturityRows.map(row=>`
    <div class="premium-rf-maturity-row">
      <div class="premium-rf-row-main">
        <div class="premium-rf-row-title">${esc(row.ticker)}</div>
        <div class="premium-rf-row-meta">${row.due?row.due.toLocaleDateString('pt-BR'):'—'}${row.issuer?` · ${esc(row.issuer)}`:''}</div>
      </div>
      <div class="premium-rf-row-value">
        ${maturityBadge(row.days)}
        <div class="premium-rf-row-meta">${row.explicit===false ? '—' : fmt(row.current)}</div>
      </div>
    </div>`).join('') : '<div class="premium-rf-empty ds-empty-state">Nenhum vencimento futuro registrado.</div>';

  const reviewGroups=rfMaturityReviewGroups(data);
  const reviewCount=reviewGroups.reduce((total,group)=>total+group.rows.length,0);
  const reviewQueue=reviewGroups.map(group=>`
    <section class="premium-rf-review-group${group.rows.length?'':' is-empty'}" aria-labelledby="rf-review-${group.id}-title">
      <div class="premium-rf-review-group-head">
        <div id="rf-review-${group.id}-title" class="premium-rf-review-group-title">${group.title}</div>
        <div class="premium-rf-review-group-count" aria-label="${group.rows.length} itens">${group.rows.length}</div>
      </div>
      <div class="premium-rf-review-group-sub">${group.subtitle}</div>
      <div class="premium-rf-review-list">
        ${group.rows.length ? group.rows.map(row=>{
          const asset=data.assets.find(asset=>asset.ticker===row.ticker);
          const getAssetEventId=(typeof rfAssetEventId==='function') ? rfAssetEventId : (a)=>String(a?.id||a?.assetId||a?.rf_asset_id||'').trim();
          const assetId=asset?getAssetEventId(asset):null;
          const dueText=row.due?row.due.toLocaleDateString('pt-BR'):'Sem data informada';
          return `<div class="premium-rf-review-item">
            <div class="premium-rf-review-item-main">
              <div class="premium-rf-review-item-title">${esc(row.ticker)}${row.name&&row.name!==row.ticker?` · ${esc(row.name)}`:''}</div>
              <div class="premium-rf-review-item-meta">${esc(row.category)} · ${esc(dueText)}</div>
              <div class="premium-rf-review-item-value">${row.explicit===false?'Atualização necessária':fmt(row.current)}</div>
            </div>
            ${assetId?`<button type="button" class="premium-rf-review-action ds-button ds-button--secondary" onclick='edA(${JSON.stringify(assetId)})'>Revisar</button>`:''}
          </div>`;
        }).join('') : '<div class="premium-rf-review-empty ds-empty-state">Nenhum título neste grupo.</div>'}
      </div>
    </section>`).join('');
  const reviewQueueHtml=`
    <section class="premium-rf-review-queue ds-panel ds-panel--readonly" aria-labelledby="rf-review-queue-title">
      <div class="premium-rf-review-queue-head">
        <div><div id="rf-review-queue-title" class="premium-rf-panel-title">Fila de conferência</div><div class="premium-rf-panel-sub">Revisão dos vencimentos registrados na carteira.</div></div>
        <div class="premium-rf-panel-badge ds-badge">${reviewCount} itens</div>
      </div>
      <div class="premium-rf-review-groups">${reviewCount ? reviewQueue : '<div class="premium-rf-review-empty ds-empty-state" style="padding:14px 15px">Nenhum ponto de conferência encontrado.</div>'}</div>
    </section>`;

  const distributionRows=(rows,label)=>rows.length ? rows.map(row=>`<div class="premium-rf-distribution-row"><span class="premium-rf-distribution-label">${esc(row[label])}</span><span class="premium-rf-distribution-value">${fmt(row.value)} · ${row.share.toFixed(1)}%</span></div>`).join('') : '<div class="premium-rf-empty">Dados insuficientes para distribuir.</div>';

  const typeRows=data.typeRows.length ? data.typeRows.map(row=>`
    <div class="premium-income-row">
      <div class="premium-row-main">
        <div class="premium-row-title">${esc(row.type)}</div>
        <div class="premium-row-sub">${row.count} título${row.count===1?'':'s'} · ${row.share.toFixed(1)}% da renda fixa</div>
      </div>
      <div class="premium-row-value">${fmt(row.value)}</div>
    </div>`).join('') : '<div class="rf-empty">Nenhum título de renda fixa cadastrado.</div>';

  const bucketRows=data.bucketRows.length ? data.bucketRows.map(row=>`
    <div class="premium-income-row">
      <div class="premium-row-main">
        <div class="premium-row-title">${esc(row.bucket)}</div>
        <div class="premium-row-sub">${row.count} título${row.count===1?'':'s'} · ${row.share.toFixed(1)}% da renda fixa</div>
      </div>
      <div class="premium-row-value">${fmt(row.value)}</div>
    </div>`).join('') : '<div class="rf-empty">Sem vencimentos cadastrados.</div>';

  const alertRows=data.alertRows.length ? data.alertRows.map(row=>`
    <div class="rf-preview-row">
      <div class="premium-row-main">
        <div class="premium-row-title">${esc(row.ticker)}</div>
        <div class="premium-row-sub">${esc(row.primaryIssue)}${row.days!=null?` · ${row.days<0?'vencido':`${Math.abs(row.days)} dia${Math.abs(row.days)===1?'':'s'}`}`:''}</div>
      </div>
      <div class="rf-preview-value">
        <span class="analysis-pill ${row.severity<=1?'danger':row.severity===2?'warn':'muted'}">${esc(row.primaryIssue==='Valor atual não informado'?'Atualização necessária':row.primaryIssue)}</span>
        <div class="premium-row-sub">${esc(row.rate||'taxa não informada')}</div>
      </div>
    </div>`).join('') : '<div class="rf-empty">Nenhum alerta crítico no momento.</div>';

  const previewRows=data.previewRows.length ? data.previewRows.map(row=>`
      <div class="rf-preview-row">
        <div class="premium-row-main">
          <div class="premium-row-title">${esc(row.ticker)}${row.name&&row.name!==row.ticker?` · ${esc(row.name)}`:''}</div>
          <div class="premium-row-sub">${esc(row.category)} · ${esc(row.indexer)}${row.rate&&row.rate!=='taxa não informada'?` · ${esc(row.rate)}`:''}${row.days!=null?` · ${row.days<0?'vencido':`${Math.abs(row.days)} dia${Math.abs(row.days)===1?'':'s'} para o vencimento`}`:''}</div>
        </div>
        <div class="rf-preview-value">
                   ${row.explicit === false
                     ? `<div class="rf-strong" style="color:#c8a84b">Atualização necessária</div>`
                     : `<div class="${row.profit>=0?'gn':'rd'}">${fmt(row.profit)}</div>
                        <div class="premium-row-sub">${fmtP(row.pct)} · ${row.currentMeta.source||'fonte não informada'}</div>`
                   }
                 </div>
        ${rfEventReceiptsSummaryHtml(row) ? `<div class="rf-event-summary-inline" style="grid-column:1 / -1">${rfEventReceiptsSummaryHtml(row)}</div>` : ''}
      </div>`).join('') : '<div class="rf-empty">Nenhum título de renda fixa cadastrado.</div>';

    const eventCards=rfEventHistoryCards(data.tableRows);

    const tableRows=trustRows.length ? trustRows.map(row=>`
      <tr>
        <td class="rf-strong">${esc(row.ticker)}</td>
        <td>${esc(row.category)}</td>
        <td class="rf-right">${fmt(row.applied)}</td>
        <td class="rf-right">
          <div class="rf-strong">${row.explicit===false ? '—' : fmt(row.current)}</div>
          <div class="rf-mini">${row.explicit===false ? 'Valor atual não informado' : 'Valor atual / líquido'}</div>
        </td>
        <td class="rf-right ${row.profit>=0?'gn':'rd'}">
                  ${row.explicit === false
                    ? `<div class="rf-strong" style="color:#c8a84b">Atualização necessária</div><div class="rf-mini">Sem valor atual informado</div>`
                    : `<div class="rf-strong">${fmt(row.profit)}</div><div class="rf-mini">Resultado de mercado</div>`
                  }
                </td>
      <td class="rf-right">
        <div class="rf-strong">${fmt(row.receivedNet)}</div>
        <div class="rf-mini">${row.eventCount>0 ? `${row.eventCount} evento${row.eventCount===1?'':'s'} · bruto ${fmt(row.receivedGross)} · IR ${fmt(row.receivedIr)} · IOF ${fmt(row.receivedIof)}` : 'Sem eventos de renda fixa'}</div>
      </td>
      <td class="rf-right ${row.resultWithEvents>=0?'gn':'rd'}">
        <div class="rf-strong">${row.explicit===false ? '—' : fmt(row.resultWithEvents)}</div>
        <div class="rf-mini">${row.explicit===false ? 'resultado total indisponível' : `${row.rentabWithEvents!=null?fmtP(row.rentabWithEvents):'—'} · resultado total`}</div>
      </td>
      <td class="rf-right ${row.pct>=0?'gn':'rd'}">${fmtP(row.pct)}</td>
      <td>${row.due?row.due.toLocaleDateString('pt-BR'):'—'}</td>
      <td><span class="analysis-pill ${row.issues.length? (row.days!=null && row.days<0 ? 'danger' : row.days!=null && row.days<=30 ? 'warn' : 'muted') : 'ok'}">${esc(row.issues.length?row.issues[0].label:'OK')}</span></td>
    </tr>`).join('') : '<tr><td colspan="10" style="padding:14px;color:#7489a4;text-align:center">Nenhum título cadastrado.</td></tr>';

  return `<div class="rf-page premium-rf-page">
    <div class="premium-rf-header">
      <div><div class="premium-rf-kicker">Carteira · acompanhamento</div><h1 class="premium-rf-title">Renda Fixa</h1><div class="premium-rf-subtitle">Visão consolidada das posições, vencimentos e movimentações.</div></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button type="button" class="btn bs ds-button ds-button--secondary" onclick="openQuickMovement('renda-fixa')" style="min-height:44px">Atualizar valor</button>
        <button type="button" class="btn bp ds-button ds-button--primary" onclick="openQuickMovement('renda-fixa')" style="min-height:44px">+ Nova aplicação</button>
      </div>
    </div>
    <div class="premium-rf-grid">
      <div class="premium-rf-panel ds-panel ds-panel--readonly">
        <div class="premium-rf-panel-head"><div><div class="premium-rf-panel-title">Posições de Renda Fixa</div><div class="premium-rf-panel-sub">Atual e resultado derivados do valor oficial de cada título.</div></div><div class="premium-rf-panel-badge">${trustRows.length}/${count} posições</div></div>
        <div class="premium-rf-controls" aria-label="Controles de leitura de renda fixa">
          <label><span>Buscar</span><input type="search" aria-label="Buscar título de renda fixa" placeholder="Nome, emissor ou indexador" value="${esc(S.rfSearch||'')}" oninput="setRfTrustSearch(this.value)"></label>
          <label><span>Status do valuation</span><select aria-label="Filtrar status do valuation" onchange="setRfTrustFilter(this.value)">
            <option value="all" ${S.rfTrustFilter==='all'?'selected':''}>Todos</option>
            <option value="MANUAL_AUTHORITATIVE" ${S.rfTrustFilter==='MANUAL_AUTHORITATIVE'?'selected':''}>Valor manual</option>
            <option value="REFERENCE_SHADOW" ${S.rfTrustFilter==='REFERENCE_SHADOW'?'selected':''}>Referência shadow</option>
            <option value="UNSUPPORTED" ${S.rfTrustFilter==='UNSUPPORTED'?'selected':''}>Sem cálculo automático</option>
            <option value="UNAVAILABLE" ${S.rfTrustFilter==='UNAVAILABLE'?'selected':''}>Indisponível</option>
            <option value="STALE" ${S.rfTrustFilter==='STALE'?'selected':''}>Desatualizada</option>
          </select></label>
          <label><span>Ordenar</span><select aria-label="Ordenar posições de renda fixa" onchange="setRfTrustSort(this.value)">
            <option value="name-asc" ${S.rfSort==='name-asc'?'selected':''}>Nome A–Z</option>
            <option value="value-desc" ${S.rfSort==='value-desc'?'selected':''}>Maior valor</option>
            <option value="value-asc" ${S.rfSort==='value-asc'?'selected':''}>Menor valor</option>
            <option value="maturity-asc" ${S.rfSort==='maturity-asc'?'selected':''}>Vencimento próximo</option>
            <option value="issuer-asc" ${S.rfSort==='issuer-asc'?'selected':''}>Instituição A–Z</option>
          </select></label>
        </div>
        <div class="premium-rf-position-list">${positionRows}</div>
      </div>
      <div class="premium-rf-panel ds-panel ds-panel--readonly">
        <div class="premium-rf-panel-head"><div><div class="premium-rf-panel-title">Próximos vencimentos</div><div class="premium-rf-panel-sub">Datas registradas na carteira.</div></div><div class="premium-rf-panel-badge">${data.maturityRows.length}</div></div>
        <div class="premium-rf-maturity-list">${maturityRows}</div>
      </div>
    </div>
    <details class="premium-rf-secondary-overview sec ds-panel ds-panel--readonly">
      <summary><div><div class="sec-title">Resumo e confiabilidade</div><div class="sec-meta">Indicadores agregados e diagnósticos de cobertura, fonte e vencimentos.</div></div><div class="sec-meta">Abrir detalhes</div></summary>
      <div class="sec-body" style="display:grid;gap:12px">
        <div class="premium-rf-kpis">${kpis.join('')}</div>
        <section class="premium-rf-trust-bar" aria-labelledby="rf-trust-title">
          <div class="premium-rf-trust-copy"><strong id="rf-trust-title">Confiança da leitura</strong><span>Valor manual continua sendo a autoridade; referências shadow não alteram o patrimônio.</span></div>
          <div class="premium-rf-trust-counts" aria-label="Resumo dos status de valuation">
            <span class="premium-rf-trust-count">Manual <b>${trustSummary.manualCount||0}</b></span>
            <span class="premium-rf-trust-count">Shadow <b>${trustSummary.shadowCount||0}</b></span>
            <span class="premium-rf-trust-count">Sem cálculo <b>${trustSummary.unsupportedCount||0}</b></span>
            <span class="premium-rf-trust-count">Indisponível <b>${trustSummary.unavailableCount||0}</b></span>
            ${trustSummary.staleCount ? `<span class="premium-rf-trust-count warn">Desatualizada <b>${trustSummary.staleCount}</b></span>` : ''}
          </div>
        </section>
        ${ipcaDiagnosticsHtml}
        ${data.missingCurrent>0 ? `<div class="premium-note">Sem rendimento atualizado. Informe o valor bruto ou líquido atual da corretora para acompanhar a rentabilidade.</div>` : ''}
        ${summaryStrip}
        ${reviewQueueHtml}
    <div class="premium-rf-distribution">
      <div class="premium-rf-panel ds-panel ds-panel--readonly"><div class="premium-rf-panel-head"><div><div class="premium-rf-panel-title">Distribuição por indexador</div><div class="premium-rf-panel-sub">Somente indexadores informados nos títulos.</div></div></div>${distributionRows(data.indexerRows,'indexer')}</div>
      <div class="premium-rf-panel ds-panel ds-panel--readonly"><div class="premium-rf-panel-head"><div><div class="premium-rf-panel-title">Distribuição por emissor</div><div class="premium-rf-panel-sub">Somente emissores cadastrados.</div></div></div>${distributionRows(data.issuerRows,'issuer')}</div>
    </div>
    <details class="sec ds-panel ds-panel--readonly" style="margin-top:0">
      <summary><div><div class="sec-title">Detalhes e alertas</div><div class="sec-meta">Vencimentos, dados incompletos e leitura por título.</div></div><div class="sec-meta">${data.alertRows.length} alertas · clique para abrir</div></summary>
      <div class="sec-body" style="padding-top:10px">
        <div class="rf-grid">
          <div class="rf-panel ds-panel ds-panel--readonly"><div class="rf-panel-head"><div><div class="rf-panel-title">Alertas inteligentes</div><div class="rf-panel-sub">Itens que precisam de revisão antes de confiar no cálculo.</div></div><div class="rf-panel-badge ds-badge">${data.alertRows.length} itens</div></div><div class="rf-preview-list">${alertRows}</div></div>
          <div class="rf-panel ds-panel ds-panel--readonly"><div class="rf-panel-head"><div><div class="rf-panel-title">Tipos cadastrados</div><div class="rf-panel-sub">Separação por subtipo.</div></div></div><div class="premium-income-list">${typeRows}</div></div>
        </div>
      </div>
    </details>

    <details class="sec ds-panel ds-panel--readonly" style="margin-top:0">
      <summary>
        <div>
          <div class="sec-title">Leitura por título</div>
          <div class="sec-meta">Resultado estimado com base apenas nos valores já informados.</div>
        </div>
        <div class="sec-meta">${data.previewRows.length} destaques · clique para abrir</div>
      </summary>
      <div class="sec-body" style="padding-top:10px">
        <div class="rf-preview-list">${previewRows}</div>
        <div class="rf-note">A estimativa não inventa rendimento: se faltar valor atual, taxa ou vencimento, o ativo fica como dados incompletos.</div>
      </div>
    </details>

    </div>
    </details>

    <details class="sec ds-panel ds-panel--readonly" style="margin-top:2px">
      <summary>
        <div>
          <div class="sec-title">Detalhamento dos títulos</div>
          <div class="sec-meta">lista completa dos ativos de renda fixa com aplicado, atual, resultado e vencimento</div>
        </div>
        <div class="sec-meta">${data.tableRows.length} títulos · clique para abrir</div>
      </summary>
      <div class="sec-body">
        <div class="rf-table-wrap">
          <table class="rf-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Tipo</th>
                <th class="rf-right">Aplicado</th>
                <th class="rf-right">Atual</th>
                <th class="rf-right">Resultado de mercado</th>
                <th class="rf-right">Rendimentos recebidos</th>
                <th class="rf-right">Resultado total</th>
                <th class="rf-right">Rentab.</th>
                <th>Vencimento</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
    </details>

    <details class="sec ds-panel ds-panel--readonly" style="margin-top:2px"${(S.rfEventEditor||S.rfMovementEditor)?' open':''}>
      <summary>
        <div>
          <div class="sec-title">Histórico de Renda Fixa</div>
          <div class="sec-meta">auditoria de eventos de renda fixa sem alterar ainda os cálculos consolidados</div>
        </div>
        <div class="sec-meta">${data.tableRows.length} títulos · clique para expandir</div>
      </summary>
      <div class="sec-body">
        ${eventCards}
      </div>
    </details>
  </div>`;
}
