import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ReadOnlyReportsAdapter } from '../features/reports/reportsSnapshotAdapter';
import type { ComponentType } from 'react';

interface MountModernAppOptions {
  readonly rootElement: HTMLElement | null | undefined;
  readonly reportsAdapter: ReadOnlyReportsAdapter | null | undefined;
  readonly AppComponent?: ComponentType<{ reportsAdapter: ReadOnlyReportsAdapter }> | null | undefined;
}

export interface ModernAppMount {
  readonly unmount: () => void;
}

const mountedRoots = new WeakMap<HTMLElement, Root>();

export function mountModernApp(options: MountModernAppOptions): ModernAppMount {
  const { rootElement, reportsAdapter, AppComponent } = options;

  if (!rootElement) {
    throw new Error('Elemento root nao encontrado para a base moderna.');
  }

  if (!reportsAdapter || typeof reportsAdapter.getSnapshot !== 'function') {
    throw new Error('Adapter moderno invalido.');
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
      React.createElement(AppComponent, { reportsAdapter }),
    ),
  );

  return {
    unmount() {
      root.unmount();
      mountedRoots.delete(rootElement);
    },
  };
}
