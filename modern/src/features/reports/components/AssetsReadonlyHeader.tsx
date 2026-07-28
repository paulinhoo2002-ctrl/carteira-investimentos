import { Button } from '../../../components/Button/Button';
import { formatReadonlyDateTime } from '../readonlyReportsViewModel';
import type { ReadOnlyReportsSnapshot } from '../reportsReadonlyContract.mjs';

interface AssetsReadonlyHeaderProps {
  readonly snapshot: ReadOnlyReportsSnapshot;
  readonly originLabel: string;
  readonly showRefreshButton: boolean;
  readonly onRefresh: (() => void) | undefined;
}

export function AssetsReadonlyHeader({
  snapshot,
  originLabel,
  showRefreshButton,
  onRefresh,
}: AssetsReadonlyHeaderProps) {
  return (
    <div className="assets-readonly__header">
      <div>
        <p className="page-shell__eyebrow">Ativos</p>
        <h2 className="page-shell__title" id="page-assets">
          Ativos
        </h2>
        <p className="page-shell__description">Somente leitura. Nada aqui escreve ou altera a carteira.</p>
      </div>

      <div className="assets-readonly__header-actions">
        <p className="assets-readonly__meta">
          <span className="assets-readonly__meta-label">Snapshot</span>
          <time dateTime={snapshot.generatedAt}>{formatReadonlyDateTime(snapshot.generatedAt)}</time>
        </p>
        <p className="assets-readonly__meta">
          <span className="assets-readonly__meta-label">Origem segura</span>
          <span>{originLabel}</span>
        </p>
        <a className="assets-readonly__legacy-link" href="/index.html">
          Voltar ao legado
        </a>
        {showRefreshButton && onRefresh ? (
          <Button className="assets-report__refresh-button" type="button" variant="secondary" onClick={onRefresh}>
            Atualizar ativos
          </Button>
        ) : null}
      </div>
    </div>
  );
}
