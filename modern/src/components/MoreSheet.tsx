import type { ModernPageId } from '../types/navigation.mjs';
import { SHELL_NAVIGATION_GROUPS, getModernPageByDisplayId } from '../types/shellNavigation.mjs';

interface MoreSheetProps {
  activePageId: ModernPageId;
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (pageId: ModernPageId) => void;
}

export function MoreSheet({ activePageId, isOpen, onClose, onSelectPage }: MoreSheetProps) {
  return (
    <div aria-hidden={!isOpen} className="modern-more-sheet" data-open={isOpen}>
      <div className="modern-more-sheet__panel">
        <div className="modern-more-sheet__header">
          <p className="modern-more-sheet__title">Mais</p>
          <button
            aria-label="Fechar painel Mais"
            className="modern-more-sheet__close"
            type="button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <nav aria-label="Secoes adicionais da base moderna">
          <ul className="modern-more-sheet__list">
            {SHELL_NAVIGATION_GROUPS.MOBILE_MORE.map((pageId) => {
              const page = getModernPageByDisplayId(pageId);
              const isActive = page?.id === activePageId;

              return (
                <li key={pageId}>
                  <button
                    aria-current={isActive ? 'page' : undefined}
                    className="sidebar__item"
                    data-active={isActive}
                    type="button"
                    onClick={() => onSelectPage(pageId)}
                  >
                    <span className="sidebar__item-label">{page?.label ?? pageId}</span>
                    <span className="sidebar__item-hint">{page?.hint ?? ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
