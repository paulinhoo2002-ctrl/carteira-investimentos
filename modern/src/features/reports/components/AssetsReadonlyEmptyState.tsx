interface AssetsReadonlyEmptyStateProps {
  readonly snapshotIsEmpty: boolean;
}

export function AssetsReadonlyEmptyState({ snapshotIsEmpty }: AssetsReadonlyEmptyStateProps) {
  return (
    <div className="assets-readonly__empty" role="status" aria-live="polite">
      <p className="assets-readonly__empty-title">
        {snapshotIsEmpty ? 'Carteira vazia nesta leitura readonly.' : 'Nenhum ativo encontrado.'}
      </p>
      <p className="assets-readonly__empty-body">
        {snapshotIsEmpty
          ? 'O snapshot de leitura chegou vazio, mas continua válido e congelado.'
          : 'Ajuste a busca, a categoria ou a ordenação para ver os itens novamente.'}
      </p>
    </div>
  );
}
