'use strict';

/**
 * IR2026 fiscal readiness UI contract.
 * Renders the blocked tax state honestly — never shows R$ 0,00 for unknown tax.
 * UNKNOWN is never zero. TAX_DUE is always "Não calculado" until evidence gates pass.
 */
const READINESS_SNAPSHOT = Object.freeze({
  ENGINE: 'READY',
  DRY_RUN: 'COMPLETE',
  OPENING: { QTY_CERTIFIED: 0, QTY_PARTIAL: 44, QTY_UNKNOWN: 235,
    COST_CERTIFIED: 0, COST_PARTIAL: 0, COST_RECONSTRUCTABLE: 0, COST_UNKNOWN: 279 },
  SALES: { ANALYZED: 61, CERTIFIED: 0, BLOCKED: 61 },
  RULES: { TOTAL: 26, CERTIFIED: 0, PARTIAL_LEGAL_EVIDENCE: 19, NEEDS_MORE_SOURCE: 7 },
  TAX_DUE: 'NOT_CALCULATED',
  IR_CALCULATION_READY: 'BLOCKED',
});

const STATUS_LABEL = Object.freeze({
  READY: 'Pronto', PARTIAL: 'Parcial', BLOCKED: 'Bloqueado',
  UNKNOWN: 'Desconhecido', NOT_APPLICABLE: 'Não aplicável',
  NOT_CALCULATED: 'Não calculado',
});

const STATUS_TONE = Object.freeze({
  READY: 'ok', PARTIAL: 'warn', BLOCKED: 'danger',
  UNKNOWN: 'muted', NOT_APPLICABLE: 'muted', NOT_CALCULATED: 'danger',
});

function taxDueLabel() {
  // P9: UNKNOWN must never render as zero or a monetary value
  return STATUS_LABEL[READINESS_SNAPSHOT.TAX_DUE];
}

function buildSummaryCards() {
  const s = READINESS_SNAPSHOT;
  return [
    { id: 'engine',    label: 'Motor fiscal',            status: 'READY',    detail: 'Engine determinística, fail-closed' },
    { id: 'dryrun',    label: 'Dry-run 2026',            status: 'READY',    detail: 'Executado com dados reais, hash verificável' },
    { id: 'opening',   label: 'Abertura fiscal',          status: 'BLOCKED',  detail: 'Posição/custo em 31/12/2025 ausentes' },
    { id: 'results',   label: 'Resultados realizados',   status: 'BLOCKED',  detail: `${s.SALES.CERTIFIED} de ${s.SALES.ANALYZED} certificados` },
    { id: 'rules',     label: 'Regras tributárias',      status: 'PARTIAL',  detail: `${s.RULES.CERTIFIED} de ${s.RULES.TOTAL} certificadas` },
    { id: 'taxdue',    label: 'Imposto devido',          status: 'BLOCKED',  detail: taxDueLabel() },
  ];
}

function buildBlockers() {
  const s = READINESS_SNAPSHOT;
  return [
    'Posição e custo fiscal de 31/12/2025 ausentes',
    `${s.SALES.ANALYZED} vendas sem resultado fiscal certificado`,
    'Prejuízos anteriores desconhecidos',
    'Taxas e IRRF sem evidência',
    `${s.RULES.TOTAL} regras tributárias ainda não certificadas`,
  ];
}

function buildEvidenceChecklist() {
  return [
    { id: 'pos-2025',     label: 'Posição oficial em 31/12/2025',        status: 'MISSING' },
    { id: 'cost-2025',    label: 'Custo médio/fiscal em 31/12/2025',      status: 'MISSING' },
    { id: 'annual-2025', label: 'Relatório anual de investimentos 2025',  status: 'MISSING' },
    { id: 'loss-carry',   label: 'Controle de prejuízos anteriores',      status: 'MISSING' },
    { id: 'irrf-report',  label: 'Relatório de IRRF',                      status: 'MISSING' },
    { id: 'fees',         label: 'Taxas/custos de corretagem',            status: 'MISSING' },
    { id: 'transfers',    label: 'Evidência de transferências',           status: 'MISSING' },
    { id: 'corp-actions', label: 'Eventos corporativos relevantes',       status: 'MISSING' },
  ];
}

function buildPriorityActions() {
  return [
    { rank: 1, action: 'Enviar posição e custo fiscal de 31/12/2025',
      reason: 'Bloqueia todas as 61 vendas de serem certificadas fiscalmente', status: 'CRITICAL' },
    { rank: 2, action: 'Enviar relatório de taxas/corretagem',
      reason: 'Necessário para custo de aquisição e resultado realizado', status: 'HIGH' },
    { rank: 3, action: 'Enviar evidência de transferências e eventos corporativos',
      reason: 'Bloqueia 45 e 27 vendas respectivamente', status: 'MEDIUM' },
  ];
}

function buildSaleCoverage() {
  const s = READINESS_SNAPSHOT.SALES;
  return { analyzed: s.ANALYZED, certified: s.CERTIFIED, blocked: s.BLOCKED };
}

function buildOpeningCoverage() {
  const o = READINESS_SNAPSHOT.OPENING;
  return {
    qty: { certified: o.QTY_CERTIFIED, partial: o.QTY_PARTIAL, unknown: o.QTY_UNKNOWN },
    cost: { certified: o.COST_CERTIFIED, partial: o.COST_PARTIAL,
      reconstructable: o.COST_RECONSTRUCTABLE, unknown: o.COST_UNKNOWN },
  };
}

function buildRulesStatus() {
  const r = READINESS_SNAPSHOT.RULES;
  return {
    total: r.TOTAL, certified: r.CERTIFIED,
    partialLegalEvidence: r.PARTIAL_LEGAL_EVIDENCE, needsMoreSource: r.NEEDS_MORE_SOURCE,
    label: 'Validação tributária em andamento',
  };
}

/** Full contract object for the IRPF readiness panel. */
function buildReadinessContract() {
  return Object.freeze({
    topLevelStatus: 'BLOQUEADA',
    topLevelExplanation: 'Evidências fiscais insuficientes para calcular o imposto com segurança.',
    taxDueDisplay: taxDueLabel(),
    summaryCards: buildSummaryCards(),
    blockers: buildBlockers(),
    evidenceChecklist: buildEvidenceChecklist(),
    priorityActions: buildPriorityActions(),
    saleCoverage: buildSaleCoverage(),
    openingCoverage: buildOpeningCoverage(),
    rulesStatus: buildRulesStatus(),
    monthlyClose: Object.freeze({ months: 12, taxDuePerMonth: 'Não calculado' }),
  });
}

/** Render the readiness panel HTML. Escapes all values. */
function renderReadinessPanel(contract, escFn) {
  const esc = escFn || (v => String(v));
  const badge = (status) =>
    `<span class="irpf-badge ${STATUS_TONE[status] || ''}">${esc(STATUS_LABEL[status] || status)}</span>`;
  const cards = contract.summaryCards.map(c =>
    `<div class="irpf-summary-card ds-kpi ${STATUS_TONE[c.status]}">
      <div class="analysis-summary-kicker ds-kpi__label">${esc(c.label)}</div>
      <div class="analysis-summary-value ds-kpi__value">${esc(c.detail)}</div>
      <div class="analysis-summary-sub ds-kpi__context">${badge(c.status)}</div>
    </div>`).join('');
  const blockers = contract.blockers.map(b => `<li>${esc(b)}</li>`).join('');
  const checklist = contract.evidenceChecklist.map(item => {
    const statusLabel = item.status === 'MISSING' ? 'Ausente' :
      item.status === 'PARTIAL' ? 'Parcial' :
      item.status === 'AVAILABLE' ? 'Disponível' : 'Não aplicável';
    const cls = item.status === 'MISSING' ? 'danger' :
      item.status === 'PARTIAL' ? 'warn' : item.status === 'AVAILABLE' ? 'ok' : 'muted';
    return `<li><span class="irpf-badge ${cls}">${esc(statusLabel)}</span> ${esc(item.label)}</li>`;
  }).join('');
  const priorities = contract.priorityActions.map(p =>
    `<li><strong>${esc(p.action)}</strong><br><small>${esc(p.reason)}</small></li>`).join('');
  return `
    <div class="irpf-shell ir2026-readiness">
      <div class="irpf-head">
        <div>
          <div class="irpf-title">APURAÇÃO DO IR 2026</div>
          <div class="irpf-sub">${esc(contract.topLevelExplanation)}</div>
        </div>
        <span class="irpf-badge danger">BLOQUEADA</span>
      </div>
      <div class="irpf-summary">${cards}</div>
      <div class="irpf-section">
        <h2 class="irpf-section-title">Por que o imposto está bloqueado</h2>
        <ul class="ir2026-blockers">${blockers}</ul>
      </div>
      <div class="irpf-section">
        <h2 class="irpf-section-title">Próxima ação de maior impacto</h2>
        <ol class="ir2026-priorities">${priorities}</ol>
      </div>
      <div class="irpf-section">
        <h2 class="irpf-section-title">Checklist de evidências</h2>
        <ul class="ir2026-checklist">${checklist}</ul>
      </div>
    </div>`;
}

module.exports = {
  READINESS_SNAPSHOT, STATUS_LABEL, STATUS_TONE,
  buildReadinessContract, renderReadinessPanel,
  taxDueLabel, buildSummaryCards, buildBlockers,
  buildEvidenceChecklist, buildPriorityActions,
  buildSaleCoverage, buildOpeningCoverage, buildRulesStatus,
};
