import {
  GOALS_READONLY_FALLBACK_SNAPSHOT,
  createGoalsReadonlyBridge,
} from './goalsReadonlyBridge.mjs';
import type { ReadOnlyGoalsSnapshot, ReadOnlyGoalsSource } from './goalsReadonlyContract.d.ts';

export type GoalsRefreshStatus = 'idle' | 'updated' | 'fallback' | 'error';

export interface GoalsRefreshControllerState {
  readonly snapshot: ReadOnlyGoalsSnapshot;
  readonly errorMessage: string | null;
  readonly refreshStatus: GoalsRefreshStatus;
}

export interface GoalsRefreshControllerOptions {
  readonly source?: ReadOnlyGoalsSource | null;
  readonly onRefresh?: () => void;
  readonly errorMessage?: string;
}

export interface GoalsRefreshController {
  readonly getSnapshot: () => ReadOnlyGoalsSnapshot;
  readonly getState: () => GoalsRefreshControllerState;
  readonly refresh: () => boolean;
  readonly subscribe: (listener: () => void) => () => void;
}

const DEFAULT_REFRESH_ERROR_MESSAGE = 'Nao foi possivel atualizar as metas. Ultimo snapshot valido mantido.';

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

function cloneState(state: GoalsRefreshControllerState): GoalsRefreshControllerState {
  return deepFreeze({
    snapshot: state.snapshot,
    errorMessage: state.errorMessage,
    refreshStatus: state.refreshStatus,
  });
}

function createState(
  snapshot: ReadOnlyGoalsSnapshot,
  refreshStatus: GoalsRefreshStatus,
  errorMessage: string | null,
): GoalsRefreshControllerState {
  return cloneState({
    snapshot,
    errorMessage,
    refreshStatus,
  });
}

export function createGoalsRefreshController(
  options: GoalsRefreshControllerOptions = {},
): GoalsRefreshController {
  const bridge = createGoalsReadonlyBridge(options.source);
  const listeners = new Set<() => void>();
  const refreshErrorMessage = options.errorMessage ?? DEFAULT_REFRESH_ERROR_MESSAGE;
  let isRefreshing = false;

  const initialSnapshot = bridge.readSnapshot();
  let state = createState(
    initialSnapshot,
    initialSnapshot === GOALS_READONLY_FALLBACK_SNAPSHOT ? 'fallback' : 'idle',
    initialSnapshot === GOALS_READONLY_FALLBACK_SNAPSHOT ? refreshErrorMessage : null,
  );

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(nextState: GoalsRefreshControllerState) {
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

        if (nextSnapshot === GOALS_READONLY_FALLBACK_SNAPSHOT) {
          if (state.snapshot === GOALS_READONLY_FALLBACK_SNAPSHOT) {
            setState(createState(GOALS_READONLY_FALLBACK_SNAPSHOT, 'fallback', refreshErrorMessage));
          } else {
            setState(createState(state.snapshot, 'fallback', refreshErrorMessage));
          }

          return false;
        }

        setState(createState(nextSnapshot, 'updated', null));
        return true;
      } catch {
        setState(createState(state.snapshot, 'error', refreshErrorMessage));
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
