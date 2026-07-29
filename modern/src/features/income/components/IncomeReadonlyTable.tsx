import { formatReadonlyDateTime, formatReadonlyMoneyOrMissing } from '../readonlyIncomeViewModel.ts';
import type { ReadOnlyIncomeItem, ReadOnlyIncomeSnapshot } from '../incomeReadonlyContract.mjs';
import { summarizeItemLabel } from './shared/summarizeItemLabel';

interface IncomeReadonlyTableProps {
  readonly items: readonly ReadOnlyIncomeItem[];
  readonly snapshot: ReadOnlyIncomeSnapshot;
}

export function IncomeReadonlyTable({ items, snapshot }: IncomeReadonlyTableProps) {
  return (
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
              Recebido
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
          {items.map((item) => (
            <tr key={item.id ?? item.sourceEventId ?? item.ticker ?? item.name ?? item.paymentDate ?? summarizeItemLabel(item)}>
              <th scope="row">
                <span className="assets-report__ticker">{item.ticker ?? 'Sem ticker'}</span>
                <span className="assets-report__name">{item.name ?? 'Sem identificacao'}</span>
              </th>
              <td>{item.type ?? 'Nao informado'}</td>
              <td>{formatReadonlyDateTime(item.paymentDate ?? snapshot.generatedAt)}</td>
              <td>{item.competenceDate ? formatReadonlyDateTime(item.competenceDate) : 'Nao informado'}</td>
              <td className="number-cell">{formatReadonlyMoneyOrMissing(item.receivedValue)}</td>
              <td className="number-cell">{formatReadonlyMoneyOrMissing(item.taxValue)}</td>
              <td className="number-cell">{item.quantity === null ? 'Nao informado' : item.quantity.toLocaleString('pt-BR')}</td>
              <td>{item.note ?? 'Nao informado'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
