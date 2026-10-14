'use strict';

/**
 * Executive Reconciliation Panel — Transparent gap disclosure
 *
 * Shows official vs detailed totals with clear gap explanation.
 * Calm UX, no alarming error language.
 */

(function exposeExecutiveReconciliation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.dashboardExecutiveReconciliation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createExecutiveReconciliation() {
  const esc = s => String(s ?? '').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
  const fmt = v => v === null || v === undefined || !Number.isFinite(v) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Official certified values (from Package 1A)
  const OFFICIAL_TOTAL = 569316.83;
  const OFFICIAL_RV = 361023.63;
  const OFFICIAL_RF = 208293.20;
  const OFFICIAL_AS_OF = '10/10/2026';

  function render({ detailTotal, detailRV, detailRF, gapTotal, gapRV, gapRF, hideValues, asOf }) {
    const officialTotal = OFFICIAL_TOTAL;
    const officialRV = OFFICIAL_RV;
    const officialRF = OFFICIAL_RF;

    const dTotal = detailTotal ?? 0;
    const dRV = detailRV ?? 0;
    const dRF = detailRF ?? 0;
    const gTotal = gapTotal ?? (officialTotal - dTotal);
    const gRV = gapRV ?? (officialRV - dRV);
    const gRF = gapRF ?? (officialRF - dRF);
    const refDate = asOf || OFFICIAL_AS_OF;

    const gapTotalAbs = Math.abs(gTotal);
    const gapRVAbs = Math.abs(gRV);
    const gapRFAbs = Math.abs(gRF);

    const status = gTotal === 0 ? 'CONCILIADO' : 'PARCIAL';
    const statusBadge = status === 'CONCILIADO' ? 'ds-badge--official' : 'ds-badge--partial';

    return `
    <section class="dashboard-executive-reconciliation" aria-label="Reconciliação oficial vs detalhamento">
      <div class="executive-panel-head">
        <div>
          <div class="executive-panel-title-row">
            <h2 class="executive-panel-title">Reconciliação Oficial</h2>
            <span class="ds-badge ${statusBadge}">${status}</span>
          </div>
          <div class="executive-panel-sub">
            Referência: ${esc(refDate)} · Fonte: Extrato Inter oficial
            ${S?.hideValues ? ' · <span class="ds-badge ds-badge--info">VALORES OCULTOS</span>' : ''}
          </div>
        </div>
      </div>

      <div class="executive-reconciliation-grid">
        <!-- Total -->
        <div class="executive-reconciliation-card executive-reconciliation-total">
          <div class="executive-reconciliation-header">
            <span class="executive-reconciliation-label">Patrimônio Total</span>
            <span class="ds-badge ds-badge--official">OFICIAL</span>
          </div>
          <div class="executive-reconciliation-value-row">
            <span class="executive-reconciliation-detail-label">Detalhado</span>
            <strong class="executive-reconciliation-detail-value">${hideValues ? '—' : fmt(dTotal)}</strong>
          </div>
          <div class="executive-reconciliation-value-row executive-reconciliation-official">
            <span class="executive-reconciliation-official-label">Total Oficial</span>
            <strong class="executive-reconciliation-official-value">${hideValues ? '—' : fmt(officialTotal)}</strong>
          </div>
          <div class="executive-reconciliation-gap ${gTotal >= 0 ? 'gap-positive' : 'gap-negative'}">
            <span class="executive-reconciliation-gap-label">Diferença</span>
            <span class="executive-reconciliation-gap-value">${gTotal >= 0 ? '+' : ''}${fmt(gTotal)}</span>
          </div>
        </div>

        <!-- RV -->
        <div class="executive-reconciliation-card">
          <div class="executive-reconciliation-header">
            <span class="executive-reconciliation-label">Renda Variável</span>
            <span class="ds-badge ds-badge--official">OFICIAL</span>
          </div>
          <div class="executive-reconciliation-value-row">
            <span class="executive-reconciliation-detail-label">Detalhado</span>
            <strong class="executive-reconciliation-detail-value">${hideValues ? '—' : fmt(detailRV ?? 0)}</strong>
          </div>
          <div class="executive-reconciliation-value-row executive-reconciliation-official">
            <span class="executive-reconciliation-official-label">RV Oficial</span>
            <strong class="executive-reconciliation-official-value">${hideValues ? '—' : fmt(OFFICIAL_RV)}</strong>
          </div>
          <div class="executive-reconciliation-gap ${gRV >= 0 ? 'gap-positive' : 'gap-negative'}">
            <span class="executive-reconciliation-gap-label">Diferença</span>
            <span class="executive-reconciliation-gap-value">${gRV >= 0 ? '+' : ''}${fmt(gRV)}</span>
          </div>
        </div>

        <!-- RF -->
        <div class="executive-reconciliation-card">
          <div class="executive-reconciliation-header">
            <span class="executive-reconciliation-label">Renda Fixa</span>
            <span class="ds-badge ds-badge--official">OFICIAL</span>
          </div>
          <div class="executive-reconciliation-value-row">
            <span class="executive-reconciliation-detail-label">Detalhado</span>
            <strong class="executive-reconciliation-detail-value">${hideValues ? '—' : fmt(detailRF ?? 0)}</strong>
          </div>
          <div class="executive-reconciliation-value-row executive-reconciliation-official">
            <span class="executive-reconciliation-official-label">RF Oficial</span>
            <strong class="executive-reconciliation-official-value">${hideValues ? '—' : fmt(OFFICIAL_RF)}</strong>
          </div>
          <div class="executive-reconciliation-gap ${gRF >= 0 ? 'gap-positive' : 'gap-negative'}">
            <span class="executive-reconciliation-gap-label">Diferença</span>
            <span class="executive-reconciliation-gap-value">${gRF >= 0 ? '+' : ''}${fmt(gRF)}</span>
          </div>
        </div>
      </div>

      <div class="executive-reconciliation-explanation">
        <details class="executive-reconciliation-details">
          <summary class="executive-reconciliation-summary">
            <span>Entender a diferença</span>
            <span class="executive-reconciliation-chevron" aria-hidden="true">▾</span>
          </summary>
          <div class="executive-reconciliation-details-body">
            <p><strong>Total oficial</strong> vem do extrato consolidado da Inter (${esc(OFFICIAL_AS_OF)}). É o valor de referência da conta.</p>
            <p><strong>Detalhado</strong> é a soma dos valores individuais das posições que conseguimos importar/ler dos relatórios de posição.</p>
            <p><strong>Diferença (Gap)</strong> pode ocorrer por:</p>
            <ul>
              <li>Juros acumulados não refletidos no detalhe das posições</li>
              <li>Posições sem valor atual informado no relatório de posição</li>
              <li>Diferença de data-base entre extrato consolidado e relatório de posição</li>
              <li>Arredondamentos ou casas decimais não visíveis</li>
            </ul>
            <p class="executive-reconciliation-note"><strong>Importante:</strong> O gap não significa dinheiro perdido. O total oficial continua sendo a autoridade para o patrimônio da conta.</p>
            <p class="executive-reconciliation-note">A reconciliação permanece <strong>PARCIAL</strong> até que todas as posições tenham valor atual certificado.</p>
          </div>
        </details>
      </div>

      <div class="executive-reconciliation-footer">
        <span class="ds-badge ds-badge--partial">RECONCILIAÇÃO PARCIAL</span>
        <span class="ds-badge ds-badge--info">NÃO É ERRO</span>
        ${S?.hideValues ? '<span class="ds-badge ds-badge--info">VALORES OCULTOS</span>' : ''}
      </div>
    </section>
    `;
  }

  return { render };
});