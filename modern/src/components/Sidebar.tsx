import type { ModernPage, ModernPageId } from '../types/navigation';

interface SidebarProps {
  activePageId: ModernPageId;
  isMenuOpen: boolean;
  onSelectPage: (pageId: ModernPageId) => void;
  pages: ModernPage[];
}

export function Sidebar({ activePageId, isMenuOpen, onSelectPage, pages }: SidebarProps) {
  return (
    <aside className="modern-sidebar" data-open={isMenuOpen} id="modern-sidebar">
      <p className="modern-sidebar__title">Navegacao</p>
      <nav aria-label="Secoes da base moderna">
        <ul className="modern-sidebar__list">
          {pages.map((page) => {
            const isActive = page.id === activePageId;

            return (
              <li key={page.id}>
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className="sidebar__item"
                  data-active={isActive}
                  type="button"
                  onClick={() => onSelectPage(page.id)}
                >
                  <span className="sidebar__item-label">{page.label}</span>
                  <span className="sidebar__item-hint">{page.hint}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
