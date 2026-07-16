import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReadOnlyFixedIncomeAdapter } from '../features/fixed-income/fixedIncomeSnapshotAdapter.mjs';
import type { ReportsRefreshController } from '../features/reports/reportsRefreshController';
import type { ReadOnlyReportsAdapter } from '../features/reports/reportsSnapshotAdapter';
import type { ModernPageId } from '../types/navigation.mjs';
import type { ComponentType } from 'react';

interface MountModernAppOptions {
  readonly rootElement: HTMLElement | null | undefined;
  readonly reportsAdapter: ReadOnlyReportsAdapter | null | undefined;
  readonly fixedIncomeAdapter: ReadOnlyFixedIncomeAdapter | null | undefined;
  readonly reportsRefreshController?: ReportsRefreshController | null | undefined;
  readonly initialPageId?: ModernPageId;
  readonly onActivePageIdChange?: (pageId: ModernPageId) => void;
  readonly AppComponent?: ComponentType<{
    reportsAdapter: ReadOnlyReportsAdapter;
    fixedIncomeAdapter: ReadOnlyFixedIncomeAdapter;
    reportsRefreshController?: ReportsRefreshController | null | undefined;
    initialPageId?: ModernPageId;
    onActivePageIdChange?: (pageId: ModernPageId) => void;
  }> | null | undefined;
}

export interface ModernAppMount {
  readonly unmount: () => void;
}

const mountedRoots = new WeakMap<HTMLElement, Root>();

export function mountModernApp(options: MountModernAppOptions): ModernAppMount {
  const {
    rootElement,
    reportsAdapter,
    fixedIncomeAdapter,
    reportsRefreshController,
    initialPageId,
    onActivePageIdChange,
    AppComponent,
  } = options;

  if (!rootElement) {
    throw new Error('Elemento root nao encontrado para a base moderna.');
  }

  if (!reportsAdapter || typeof reportsAdapter.getSnapshot !== 'function') {
    throw new Error('Adapter moderno invalido.');
  }

  if (!fixedIncomeAdapter || typeof fixedIncomeAdapter.getSnapshot !== 'function') {
    throw new Error('Adapter moderno de renda fixa invalido.');
  }

  if (!AppComponent) {
    throw new Error('Componente moderno invalido.');
  }

  if (mountedRoots.has(rootElement)) {
    throw new Error('Base moderna ja montada neste root.');
  }

  const root = createRoot(rootElement);
  mountedRoots.set(rootElement, root);
  root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(AppComponent, {
          reportsAdapter,
          fixedIncomeAdapter,
          reportsRefreshController,
          initialPageId,
          onActivePageIdChange,
        }),
      ),
    );

  return {
    unmount() {
      root.unmount();
      mountedRoots.delete(rootElement);
    },
  };
}
