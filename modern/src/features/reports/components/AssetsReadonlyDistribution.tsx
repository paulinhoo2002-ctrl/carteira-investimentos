import { Button } from '../../../components/Button/Button';
import { formatReadonlyPercent, type ReadonlyAssetCategoryDistribution } from '../readonlyReportsViewModel';

interface AssetsReadonlyDistributionProps {
  readonly open: boolean;
  readonly onOpenChange: (value: boolean) => void;
  readonly entries: readonly ReadonlyAssetCategoryDistribution[];
}

export function AssetsReadonlyDistribution({ open, onOpenChange, entries }: AssetsReadonlyDistributionProps) {
  return (
    <section className="assets-readonly__distribution" aria-labelledby="assets-distribution">
      <div className="assets-readonly__section-title-row">
        <div>
          <h3 className="assets-readonly__section-title" id="assets-distribution">
            Distribuição por categoria
          </h3>
          <p className="assets-readonly__section-note">Agregação visual baseada nas participações já calculadas.</p>
        </div>
        <Button
          aria-controls="assets-readonly-distribution-panel"
          aria-expanded={open}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(!open)}
        >
          {open ? 'Ocultar' : 'Ver distribuição'}
        </Button>
      </div>

      <div className="assets-readonly__auxiliary-panel" id="assets-readonly-distribution-panel" hidden={!open}>
        <div className="assets-readonly__distribution-list">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <div className="assets-readonly__distribution-row" key={entry.category}>
                <div className="assets-readonly__distribution-row-head">
                  <strong>{entry.category}</strong>
                  <span>
                    {formatReadonlyPercent(entry.allocationPct, { signed: false })} · {entry.itemCount} ativos
                  </span>
                </div>
                <div
                  className="assets-readonly__distribution-track"
                  aria-label={`${entry.category}: ${formatReadonlyPercent(entry.allocationPct, { signed: false })}`}
                >
                  <span
                    className="assets-readonly__distribution-fill"
                    style={{ width: `${Math.max(0, Math.min(entry.allocationPct, 100))}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <article className="overview-card" aria-live="polite">
              <p className="overview-card__label">Sem distribuicao</p>
              <p className="overview-card__value">Snapshot vazio</p>
              <p className="overview-card__hint">Nenhuma categoria readonly para exibir.</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
