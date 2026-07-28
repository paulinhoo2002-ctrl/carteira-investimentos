import { Button } from '../../../components/Button/Button';
import { formatReadonlyCurrency, formatReadonlyPercent, type ReadOnlyReportItem } from '../readonlyReportsViewModel';
import { summarizeItemLabel } from '../readonlyReportsConstants';

interface AssetsReadonlyTopPositionsProps {
  readonly open: boolean;
  readonly onOpenChange: (value: boolean) => void;
  readonly items: readonly ReadOnlyReportItem[];
}

export function AssetsReadonlyTopPositions({ open, onOpenChange, items }: AssetsReadonlyTopPositionsProps) {
  return (
    <section className="assets-readonly__highlights" aria-labelledby="assets-highlights">
      <div className="assets-readonly__section-title-row">
        <div>
          <h3 className="assets-readonly__section-title" id="assets-highlights">
            Maiores posições
          </h3>
          <p className="assets-readonly__section-note">Top 3 por valor da posição.</p>
        </div>
        <Button
          aria-controls="assets-readonly-highlights-panel"
          aria-expanded={open}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(!open)}
        >
          {open ? 'Ocultar' : 'Ver maiores'}
        </Button>
      </div>

      <div className="assets-readonly__auxiliary-panel" id="assets-readonly-highlights-panel" hidden={!open}>
        <div className="assets-readonly__top-list">
          {items.length > 0 ? (
            items.map((item, index) => (
              <article className="overview-card" key={item.ticker}>
                <p className="overview-card__label">Posição {index + 1}</p>
                <p className="overview-card__value">{summarizeItemLabel(item.ticker, item.name)}</p>
                <p className="overview-card__hint">
                  {formatReadonlyCurrency(item.currentValue)} · {formatReadonlyPercent(item.allocationPct, { signed: false })}
                </p>
              </article>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">Sem ativos</p>
              <p className="overview-card__value">Snapshot vazio</p>
              <p className="overview-card__hint">Nenhuma posição readonly para exibir.</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
