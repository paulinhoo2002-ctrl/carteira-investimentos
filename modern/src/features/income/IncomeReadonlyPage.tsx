import { useMemo, useState, useSyncExternalStore } from 'react';
import type { IncomeRefreshController } from './incomeRefreshController.ts';
import type { ReadOnlyIncomeAdapter, ReadOnlyIncomeItem } from './incomeSnapshotAdapter.mjs';
import {
  createReadonlyIncomeViewModel,
  formatReadonlyCurrency,
  formatReadonlyDateTime,
  formatReadonlyMoneyOrMissing,
  type ReadonlyIncomeSortKey,
} from './readonlyIncomeViewModel.ts';

interface IncomeReadonlyPageProps {
  adapter: ReadOnlyIncomeAdapter;
  refreshController?: IncomeRefreshController | null;
}

interface IncomeReadonlyPageContentProps {
  snapshot: ReturnType<ReadOnlyIncomeAdapter['getSnapshot']>;
  errorMessage: string | null;
  refreshStatus: string;
  showRefreshButton: boolean;
  onRefresh?: () => void;
}

const sortLabels: Record<ReadonlyIncomeSortKey, string> = {
  paymentDate: 'Data de pagamento',
  netValue: 'Valor liquido',
  ticker: 'Ticker',
  type: 'Tipo',
};

function summarizeItemLabel(item: ReadOnlyIncomeItem) {
  const ticker = item.ticker?.trim();
  const name = item.name?.trim();

  if (ticker && name) {
    return `${ticker} · ${name}`;
  }

  return ticker || name || 'Sem identificacao';
}

function formatStatusLabel(refreshStatus: string, itemCount: number) {
  switch (refreshStatus) {
    case 'updated':
      return `Leitura atualizada · ${itemCount} proventos`;
    case 'fallback':
      return 'Fallback readonly ativo';
    case 'error':
      return 'Ultimo snapshot valido preservado';
    default:
      return `${itemCount} provento${itemCount === 1 ? '' : 's'} somente leitura`;
  }
}

function renderAmount(value: number | null | undefined) {
  return formatReadonlyMoneyOrMissing(value);
}

function IncomeReadonlyPageContent({
  errorMessage,
  onRefresh,
  refreshStatus,
  showRefreshButton,
  snapshot,
}: IncomeReadonlyPageContentProps) {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [month, setMonth] = useState('all');
  const [type, setType] = useState('all');
  const [sortBy, setSortBy] = useState<ReadonlyIncomeSortKey>('paymentDate');

  const viewModel = useMemo(
    () =>
      createReadonlyIncomeViewModel(snapshot, {
        query,
        year,
        month,
        type,
        sortBy,
      }),
    [month, query, snapshot, sortBy, type, year],
  );

  const hasItems = snapshot.items.length > 0;
  const topPayment = viewModel.topPayments[0] ?? null;
  const topPayer = viewModel.topPayers[0] ?? null;
  const emptyTitle = hasItems ? 'Nenhum provento encontrado' : 'Carteira de proventos vazia nesta leitura readonly.';
  const emptyBody = hasItems
    ? 'Ajuste busca, periodo, ano, mes, tipo ou ordenacao para ver os registros novamente.'
    : 'O snapshot de proventos chegou vazio, mas continua valido e congelado.';

  return (
    <section className="page-shell fixed-income-readonly" aria-labelledby="page-income">
      <div className="fixed-income-readonly__header">
        <div>
          <p className="page-shell__eyebrow">Proventos</p>
          <h2 className="page-shell__title" id="page-income">
            Proventos e renda mensal
          </h2>
          <p className="page-shell__description">
            Somente leitura. O legado fornece os registros reais e a tela apenas apresenta o snapshot congelado.
          </p>
        </div>

        <div className="fixed-income-readonly__header-actions">
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Snapshot</span>
            <time dateTime={snapshot.generatedAt}>{formatReadonlyDateTime(snapshot.generatedAt)}</time>
          </p>
          <p className="fixed-income-readonly__meta">
            <span className="fixed-income-readonly__meta-label">Origem segura</span>
            <span>Snapshot readonly validado</span>
          </p>
          <a className="fixed-income-readonly__legacy-link" href="/index.html">
            Voltar ao legado
          </a>
          {showRefreshButton ? (
            <button className="assets-report__refresh-button" type="button" onClick={onRefresh}>
              Atualizar proventos
            </button>
          ) : null}
        </div>
      </div>

      <p className="fixed-income-readonly__notice">{snapshot.notice}</p>

      <p className="fixed-income-readonly__status" role="status" aria-live="polite">
        {errorMessage ? errorMessage : formatStatusLabel(refreshStatus, snapshot.summary.paymentCount)}
      </p>

      <section className="fixed-income-readonly__filters" aria-labelledby="income-filters">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="income-filters">
            Filtros
          </h3>
          <p className="fixed-income-readonly__section-note">Apenas estado visual local, sem persistencia.</p>
        </div>

        <div className="fixed-income-readonly__controls">
          <label className="fixed-income-readonly__control">
            <span>Buscar por ticker, nome, tipo ou observacao</span>
            <input
              aria-label="Buscar por ticker, nome, tipo ou observacao"
              placeholder="PETR4, dividendo, julho..."
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <label className="fixed-income-readonly__control">
            <span>Ano</span>
            <select aria-label="Filtrar por ano" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">Todos</option>
              {viewModel.years.map((itemYear) => (
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
            <span>Tipo</span>
            <select aria-label="Filtrar por tipo" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">Todos</option>
              {viewModel.types.map((itemType) => (
                <option key={itemType} value={itemType}>
                  {itemType}
                </option>
              ))}
            </select>
          </label>

          <label className="fixed-income-readonly__control">
            <span>Ordenar por</span>
            <select aria-label="Ordenar proventos" value={sortBy} onChange={(event) => setSortBy(event.target.value as ReadonlyIncomeSortKey)}>
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
              ? 'Nenhum provento corresponde aos filtros atuais.'
              : 'Carteira vazia nesta leitura readonly.'}
        </p>
      </section>

      <div className="overview-grid fixed-income-readonly__summary" aria-label="Resumo readonly dos proventos">
        <article className="overview-card">
          <p className="overview-card__label">Total recebido</p>
          <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.totalReceived)}</p>
          <p className="overview-card__hint">Valor oficial fornecido pelo legado</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Mes atual</p>
          <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.monthTotal)}</p>
          <p className="overview-card__hint">Leitura direta do snapshot readonly</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Ano atual</p>
          <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.yearTotal)}</p>
          <p className="overview-card__hint">Sem recalculo moderno</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Media mensal</p>
          <p className="overview-card__value">{formatReadonlyMoneyOrMissing(viewModel.averageMonthly)}</p>
          <p className="overview-card__hint">Media oficial do legado quando existente</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Quantidade de pagamentos</p>
          <p className="overview-card__value">{viewModel.paymentCount}</p>
          <p className="overview-card__hint">Registros ja validados e congelados</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Maior pagamento</p>
          <p className="overview-card__value">{topPayment ? summarizeItemLabel(topPayment) : 'Nao informado'}</p>
          <p className="overview-card__hint">
            {topPayment ? renderAmount(topPayment.netValue ?? topPayment.grossValue) : 'Sem valor informado'}
          </p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Maior pagador</p>
          <p className="overview-card__value">{topPayer ? topPayer.label : 'Nao informado'}</p>
          <p className="overview-card__hint">
            {topPayer ? renderAmount(topPayer.totalValue) : 'Sem agrupamento suficiente'}
          </p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Ultimo snapshot valido</p>
          <p className="overview-card__value">{snapshot.generatedAt ? 'Sim' : 'Nao informado'}</p>
          <p className="overview-card__hint">Mantido mesmo em refresh com erro</p>
        </article>
      </div>

      <section className="fixed-income-readonly__highlights" aria-labelledby="income-highlights">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="income-highlights">
            Destaques
          </h3>
          <p className="fixed-income-readonly__section-note">Leitura rapida dos pagamentos e pagadores mais uteis na sessao atual.</p>
        </div>

        <div className="fixed-income-readonly__highlight-grid">
          <article className="overview-card">
            <p className="overview-card__label">Maiores pagamentos</p>
            {viewModel.topPayments.length > 0 ? (
              <ul className="fixed-income-readonly__compact-list">
                {viewModel.topPayments.map((item) => (
                  <li key={item.id ?? item.sourceEventId ?? item.ticker ?? item.name ?? item.paymentDate ?? summarizeItemLabel(item)}>
                    <strong>{summarizeItemLabel(item)}</strong>
                    <span>
                      {renderAmount(item.netValue ?? item.grossValue)} · {formatReadonlyDateTime(item.paymentDate ?? snapshot.generatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="overview-card__hint">Nenhum pagamento informado.</p>
            )}
          </article>

          <article className="overview-card">
            <p className="overview-card__label">Maiores pagadores</p>
            {viewModel.topPayers.length > 0 ? (
              <ul className="fixed-income-readonly__compact-list">
                {viewModel.topPayers.map((item) => (
                  <li key={`${item.label}-${item.totalValue ?? 'na'}`}>
                    <strong>{item.label}</strong>
                    <span>
                      {renderAmount(item.totalValue)} · {item.paymentCount} lancamento{item.paymentCount === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="overview-card__hint">Nenhum pagador informado.</p>
            )}
          </article>

          <article className="overview-card">
            <p className="overview-card__label">Meses com recebimento</p>
            {viewModel.monthlyBuckets.length > 0 ? (
              <ul className="fixed-income-readonly__compact-list">
                {viewModel.monthlyBuckets.slice(0, 3).map((item) => (
                  <li key={item.monthKey}>
                    <strong>{item.label}</strong>
                    <span>
                      {renderAmount(item.totalValue)} · {item.paymentCount} lancamento{item.paymentCount === 1 ? '' : 's'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="overview-card__hint">Sem meses informados.</p>
            )}
          </article>

          <article className="overview-card">
            <p className="overview-card__label">Filtro atual</p>
            <ul className="fixed-income-readonly__compact-list">
              <li>
                <strong>Ano</strong>
                <span>{viewModel.selectedYear === 'all' ? 'Todos' : viewModel.selectedYear}</span>
              </li>
              <li>
                <strong>Mes</strong>
                <span>{viewModel.selectedMonth === 'all' ? 'Todos' : viewModel.selectedMonth}</span>
              </li>
              <li>
                <strong>Tipo</strong>
                <span>{viewModel.selectedType === 'all' ? 'Todos' : viewModel.selectedType}</span>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section className="fixed-income-readonly__distribution" aria-labelledby="income-monthly">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="income-monthly">
            Distribuicao mensal
          </h3>
          <p className="fixed-income-readonly__section-note">Agregacao visual baseada nos valores ja fornecidos.</p>
        </div>

        <div className="fixed-income-readonly__distribution-list">
          {viewModel.monthlyBuckets.length > 0 ? (
            viewModel.monthlyBuckets.map((entry) => {
              const maxValue = Math.max(...viewModel.monthlyBuckets.map((bucket) => bucket.totalValue ?? 0), 0);
              const ratio = maxValue > 0 && typeof entry.totalValue === 'number' ? (entry.totalValue / maxValue) * 100 : 0;

              return (
                <div className="fixed-income-readonly__distribution-row" key={entry.monthKey}>
                  <div className="fixed-income-readonly__distribution-row-head">
                    <strong>{entry.label}</strong>
                    <span>
                      {formatReadonlyMoneyOrMissing(entry.totalValue)} · {entry.paymentCount} lancamento{entry.paymentCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  {entry.totalValue === null ? (
                    <p className="overview-card__hint">Participacao nao informada.</p>
                  ) : (
                    <div
                      className="fixed-income-readonly__distribution-track"
                      aria-label={`${entry.label}: ${formatReadonlyMoneyOrMissing(entry.totalValue)}`}
                    >
                      <span
                        className="fixed-income-readonly__distribution-fill"
                        style={{ width: `${Math.max(0, Math.min(ratio, 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="fixed-income-readonly__empty" role="status" aria-live="polite">
              <p className="fixed-income-readonly__empty-title">Sem meses informados</p>
              <p className="fixed-income-readonly__empty-body">O snapshot nao trouxe meses suficientes para grafico mensal.</p>
            </div>
          )}
        </div>
      </section>

      <section className="fixed-income-readonly__list" aria-labelledby="income-list">
        <div className="fixed-income-readonly__section-title-row">
          <h3 className="fixed-income-readonly__section-title" id="income-list">
            Lista de proventos
          </h3>
          <p className="fixed-income-readonly__section-note">Desktop em tabela; mobile em cartes sem rolagem horizontal.</p>
        </div>

        {viewModel.filteredItems.length > 0 ? (
          <>
            <div className="fixed-income-readonly__table-wrap">
              <table className="fixed-income-readonly__table">
                <caption>Proventos recebidos e renda mensal somente leitura</caption>
                <thead>
                  <tr>
                    <th scope="col">Ativo</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Pagamento</th>
                    <th scope="col">Competencia</th>
                    <th className="number-cell" scope="col">
                      Bruto
                    </th>
                    <th className="number-cell" scope="col">
                      Liquido
                    </th>
                    <th className="number-cell" scope="col">
                      Imposto
                    </th>
                    <th className="number-cell" scope="col">
                      Quantidade
                    </th>
                    <th scope="col">Observacao</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.filteredItems.map((item) => (
                    <tr key={item.id ?? item.sourceEventId ?? item.ticker ?? item.name ?? item.paymentDate ?? summarizeItemLabel(item)}>
                      <th scope="row">
                        <span className="assets-report__ticker">{item.ticker ?? 'Sem ticker'}</span>
                        <span className="assets-report__name">{item.name ?? 'Sem identificacao'}</span>
                      </th>
                      <td>{item.type ?? 'Nao informado'}</td>
                      <td>{formatReadonlyDateTime(item.paymentDate ?? snapshot.generatedAt)}</td>
                      <td>{item.competenceDate ? formatReadonlyDateTime(item.competenceDate) : 'Nao informado'}</td>
                      <td className="number-cell">{renderAmount(item.grossValue)}</td>
                      <td className="number-cell">{renderAmount(item.netValue)}</td>
                      <td className="number-cell">{renderAmount(item.taxValue)}</td>
                      <td className="number-cell">{item.quantity === null ? 'Nao informado' : item.quantity.toLocaleString('pt-BR')}</td>
                      <td>{item.note ?? 'Nao informado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="fixed-income-readonly__mobile-list" aria-label="Lista mobile dos proventos">
              {viewModel.filteredItems.map((item) => (
                <article
                  className="fixed-income-readonly__mobile-card"
                  key={item.id ?? item.sourceEventId ?? item.ticker ?? item.name ?? item.paymentDate ?? summarizeItemLabel(item)}
                >
                  <div>
                    <h4>{item.ticker ?? 'Sem ticker'}</h4>
                    <p className="fixed-income-readonly__mobile-subtitle">{item.name ?? 'Sem identificacao'}</p>
                  </div>
                  <dl>
                    <div>
                      <dt>Tipo</dt>
                      <dd>{item.type ?? 'Nao informado'}</dd>
                    </div>
                    <div>
                      <dt>Pagamento</dt>
                      <dd>{formatReadonlyDateTime(item.paymentDate ?? snapshot.generatedAt)}</dd>
                    </div>
                    <div>
                      <dt>Competencia</dt>
                      <dd>{item.competenceDate ? formatReadonlyDateTime(item.competenceDate) : 'Nao informado'}</dd>
                    </div>
                    <div>
                      <dt>Bruto</dt>
                      <dd>{renderAmount(item.grossValue)}</dd>
                    </div>
                    <div>
                      <dt>Liquido</dt>
                      <dd>{renderAmount(item.netValue)}</dd>
                    </div>
                    <div>
                      <dt>Imposto</dt>
                      <dd>{renderAmount(item.taxValue)}</dd>
                    </div>
                    <div>
                      <dt>Quantidade</dt>
                      <dd>{item.quantity === null ? 'Nao informado' : item.quantity.toLocaleString('pt-BR')}</dd>
                    </div>
                    <div>
                      <dt>Observacao</dt>
                      <dd>{item.note ?? 'Nao informado'}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="fixed-income-readonly__empty" role="status" aria-live="polite">
            <p className="fixed-income-readonly__empty-title">{emptyTitle}</p>
            <p className="fixed-income-readonly__empty-body">{emptyBody}</p>
          </div>
        )}
      </section>
    </section>
  );
}

function StaticIncomeReadonlyPage({ adapter }: { adapter: ReadOnlyIncomeAdapter }) {
  return (
    <IncomeReadonlyPageContent
      errorMessage={null}
      refreshStatus="idle"
      showRefreshButton={false}
      snapshot={adapter.getSnapshot()}
    />
  );
}

function RefreshableIncomeReadonlyPage({ refreshController }: { refreshController: IncomeRefreshController }) {
  const refreshState = useSyncExternalStore(
    refreshController.subscribe,
    refreshController.getState,
    refreshController.getState,
  );

  return (
    <IncomeReadonlyPageContent
      errorMessage={refreshState.errorMessage}
      onRefresh={() => refreshController.refresh()}
      refreshStatus={refreshState.refreshStatus}
      showRefreshButton={true}
      snapshot={refreshState.snapshot}
    />
  );
}

export function IncomeReadonlyPage({ adapter, refreshController }: IncomeReadonlyPageProps) {
  if (!refreshController) {
    return <StaticIncomeReadonlyPage adapter={adapter} />;
  }

  return <RefreshableIncomeReadonlyPage refreshController={refreshController} />;
}
