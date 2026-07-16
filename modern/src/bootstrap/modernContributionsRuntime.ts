import { createConnectedContributionsAdapter, createConnectedContributionsDemoSource } from '../features/contributions/legacyContributionsReadonlyIntegration.ts';
import { createContributionsRefreshController } from '../features/contributions/contributionsRefreshController.ts';
import type { ReadOnlyContributionsAdapter } from '../features/contributions/contributionsSnapshotAdapter.mjs';
import type { ReadOnlyContributionsSource } from '../features/contributions/contributionsReadonlyContract.mjs';
import type { ContributionsRefreshController } from '../features/contributions/contributionsRefreshController.ts';

export interface ModernContributionsRuntimeOptions {
  readonly contributionsSource?: ReadOnlyContributionsSource | null;
}

export interface ModernContributionsRuntime {
  readonly contributionsAdapter: ReadOnlyContributionsAdapter;
  readonly contributionsRefreshController: ContributionsRefreshController | null;
}

export function createModernContributionsRuntime(
  options: ModernContributionsRuntimeOptions = {},
): ModernContributionsRuntime {
  const contributionsSource = options.contributionsSource ?? createConnectedContributionsDemoSource();

  if (!options.contributionsSource) {
    return {
      contributionsAdapter: createConnectedContributionsAdapter(contributionsSource),
      contributionsRefreshController: null,
    };
  }

  const contributionsRefreshController = createContributionsRefreshController({
    source: contributionsSource,
  });

  return {
    contributionsAdapter: createConnectedContributionsAdapter(contributionsRefreshController),
    contributionsRefreshController,
  };
}
