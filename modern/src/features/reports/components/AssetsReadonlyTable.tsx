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

interface AssetsReadonlyTableItem {
  readonly item: import('../readonlyReportsViewModel').ReadonlyAssetsViewModel['filteredItems'][number];
  readonly signal: import('../readonlyReportsViewModel').ReadonlyAssetPrudentSignal;
}

interface AssetsReadonlyTableProps {
  readonly items: readonly AssetsReadonlyTableItem[];
}

export function AssetsReadonlyTable({ items }: AssetsReadonlyTableProps) {
  return (
    <div className="assets-report__table-wrap">
      <table className="assets-report__table">
        <caption>Lista readonly dos ativos da carteira</caption>
        <thead>
          <tr>
            <th scope="col">Ativo</th>
            <th scope="col">Categoria</th>
            <th className="number-cell" scope="col">
              Quantidade
            </th>
            <th className="number-cell" scope="col">
              Preço médio
            </th>
            <th className="number-cell" scope="col">
              Valor da posição
            </th>
            <th className="number-cell" scope="col">
              Resultado
            </th>
            <th className="number-cell" scope="col">
              Rentabilidade
            </th>
            <th scope="col">Sinal</th>
            <th scope="col">Tendência</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ item, signal }) => {
            const signalDescriptionId = `assets-readonly-signal-reason-${sanitizeTickerForId(item.ticker)}`;
            return (
              <tr key={item.ticker}>
                <th scope="row">
                  <span className="assets-report__ticker">{item.ticker}</span>
                  <span className="assets-report__name">{item.name}</span>
                </th>
                <td>
                  <Badge size="sm" variant={categoryBadgeVariant(item.category)}>
                    {item.category}
                  </Badge>
                </td>
                <td className="number-cell">{formatReadonlyQuantity(item.quantity)}</td>
                <td className="number-cell">{formatReadonlyCurrency(item.averagePrice)}</td>
                <td className="number-cell">{formatReadonlyCurrency(item.currentValue)}</td>
                <td className="number-cell">{formatReadonlyCurrency(calculateReadonlyAssetResult(item))}</td>
                <td className="number-cell">{formatReadonlyPercent(calculateReadonlyAssetRentabilityPct(item))}</td>
                <td className="assets-report__signal-cell">
                  <div aria-describedby={signalDescriptionId} className="assets-report__signal">
                    <Badge size="sm" variant={signal.badgeVariant}>
                      {signal.label}
                    </Badge>
                    <span className="assets-report__signal-reason" id={signalDescriptionId}>
                      {signal.reason}
                    </span>
                  </div>
                </td>
                <td>
                  <Badge size="sm" variant={trendBadgeVariant[item.trend]}>
                    {item.trend === 'positive' ? 'Positivo' : item.trend === 'negative' ? 'Negativo' : 'Neutro'}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
