import { useMemo, useState, useSyncExternalStore } from 'react';
import type { ContributionsRefreshController } from './contributionsRefreshController.ts';
import type {
  ReadOnlyContributionItem,
  ReadOnlyContributionsAdapter,
  ReadOnlyContributionsSnapshot,
} from './contributionsReadonlyContract.mjs';
import {
  createReadonlyContributionsViewModel,
  displayContributionIdentity,
  formatReadonlyCurrencyOrMissing,
  formatReadonlyDate,
  formatReadonlyDateTime,
  formatReadonlyQuantity,
  formatReadonlyScoreOrMissing,
  formatReadonlyTextOrMissing,
  sortContributionCandidatesByScore,
  type ReadonlyContributionsSortKey,
} from './readonlyContributionsViewModel.ts';

interface ContributionsReadonlyPageProps {
  adapter: ReadOnlyContributionsAdapter;
  refreshController?: ContributionsRefreshController | null;
}

interface ContributionsReadonlyPageContentProps {
  snapshot: ReadOnlyContributionsSnapshot;
  refreshStatus: string;
  errorMessage: string | null;
  showRefreshButton: boolean;
  onRefresh?: () => void;
}

const sortLabels: Record<ReadonlyContributionsSortKey, string> = {
  date: 'Data',
  ticker: 'Ticker',
  assetClass: 'Classe',
  amount: 'Valor informado',
  quantity: 'Quantidade',
  source: 'Origem',
};

function formatSuggestionStatus(status: ReadOnlyContributionsSnapshot['suggestion']['status']) {
  switch (status) {
    case 'available':
      return 'Sugestao explicavel disponivel';
    case 'conflicting':
      return 'Regras conflitantes';
    case 'insufficient-data':
      return 'Dados insuficientes';
    case 'unavailable':
    default:
      return 'Sem sugestao produzida';
  }
}

function formatRefreshStatus(refreshStatus: string, itemCount: number) {
  switch (refreshStatus) {
    case 'updated':
      return `Leitura atualizada - ${itemCount} aportes`;
    case 'fallback':
      return 'Fallback readonly ativo';
    case 'error':
      return 'Ultimo snapshot valido preservado';
    default:
      return `${itemCount} aporte${itemCount === 1 ? '' : 's'} somente leitura`;
  }
}

function summarizeCandidate(item: ReadOnlyContributionsSnapshot['suggestion']['candidates'][number]) {
  const ticker = item.ticker?.trim();
  const name = item.assetName?.trim();

  if (ticker && name) {
    return `${ticker} · ${name}`;
  }

  return ticker || name || 'Sem identificacao';
}

function renderReasonLine(reason: ReadOnlyContributionsSnapshot['suggestion']['candidates'][number]['reasons'][number]) {
  const details = [reason.detail];

  if (reason.sourceField) {
    details.push(`Campo: ${reason.sourceField}`);
  }

  if (reason.value) {
    details.push(`Valor: ${reason.value}`);
  }

  return `${reason.label} · ${details.join(' · ')}`;
}

function renderCandidateSignal(item: ReadOnlyContributionsSnapshot['suggestion']['candidates'][number]) {
  const share = item.share === null ? 'Nao informado' : `${item.share.toFixed(2)}%`;
  const idealWeight = item.idealWeightPct === null ? 'Nao informado' : `${item.idealWeightPct.toFixed(2)}%`;
  const gap = item.typeGapPct === null ? 'Nao informado' : `${item.typeGapPct.toFixed(2)} p.p.`;

  return [
    `Peso atual: ${share}`,
    `Meta: ${idealWeight}`,
    `Diferenca: ${gap}`,
  ].join(' - ');
}

function ContributionsReadonlyPageContent({
  errorMessage,
  onRefresh,
  refreshStatus,
  showRefreshButton,
  snapshot,
}: ContributionsReadonlyPageContentProps) {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [assetClass, setAssetClass] = useState('all');
  const [source, setSource] = useState('all');
  const [sortBy, setSortBy] = useState<ReadonlyContributionsSortKey>('date');

  const viewModel = useMemo(
    () =>
      createReadonlyContributionsViewModel(snapshot, {
        query,
        year,
        month,
        assetClass,
        source,
        sortBy,
      }),
    [assetClass, month, query, sortBy, snapshot, source, year],
  );

  const hasItems = snapshot.items.length > 0;
  const latestItem = viewModel.latestItem;
  const suggestion = snapshot.suggestion;
  const sortedCandidates = useMemo(
    () => sortContributionCandidatesByScore(snapshot.suggestion.candidates).slice(0, 3),
    [snapshot.suggestion.candidates],
  );
  const suggestionIntro =
    suggestion.inputs.length > 0
      ? `Entradas: ${suggestion.inputs.join(' - ')}`
      : 'Entradas do legado nao informadas.';
  const suggestionLimits =
    suggestion.limitations.length > 0
      ? `Limites: ${suggestion.limitations.join(' - ')}`
      : 'Limites do legado nao informados.';
  const suggestionWarnings =
    suggestion.warnings.length > 0 ? `Avisos: ${suggestion.warnings.join(' - ')}` : 'Sem avisos adicionais.';
  const emptyTitle = hasItems ? 'Nenhum aporte encontrado' : 'Carteira de aportes vazia nesta leitura readonly.';
  const emptyBody = hasItems
    ? 'Ajuste busca, periodo, classe, origem ou ordenacao para ver os registros novamente.'
    : 'O snapshot de aportes chegou vazio, mas continua valido e congelado.';

  return (
    <section className="page-shell fixed-income-readonly contributions-readonly" aria-labelledby="page-contributions">
      <div className="fixed-income-readonly__header">
        <div>
          <p className="page-shell__eyebrow">Aportes</p>
          <h2 className="page-shell__title" id="page-contributions">
            Aportes
          </h2>
          <p className="page-shell__description">
            Historico e sugestao explicavel. Somente leitura. O legado fornece os dados reais e a tela apenas apresenta o
            snapshot congelado.
          </p>
        </div>

        <div className="fixed-income-readonly__header-actions">
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Snapshot</span>
            <time dateTime={snapshot.generatedAt}>{formatReadonlyDateTime(snapshot.generatedAt)}</time>
          </p>
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Origem segura</span>
            <span>{snapshot.originLabel}</span>
          </p>
          <a className="fixed-income-readonly__legacy-link" href="/index.html">
            Voltar ao legado
          </a>
          {showRefreshButton ? (
            <button className="assets-report__refresh-button" type="button" onClick={onRefresh}>
              Atualizar aportes
            </button>
          ) : null}
        </div>
      </div>

      <p className="fixed-income-readonly__notice">{snapshot.notice}</p>

      <p className="fixed-income-readonly__status" role="status" aria-live="polite">
        {errorMessage ? errorMessage : `${formatRefreshStatus(refreshStatus, snapshot.summary.itemCount)} - ${formatSuggestionStatus(snapshot.suggestion.status)}`}
      </p>

      <section className="fixed-income-readonly__filters" aria-labelledby="contributions-filters">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="contributions-filters">
            Filtros
          </h3>
          <p className="fixed-income-readonly__section-note">Apenas estado visual local, sem persistencia.</p>
        </div>

        <div className="fixed-income-readonly__controls">
          <label className="fixed-income-readonly__control">
            <span>Buscar por ticker, nome, classe, origem ou nota</span>
            <input
              aria-label="Buscar por ticker, nome, classe, origem ou nota"
              placeholder="PETR4, aporte, junho..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="fixed-income-readonly__control">
            <span>Ano</span>
            <select aria-label="Filtrar por ano" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">Todos</option>
              {viewModel.months
                .map((monthItem) => monthItem.key.slice(0, 4))
                .filter((itemYear, index, list) => list.indexOf(itemYear) === index)
                .map((itemYear) => (
                  <option key={itemYear} value={itemYear}>
                    {itemYear}
                  </option>
                ))}
            </select>
          </label>

          <label className="fixed-income-readonly__control">
            <span>Mes</span>
            <select aria-label="Filtrar por mes" value={month} onChange={(event) => setMonth(event.target.value)}>
              <option value="all">Todos</option>
              {viewModel.months.map((itemMonth) => (
                <option key={itemMonth.key} value={itemMonth.key}>
                  {itemMonth.label}
                </option>
              ))}
            </select>
          </label>

          <label className="fixed-income-readonly__control">
            <span>Classe</span>
            <select aria-label="Filtrar por classe" value={assetClass} onChange={(event) => setAssetClass(event.target.value)}>
              <option value="all">Todas</option>
              {viewModel.classes.map((itemClass) => (
                <option key={itemClass} value={itemClass}>
                  {itemClass}
                </option>
              ))}
            </select>
          </label>

          <label className="fixed-income-readonly__control">
            <span>Origem</span>
            <select aria-label="Filtrar por origem" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="all">Todas</option>
              {viewModel.sources.map((itemSource) => (
                <option key={itemSource} value={itemSource}>
                  {itemSource}
                </option>
              ))}
            </select>
          </label>

          <label className="fixed-income-readonly__control">
            <span>Ordenar por</span>
            <select aria-label="Ordenar aportes" value={sortBy} onChange={(event) => setSortBy(event.target.value as ReadonlyContributionsSortKey)}>
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="fixed-income-readonly__results" aria-live="polite">
          {viewModel.hasResults
            ? `${viewModel.filteredItems.length} resultado${viewModel.filteredItems.length === 1 ? '' : 's'} encontrado${
                viewModel.filteredItems.length === 1 ? '' : 's'
              }`
            : hasItems
              ? 'Nenhum aporte corresponde aos filtros atuais.'
              : 'Carteira vazia nesta leitura readonly.'}
        </p>
      </section>

      <div className="overview-grid fixed-income-readonly__summary" aria-label="Resumo readonly dos aportes">
        <article className="overview-card">
          <p className="overview-card__label">Quantidade de aportes</p>
          <p className="overview-card__value">{snapshot.summary.itemCount}</p>
          <p className="overview-card__hint">Registros oficiais ja validados</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Classes presentes</p>
          <p className="overview-card__value">{snapshot.summary.classCount}</p>
          <p className="overview-card__hint">Leitura direta da carteira</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Meses com aportes</p>
          <p className="overview-card__value">{snapshot.summary.monthCount}</p>
          <p className="overview-card__hint">Agrupamento somente visual</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Sugestoes disponiveis</p>
          <p className="overview-card__value">{snapshot.summary.candidateCount}</p>
          <p className="overview-card__hint">Resultado ja produzido pelo legado</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Dados insuficientes</p>
          <p className="overview-card__value">{snapshot.summary.insufficientCount}</p>
          <p className="overview-card__hint">Sinais sem base completa</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Evitados por concentracao</p>
          <p className="overview-card__value">{snapshot.summary.avoidedCount}</p>
          <p className="overview-card__hint">Apenas leitura do sinal prudente</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Ultimo aporte</p>
          <p className="overview-card__value">{latestItem ? displayContributionIdentity(latestItem) : 'Nao informado'}</p>
          <p className="overview-card__hint">
            {latestItem?.date ? formatReadonlyDate(latestItem.date) : 'Sem data valida'}
          </p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Estado da sugestao</p>
          <p className="overview-card__value">{formatSuggestionStatus(snapshot.suggestion.status)}</p>
          <p className="overview-card__hint">Nao executa nenhuma compra</p>
        </article>
      </div>

      <section className="fixed-income-readonly__highlights" aria-labelledby="contributions-suggestion">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="contributions-suggestion">
            Sugestao explicavel
          </h3>
          <p className="fixed-income-readonly__section-note">
            A sugestao e uma leitura das regras ja existentes na carteira e nao executa nenhuma compra.
          </p>
        </div>

        <div className="fixed-income-readonly__highlight-grid">
          <article className="overview-card">
            <p className="overview-card__label">Leitura do legado</p>
            <p className="overview-card__value">{snapshot.suggestion.strategyName ?? 'Nao informado'}</p>
            <p className="overview-card__hint">{suggestionIntro}</p>
            <p className="overview-card__hint">{suggestionLimits}</p>
            <p className="overview-card__hint">{suggestionWarnings}</p>
          </article>

          {sortedCandidates.length > 0 ? (
            sortedCandidates.map((candidate, index) => (
              <article className="overview-card" key={`${candidate.ticker ?? candidate.assetId ?? index}`}>
                <p className="overview-card__label">Candidato {index + 1}</p>
                <p className="overview-card__value">{summarizeCandidate(candidate)}</p>
                <p className="overview-card__hint">
                  {candidate.signalLabel} - score {formatReadonlyScoreOrMissing(candidate.score)}
                </p>
                <p className="overview-card__hint">
                  Classe: {formatReadonlyTextOrMissing(candidate.assetClass)} - Sinal: {candidate.signalTone}
                </p>
                <p className="overview-card__hint">{renderCandidateSignal(candidate)}</p>
                {candidate.reasons.length > 0 ? (
                  <ul className="fixed-income-readonly__compact-list">
                    {candidate.reasons.map((reason) => (
                      <li key={`${candidate.ticker ?? candidate.assetId ?? index}-${reason.code}`}>
                        <strong>{reason.label}</strong>
                        <span>{renderReasonLine(reason)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="overview-card__hint">O legado nao forneceu uma justificativa detalhada.</p>
                )}
                {candidate.warnings.length > 0 ? (
                  <p className="overview-card__hint">Alertas: {candidate.warnings.join(' - ')}</p>
                ) : null}
              </article>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">{formatSuggestionStatus(snapshot.suggestion.status)}</p>
              <p className="overview-card__value">{emptyTitle}</p>
              <p className="overview-card__hint">{emptyBody}</p>
            </article>
          )}
        </div>
      </section>

      <section className="assets-readonly__distribution" aria-labelledby="contributions-distribution">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="contributions-distribution">
            Distribuicao por classe
          </h3>
          <p className="assets-readonly__section-note">Contagem visual dos aportes ja registrados por classe.</p>
        </div>

        <div className="assets-readonly__distribution-list">
          {snapshot.classDistribution.length > 0 ? (
            snapshot.classDistribution.map((entry) => (
              <div className="assets-readonly__distribution-row" key={entry.label}>
                <div className="assets-readonly__distribution-row-head">
                  <strong>{entry.label}</strong>
                  <span>
                    {entry.itemCount} aporte{entry.itemCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div
                  className="assets-readonly__distribution-track"
                  aria-label={`${entry.label}: ${entry.itemCount} aporte${entry.itemCount === 1 ? '' : 's'}`}
                >
                  <span
                    className="assets-readonly__distribution-fill"
                    style={{
                      width: `${Math.max(0, Math.min((entry.itemCount / Math.max(1, snapshot.summary.itemCount)) * 100, 100))}%`,
                    }}
                  />
                </div>
                <p className="assets-readonly__distribution-hint">
                  {entry.latestContributionDate ? formatReadonlyDate(entry.latestContributionDate) : 'Sem data valida'}
                </p>
              </div>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">Sem classes</p>
              <p className="overview-card__value">Snapshot vazio</p>
              <p className="overview-card__hint">Nenhuma distribuicao readonly para exibir.</p>
            </article>
          )}
        </div>
      </section>

      <section className="assets-readonly__distribution" aria-labelledby="contributions-monthly">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="contributions-monthly">
            Agrupamento mensal
          </h3>
          <p className="assets-readonly__section-note">Contagem por mes, sem soma financeira nova.</p>
        </div>

        <div className="assets-readonly__distribution-list">
          {snapshot.monthDistribution.length > 0 ? (
            snapshot.monthDistribution.map((entry) => (
              <div className="assets-readonly__distribution-row" key={entry.monthKey}>
                <div className="assets-readonly__distribution-row-head">
                  <strong>{entry.label}</strong>
                  <span>
                    {entry.itemCount} aporte{entry.itemCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div
                  className="assets-readonly__distribution-track"
                  aria-label={`${entry.label}: ${entry.itemCount} aporte${entry.itemCount === 1 ? '' : 's'}`}
                >
                  <span
                    className="assets-readonly__distribution-fill"
                    style={{
                      width: `${Math.max(0, Math.min((entry.itemCount / Math.max(1, snapshot.summary.itemCount)) * 100, 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">Sem meses</p>
              <p className="overview-card__value">Snapshot vazio</p>
              <p className="overview-card__hint">Nenhum agrupamento mensal readonly para exibir.</p>
            </article>
          )}
        </div>
      </section>

      <section className="assets-readonly__highlights" aria-labelledby="contributions-history">
        <div className="assets-readonly__section-title-row">
          <h3 className="assets-readonly__section-title" id="contributions-history">
            Lista de aportes
          </h3>
          <p className="assets-readonly__section-note">Apenas campos comprovados no legado.</p>
        </div>

        {viewModel.filteredItems.length > 0 ? (
          <>
            <div className="assets-report__table-wrap">
              <table className="assets-report__table">
                <caption>Historico readonly de aportes</caption>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Ticker</th>
                    <th scope="col">Ativo</th>
                    <th scope="col">Classe</th>
                    <th scope="col">Quantidade</th>
                    <th scope="col">Preco</th>
                    <th scope="col">Valor</th>
                    <th scope="col">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.filteredItems.map((item) => (
                    <tr key={item.id ?? `${item.ticker ?? item.assetName ?? 'item'}-${item.date ?? item.sourceEventId ?? ''}`}>
                      <td>{formatReadonlyDate(item.date)}</td>
                      <td>{formatReadonlyTextOrMissing(item.ticker)}</td>
                      <td>{formatReadonlyTextOrMissing(item.assetName)}</td>
                      <td>{formatReadonlyTextOrMissing(item.assetClass)}</td>
                      <td>{formatReadonlyQuantity(item.quantity)}</td>
                      <td>{formatReadonlyCurrencyOrMissing(item.unitPrice)}</td>
                      <td>{formatReadonlyCurrencyOrMissing(item.amount)}</td>
                      <td>{formatReadonlyTextOrMissing(item.source)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="assets-report__mobile-list">
              {viewModel.filteredItems.map((item) => (
                <article className="assets-report__mobile-card" key={`mobile-${item.id ?? item.ticker ?? item.sourceEventId ?? ''}`}>
                  <div className="assets-report__mobile-card-header">
                    <strong>{displayContributionIdentity(item)}</strong>
                    <span>{formatReadonlyTextOrMissing(item.assetClass)}</span>
                  </div>
                  <dl className="assets-report__mobile-card-meta">
                    <div>
                      <dt>Data</dt>
                      <dd>{formatReadonlyDate(item.date)}</dd>
                    </div>
                    <div>
                      <dt>Quantidade</dt>
                      <dd>{formatReadonlyQuantity(item.quantity)}</dd>
                    </div>
                    <div>
                      <dt>Preco</dt>
                      <dd>{formatReadonlyCurrencyOrMissing(item.unitPrice)}</dd>
                    </div>
                    <div>
                      <dt>Valor</dt>
                      <dd>{formatReadonlyCurrencyOrMissing(item.amount)}</dd>
                    </div>
                    <div>
                      <dt>Origem</dt>
                      <dd>{formatReadonlyTextOrMissing(item.source)}</dd>
                    </div>
                  </dl>
                  {item.note ? <p className="assets-report__mobile-card-note">{item.note}</p> : null}
                </article>
              ))}
            </div>
          </>
        ) : (
          <article className="overview-card" aria-live="polite">
            <p className="overview-card__label">{emptyTitle}</p>
            <p className="overview-card__value">Sem resultados</p>
            <p className="overview-card__hint">{emptyBody}</p>
          </article>
        )}
      </section>
    </section>
  );
}

function StaticContributionsReadonlyPage({ adapter }: { adapter: ReadOnlyContributionsAdapter }) {
  return (
    <ContributionsReadonlyPageContent
      errorMessage={null}
      refreshStatus="idle"
      showRefreshButton={false}
      snapshot={adapter.getSnapshot()}
    />
  );
}

function RefreshableContributionsReadonlyPage({ refreshController }: { refreshController: ContributionsRefreshController }) {
  const refreshState = useSyncExternalStore(
    refreshController.subscribe,
    refreshController.getState,
    refreshController.getState,
  );

  return (
    <ContributionsReadonlyPageContent
      errorMessage={refreshState.errorMessage}
      onRefresh={() => refreshController.refresh()}
      refreshStatus={refreshState.refreshStatus}
      showRefreshButton={true}
      snapshot={refreshState.snapshot}
    />
  );
}

export function ContributionsReadonlyPage({ adapter, refreshController }: ContributionsReadonlyPageProps) {
  if (!refreshController) {
    return <StaticContributionsReadonlyPage adapter={adapter} />;
  }

  return <RefreshableContributionsReadonlyPage refreshController={refreshController} />;
}
