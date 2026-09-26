import { useMemo, useState, useCallback } from 'react';
import type { ReadOnlyPortfolioHistorySource } from './portfolioHistoryReadonlyContract.ts';
import type { ReadOnlyPortfolioHistoryAdapter } from './portfolioHistorySnapshotAdapter.ts';
import { DashboardMetricCard } from '../shared/components/DashboardMetricCard/DashboardMetricCard';
import { DashboardSection } from '../shared/components/DashboardSection/DashboardSection';
import { EmptyState } from '../shared/components/EmptyState/EmptyState';
import { ResponsiveDataList } from '../shared/components/ResponsiveDataList/ResponsiveDataList';
import { formatReadonlyCurrency, formatReadonlyPercent } from '../reports/readonlyReportsViewModel.ts';
import './PortfolioHistoryPage.css';

function formatDateTimeShort(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatDateOnly(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getCoverageLabel(coverage: string) {
  switch (coverage) {
    case 'FULL_COVERAGE':
      return 'Cobertura completa';
    case 'PARTIAL_COVERAGE':
      return 'Cobertura parcial';
    case 'UNKNOWN':
    default:
      return 'Sem cobertura de preço';
  }
}

function getCoverageClass(coverage: string) {
  switch (coverage) {
    case 'FULL_COVERAGE':
      return 'coverage-full';
    case 'PARTIAL_COVERAGE':
      return 'coverage-partial';
    case 'UNKNOWN':
    default:
      return 'coverage-unknown';
  }
}

function getSourceLabel(source: string) {
  switch (source) {
    case 'MANUAL':
      return 'Manual';
    case 'AUTO':
      return 'Automático';
    case 'IMPORT':
      return 'Importação';
    case 'RECOVERY':
      return 'Recuperação';
    default:
      return source;
  }
}

function getReadinessLabel(ready: boolean) {
  return ready ? 'Disponível' : 'Indisponível';
}

function getReadinessClass(ready: boolean) {
  return ready ? 'readiness-ready' : 'readiness-not-ready';
}

interface PortfolioHistoryPageProps {
  adapter: ReadOnlyPortfolioHistoryAdapter;
  captureHistorySnapshot?: () => Promise<{
    readonly status: 'CREATED' | 'DUPLICATE' | 'FAILED';
    readonly snapshot?: {
      readonly id: string;
      readonly capturedAt: string;
      readonly priceCoverage: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'UNKNOWN';
      readonly totalValue: number;
    };
    readonly reason?: string;
  }> | null;
}

export function PortfolioHistoryPage({ adapter, captureHistorySnapshot }: PortfolioHistoryPageProps) {
  const [captureTriggered, setCaptureTriggered] = useState(false);
  const [lastCaptureResult, setLastCaptureResult] = useState<{
    status: 'CREATED' | 'DUPLICATE' | 'FAILED';
    snapshot?: {
      id: string;
      capturedAt: string;
      priceCoverage: 'FULL_COVERAGE' | 'PARTIAL_COVERAGE' | 'UNKNOWN';
      totalValue: number;
    };
    reason?: string;
  } | null>(null);

  const snapshot = useMemo(() => adapter.getSnapshot(), [adapter]);

  const { snapshots, config } = snapshot;
  const hasSnapshots = snapshots.length > 0;
  const latestSnapshot = hasSnapshots ? snapshots[0] : null;
  const oldestSnapshot = hasSnapshots ? snapshots[snapshots.length - 1] : null;

  // Compute readiness/sufficiency (read-only, derived from snapshots + config)
  const readiness = useMemo(() => {
    if (!hasSnapshots) {
      return {
        overallState: 'NOT_STARTED',
        capabilities: {
          PORTFOLIO_EVOLUTION: { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS' },
          ALLOCATION_HISTORY: { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS' },
          VALUATION_HISTORY: { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS' },
          TWR: { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS' },
          XIRR: { ready: false, reason: 'INSUFFICIENT_SNAPSHOTS' },
        },
        snapshotCount: 0,
        historySpanDays: 0,
        priceCoverage: 'UNKNOWN',
        dailyCoverageRatio: 0,
        largestGapDays: 0,
        warnings: ['Histórico vazio — rastreamento automático começará no próximo ciclo elegível.'],
      };
    }

    // Price coverage analysis
    let full = 0, partial = 0, unknown = 0;
    for (const snap of snapshots) {
      if (snap.priceCoverage === 'FULL_COVERAGE') full++;
      else if (snap.priceCoverage === 'PARTIAL_COVERAGE') partial++;
      else unknown++;
    }
    const total = snapshots.length;
    const coverageRatio = total > 0 ? full / total : 0;
    let priceCoverageLevel = 'UNKNOWN';
    if (full === total) priceCoverageLevel = 'FULL_COVERAGE';
    else if (full > 0 || partial > 0) priceCoverageLevel = 'PARTIAL_COVERAGE';

    // History span
    const dates = snapshots.map(s => Date.parse(s.capturedAt)).filter(Number.isFinite);
    const first = dates.length ? Math.min(...dates) : null;
    const latest = dates.length ? Math.max(...dates) : null;
    const spanDays = first && latest ? Math.floor((latest - first) / 86400000) : 0;

    // Daily coverage
    const uniqueDays = new Set(snapshots.map(s => s.capturedAt.split('T')[0]));
    const observedDays = uniqueDays.size;
    const expectedDays = spanDays + 1;
    const dailyCoverageRatio = expectedDays > 0 ? observedDays / expectedDays : 0;

    // Largest gap
    const sortedDates = dates.sort((a, b) => a - b);
    let largestGapDays = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = Math.floor((sortedDates[i] - sortedDates[i-1]) / 86400000);
      if (gap > largestGapDays) largestGapDays = gap;
    }

    // Capability readiness (simplified client-side assessment)
    const capabilities = {
      PORTFOLIO_EVOLUTION: {
        ready: total >= 2 && spanDays >= 1 && priceCoverageLevel !== 'UNKNOWN',
        reason: total < 2 ? 'INSUFFICIENT_SNAPSHOTS' : spanDays < 1 ? 'SAME_DAY_SNAPSHOTS' : priceCoverageLevel === 'UNKNOWN' ? 'NO_PRICE_COVERAGE' : 'SUFFICIENT'
      },
      ALLOCATION_HISTORY: {
        ready: total >= 2 && snapshots.some(s => s.valuations.byAsset.length > 0) && priceCoverageLevel !== 'UNKNOWN',
        reason: total < 2 ? 'INSUFFICIENT_SNAPSHOTS' : !snapshots.some(s => s.valuations.byAsset.length > 0) ? 'NO_ASSET_BREAKDOWN' : priceCoverageLevel === 'UNKNOWN' ? 'NO_PRICE_COVERAGE' : 'SUFFICIENT'
      },
      VALUATION_HISTORY: {
        ready: total >= 2 && priceCoverageLevel === 'FULL_COVERAGE' && spanDays >= 7,
        reason: total < 2 ? 'INSUFFICIENT_SNAPSHOTS' : priceCoverageLevel !== 'FULL_COVERAGE' ? 'PARTIAL_PRICE_COVERAGE' : spanDays < 7 ? 'INSUFFICIENT_SPAN' : 'SUFFICIENT'
      },
      TWR: {
        ready: false,
        reason: 'REQUIRES_EXTERNAL_FLOWS_AND_HISTORY'
      },
      XIRR: {
        ready: false,
        reason: 'REQUIRES_DATED_CASH_FLOWS'
      },
    };

    const warnings = [];
    if (total === 1) warnings.push('Apenas 1 snapshot — histórico muito incipiente');
    if (priceCoverageLevel === 'UNKNOWN') warnings.push('Sem cobertura de preço em nenhum snapshot');
    else if (priceCoverageLevel === 'PARTIAL_COVERAGE') warnings.push('Cobertura de preço parcial — análises de valuation podem ser imprecisas');
    if (largestGapDays > 30) warnings.push(`Maior lacuna: ${largestGapDays} dias sem captura`);

    return {
      overallState: total === 0 ? 'NOT_STARTED' : 'BUILDING',
      capabilities,
      snapshotCount: total,
      historySpanDays: spanDays,
      priceCoverage: priceCoverageLevel,
      dailyCoverageRatio,
      largestGapDays,
      warnings,
    };
  }, [snapshots, hasSnapshots]);

  const handleCapture = useCallback(async () => {
    if (!captureHistorySnapshot) {
      setLastCaptureResult({ status: 'FAILED', reason: 'Ação de captura não disponível' });
      return;
    }
    setCaptureTriggered(true);
    setLastCaptureResult(null);
    try {
      const result = await captureHistorySnapshot();
      setLastCaptureResult(result);
    } catch (err) {
      setLastCaptureResult({ status: 'FAILED', reason: 'Erro inesperado ao capturar snapshot' });
    } finally {
      setCaptureTriggered(false);
    }
  }, [captureHistorySnapshot]);

  const handleCaptureKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCapture();
    }
  }, [handleCapture]);

  const autoTrackingEnabled = config?.autoCaptureEnabled !== false;
  const nextAutoCaptureHint = hasSnapshots && autoTrackingEnabled
    ? (() => {
        const last = snapshots.find(s => s.provenance?.walletId === 'default');
        if (!last) return null;
        const lastDay = last.capturedAt.split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        if (lastDay === today) return 'Próxima captura automática: amanhã';
        return 'Captura automática elegível hoje';
      })()
    : null;

  return (
    <div className="portfolio-history-page">
      <DashboardSection title="Histórico do Portfólio" subtitle={hasSnapshots ? `${snapshots.length} snapshot${snapshots.length !== 1 ? 's' : ''} registrad${snapshots.length !== 1 ? 'os' : 'o'}` : 'Nenhum snapshot capturado'}>
        <div className="portfolio-history-metrics">
          <DashboardMetricCard
            label="Snapshots"
            value={snapshots.length}
            variant="primary"
            size="large"
          />
          <DashboardMetricCard
            label="Última captura"
            value={latestSnapshot ? formatDateTimeShort(latestSnapshot.capturedAt) : '—'}
            variant="info"
            size="large"
          />
          <DashboardMetricCard
            label="Primeira captura"
            value={oldestSnapshot ? formatDateOnly(oldestSnapshot.capturedAt) : '—'}
            variant="info"
            size="large"
          />
          <DashboardMetricCard
            label="Cobertura de preço"
            value={latestSnapshot ? getCoverageLabel(latestSnapshot.priceCoverage) : '—'}
            variant={latestSnapshot ? (latestSnapshot.priceCoverage === 'FULL_COVERAGE' ? 'success' : latestSnapshot.priceCoverage === 'PARTIAL_COVERAGE' ? 'warning' : 'info') : 'info'}
            size="large"
          />
        </div>
      </DashboardSection>

      {/* Auto-tracking status panel */}
      <DashboardSection title="Rastreamento Automático" subtitle={autoTrackingEnabled ? 'Ativo — captura diária por carteira' : 'Desativado'}>
        <div className="portfolio-history-auto-status">
          <div className="auto-status-row">
            <span className="auto-status-label">Estado:</span>
            <span className={`auto-status-value ${autoTrackingEnabled ? 'enabled' : 'disabled'}`}>
              {autoTrackingEnabled ? 'Ativo' : 'Desativado'}
            </span>
          </div>
          <div className="auto-status-row">
            <span className="auto-status-label">Última captura automática:</span>
            <span className="auto-status-value">
              {(() => {
                const autoSnapshots = snapshots.filter(s => s.source === 'AUTO');
                return autoSnapshots.length > 0 ? formatDateTimeShort(autoSnapshots[0].capturedAt) : '—';
              })()}
            </span>
          </div>
          {nextAutoCaptureHint && (
            <div className="auto-status-row hint">
              <span className="auto-status-label">Próxima verificação:</span>
              <span className="auto-status-value">{nextAutoCaptureHint}</span>
            </div>
          )}
          <p className="auto-status-hint">
            Captura automática ocorre no máximo uma vez por dia civil por carteira,
            apenas após o estado do portfólio estar carregado e válido.
            Capturas manuais não impedem a automática (e vice-versa).
          </p>
        </div>
      </DashboardSection>

      <DashboardSection title="Capturar Snapshot" subtitle="Registra o estado atual do portfólio">
        <div className="portfolio-history-capture">
          <button
            className="btn-capture"
            onClick={handleCapture}
            onKeyDown={handleCaptureKeyDown}
            disabled={captureTriggered}
            aria-busy={captureTriggered}
          >
            {captureTriggered ? 'Capturando...' : 'Registrar snapshot'}
          </button>
          {lastCaptureResult && (
            <div className={`capture-feedback capture-feedback--${lastCaptureResult.status.toLowerCase()}`} role="status" aria-live="polite">
              {lastCaptureResult.status === 'CREATED' && lastCaptureResult.snapshot && (
                <>
                  <span className="capture-feedback__icon" aria-hidden="true">✓</span>
                  <span>Snapshot capturado: {formatDateTimeShort(lastCaptureResult.snapshot.capturedAt)} — {getCoverageLabel(lastCaptureResult.snapshot.priceCoverage)}</span>
                </>
              )}
              {lastCaptureResult.status === 'DUPLICATE' && (
                <>
                  <span className="capture-feedback__icon" aria-hidden="true">↻</span>
                  <span>Sem alteração significativa — snapshot não duplicado</span>
                </>
              )}
              {lastCaptureResult.status === 'FAILED' && (
                <>
                  <span className="capture-feedback__icon" aria-hidden="true">✕</span>
                  <span>{lastCaptureResult.reason ?? 'Falha ao capturar snapshot'}</span>
                </>
              )}
            </div>
          )}
          <p className="capture-hint">
            Captura o estado atual: patrimônio, alocação, preços e proveniência.
            Snapshots duplicados (mesmo estado + timestamp) são desduplicados automaticamente.
          </p>
        </div>
      </DashboardSection>

      {/* Readiness / Sufficiency Panel */}
      <DashboardSection title="Prontidão para Análises Históricas" subtitle={`Estado geral: ${readiness.overallState}`}>
        <div className="portfolio-history-readiness">
          <div className="readiness-metrics">
            <DashboardMetricCard
              label="Histórico"
              value={`${readiness.snapshotCount} snapshots`}
              variant="info"
              size="small"
            />
            <DashboardMetricCard
              label="Período"
              value={readiness.historySpanDays > 0 ? `${readiness.historySpanDays} dias` : '—'}
              variant="info"
              size="small"
            />
            <DashboardMetricCard
              label="Cobertura diária"
              value={readiness.dailyCoverageRatio > 0 ? `${Math.round(readiness.dailyCoverageRatio * 100)}%` : '—'}
              variant={readiness.dailyCoverageRatio >= 0.8 ? 'success' : readiness.dailyCoverageRatio > 0 ? 'warning' : 'info'}
              size="small"
            />
            <DashboardMetricCard
              label="Cobertura de preço"
              value={getCoverageLabel(readiness.priceCoverage)}
              variant={readiness.priceCoverage === 'FULL_COVERAGE' ? 'success' : readiness.priceCoverage === 'PARTIAL_COVERAGE' ? 'warning' : 'info'}
              size="small"
            />
          </div>

          <div className="readiness-capabilities">
            <h4>Capacidades</h4>
            <ul className="readiness-capability-list">
              {Object.entries(readiness.capabilities).map(([cap, info]) => (
                <li key={cap} className={`readiness-capability-item ${getReadinessClass(info.ready)}`}>
                  <span className="readiness-capability-name">{cap.replace(/_/g, ' ')}</span>
                  <span className={`readiness-capability-status ${getReadinessClass(info.ready)}`}>
                    {getReadinessLabel(info.ready)}
                  </span>
                  <span className="readiness-capability-reason">{info.reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {readiness.warnings.length > 0 && (
            <div className="readiness-warnings">
              <h4>Observações</h4>
              <ul>
                {readiness.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="readiness-twrxirr">
            <h4>TWR / XIRR</h4>
            <p className="twrxirr-status">
              <strong>Indisponíveis</strong> — requerem histórico suficiente com cobertura de preço completa
              e fluxos de caixa externos datados (aportes, saques, proventos).
            </p>
            <p className="twrxirr-detail">
              TWR: precisa ≥4 snapshots, cobertura completa, ≥30 dias de histórico, fluxos externos confiáveis.
              XIRR: precisa fluxos de caixa datados com sinais corretos + valuation terminal.
            </p>
          </div>
        </div>
      </DashboardSection>

      {hasSnapshots ? (
        <>
          <DashboardSection title="Histórico de Snapshots" subtitle="Ordenado do mais recente para o mais antigo">
            <ResponsiveDataList
              items={snapshots}
              renderItem={snap => (
                <article className="portfolio-history-row">
                  <div className="portfolio-history-row__main">
                    <time className="portfolio-history-row__datetime">{formatDateTimeShort(snap.capturedAt)}</time>
                    <span className={`portfolio-history-row__source ${getCoverageClass(snap.priceCoverage)}`}>
                      {getSourceLabel(snap.source)}
                    </span>
                  </div>
                  <div className="portfolio-history-row__values">
                    <span className="portfolio-history-row__total">{formatReadonlyCurrency(snap.valuations.totalValue)}</span>
                    <span className="portfolio-history-row__assets">{snap.valuations.byAsset.length} ativo{snap.valuations.byAsset.length !== 1 ? 's' : ''}</span>
                    <span className={`portfolio-history-row__coverage ${getCoverageClass(snap.priceCoverage)}`}>
                      {getCoverageLabel(snap.priceCoverage)}
                    </span>
                  </div>
                </article>
              )}
              renderMobileItem={snap => (
                <article className="portfolio-history-card">
                  <header>
                    <time>{formatDateTimeShort(snap.capturedAt)}</time>
                    <span className={`portfolio-history-card__source ${getCoverageClass(snap.priceCoverage)}`}>
                      {getSourceLabel(snap.source)}
                    </span>
                  </header>
                  <div className="portfolio-history-card__details">
                    <p className="portfolio-history-card__total">{formatReadonlyCurrency(snap.valuations.totalValue)}</p>
                    <p className="portfolio-history-card__assets">{snap.valuations.byAsset.length} ativo{snap.valuations.byAsset.length !== 1 ? 's' : ''}</p>
                    <p className={`portfolio-history-card__coverage ${getCoverageClass(snap.priceCoverage)}`}>
                      {getCoverageLabel(snap.priceCoverage)}
                    </p>
                  </div>
                  <details className="portfolio-history-card__detail">
                    <summary>Detalhes</summary>
                    <div className="portfolio-history-card__provenance">
                      <p><strong>Proveniência:</strong> {snap.provenance.captureReason} (usuário: {snap.provenance.userId}, carteira: {snap.provenance.walletId})</p>
                      <p><strong>Versão do schema:</strong> {snap.schemaVersion}</p>
                      <p><strong>Hash de integridade:</strong> <code>{snap.contentHash.slice(0, 16)}…</code></p>
                    </div>
                  </details>
                </article>
              )}
              emptyState={
                <EmptyState title="Sem snapshots" body="Nenhum snapshot capturado ainda." size="compact" />
              }
            />
          </DashboardSection>
        </>
      ) : (
        <DashboardSection title="Histórico Vazio" subtitle="Nenhum snapshot capturado">
          <EmptyState
            title="Rastreamento histórico ainda não iniciado"
            body={
              <>
                <p>O histórico de portfólio começa quando snapshots são capturados manualmente ou via captura automática.</p>
                <p>Estados passados da carteira não podem ser reconstruídos automaticamente sem evidências registradas.</p>
                <p>Snapshots futuros habilitarão análises históricas mais ricas (TWR, XIRR, evolução de alocação).</p>
              </>
            }
            size="normal"
          />
        </DashboardSection>
      )}

      <details className="portfolio-history-reading-guide">
        <summary>Como interpretar esta tela</summary>
        <p>
          Cada snapshot captura o estado completo do portfólio no momento da captura: valor total, alocação por ativo, preços atuais e proveniência.
          A cobertura de preço indica se todos os ativos têm cotação atual (COMPLETA), alguns têm (PARCIAL) ou nenhum (DESCONHECIDO).
        </p>
        <p>
          Snapshots duplicados (mesmo estado de portfólio no mesmo timestamp) são desduplicados automaticamente.
          A retenção mantém até 3.650 snapshots (≈10 anos diários) e remove snapshots com mais de 10 anos.
        </p>
        <p>
          <strong>TWR/XIRR permanecem indisponíveis</strong> até que haja histórico suficiente e confiável.
          Valores zero ou percentuais não são exibidos como substituto de "indisponível".
        </p>
      </details>
    </div>
  );
}