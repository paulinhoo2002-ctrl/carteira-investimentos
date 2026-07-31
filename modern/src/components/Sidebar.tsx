import type { ModernPage, ModernPageId } from '../types/navigation.mjs';
import { SHELL_NAVIGATION_GROUPS, getModernPageByDisplayId } from '../types/shellNavigation.mjs';

interface SidebarProps {
  activePageId: ModernPageId;
  isMenuOpen: boolean;
  onSelectPage: (pageId: ModernPageId) => void;
  pages: ModernPage[];
}

const SIDEBAR_GROUP_ORDER = ['PRIMARY', 'SECONDARY'];
const SIDEBAR_GROUP_TITLE = {
  PRIMARY: 'Principal',
  SECONDARY: 'Mais',
};

export function Sidebar({ activePageId, isMenuOpen, onSelectPage, pages }: SidebarProps) {
  return (
    <aside className="modern-sidebar" data-open={isMenuOpen} id="modern-sidebar">
      <p className="modern-sidebar__title">Navegacao</p>
      <nav aria-label="Secoes da base moderna">
        {SIDEBAR_GROUP_ORDER.map((group) => (
          <div className="modern-sidebar__group" key={group}>
            <p className="modern-sidebar__group-title">{SIDEBAR_GROUP_TITLE[group]}</p>
            <ul className="modern-sidebar__list">
              {SHELL_NAVIGATION_GROUPS[group].map((pageId) => {
                const page = getModernPageByDisplayId(pageId, pages);
                if (!page) {
                  return null;
                }
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
          </div>
        ))}
      </nav>
    </aside>
  );
}
