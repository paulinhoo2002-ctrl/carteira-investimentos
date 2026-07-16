import {
  CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT,
  createContributionsReadonlyBridge,
} from './contributionsReadonlyBridge.mjs';
import type { ReadOnlyContributionsSnapshot, ReadOnlyContributionsSource } from './contributionsReadonlyContract.mjs';

export type ContributionsRefreshStatus = 'idle' | 'updated' | 'fallback' | 'error';

export interface ContributionsRefreshControllerState {
  readonly snapshot: ReadOnlyContributionsSnapshot;
  readonly errorMessage: string | null;
  readonly refreshStatus: ContributionsRefreshStatus;
}

export interface ContributionsRefreshControllerOptions {
  readonly source?: ReadOnlyContributionsSource | null;
  readonly onRefresh?: () => void;
  readonly errorMessage?: string;
}

export interface ContributionsRefreshController {
  readonly getSnapshot: () => ReadOnlyContributionsSnapshot;
  readonly getState: () => ContributionsRefreshControllerState;
  readonly refresh: () => boolean;
  readonly subscribe: (listener: () => void) => () => void;
}

const DEFAULT_REFRESH_ERROR_MESSAGE = 'Nao foi possivel atualizar os aportes. Ultimo snapshot valido mantido.';

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

function cloneState(state: ContributionsRefreshControllerState): ContributionsRefreshControllerState {
  return deepFreeze({
    snapshot: state.snapshot,
    errorMessage: state.errorMessage,
    refreshStatus: state.refreshStatus,
  });
}

function createState(
  snapshot: ReadOnlyContributionsSnapshot,
  refreshStatus: ContributionsRefreshStatus,
  errorMessage: string | null,
): ContributionsRefreshControllerState {
  return cloneState({
    snapshot,
    errorMessage,
    refreshStatus,
  });
}

export function createContributionsRefreshController(
  options: ContributionsRefreshControllerOptions = {},
): ContributionsRefreshController {
  const bridge = createContributionsReadonlyBridge(options.source);
  const listeners = new Set<() => void>();
  const refreshErrorMessage = options.errorMessage ?? DEFAULT_REFRESH_ERROR_MESSAGE;
  let isRefreshing = false;

  const initialSnapshot = bridge.readSnapshot();
  let state = createState(
    initialSnapshot,
    initialSnapshot === CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT ? 'fallback' : 'idle',
    initialSnapshot === CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT ? refreshErrorMessage : null,
  );

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function setState(nextState: ContributionsRefreshControllerState) {
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

        if (nextSnapshot === CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT) {
          if (state.snapshot === CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT) {
            setState(createState(CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT, 'fallback', refreshErrorMessage));
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
