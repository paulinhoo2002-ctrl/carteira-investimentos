'use strict';
// ============================================================================
// IR2026 — IRPF product experience (P23-P26): top cards, document-missing
// panel (from blockers), per-asset and per-month detail. Renders from SAFE
// snapshot data (counts/statuses/hashes); unknown is never zero; technical
// audit stays available via fiscal-product.explainFiscalValue.
// States: CERTIFICADO | PARCIAL | EM RECONSTRUCAO | BLOQUEADO POR EVIDENCIA.
// ============================================================================

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '\\u0026amp;',
    '<': '\\u0026lt;',
    '>': '\\u0026gt;',
    '"': '\\u0026quot;',
    "'": '\\u0026#39;',
  }[c]));
}

function statusBadge(status) {
  const tone = { CERTIFICADO: 'ok', PARCIAL: 'warn', 'EM RECONSTRUÇÃO': 'info', 'BLOQUEADO POR EVIDÊNCIA': 'bad' };
  return `<span class="irpf-badge ${tone[status] || ''}">${esc(status)}</span>`;
}

function moneyOrUnknown(cents, status) {
  if (cents === null || cents === undefined || status === 'UNKNOWN' || status === 'BLOQUEADO POR EVIDÊNCIA') return 'Não certificado';
  return 'R$ ' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

/** P23 — top cards from a safe snapshot. */
function renderSummaryCards(s) {
  const coverage = s.OPENING_COVERAGE || {};
  const held = coverage.OPENING_HELD_CANDIDATES || 0;
  const certified = coverage.OPENING_CERTIFIED || 0;
  const fiscalState = certified === held && held > 0 ? 'CERTIFICADO'
    : (coverage.OPENING_UNKNOWN || 0) > 0 ? 'BLOQUEADO POR EVIDÊNCIA'
    : held > 0 ? 'EM RECONSTRUÇÃO' : 'PARCIAL';
  const cards = [
    ['Situação fiscal 2026', statusBadge(fiscalState)],
    ['Cobertura fiscal', `${esc(String(coverage.OPENING_COST_COVERAGE_PERCENT ?? '—'))}% do custo com evidência derivada`],
    ['Vendas analisadas', esc(String(s.SALES_2026?.TOTAL ?? '—'))],
    ['Resultado realizado certificado', 'Não certificado'],
    ['IRRF identificado', 'Não certificado'],
    ['Prejuízos acumulados', 'Não certificado'],
    ['Imposto calculável?', s.TAX_PAYABLE_STATUS === 'NOT_CALCULATED' ? 'Não — aguardando evidências' : esc(s.TAX_PAYABLE_STATUS)],
  ];
  return `<div class="irpf-cards">${cards.map(([t, v]) =>
    `<div class="irpf-card"><div class="irpf-card-title">${esc(t)}</div><div class="irpf-card-value">${v}</div></div>`).join('')}</div>`;
}

/** P24 — document missing panel generated from blockers checklist. */
function renderDocumentChecklist(checklist) {
  if (!checklist || !checklist.length) return '<div class="irpf-docpanel">Tudo certo — nenhum documento pendente.</div>';
  const unlocks = { MISSING_OPENING_COST: 'certifica custo de abertura e desbloqueia resultados realizados',
    MISSING_OPENING_QTY: 'certifica quantidades de abertura', MISSING_SALE_AMOUNT: 'confirma se as movimentações sem valor são vendas reais',
    MISSING_FEES: 'precisa das taxas por operação para o resultado líquido exato', MISSING_IRRF: 'habilita a compensação do imposto retido',
    MISSING_PRIOR_LOSS: 'habilita compensação de prejuízos anteriores', LENDING_CUSTODY_UNPRICED: 'confirma movimentações de custódia/empréstimo' };
  return `<div class="irpf-docpanel"><h3>Precisamos destes documentos para terminar seu IR 2026</h3><ol>${checklist.map((c) =>
    `<li><b>${esc(c.TITLE)}</b> — libera: ${esc(unlocks[c.CODE] || 'desbloqueia evidência fiscal')}.
     Resolver com: ${c.RESOLVED_BY.map(esc).join(', ')}.</li>`).join('')}</ol></div>`;
}

/** P25 — per-asset fiscal detail rows (from a SAFE snapshot; unknown shows Não certificado). */
function renderAssetDetail(assetRows) {
  return `<table class="irpf-asset-table"><thead><tr><th>Ativo</th><th>Qtde abertura</th><th>Custo abertura</th><th>Vendas 2026</th><th>Resultado</th><th>Status</th></tr></thead><tbody>${(assetRows || []).map((a) =>
    `<tr><td>${esc(a.ASSET)}</td><td>${esc(a.OPENING_QTY ?? 'Não certificado')}</td><td>${moneyOrUnknown(a.OPENING_TOTAL_COST_CENTS, a.COST_REPLAY_STATUS)}</td><td>${esc(String(a.SELLS_2026 ?? 0))}</td><td>${moneyOrUnknown(a.REALIZED_CENTS, a.REALIZED_STATUS)}</td><td>${statusBadge(a.OPENING_STATUS === 'DERIVED' ? 'EM RECONSTRUÇÃO' : a.OPENING_STATUS === 'PARTIAL' ? 'PARCIAL' : 'BLOQUEADO POR EVIDÊNCIA')}</td></tr>`).join('')}</tbody></table>`;
}

/** P26 — per-month table; unknown fields show Não certificado, never R$0. */
function renderMonthlyTable(monthlyRows) {
  return `<table class="irpf-month-table"><thead><tr><th>Mês</th><th>Vendas</th><th>Ganhos</th><th>Perdas</th><th>IRRF</th><th>Imposto</th><th>Status</th></tr></thead><tbody>${(monthlyRows || []).map((m) =>
    `<tr><td>${esc(m.MONTH)}</td><td>${moneyOrUnknown(m.SALES_GROSS_CENTS, m.SALES_STATUS)}</td><td>${moneyOrUnknown(m.GAINS_CENTS, m.SALES_STATUS)}</td><td>${moneyOrUnknown(m.LOSSES_CENTS, m.SALES_STATUS)}</td><td>Não certificado</td><td>${esc(m.TAX_DUE === 'NOT_CALCULATED' ? 'Não calculado' : esc(String(m.TAX_DUE)))}</td><td>${statusBadge(m.STATUS === 'SIMULATION_ONLY' ? 'EM RECONSTRUÇÃO' : m.STATUS === 'PARTIAL' ? 'PARCIAL' : 'BLOQUEADO POR EVIDÊNCIA')}</td></tr>`).join('')}</tbody></table>`;
}

module.exports = { renderSummaryCards, renderDocumentChecklist, renderAssetDetail, renderMonthlyTable, statusBadge };
