import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { PagePlaceholder } from './components/PagePlaceholder';
import { Sidebar } from './components/Sidebar';
import { IncomeReadonlyPage } from './features/income/IncomeReadonlyPage';
import type { IncomeRefreshController } from './features/income/incomeRefreshController.ts';
import type { ReadOnlyIncomeAdapter } from './features/income/incomeSnapshotAdapter.mjs';
import { FixedIncomeReadonlyPage } from './features/fixed-income/FixedIncomeReadonlyPage';
import { AssetsReadonlyPage } from './features/reports/AssetsReadonlyPage';
import { AssetsReportPreview } from './features/reports/AssetsReportPreview';
import type { ReportsRefreshController } from './features/reports/reportsRefreshController';
import type { ReadOnlyFixedIncomeAdapter } from './features/fixed-income/fixedIncomeSnapshotAdapter.mjs';
import type { ReadOnlyReportsAdapter } from './features/reports/reportsSnapshotAdapter';
import type { ModernPageId } from './types/navigation.mjs';
import { MODERN_PAGES, OVERVIEW_CARDS } from './types/navigation.mjs';

interface AppProps {
  reportsAdapter: ReadOnlyReportsAdapter;
  fixedIncomeAdapter: ReadOnlyFixedIncomeAdapter;
  incomeAdapter: ReadOnlyIncomeAdapter;
  reportsRefreshController?: ReportsRefreshController | null;
  incomeRefreshController?: IncomeRefreshController | null;
  initialPageId?: ModernPageId;
  onActivePageIdChange?: (pageId: ModernPageId) => void;
}

export function App({
  reportsAdapter,
  fixedIncomeAdapter,
  incomeAdapter,
  reportsRefreshController,
  incomeRefreshController,
  initialPageId = 'overview',
  onActivePageIdChange,
}: AppProps) {
  const [activePageId, setActivePageId] = useState<ModernPageId>(initialPageId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activePage = MODERN_PAGES.find((page) => page.id === activePageId) ?? MODERN_PAGES[0];

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const handlePageChange = (pageId: ModernPageId) => {
    setActivePageId(pageId);
    setIsMenuOpen(false);
    onActivePageIdChange?.(pageId);
  };

  return (
    <div className="modern-app">
      <AppHeader isMenuOpen={isMenuOpen} onToggleMenu={() => setIsMenuOpen((current) => !current)} />

      <div className="modern-shell">
        <Sidebar
          activePageId={activePageId}
          isMenuOpen={isMenuOpen}
          onSelectPage={handlePageChange}
          pages={MODERN_PAGES}
        />

        {isMenuOpen ? (
          <button
            aria-label="Fechar menu"
            className="modern-backdrop"
            type="button"
            onClick={() => setIsMenuOpen(false)}
          />
        ) : null}

        <main className="modern-main" id="modern-main">
          {activePageId === 'assets' ? (
            <AssetsReadonlyPage
              adapter={reportsAdapter}
              refreshController={reportsRefreshController}
            />
          ) : activePageId === 'fixed-income' ? (
            <FixedIncomeReadonlyPage adapter={fixedIncomeAdapter} />
          ) : activePageId === 'provents' ? (
            <IncomeReadonlyPage adapter={incomeAdapter} refreshController={incomeRefreshController} />
          ) : activePageId === 'reports' ? (
            <AssetsReportPreview adapter={reportsAdapter} refreshController={reportsRefreshController} />
          ) : (
            <PagePlaceholder
              cardData={activePageId === 'overview' ? OVERVIEW_CARDS : undefined}
              page={activePage}
            />
          )}
        </main>
      </div>

      <footer className="modern-footnote">Base moderna isolada - sem acesso aos dados da carteira.</footer>
    </div>
  );
}
