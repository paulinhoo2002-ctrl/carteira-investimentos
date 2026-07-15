const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const controllerModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'reportsRefreshController.ts',
);
const bridgeModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'reports',
  'reportsReadonlyBridge.ts',
);

async function loadControllerModule() {
  return import(pathToFileURL(controllerModulePath).href);
}

async function loadBridgeModule() {
  return import(pathToFileURL(bridgeModulePath).href);
}

function createSnapshot(generatedAt, currentValue = 900) {
  return {
    generatedAt,
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
    summary: {
      totalValue: currentValue,
      itemCount: 3,
      averageVariationPct: 0.14,
    },
    items: [
      {
        ticker: 'PETR4',
        name: 'Petrobras',
        category: 'Acao demo',
        quantity: 10,
        averagePrice: 20,
        currentValue: 250,
        variationPct: 25,
        allocationPct: 27.78,
        trend: 'positive',
      },
      {
        ticker: 'MXRF11',
        name: 'Maxi Renda',
        category: 'FII demo',
        quantity: 5,
        averagePrice: 100,
        currentValue: 450,
        variationPct: -10,
        allocationPct: 50,
        trend: 'negative',
      },
      {
        ticker: 'BOVA11',
        name: 'BOVA',
        category: 'ETF demo',
        quantity: 2,
        averagePrice: 100,
        currentValue: 200,
        variationPct: 0,
        allocationPct: 22.22,
        trend: 'neutral',
      },
    ],
  };
}

function assertDeepFrozen(snapshot) {
  assert.equal(snapshot.version, 1);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);

  for (const item of snapshot.items) {
    assert.equal(Object.isFrozen(item), true);
  }
}

function assertDeepFrozenDiagnostics(diagnostics) {
  assert.equal(Object.isFrozen(diagnostics), true);
}

test('controlador inicia com snapshot valido', async () => {
  const { createReportsRefreshController } = await loadControllerModule();
  const source = {
    getSnapshot() {
      return createSnapshot('2026-07-14T10:30:00.000Z');
    },
  };

  const controller = createReportsRefreshController({ source });
  const state = controller.getState();

  assert.equal(state.errorMessage, null);
  assert.equal(state.snapshot.generatedAt, '2026-07-14T10:30:00.000Z');
  assert.equal(controller.getSnapshot().generatedAt, '2026-07-14T10:30:00.000Z');
  assertDeepFrozen(state.snapshot);
});

test('refresh explicito busca novo snapshot', async () => {
  const { createReportsRefreshController } = await loadControllerModule();
  const snapshots = [
    createSnapshot('2026-07-14T10:30:00.000Z', 900),
    createSnapshot('2026-07-14T10:31:00.000Z', 920),
    createSnapshot('2026-07-14T10:32:00.000Z', 940),
  ];
  let cursor = 0;
  const source = {
    getSnapshot() {
      return snapshots[Math.min(cursor, snapshots.length - 1)];
    },
  };

  const controller = createReportsRefreshController({
    source,
    onRefresh() {
      cursor += 1;
    },
  });

  const before = controller.getSnapshot();
  const refreshed = controller.refresh();
  const after = controller.getSnapshot();

  assert.equal(refreshed, true);
  assert.notEqual(after, before);
  assert.equal(after.generatedAt, '2026-07-14T10:31:00.000Z');
  assert.equal(after.summary.totalValue, 920);
  assertDeepFrozen(after);
});

test('subscribe registra listener e unsubscribe remove', async () => {
  const { createReportsRefreshController } = await loadControllerModule();
  let refreshCount = 0;
  const source = {
    getSnapshot() {
      refreshCount += 1;
      return createSnapshot(`2026-07-14T10:3${refreshCount}:00.000Z`, 900 + refreshCount * 10);
    },
  };

  const controller = createReportsRefreshController({ source });
  let calls = 0;
  const unsubscribe = controller.subscribe(() => {
    calls += 1;
  });

  controller.refresh();
  assert.equal(calls, 1);

  unsubscribe();
  controller.refresh();
  assert.equal(calls, 1);
});

test('refresh com erro e invalido mantem ultimo snapshot valido', async () => {
  const { createReportsRefreshController } = await loadControllerModule();
  const validSnapshot = createSnapshot('2026-07-14T10:30:00.000Z', 900);
  const invalidSnapshot = {
    generatedAt: '2026-07-14T10:31:00.000Z',
    notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
    summary: {
      totalValue: NaN,
      itemCount: 3,
      averageVariationPct: 0.14,
    },
    items: [],
  };
  const snapshots = [validSnapshot, invalidSnapshot];
  let cursor = 0;
  const source = {
    getSnapshot() {
      if (cursor === 2) {
        throw new Error('boom');
      }

      return snapshots[Math.min(cursor, snapshots.length - 1)];
    },
  };

  const controller = createReportsRefreshController({
    source,
    onRefresh() {
      cursor += 1;
    },
  });

  const initial = controller.getSnapshot();
  const invalidRefresh = controller.refresh();
  const afterInvalid = controller.getSnapshot();
  const errorRefresh = controller.refresh();
  const afterError = controller.getSnapshot();

  assert.equal(invalidRefresh, false);
  assert.equal(errorRefresh, false);
  assert.equal(afterInvalid, initial);
  assert.equal(afterError, initial);
  assert.equal(controller.getState().errorMessage, 'Nao foi possivel atualizar a previa. Ultimo snapshot valido mantido.');
});

test('fallback e usado apenas quando nao existe snapshot valido', async () => {
  const { READ_ONLY_REPORTS_FALLBACK_SNAPSHOT } = await loadBridgeModule();
  const { createReportsRefreshController } = await loadControllerModule();
  const source = {
    getSnapshot() {
      return {
        generatedAt: '2026-07-14T10:30:00.000Z',
        notice: 'invalido',
        summary: { totalValue: Infinity, itemCount: 1, averageVariationPct: 0 },
        items: [],
      };
    },
  };

  const controller = createReportsRefreshController({ source });

  assert.deepEqual(controller.getSnapshot(), READ_ONLY_REPORTS_FALLBACK_SNAPSHOT);
  assert.equal(controller.getState().errorMessage, 'Nao foi possivel atualizar a previa. Ultimo snapshot valido mantido.');
});

test('refresh sequencial e deterministico', async () => {
  const { createReportsRefreshController } = await loadControllerModule();
  const snapshots = [
    createSnapshot('2026-07-14T10:30:00.000Z', 900),
    createSnapshot('2026-07-14T10:31:00.000Z', 910),
    createSnapshot('2026-07-14T10:32:00.000Z', 920),
  ];
  let cursor = 0;
  const source = {
    getSnapshot() {
      return snapshots[Math.min(cursor, snapshots.length - 1)];
    },
  };

  const controller = createReportsRefreshController({
    source,
    onRefresh() {
      cursor += 1;
    },
  });

  controller.refresh();
  controller.refresh();
  const snapshot = controller.getSnapshot();

  assert.equal(snapshot.generatedAt, '2026-07-14T10:32:00.000Z');
  assert.equal(snapshot.summary.totalValue, 920);
  assertDeepFrozen(snapshot);
});

test('diagnostico readonly distingue real, vazio, fallback e erro de refresh', async () => {
  const { createReportsRefreshController } = await loadControllerModule();
  const snapshots = [
    createSnapshot('2026-07-14T10:30:00.000Z', 900),
    {
      generatedAt: '2026-07-14T10:31:00.000Z',
      notice: 'Snapshot legado somente leitura. React nao escreve na fonte.',
      summary: {
        totalValue: 0,
        itemCount: 0,
        averageVariationPct: 0,
      },
      items: [],
    },
  ];
  let cursor = 0;
  const source = {
    getSnapshot() {
      if (cursor >= snapshots.length) {
        throw new Error('boom');
      }

      return snapshots[cursor];
    },
  };

  const controller = createReportsRefreshController({
    source,
    onRefresh() {
      cursor += 1;
    },
    buildDiagnostics({ snapshot, isFallbackSnapshot, refreshStatus }) {
      const originMode = isFallbackSnapshot ? 'fallback-readonly' : snapshot.items.length > 0 ? 'real-wallet' : 'empty-wallet';

      return {
        originMode,
        originLabel:
          originMode === 'real-wallet'
            ? 'Carteira ativa real'
            : originMode === 'empty-wallet'
              ? 'Carteira ativa vazia'
              : 'Fallback readonly',
        itemCount: snapshot.items.length,
        generatedAt: snapshot.generatedAt,
        hasNotice: Boolean(String(snapshot.notice || '').trim()),
        refreshStatus,
      };
    },
  });

  const initialState = controller.getState();
  assert.equal(initialState.diagnostics.originMode, 'real-wallet');
  assert.equal(initialState.diagnostics.originLabel, 'Carteira ativa real');
  assert.equal(initialState.diagnostics.refreshStatus, 'idle');
  assert.equal(initialState.diagnostics.itemCount, 3);
  assert.equal(initialState.diagnostics.generatedAt, '2026-07-14T10:30:00.000Z');
  assertDeepFrozenDiagnostics(initialState.diagnostics);

  controller.refresh();
  const emptyState = controller.getState();
  assert.equal(emptyState.diagnostics.originMode, 'empty-wallet');
  assert.equal(emptyState.diagnostics.originLabel, 'Carteira ativa vazia');
  assert.equal(emptyState.diagnostics.refreshStatus, 'updated');
  assert.equal(emptyState.diagnostics.itemCount, 0);
  assertDeepFrozenDiagnostics(emptyState.diagnostics);

  const previousSnapshot = controller.getSnapshot();
  controller.refresh();
  const errorState = controller.getState();

  assert.equal(errorState.snapshot, previousSnapshot);
  assert.equal(errorState.diagnostics.originMode, 'empty-wallet');
  assert.equal(errorState.diagnostics.refreshStatus, 'fallback');
  assert.equal(errorState.errorMessage, 'Nao foi possivel atualizar a previa. Ultimo snapshot valido mantido.');
  assertDeepFrozenDiagnostics(errorState.diagnostics);
});

test('erro explicito no callback de refresh marca estado de erro sem perder snapshot valido', async () => {
  const { createReportsRefreshController } = await loadControllerModule();
  const source = {
    getSnapshot() {
      return createSnapshot('2026-07-14T10:30:00.000Z');
    },
  };

  const controller = createReportsRefreshController({
    source,
    onRefresh() {
      throw new Error('boom');
    },
  });

  const before = controller.getSnapshot();
  const refreshed = controller.refresh();
  const after = controller.getState();

  assert.equal(refreshed, false);
  assert.equal(after.snapshot, before);
  assert.equal(after.diagnostics.refreshStatus, 'error');
  assert.equal(after.errorMessage, 'Nao foi possivel atualizar a previa. Ultimo snapshot valido mantido.');
  assertDeepFrozenDiagnostics(after.diagnostics);
});
