import { useMemo, useSyncExternalStore } from 'react';
import type { GoalsRefreshController } from './goalsRefreshController';
import type { ReadOnlyGoalsAdapter } from './goalsSnapshotAdapter.mjs';
import type { ReadonlyGoalsSnapshot } from './goalsReadonlyContract.d.ts';
import {
  createReadonlyGoalsViewModel,
  formatReadonlyDateTime,
  formatReadonlyCurrencyOrMissing,
  formatReadonlyPercentSimple,
  formatReadonlyTextOrMissing,
  type ReadonlyGoalsViewModel,
} from './readonlyGoalsViewModel';

interface GoalsReadonlyPageProps {
  adapter: ReadOnlyGoalsAdapter;
  refreshController?: GoalsRefreshController | null;
}

interface GoalsReadonlyPageContentProps {
  snapshot: ReadonlyGoalsSnapshot;
  viewModel: ReadonlyGoalsViewModel;
  refreshStatus: string;
  errorMessage: string | null;
  showRefreshButton: boolean;
  onRefresh?: () => void;
}

function ProgressBar({
  barPercent,
  ariaLabel,
  ariaValueNow,
  ariaValueText,
}: {
  barPercent: number;
  ariaLabel: string;
  ariaValueNow: string;
  ariaValueText: string;
}) {
  const width = Math.max(0, Math.min(100, barPercent)).toFixed(1);
  const color =
    barPercent >= 100
      ? '#34d399'
      : barPercent >= 75
        ? '#60a5fa'
        : barPercent >= 40
          ? '#fbbf24'
          : '#f87171';

  return (
    <div
      className="dbt financial-goal-progress"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={ariaValueNow}
      aria-valuetext={ariaValueText}
    >
      <div
        className="dbf"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string | null;
  tone?: 'muted' | 'ok' | 'info' | 'warn' | 'danger';
}) {
  const toneClass = tone === 'ok' ? 'gn' : tone === 'info' ? 'bl' : tone === 'warn' ? 'yw' : tone === 'danger' ? 'rd' : 'mu';

  return (
    <article className="overview-card">
      <p className="overview-card__label">{label}</p>
      <p className={`overview-card__value ${toneClass}`}>{value}</p>
      {hint && <p className="overview-card__hint">{hint}</p>}
    </article>
  );
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="fixed-income-readonly__section-title-row">
      <h3 className="fixed-income-readonly__section-title" id={id}>
        {children}
      </h3>
    </div>
  );
}

function GoalCard({
  card,
}: {
  card: {
    title: string;
    currentLabel: string;
    currentValue: string;
    targetLabel: string;
    targetValue: string;
    percentLabel: string;
    percentValue: string | null;
    barPercent: number;
    tone: 'muted' | 'ok' | 'info' | 'warn' | 'danger';
    statusText: string;
    hasData: boolean;
    missingValue: string | null;
    excessValue: string | null;
  } | null;
}) {
  if (!card) {
    return null;
  }

  const showPercent = card.percentValue !== null && card.hasData;
  const showMissing = card.missingValue !== null && !card.reached && card.hasData;
  const showExcess = card.excessValue !== null && card.reached && card.hasData;

  return (
    <article className={`passive-goal-card financial-goal-card ${card.tone}`}>
      <div className="passive-goal-kicker">{card.title}</div>
      <div className="passive-goal-sub">{card.currentLabel}</div>
      <div className="passive-goal-value">{card.currentValue}</div>
      <div className="passive-goal-sub">
        {card.targetLabel}: {card.targetValue}
      </div>
      {card.hasData ? (
        <>
          <ProgressBar
            barPercent={card.barPercent}
            ariaLabel={`Progresso da meta ${card.title.toLowerCase()}`}
            ariaValueNow={card.barPercent.toFixed(1)}
            ariaValueText={card.statusText}
          />
          <div className="passive-goal-sub">{card.statusText}</div>
          {showMissing && <div className="passive-goal-sub">Faltam {card.missingValue}</div>}
          {showExcess && <div className="passive-goal-sub">Acima da meta: {card.excessValue}</div>}
          {showPercent && (
            <div className="passive-goal-sub">
              {card.percentValue}
            </div>
          )}
        </>
      ) : (
        <div className="passive-goal-sub">{card.statusText}</div>
      )}
    </article>
  );
}

function AssetGoalCard({
  card,
}: {
  card: {
    typeLabel: string;
    typeValue: string;
    tickerLabel: string;
    tickerValue: string;
    monthlyContributionLabel: string;
    monthlyContributionValue: string;
    annualVariationLabel: string;
    annualVariationValue: string;
    finalValueLabel: string;
    finalValueValue: string;
  } | null;
}) {
  if (!card) {
    return null;
  }

  return (
    <div className="assets-readonly__distribution-list">
      <div className="assets-readonly__distribution-row">
        <div className="assets-readonly__distribution-row-head">
          <strong>{card.typeLabel}</strong>
          <span>{card.typeValue}</span>
        </div>
      </div>
      <div className="assets-readonly__distribution-row">
        <div className="assets-readonly__distribution-row-head">
          <strong>{card.tickerLabel}</strong>
          <span>{card.tickerValue}</span>
        </div>
      </div>
      <div className="assets-readonly__distribution-row">
        <div className="assets-readonly__distribution-row-head">
          <strong>{card.monthlyContributionLabel}</strong>
          <span>{card.monthlyContributionValue}</span>
        </div>
      </div>
      <div className="assets-readonly__distribution-row">
        <div className="assets-readonly__distribution-row-head">
          <strong>{card.annualVariationLabel}</strong>
          <span>{card.annualVariationValue}</span>
        </div>
      </div>
      <div className="assets-readonly__distribution-row">
        <div className="assets-readonly__distribution-row-head">
          <strong>{card.finalValueLabel}</strong>
          <span>{card.finalValueValue}</span>
        </div>
      </div>
    </div>
  );
}

function AllocationSection({
  section,
}: {
  section: {
    items: readonly {
      type: string;
      targetPct: number;
      targetValue: string;
      actualPct: number;
      actualValue: string;
    }[];
  } | null;
}) {
  if (!section || section.items.length === 0) {
    return null;
  }

  return (
    <section className="assets-readonly__distribution" aria-labelledby="goals-allocation">
      <SectionTitle id="goals-allocation">Distribuicao alvo da carteira</SectionTitle>
      <p className="assets-readonly__section-note">
        Configuracao de alocacao por classe de ativo. Valores atuais nao sao calculados no moderno.
      </p>
      <div className="assets-readonly__distribution-list">
        {section.items.map((row, index) => (
          <div className="assets-readonly__distribution-row" key={row.type || `alloc-${index}`}>
            <div className="assets-readonly__distribution-row-head">
              <strong>{row.type}</strong>
              <span>Meta: {row.targetValue}</span>
            </div>
            <div
              className="assets-readonly__distribution-track"
              aria-label={`${row.type}: ${row.targetPct}%`}
            >
              <span
                className="assets-readonly__distribution-fill"
                style={{ width: `${Math.max(0, Math.min(100, row.targetPct))}%` }}
              />
            </div>
            <p className="assets-readonly__distribution-hint">
              Atual: {row.actualValue}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistorySection({
  section,
}: {
  section: {
    summary: {
      totalLabel: string;
      totalValue: string;
      monthCountLabel: string;
      monthCountValue: string;
      avgLabel: string;
      avgValue: string;
    };
    groups: readonly {
      monthLabel: string;
      totalValue: string;
      countValue: string;
      diffValue: string | null;
      diffPctValue: string | null;
      isCurrent: boolean;
    }[];
  } | null;
}) {
  if (!section || section.groups.length === 0) {
    return null;
  }

  return (
    <section className="assets-readonly__highlights" aria-labelledby="goals-history">
      <SectionTitle id="goals-history">Historico mensal de renda passiva</SectionTitle>
      <p className="assets-readonly__section-note">
        Somente dado real ja gravado no legado. Sem preenchimento retroativo.
      </p>

      <div className="assets-readonly__summary" aria-label="Resumo do historico">
        <MetricCard
          label={section.summary.totalLabel}
          value={section.summary.totalValue}
          hint="Total de proventos no Historico"
        />
        <MetricCard
          label={section.summary.monthCountLabel}
          value={section.summary.monthCountValue}
          hint="Meses com lancamentos"
        />
        <MetricCard
          label={section.summary.avgLabel}
          value={section.summary.avgValue}
          hint="Media mensal"
        />
      </div>

      <div className="assets-report__table-wrap">
        <table className="assets-report__table">
          <caption>Historico mensal readonly de renda passiva</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Total</th>
              <th scope="col">Lancamentos</th>
              <th scope="col">Diferenca</th>
              <th scope="col">Var. %</th>
            </tr>
          </thead>
          <tbody>
            {section.groups.map((row, index) => (
              <tr key={row.monthLabel || `hist-${index}`}>
                <td>{row.monthLabel}</td>
                <td>{row.totalValue}</td>
                <td>{row.countValue}</td>
                <td>{row.diffValue ?? '—'}</td>
                <td>{row.diffPctValue ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="page-shell goals-readonly" aria-labelledby="goals-empty">
      <div className="fixed-income-readonly__header">
        <div>
          <p className="page-shell__eyebrow">Metas</p>
          <h2 className="page-shell__title" id="goals-empty">
            Metas
          </h2>
          <p className="page-shell__description">
            Acompanhamento readonly de metas financeiras. Somente leitura. O legado fornece os dados reais e a tela apenas apresenta o snapshot congelado.
          </p>
        </div>
      </div>
      <p className="fixed-income-readonly__notice">
        Nenhuma meta configurada na carteira ativa.
      </p>
      <p className="fixed-income-readonly__status" role="status" aria-live="polite">
        Configure metas na aba Metas do legado para ver o progresso aqui.
      </p>
    </section>
  );
}

function GoalsReadonlyPageContent({
  errorMessage,
  onRefresh,
  refreshStatus,
  showRefreshButton,
  snapshot,
  viewModel,
}: GoalsReadonlyPageContentProps) {
  if (!viewModel.hasAnyGoal && !snapshot.flags.hasPortfolioData && snapshot.history.groups.length === 0) {
    return <EmptyState />;
  }

  const hasRefresh = typeof onRefresh === 'function';
  const refreshLabel = showRefreshButton ? 'Atualizar metas' : null;

  return (
    <section className="page-shell goals-readonly" aria-labelledby="page-goals">
      <div className="fixed-income-readonly__header">
        <div>
          <p className="page-shell__eyebrow">Metas</p>
          <h2 className="page-shell__title" id="page-goals">
            Metas financeiras
          </h2>
          <p className="page-shell__description">
            Acompanhamento readonly de metas financeiras. Somente leitura. O legado fornece os dados reais e a tela apenas apresenta o snapshot congelado.
          </p>
        </div>

        <div className="fixed-income-readonly__header-actions">
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Snapshot</span>
            <time dateTime={snapshot.generatedAt}>
              {formatReadonlyDateTime(snapshot.generatedAt)}
            </time>
          </p>
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Origem segura</span>
            <span>{snapshot.originLabel}</span>
          </p>
          <a className="fixed-income-readonly__legacy-link" href="/index.html">
            Voltar ao legado
          </a>
          {showRefreshButton ? (
            <button
              className="assets-report__refresh-button"
              type="button"
              onClick={onRefresh}
            >
              {refreshLabel}
            </button>
          ) : null}
        </div>
      </div>

      <p className="fixed-income-readonly__notice">{snapshot.notice}</p>

      <p className="fixed-income-readonly__status" role="status" aria-live="polite">
        {errorMessage ? errorMessage : `Snapshot ${refreshStatus} - ${viewModel.hasAnyGoal ? 'Metas configuradas' : 'Nenhuma meta ativa'}`}
      </p>

      <div className="passive-goal-grid financial-goals-grid">
        {viewModel.patrimonyCard && <GoalCard card={viewModel.patrimonyCard} />}
        {viewModel.incomeCard && <GoalCard card={viewModel.incomeCard} />}
      </div>

      {viewModel.assetGoalCard && (
        <section className="assets-readonly__highlights" aria-labelledby="goals-asset">
          <SectionTitle id="goals-asset">Configuracao do ativo-alvo</SectionTitle>
          <p className="assets-readonly__section-note">
            Meta para um ativo especifico. Somente configuracao, sem progresso calculado.
          </p>
          <AssetGoalCard card={viewModel.assetGoalCard} />
        </section>
      )}

      {viewModel.allocationSection && (
        <AllocationSection section={viewModel.allocationSection} />
      )}

      {viewModel.historySection && <HistorySection section={viewModel.historySection} />}

      {!viewModel.hasAnyGoal && snapshot.flags.hasPortfolioData && (
        <section className="assets-readonly__highlights" aria-labelledby="goals-fallback">
          <SectionTitle id="goals-fallback">Carteira ativa sem metas configuradas</SectionTitle>
          <p className="assets-readonly__section-note">
            Configure metas na aba Metas do legado para ver o progresso aqui.
          </p>
          <MetricCard
            label="Patrimonio atual"
            value={formatReadonlyCurrencyOrMissing(snapshot.patrimony.current)}
            hint="Valor estimado da carteira ativa"
          />
          <MetricCard
            label="Meta patrimonial"
            value="Nao configurada"
            hint="Configure na aba Metas do legado"
          />
          <MetricCard
            label="Meta de renda passiva"
            value="Nao configurada"
            hint="Configure na aba Metas do legado"
          />
        </section>
      )}
    </section>
  );
}

function StaticGoalsReadonlyPage({ adapter }: { adapter: ReadOnlyGoalsAdapter }) {
  const snapshot = adapter.getSnapshot();
  const viewModel = createReadonlyGoalsViewModel(snapshot);

  return (
    <GoalsReadonlyPageContent
      errorMessage={null}
      refreshStatus="idle"
      showRefreshButton={false}
      snapshot={snapshot}
      viewModel={viewModel}
    />
  );
}

function RefreshableGoalsReadonlyPage({ refreshController }: { refreshController: GoalsRefreshController }) {
  const state = useSyncExternalStore(
    refreshController.subscribe,
    refreshController.getState,
    refreshController.getState,
  );

  const viewModel = useMemo(
    () => createReadonlyGoalsViewModel(state.snapshot),
    [state.snapshot],
  );

  return (
    <GoalsReadonlyPageContent
      errorMessage={state.errorMessage}
      onRefresh={() => refreshController.refresh()}
      refreshStatus={state.refreshStatus}
      showRefreshButton={true}
      snapshot={state.snapshot}
      viewModel={viewModel}
    />
  );
}

export function GoalsReadonlyPage({ adapter, refreshController }: GoalsReadonlyPageProps) {
  if (!refreshController) {
    return <StaticGoalsReadonlyPage adapter={adapter} />;
  }

  return <RefreshableGoalsReadonlyPage refreshController={refreshController} />;
}
