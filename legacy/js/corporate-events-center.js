/* Read-only Corporate Events Center view model and renderer. */
(function (root, factory) {
  const Shadow = (typeof module !== 'undefined' && module.exports) ? require('./corporate-events-shadow') : root.CorporateEventsShadow;
  const api = factory(Shadow);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CorporateEventsCenter = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Shadow) {
  const escDefault = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const label = value => String(value || 'UNKNOWN').replace(/_/g, ' ');
  function buildViewModel({ events = [], positions = {} } = {}) {
    const result = Shadow.processShadowEvents(events, { positions });
    const rows = result.reconciliations.map(item => ({
      ...item,
      event: item.event,
      status: item.status,
      asset: item.event.assetAfter || item.event.assetBefore || '—',
      transform: item.event.eventType,
      impact: item.expectedQuantity == null ? 'UNKNOWN' : `${item.currentOfficialQuantity ?? '—'} → ${item.expectedQuantity}`
    }));
    return {
      ...result,
      events: rows,
      summary: {
        detected: rows.length,
        reconciled: rows.filter(row => row.status === 'MATCH' || row.status === 'MISMATCH').length,
        matches: rows.filter(row => row.status === 'MATCH').length,
        mismatches: rows.filter(row => row.status === 'MISMATCH').length,
        reviewRequired: rows.filter(row => row.status === 'REVIEW_REQUIRED').length + result.conflicts.length,
        unsupported: rows.filter(row => row.event.status === 'UNSUPPORTED').length,
        writes: result.writes
      }
    };
  }
  function render(vm, { escape = escDefault } = {}) {
    const summary = vm.summary || {};
    const rowsData = vm.events || [];
    const years = [...new Set(rowsData.map(row => String(row.event.eventDate || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    const types = [...new Set(rowsData.map(row => row.event.eventType).filter(Boolean))].sort();
    const statuses = [...new Set(rowsData.map(row => row.status).filter(Boolean))].sort();
    const cards = [
      ['Eventos detectados', summary.detected || 0], ['Reconciliados', summary.reconciled || 0], ['Matches', summary.matches || 0],
      ['Divergências', summary.mismatches || 0], ['Revisão necessária', summary.reviewRequired || 0], ['Sem suporte', summary.unsupported || 0]
    ].map(([title, value]) => `<div class="corporate-events-summary-card"><span>${escape(title)}</span><strong>${escape(value)}</strong></div>`).join('');
    const rows = rowsData.map(row => `<article class="corporate-event-row" data-status="${escape(row.status)}" data-year="${escape(String(row.event.eventDate || '').slice(0, 4))}" data-type="${escape(row.event.eventType)}" data-asset="${escape(row.asset)}">
      <div><strong>${escape(row.asset)}</strong><span>${escape(row.event.eventDate || 'Data desconhecida')}</span></div>
      <div><strong>${escape(label(row.transform))}</strong><span>${escape(row.impact)}</span></div>
      <div><span class="corporate-event-status corporate-event-status-${escape(row.status)}">${escape(label(row.status))}</span><span>${escape(label(row.event.classificationConfidence))}</span></div>
      <div><strong>Proveniência</strong><span>${escape(row.event.provenance.source)}${row.event.provenance.sourceReference ? ` · ${escape(row.event.provenance.sourceReference)}` : ''}</span></div>
      <div class="corporate-event-row-actions"><button type="button" class="btn bgh" aria-expanded="false" onclick="this.closest('.corporate-event-row')?.querySelector('.corporate-event-detail')?.toggleAttribute('hidden');this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')!=='true')" data-corporate-event-detail="${escape(row.event.eventId)}">Detalhes</button>${row.status === 'REVIEW_REQUIRED' || row.status === 'MISMATCH' ? '<button type="button" class="btn bgh" aria-expanded="false" onclick="this.closest(\'.corporate-event-row\')?.querySelector(\'.corporate-event-review\')?.toggleAttribute(\'hidden\');this.setAttribute(\'aria-expanded\',this.getAttribute(\'aria-expanded\')!==\'true\')" data-corporate-event-review="true">Revisar</button>' : ''}</div>
      <div class="corporate-event-detail" hidden><strong>Detalhes da simulação</strong><span>Antes: ${escape(row.currentOfficialQuantity ?? 'UNKNOWN')} · Esperado: ${escape(row.expectedQuantity ?? 'UNKNOWN')} · Diferença: ${escape(row.difference ?? 'UNKNOWN')}</span><span>Fonte: ${escape(row.event.provenance.source)} · Confiança: ${escape(label(row.event.classificationConfidence))}</span></div>
      ${row.status === 'REVIEW_REQUIRED' || row.status === 'MISMATCH' ? '<div class="corporate-event-review" hidden><strong>Revisão necessária</strong><span>Não há aplicação automática. Confirme apenas com evidência externa suficiente.</span></div>' : ''}
    </article>`).join('');
    const empty = rowsData.length ? '' : '<div class="corporate-events-empty">Nenhum evento societário disponível nesta cobertura.</div>';
    const options = (values, allLabel) => `<option value="">${escape(allLabel)}</option>${values.map(value => `<option value="${escape(value)}">${escape(label(value))}</option>`).join('')}`;
    return `<section class="corporate-events-center" aria-labelledby="corporate-events-center-title">
      <header class="corporate-events-center-head"><div><span class="eyebrow">Auditoria societária</span><h1 id="corporate-events-center-title">Corporate Events</h1><p>Descoberta, simulação e reconciliação somente leitura. A posição oficial continua soberana.</p></div><span class="corporate-events-readonly-badge">SHADOW · 0 writes</span></header>
      <div class="corporate-events-summary" aria-label="Resumo de eventos">${cards}</div>
      <div class="corporate-events-filters" aria-label="Filtros de eventos"><label>Ano<select aria-label="Filtrar por ano" data-corporate-event-year onchange="filterCorporateEventsCenter(this)">${options(years, 'Todos os anos')}</select></label><label>Tipo<select aria-label="Filtrar por tipo" data-corporate-event-type onchange="filterCorporateEventsCenter(this)">${options(types, 'Todos os tipos')}</select></label><label>Status<select aria-label="Filtrar por status" data-corporate-event-status onchange="filterCorporateEventsCenter(this)">${options(statuses, 'Todos os status')}</select></label><label>Ativo<input aria-label="Buscar ativo" data-corporate-event-asset placeholder="Ticker ou ativo" oninput="filterCorporateEventsCenter(this)"></label></div>
      <div class="corporate-events-legend"><span>Impacto esperado</span><span>Proveniência</span><span>Reconciliação</span><span>Sem aplicação automática</span></div>
      <div class="corporate-events-list" aria-label="Lista de eventos societários">${rows || empty}</div>
      <aside class="corporate-events-review-queue" aria-label="Fila de revisão"><strong>Corporate Events — Revisar</strong><span>${summary.reviewRequired || 0} item(ns) aguardando evidência adicional. Ratios, custo e taxação desconhecidos não são inferidos.</span></aside>
    </section>`;
  }
  function filterCorporateEventsCenter(control) {
    const section = control?.closest('.corporate-events-center');
    if (!section) return;
    const year = section.querySelector('[data-corporate-event-year]')?.value || '';
    const type = section.querySelector('[data-corporate-event-type]')?.value || '';
    const status = section.querySelector('[data-corporate-event-status]')?.value || '';
    const asset = (section.querySelector('[data-corporate-event-asset]')?.value || '').trim().toUpperCase();
    section.querySelectorAll('.corporate-event-row').forEach(row => {
      row.hidden = Boolean((year && row.dataset.year !== year) || (type && row.dataset.type !== type) || (status && row.dataset.status !== status) || (asset && !row.dataset.asset.includes(asset)));
    });
  }
  return { buildViewModel, render, filterCorporateEventsCenter };
});
