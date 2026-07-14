import {
  ASSETS_REPORT_ITEMS,
  ASSETS_REPORT_UPDATED_AT,
  type AssetReportItem,
  type AssetTrend,
} from './assetsReportData';

const DEMO_NOTICE = 'Dados demonstrativos. Nenhuma informacao real da carteira foi carregada.';

const trendLabel: Record<AssetTrend, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

function formatPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}%`;
}

function formatQuantity(value: number) {
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: 4,
  });
}

function totalCurrentValue(items: readonly AssetReportItem[]) {
  return items.reduce((total, item) => total + item.currentValue, 0);
}

function averageVariation(items: readonly AssetReportItem[]) {
  return items.reduce((total, item) => total + item.variationPct, 0) / items.length;
}

export function AssetsReportPreview() {
  const totalValue = totalCurrentValue(ASSETS_REPORT_ITEMS);
  const variationAverage = averageVariation(ASSETS_REPORT_ITEMS);

  return (
    <section className="page-shell assets-report" aria-labelledby="page-reports">
      <div className="assets-report__header">
        <div>
          <p className="page-shell__eyebrow">Relatorios</p>
          <h2 className="page-shell__title" id="page-reports">
            Previa de Ativos
          </h2>
        </div>
        <p className="assets-report__updated">Atualizacao ficticia: {ASSETS_REPORT_UPDATED_AT}</p>
      </div>

      <p className="page-shell__description">
        Primeira tela moderna somente leitura para demonstrar uma previa de ativos sem carregar dados reais.
      </p>
      <p className="assets-report__notice">{DEMO_NOTICE}</p>

      <div className="assets-report__summary" aria-label="Resumo demonstrativo da previa de ativos">
        <article className="overview-card">
          <p className="overview-card__label">Total demonstrativo</p>
          <p className="overview-card__value">{formatCurrency(totalValue)}</p>
          <p className="overview-card__hint">Soma ficticia dos valores atuais</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Ativos na previa</p>
          <p className="overview-card__value">{ASSETS_REPORT_ITEMS.length}</p>
          <p className="overview-card__hint">Itens locais de demonstracao</p>
        </article>
        <article className="overview-card">
          <p className="overview-card__label">Variacao media</p>
          <p className="overview-card__value">{formatPercent(variationAverage)}</p>
          <p className="overview-card__hint">Media simples ficticia</p>
        </article>
      </div>

      <div className="assets-report__table-wrap">
        <table className="assets-report__table">
          <caption>Previa demonstrativa de ativos em relatorios</caption>
          <thead>
            <tr>
              <th scope="col">Ativo</th>
              <th scope="col">Tipo</th>
              <th className="number-cell" scope="col">
                Quantidade
              </th>
              <th className="number-cell" scope="col">
                Preco medio
              </th>
              <th className="number-cell" scope="col">
                Valor atual
              </th>
              <th className="number-cell" scope="col">
                Variacao
              </th>
              <th className="number-cell" scope="col">
                Participacao
              </th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS_REPORT_ITEMS.map((item) => (
              <tr key={item.ticker}>
                <th scope="row">
                  <span className="assets-report__ticker">{item.ticker}</span>
                  <span className="assets-report__name">{item.name}</span>
                </th>
                <td>{item.category}</td>
                <td className="number-cell">{formatQuantity(item.quantity)}</td>
                <td className="number-cell">{formatCurrency(item.averagePrice)}</td>
                <td className="number-cell">{formatCurrency(item.currentValue)}</td>
                <td className="number-cell">{formatPercent(item.variationPct)}</td>
                <td className="number-cell">{formatPercent(item.allocationPct).replace('+', '')}</td>
                <td>
                  <span className="trend-badge" data-trend={item.trend}>
                    {trendLabel[item.trend]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="assets-report__mobile-list" aria-label="Lista mobile equivalente da previa de ativos">
        {ASSETS_REPORT_ITEMS.map((item) => (
          <article className="assets-report__mobile-card" key={item.ticker}>
            <div>
              <h3>{item.ticker}</h3>
              <p>{item.name}</p>
            </div>
            <dl>
              <div>
                <dt>Tipo</dt>
                <dd>{item.category}</dd>
              </div>
              <div>
                <dt>Quantidade</dt>
                <dd>{formatQuantity(item.quantity)}</dd>
              </div>
              <div>
                <dt>Preco medio</dt>
                <dd>{formatCurrency(item.averagePrice)}</dd>
              </div>
              <div>
                <dt>Valor atual</dt>
                <dd>{formatCurrency(item.currentValue)}</dd>
              </div>
              <div>
                <dt>Variacao</dt>
                <dd>{formatPercent(item.variationPct)}</dd>
              </div>
              <div>
                <dt>Participacao</dt>
                <dd>{formatPercent(item.allocationPct).replace('+', '')}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  <span className="trend-badge" data-trend={item.trend}>
                    {trendLabel[item.trend]}
                  </span>
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
