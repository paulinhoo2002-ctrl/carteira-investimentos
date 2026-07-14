import { createReadOnlyReportsBridge, READ_ONLY_REPORTS_FALLBACK_SNAPSHOT, type ReadOnlyReportsSnapshot, type ReadOnlyReportsSource } from './reportsReadonlyBridge.ts';

export interface ReportsRefreshControllerState {
  readonly snapshot: ReadOnlyReportsSnapshot;
  readonly errorMessage: string | null;
}

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
}

const DEFAULT_REFRESH_ERROR_MESSAGE = 'Nao foi possivel atualizar a previa. Ultimo snapshot valido mantido.';

function isSameSnapshot(a: ReadOnlyReportsSnapshot, b: ReadOnlyReportsSnapshot) {
  return a === b;
}

export function createReportsRefreshController(options: ReportsRefreshControllerOptions = {}): ReportsRefreshController {
  const bridge = createReadOnlyReportsBridge(options.source);
  const listeners = new Set<() => void>();
  const refreshErrorMessage = options.errorMessage ?? DEFAULT_REFRESH_ERROR_MESSAGE;
  let isRefreshing = false;

  const initialSnapshot = bridge.readSnapshot();
  let state: ReportsRefreshControllerState = {
    snapshot: initialSnapshot,
    errorMessage: initialSnapshot === READ_ONLY_REPORTS_FALLBACK_SNAPSHOT ? refreshErrorMessage : null,
  };

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
            setState({
              snapshot: READ_ONLY_REPORTS_FALLBACK_SNAPSHOT,
              errorMessage: refreshErrorMessage,
            });
          } else {
            setState({
              snapshot: state.snapshot,
              errorMessage: refreshErrorMessage,
            });
          }

          return false;
        }

        setState({
          snapshot: nextSnapshot,
          errorMessage: null,
        });
        return true;
      } catch {
        setState({
          snapshot: state.snapshot,
          errorMessage: refreshErrorMessage,
        });
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
