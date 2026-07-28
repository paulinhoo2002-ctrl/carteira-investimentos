import { Badge } from '../../../components/Badge/Badge';
import { SIGNAL_PRIORITY_ORDER, type ReadonlyAssetSignalCounts } from '../readonlyReportsViewModel';
import { signalBadgeVariant, signalLabels } from '../readonlyReportsConstants';

interface AssetsReadonlySignalCountsProps {
  readonly counts: ReadonlyAssetSignalCounts;
}

export function AssetsReadonlySignalCounts({ counts }: AssetsReadonlySignalCountsProps) {
  return (
    <section className="assets-readonly__signal-counts" aria-labelledby="assets-signal-counts-title">
      <div className="assets-readonly__section-title-row">
        <h3 className="assets-readonly__section-title" id="assets-signal-counts-title">
          Contagem por sinal
        </h3>
        <p className="assets-readonly__section-note">Calculada antes do filtro por sinal; respeita busca e categoria.</p>
      </div>
      <ul className="assets-readonly__signal-counts-list" aria-label="Contagem de ativos por sinal">
        {SIGNAL_PRIORITY_ORDER.map((key) => (
          <li key={key} className="assets-readonly__signal-counts-item" data-signal={key}>
            <Badge size="sm" variant={signalBadgeVariant[key]}>
              {signalLabels[key]}
            </Badge>
            <span className="assets-readonly__signal-counts-value">{counts[key]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
