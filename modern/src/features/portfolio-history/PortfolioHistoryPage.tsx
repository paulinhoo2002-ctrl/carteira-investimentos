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

          <DashboardSection title="Análise de Performance (TWR/XIRR)" subtitle="Indicadores indisponíveis">
            <EmptyState
              title="Análise de rentabilidade histórica indisponível"
              body={
                <>
                  <p>O cálculo de TWR (Time-Weighted Return) e XIRR (Extended Internal Rate of Return) requer uma série histórica suficiente de snapshots com cobertura de preço completa e fluxos de caixa registrados.</p>
                  <p className="twrxirr-status">Estado atual: <strong>COLETANDO_HISTÓRICO</strong> — Snapshots serão acumulados ao longo do tempo. Nenhum valor sintético ou fabricado é exibido.</p>
                </>
              }
              size="compact"
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