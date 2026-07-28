import { Badge } from '../../../components/Badge/Badge';
import {
  calculateReadonlyAssetResult,
  calculateReadonlyAssetRentabilityPct,
  formatReadonlyCurrency,
  formatReadonlyPercent,
  formatReadonlyQuantity,
} from '../readonlyReportsViewModel';
import { categoryBadgeVariant, trendBadgeVariant } from '../readonlyReportsConstants';
import { sanitizeTickerForId } from '../shared/sanitizeTickerForId';

interface AssetsReadonlyMobileCardsItem {
  readonly item: import('../readonlyReportsViewModel').ReadonlyAssetsViewModel['filteredItems'][number];
  readonly signal: import('../readonlyReportsViewModel').ReadonlyAssetPrudentSignal;
}

interface AssetsReadonlyMobileCardsProps {
  readonly items: readonly AssetsReadonlyMobileCardsItem[];
}

export function AssetsReadonlyMobileCards({ items }: AssetsReadonlyMobileCardsProps) {
  return (
    <div className="assets-report__mobile-list" aria-label="Lista mobile dos ativos readonly">
      {items.map(({ item, signal }) => {
        const signalDescriptionId = `assets-readonly-signal-reason-mobile-${sanitizeTickerForId(item.ticker)}`;
        return (
          <article className="assets-report__mobile-card" key={item.ticker}>
            <div className="assets-report__mobile-card-head">
              <div>
                <h4 className="assets-report__ticker">{item.ticker}</h4>
                <p className="assets-report__name">{item.name}</p>
              </div>
              <Badge size="sm" variant={categoryBadgeVariant(item.category)}>
                {item.category}
              </Badge>
            </div>
            <dl>
              <div>
                <dt>Valor da posição</dt>
                <dd>{formatReadonlyCurrency(item.currentValue)}</dd>
              </div>
              <div>
                <dt>Resultado</dt>
                <dd>{formatReadonlyCurrency(calculateReadonlyAssetResult(item))}</dd>
              </div>
              <div>
                <dt>Rentabilidade</dt>
                <dd>{formatReadonlyPercent(calculateReadonlyAssetRentabilityPct(item))}</dd>
              </div>
              <div>
                <dt>Sinal</dt>
                <dd className="assets-report__signal-value">
                  <div aria-describedby={signalDescriptionId} className="assets-report__signal">
                    <Badge size="sm" variant={signal.badgeVariant}>
                      {signal.label}
                    </Badge>
                    <span className="assets-report__signal-reason" id={signalDescriptionId}>
                      {signal.reason}
                    </span>
                  </div>
                </dd>
              </div>
              <div>
                <dt>Quantidade</dt>
                <dd>{formatReadonlyQuantity(item.quantity)}</dd>
              </div>
              <div>
                <dt>Preço médio</dt>
                <dd>{formatReadonlyCurrency(item.averagePrice)}</dd>
              </div>
              <div>
                <dt>Tendência</dt>
                <dd>
                  <Badge size="sm" variant={trendBadgeVariant[item.trend]}>
                    {item.trend === 'positive' ? 'Positivo' : item.trend === 'negative' ? 'Negativo' : 'Neutro'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}
