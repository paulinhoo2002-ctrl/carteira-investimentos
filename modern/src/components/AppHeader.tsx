interface AppHeaderProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

export function AppHeader({ isMenuOpen, onToggleMenu }: AppHeaderProps) {
  return (
    <header className="modern-header">
      <div className="modern-brand">
        <p className="modern-brand__badge">Base moderna isolada</p>
        <h1 className="modern-brand__title">Carteira de Investimentos</h1>
        <p className="modern-brand__subtitle">Shell visual para a fase 2 da modernizacao</p>
      </div>

      <button
        aria-controls="modern-sidebar"
        aria-expanded={isMenuOpen}
        className="modern-menu-button"
        type="button"
        onClick={onToggleMenu}
      >
        {isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
      </button>
    </header>
  );
}
