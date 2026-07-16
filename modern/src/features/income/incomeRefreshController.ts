import {
  INCOME_READONLY_FALLBACK_SNAPSHOT,
  createIncomeReadonlyBridge,
} from './incomeReadonlyBridge.mjs';
import type { ReadOnlyIncomeSnapshot, ReadOnlyIncomeSource } from './incomeReadonlyContract.mjs';

export type IncomeRefreshStatus = 'idle' | 'updated' | 'fallback' | 'error';

export interface IncomeRefreshControllerState {
  readonly snapshot: ReadOnlyIncomeSnapshot;
  readonly errorMessage: string | null;
  readonly refreshStatus: IncomeRefreshStatus;
}

export interface IncomeRefreshControllerOptions {
  readonly source?: ReadOnlyIncomeSource | null;
  readonly onRefresh?: () => void;
  readonly errorMessage?: string;
}

export interface IncomeRefreshController {
  readonly getSnapshot: () => ReadOnlyIncomeSnapshot;
  readonly getState: () => IncomeRefreshControllerState;
  readonly refresh: () => boolean;
  readonly subscribe: (listener: () => void) => () => void;
}

const DEFAULT_REFRESH_ERROR_MESSAGE = 'Nao foi possivel atualizar os proventos. Ultimo snapshot valido mantido.';

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

function cloneState(state: IncomeRefreshControllerState): IncomeRefreshControllerState {
  return deepFreeze({
    snapshot: state.snapshot,
    errorMessage: state.errorMessage,
    refreshStatus: state.refreshStatus,
  });
}

function createState(
  snapshot: ReadOnlyIncomeSnapshot,
  refreshStatus: IncomeRefreshStatus,
  errorMessage: string | null,
): IncomeRefreshControllerState {
  return cloneState({
    snapshot,
    errorMessage,
    refreshStatus,
  });
}

export function createIncomeRefreshController(
  options: IncomeRefreshControllerOptions = {},
): IncomeRefreshController {
  const bridge = createIncomeReadonlyBridge(options.source);
  const listeners = new Set<() => void>();
  const refreshErrorMessage = options.errorMessage ?? DEFAULT_REFRESH_ERROR_MESSAGE;
  let isRefreshing = false;

  const initialSnapshot = bridge.readSnapshot();
  let state = createState(
    initialSnapshot,
    initialSnapshot === INCOME_READONLY_FALLBACK_SNAPSHOT ? 'fallback' : 'idle',
    initialSnapshot === INCOME_READONLY_FALLBACK_SNAPSHOT ? refreshErrorMessage : null,
  );

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(nextState: IncomeRefreshControllerState) {
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

        if (nextSnapshot === INCOME_READONLY_FALLBACK_SNAPSHOT) {
          if (state.snapshot === INCOME_READONLY_FALLBACK_SNAPSHOT) {
            setState(createState(INCOME_READONLY_FALLBACK_SNAPSHOT, 'fallback', refreshErrorMessage));
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
