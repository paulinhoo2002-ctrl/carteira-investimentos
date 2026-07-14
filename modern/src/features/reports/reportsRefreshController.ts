import { createReadOnlyReportsBridge, READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, type ReadOnlyReportsSnapshot, type ReadOnlyReportsSource } from './reportsReadonlyBridge.ts';

export type ReportsReadonlyOriginMode = 'real-wallet' | 'empty-wallet' | 'fallback-readonly' | 'demo-source';

export type ReportsRefreshStatus = 'idle' | 'updated' | 'fallback' | 'error';

export interface ReportsReadonlyDiagnostics {
  readonly originMode: ReportsReadonlyOriginMode;
  readonly originLabel: string;
  readonly itemCount: number;
  readonly generatedAt: string;
  readonly hasNotice: boolean;
  readonly refreshStatus: ReportsRefreshStatus;
}

export interface ReportsRefreshControllerState {
  readonly snapshot: ReadOnlyReportsSnapshot;
  readonly errorMessage: string | null;
  readonly diagnostics: ReportsReadonlyDiagnostics;
}

export interface ReportsRefreshControllerDiagnosticsInput {
  readonly snapshot: ReadOnlyReportsSnapshot;
  readonly isFallbackSnapshot: boolean;
  readonly previousDiagnostics: ReportsReadonlyDiagnostics | null;
  readonly refreshStatus: ReportsRefreshStatus;
}

export type ReportsRefreshControllerDiagnosticsFactory = (
  input: ReportsRefreshControllerDiagnosticsInput,
) => ReportsReadonlyDiagnostics;

export interface ReportsRefreshController {
  readonly getSnapshot: () => ReadOnlyReportsSnapshot;
  readonly getState: () => ReportsRefreshControllerState;
  readonly refresh: () => boolean;
  readonly subscribe: (listener: () => void) => () => void;
}

export interface ReportsRefreshControllerOptions {
  readonly source?: ReadOnlyReportsSource | null;
  readonly onRefresh?: () => void;
  readonly errorMessage?: string;
  readonly buildDiagnostics?: ReportsRefreshControllerDiagnosticsFactory;
}

const DEFAULT_REFRESH_ERROR_MESSAGE = 'Nao foi possivel atualizar a previa. Ultimo snapshot valido mantido.';

function isSameSnapshot(a: ReadOnlyReportsSnapshot, b: ReadOnlyReportsSnapshot) {
  return a === b;
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }

  return value;
}

function cloneDiagnostics(diagnostics: ReportsReadonlyDiagnostics): ReportsReadonlyDiagnostics {
  return deepFreeze({
    originMode: diagnostics.originMode,
    originLabel: diagnostics.originLabel,
    itemCount: diagnostics.itemCount,
    generatedAt: diagnostics.generatedAt,
    hasNotice: diagnostics.hasNotice,
    refreshStatus: diagnostics.refreshStatus,
  });
}

function createDefaultDiagnostics({
  snapshot,
  refreshStatus,
  isFallbackSnapshot,
}: ReportsRefreshControllerDiagnosticsInput): ReportsReadonlyDiagnostics {
  return cloneDiagnostics({
    originMode: isFallbackSnapshot ? 'fallback-readonly' : snapshot.items.length > 0 ? 'demo-source' : 'demo-source',
    originLabel: isFallbackSnapshot
      ? 'Fallback readonly'
      : snapshot.items.length > 0
        ? 'Demo source'
        : 'Snapshot vazio valido',
    itemCount: snapshot.items.length,
    generatedAt: snapshot.generatedAt,
    hasNotice: Boolean(String(snapshot.notice || '').trim()),
    refreshStatus,
  });
}

function buildDiagnostics(
  options: ReportsRefreshControllerOptions,
  input: ReportsRefreshControllerDiagnosticsInput,
): ReportsReadonlyDiagnostics {
  const factory = options.buildDiagnostics ?? createDefaultDiagnostics;
  return cloneDiagnostics(factory(input));
}

function createState(
  options: ReportsRefreshControllerOptions,
  snapshot: ReadOnlyReportsSnapshot,
  refreshStatus: ReportsRefreshStatus,
  previousDiagnostics: ReportsReadonlyDiagnostics | null,
  errorMessage: string | null,
): ReportsRefreshControllerState {
  const diagnostics =
    refreshStatus === 'error' && previousDiagnostics
      ? cloneDiagnostics({
          ...previousDiagnostics,
          refreshStatus,
        })
      : buildDiagnostics(options, {
          snapshot,
          isFallbackSnapshot: isSameSnapshot(snapshot, READ_ONLY_REPORTS_FALLBACK_SNAPSHOT),
          previousDiagnostics,
          refreshStatus,
        });

  return deepFreeze({
    snapshot,
    errorMessage,
    diagnostics,
  });
}

export function createReportsRefreshController(options: ReportsRefreshControllerOptions = {}): ReportsRefreshController {
  const bridge = createReadOnlyReportsBridge(options.source);
  const listeners = new Set<() => void>();
  const refreshErrorMessage = options.errorMessage ?? DEFAULT_REFRESH_ERROR_MESSAGE;
  let isRefreshing = false;

  const initialSnapshot = bridge.readSnapshot();
  let state: ReportsRefreshControllerState = createState(
    options,
    initialSnapshot,
    initialSnapshot === READ_ONLY_REPORTS_FALLBACK_SNAPSHOT ? 'fallback' : 'idle',
    null,
    initialSnapshot === READ_ONLY_REPORTS_FALLBACK_SNAPSHOT ? refreshErrorMessage : null,
  );

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(nextState: ReportsRefreshControllerState) {
    state = nextState;
    notify();
  }

  return {
    getSnapshot() {
      return state.snapshot;
    },

    getState() {
      return state;
    },

    refresh() {
      if (isRefreshing) {
        return false;
      }

      isRefreshing = true;

      try {
        options.onRefresh?.();
        const nextSnapshot = bridge.readSnapshot();

        if (isSameSnapshot(nextSnapshot, READ_ONLY_REPORTS_FALLBACK_SNAPSHOT)) {
          if (isSameSnapshot(state.snapshot, READ_ONLY_REPORTS_FALLBACK_SNAPSHOT)) {
            setState(createState(options, READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, 'fallback', state.diagnostics, refreshErrorMessage));
          } else {
            setState(createState(options, state.snapshot, 'fallback', state.diagnostics, refreshErrorMessage));
          }

          return false;
        }

        setState(createState(options, nextSnapshot, 'updated', state.diagnostics, null));
        return true;
      } catch {
        setState(createState(options, state.snapshot, 'error', state.diagnostics, refreshErrorMessage));
        return false;
      } finally {
        isRefreshing = false;
      }
    },

    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
