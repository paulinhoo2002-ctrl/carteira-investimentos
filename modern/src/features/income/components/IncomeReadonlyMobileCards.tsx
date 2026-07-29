import { formatReadonlyDateTime, formatReadonlyMoneyOrMissing } from '../readonlyIncomeViewModel.ts';
import type { ReadOnlyIncomeItem, ReadOnlyIncomeSnapshot } from '../incomeReadonlyContract.mjs';
import { summarizeItemLabel } from './shared/summarizeItemLabel';

interface IncomeReadonlyMobileCardsProps {
  readonly items: readonly ReadOnlyIncomeItem[];
  readonly snapshot: ReadOnlyIncomeSnapshot;
}

export function IncomeReadonlyMobileCards({ items, snapshot }: IncomeReadonlyMobileCardsProps) {
  return (
    <div className="fixed-income-readonly__mobile-list" aria-label="Lista mobile dos proventos">
      {items.map((item) => (
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
              <dt>Recebido</dt>
              <dd>{formatReadonlyMoneyOrMissing(item.receivedValue)}</dd>
            </div>
            <div>
              <dt>Imposto</dt>
              <dd>{formatReadonlyMoneyOrMissing(item.taxValue)}</dd>
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
  );
}
