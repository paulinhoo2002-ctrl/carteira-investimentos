import type { ModernPageId } from '../types/navigation.mjs';
import { SHELL_MORE_ITEM_ID, SHELL_NAVIGATION_GROUPS, getModernPageByDisplayId } from '../types/shellNavigation.mjs';

interface BottomNavProps {
  activePageId: ModernPageId;
  isMoreOpen: boolean;
  onSelectPage: (pageId: ModernPageId) => void;
  onToggleMore: () => void;
}

export function BottomNav({ activePageId, isMoreOpen, onSelectPage, onToggleMore }: BottomNavProps) {
  return (
    <nav aria-label="Navegacao principal movel" className="modern-bottom-nav">
      {SHELL_NAVIGATION_GROUPS.MOBILE_BOTTOM.map((pageId) => {
        if (pageId === SHELL_MORE_ITEM_ID) {
          return (
            <button
              aria-expanded={isMoreOpen}
              className="modern-bottom-nav__item modern-bottom-nav__item--more"
              data-active={isMoreOpen}
              key={SHELL_MORE_ITEM_ID}
              type="button"
              onClick={onToggleMore}
            >
              <span className="modern-bottom-nav__label">Mais</span>
            </button>
          );
        }

        const page = getModernPageByDisplayId(pageId);
        const isActive = page?.id === activePageId;
        const label = page?.displayLabel ?? page?.label ?? pageId;

        return (
          <button
            aria-current={isActive ? 'page' : undefined}
            className="modern-bottom-nav__item"
            data-active={isActive}
            key={pageId}
            type="button"
            onClick={() => onSelectPage(pageId)}
          >
            <span className="modern-bottom-nav__label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
