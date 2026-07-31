import { useEffect, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { MoreSheet } from './components/MoreSheet';
import { PagePlaceholder } from './components/PagePlaceholder';
import { Sidebar } from './components/Sidebar';
import { ContributionsReadonlyPage } from './features/contributions/ContributionsReadonlyPage';
import type { ContributionsRefreshController } from './features/contributions/contributionsRefreshController.ts';
import type { ReadOnlyContributionsAdapter } from './features/contributions/contributionsSnapshotAdapter.mjs';
import { GoalsPage } from './features/goals/GoalsPage';
import { IncomeReadonlyPage } from './features/income/IncomeReadonlyPage';
import type { IncomeRefreshController } from './features/income/incomeRefreshController.ts';
import type { ReadOnlyIncomeAdapter } from './features/income/incomeSnapshotAdapter.mjs';
import { FixedIncomeReadonlyPage } from './features/fixed-income/FixedIncomeReadonlyPage';
import { NetWorthPage } from './features/net-worth/NetWorthPage';
import { RebalancePage } from './features/rebalance/RebalancePage';
import { AssetsReadonlyPage } from './features/reports/AssetsReadonlyPage';
import { AssetsReportPreview } from './features/reports/AssetsReportPreview';
import type { ReportsRefreshController } from './features/reports/reportsRefreshController';
import type { ReadOnlyFixedIncomeAdapter } from './features/fixed-income/fixedIncomeSnapshotAdapter.mjs';
import type { ReadOnlyReportsAdapter } from './features/reports/reportsSnapshotAdapter';
import { ReturnsPage } from './features/returns/ReturnsPage';
import type { ModernPageId } from './types/navigation.mjs';
import { MODERN_PAGES, OVERVIEW_CARDS } from './types/navigation.mjs';

interface AppProps {
  reportsAdapter: ReadOnlyReportsAdapter;
  fixedIncomeAdapter: ReadOnlyFixedIncomeAdapter;
  incomeAdapter: ReadOnlyIncomeAdapter;
  contributionsAdapter: ReadOnlyContributionsAdapter;
  reportsRefreshController?: ReportsRefreshController | null;
  incomeRefreshController?: IncomeRefreshController | null;
  contributionsRefreshController?: ContributionsRefreshController | null;
  initialPageId?: ModernPageId;
  onActivePageIdChange?: (pageId: ModernPageId) => void;
}

export function App({
  reportsAdapter,
  fixedIncomeAdapter,
  incomeAdapter,
  contributionsAdapter,
  reportsRefreshController,
  incomeRefreshController,
  contributionsRefreshController,
  initialPageId = 'overview',
  onActivePageIdChange,
}: AppProps) {
  const [activePageId, setActivePageId] = useState<ModernPageId>(initialPageId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const activePage = MODERN_PAGES.find((page) => page.id === activePageId) ?? MODERN_PAGES[0];

  useEffect(() => {
    if (!isMenuOpen && !isMoreOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsMoreOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen, isMoreOpen]);

  const handlePageChange = (pageId: ModernPageId) => {
    setActivePageId(pageId);
    setIsMenuOpen(false);
    setIsMoreOpen(false);
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
          ) : activePageId === 'contributions' ? (
            <ContributionsReadonlyPage
              adapter={contributionsAdapter}
              refreshController={contributionsRefreshController}
            />
          ) : activePageId === 'reports' ? (
            <AssetsReportPreview adapter={reportsAdapter} refreshController={reportsRefreshController} />
          ) : activePageId === 'returns' ? (
            <ReturnsPage />
          ) : activePageId === 'goals' ? (
            <GoalsPage />
          ) : activePageId === 'net-worth' ? (
            <NetWorthPage />
          ) : activePageId === 'rebalance' ? (
            <RebalancePage />
          ) : (
            <PagePlaceholder
              cardData={activePageId === 'overview' ? OVERVIEW_CARDS : undefined}
              page={activePage}
            />
          )}
        </main>
      </div>

      <MoreSheet
        activePageId={activePageId}
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        onSelectPage={handlePageChange}
      />

      <footer className="modern-footnote">Base moderna isolada - sem acesso aos dados da carteira.</footer>

      <BottomNav
        activePageId={activePageId}
        isMoreOpen={isMoreOpen}
        onSelectPage={handlePageChange}
        onToggleMore={() => setIsMoreOpen((current) => !current)}
      />
    </div>
  );
}
