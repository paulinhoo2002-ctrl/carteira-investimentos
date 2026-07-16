const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const pageModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'income', 'IncomeReadonlyPage.tsx');
const viewModelModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'income',
  'readonlyIncomeViewModel.ts',
);
const contractModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'income',
  'incomeReadonlyContract.mjs',
);
const runtimeModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'modernIncomeRuntime.ts');
const sourceModulePath = path.join(__dirname, '..', 'modern', 'src', 'bootstrap', 'hostIncomeReadonlySource.ts');

async function loadPageModule() {
  return import(pathToFileURL(pageModulePath).href);
}

async function loadViewModelModule() {
  return import(pathToFileURL(viewModelModulePath).href);
}

async function loadContractModule() {
  return import(pathToFileURL(contractModulePath).href);
}

async function loadRuntimeModule() {
  return import(pathToFileURL(runtimeModulePath).href);
}

async function loadSourceModule() {
  return import(pathToFileURL(sourceModulePath).href);
}

function createSnapshot(overrides = {}) {
  return {
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de proventos. React nao escreve na fonte.',
    summary: {
      totalReceived: 748.51,
      monthTotal: 748.51,
      yearTotal: 748.51,
      averageMonthly: 62.38,
      paymentCount: 4,
    },
    items: [
      {
        id: 'inc-001',
        ticker: 'PETR4',
        name: 'Petrobras',
        type: 'Dividendo',
        paymentDate: '2026-06-15',
        competenceDate: null,
        receivedValue: 320,
        taxValue: null,
        quantity: null,
        note: 'Demo de provento recebido',
        source: 'demo',
        sourceEventKind: null,
        sourceEventId: null,
      },
      {
        id: 'inc-002',
        ticker: 'BBAS3',
        name: 'Banco do Brasil',
        type: 'JCP',
        paymentDate: '2026-06-27',
        competenceDate: null,
        receivedValue: 215.41,
        taxValue: null,
        quantity: null,
        note: 'Demo de JCP',
        source: 'demo',
        sourceEventKind: null,
        sourceEventId: null,
      },
      {
        id: 'inc-003',
        ticker: 'ITSA4',
        name: 'Itausa',
        type: 'Rendimento',
        paymentDate: '2026-07-05',
        competenceDate: null,
        receivedValue: 168.5,
        taxValue: null,
        quantity: null,
        note: 'Demo de rendimento',
        source: 'demo',
        sourceEventKind: null,
        sourceEventId: null,
      },
      {
        id: 'inc-004',
        ticker: 'CDB26',
        name: 'CDB 2026',
        type: 'Juros de Renda Fixa',
        paymentDate: '2026-07-14',
        competenceDate: null,
        receivedValue: 44.6,
        taxValue: null,
        quantity: null,
        note: 'Demo de renda fixa',
        source: 'demo',
        sourceEventKind: null,
        sourceEventId: null,
      },
    ],
    ...overrides,
  };
}

function createAdapter(snapshot) {
  return {
    getSnapshot() {
      return snapshot;
    },
  };
}

function createRefreshController(snapshotFactory) {
  let currentSnapshot = snapshotFactory();
  let currentRefreshStatus = 'idle';
  let currentErrorMessage = null;
  const listeners = new Set();
  return {
    getSnapshot() {
      return currentSnapshot;
    },
    getState() {
      return {
        snapshot: currentSnapshot,
        errorMessage: currentErrorMessage,
        refreshStatus: currentRefreshStatus,
      };
    },
    refresh() {
      currentSnapshot = snapshotFactory();
      currentRefreshStatus = 'updated';
      currentErrorMessage = null;
      for (const listener of listeners) {
        listener();
      }
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

test('contrato readonly de proventos aceita snapshot valido e preserva zero e null', async () => {
  const { normalizeReadonlyIncomeSnapshot, isReadonlyIncomeSnapshot } = await loadContractModule();
  const snapshot = normalizeReadonlyIncomeSnapshot(createSnapshot());

  assert.equal(isReadonlyIncomeSnapshot(createSnapshot()), true);
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.summary.totalReceived, 748.51);
  assert.equal(snapshot.summary.monthTotal, 748.51);
  assert.equal(snapshot.summary.yearTotal, 748.51);
  assert.equal(snapshot.summary.averageMonthly, 62.38);
  assert.equal(snapshot.summary.paymentCount, 4);
  assert.equal(snapshot.items.length, 4);
  assert.equal(snapshot.items[0].receivedValue, 320);
  assert.equal(snapshot.items[0].taxValue, null);
  assert.equal(snapshot.items[0].quantity, null);
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);
});

test('contrato readonly de proventos rejeita item vazio e aceita identidade minima, zero real e evento', async () => {
  const { normalizeReadonlyIncomeSnapshot, INCOME_READONLY_FALLBACK_SNAPSHOT } = await loadContractModule();

  const emptySnapshot = normalizeReadonlyIncomeSnapshot({
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de proventos. React nao escreve na fonte.',
    summary: {
      totalReceived: null,
      monthTotal: null,
      yearTotal: null,
      averageMonthly: null,
      paymentCount: 1,
    },
    items: [
      {
        id: null,
        ticker: null,
        name: null,
        type: null,
        paymentDate: null,
        competenceDate: null,
        receivedValue: null,
        taxValue: null,
        quantity: null,
        note: null,
        source: null,
        sourceEventKind: null,
        sourceEventId: null,
      },
    ],
  });

  const idOnlySnapshot = normalizeReadonlyIncomeSnapshot({
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de proventos. React nao escreve na fonte.',
    summary: {
      totalReceived: null,
      monthTotal: null,
      yearTotal: null,
      averageMonthly: null,
      paymentCount: 1,
    },
    items: [
      {
        id: 'inc-id-only',
        ticker: null,
        name: null,
        type: null,
        paymentDate: null,
        competenceDate: null,
        receivedValue: null,
        taxValue: null,
        quantity: null,
        note: null,
        source: null,
        sourceEventKind: null,
        sourceEventId: null,
      },
    ],
  });

  const sourceEventOnlySnapshot = normalizeReadonlyIncomeSnapshot({
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de proventos. React nao escreve na fonte.',
    summary: {
      totalReceived: null,
      monthTotal: null,
      yearTotal: null,
      averageMonthly: null,
      paymentCount: 1,
    },
    items: [
      {
        id: null,
        ticker: null,
        name: null,
        type: null,
        paymentDate: null,
        competenceDate: null,
        receivedValue: null,
        taxValue: null,
        quantity: null,
        note: null,
        source: null,
        sourceEventKind: null,
        sourceEventId: 'evt-1',
      },
    ],
  });

  const zeroSnapshot = normalizeReadonlyIncomeSnapshot({
    version: 1,
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de proventos. React nao escreve na fonte.',
    summary: {
      totalReceived: 0,
      monthTotal: 0,
      yearTotal: 0,
      averageMonthly: 0,
      paymentCount: 1,
    },
    items: [
      {
        id: 'inc-zero',
        ticker: 'PETR4',
        name: 'Petrobras',
        type: 'Dividendo',
        paymentDate: '2026-06-15',
        competenceDate: null,
        receivedValue: 0,
        taxValue: null,
        quantity: null,
        note: 'Zero real',
        source: 'demo',
        sourceEventKind: 'payment',
        sourceEventId: 'evt-zero',
      },
    ],
  });

  assert.equal(emptySnapshot, INCOME_READONLY_FALLBACK_SNAPSHOT);
  assert.equal(Object.isFrozen(idOnlySnapshot), true);
  assert.equal(idOnlySnapshot.items[0].id, 'inc-id-only');
  assert.equal(sourceEventOnlySnapshot.items[0].sourceEventId, 'evt-1');
  assert.equal(zeroSnapshot.items[0].receivedValue, 0);
  assert.equal(zeroSnapshot.summary.totalReceived, 0);
  assert.equal(zeroSnapshot.summary.monthTotal, 0);
  assert.equal(zeroSnapshot.summary.yearTotal, 0);
  assert.equal(zeroSnapshot.summary.averageMonthly, 0);
});

test('view model preserva ausencias, agrupa mes a mes e nao muta snapshot', async () => {
  const { createReadonlyIncomeViewModel, formatReadonlyMoneyOrMissing } = await loadViewModelModule();
  const snapshot = createSnapshot();

  const viewModel = createReadonlyIncomeViewModel(snapshot, {
    query: 'BBAS',
    year: 'all',
    month: 'all',
    type: 'all',
    sortBy: 'paymentDate',
  });

  assert.equal(viewModel.paymentCount, 4);
  assert.equal(viewModel.totalReceived, 748.51);
  assert.equal(viewModel.monthTotal, 748.51);
  assert.equal(viewModel.yearTotal, 748.51);
  assert.equal(viewModel.averageMonthly, 62.38);
  assert.equal(viewModel.filteredItems.length, 1);
  assert.equal(viewModel.filteredItems[0].ticker, 'BBAS3');
  assert.equal(viewModel.monthlyBuckets.length, 1);
  assert.equal(viewModel.monthlyBuckets[0].paymentCount, 1);
  assert.equal(viewModel.topPayments[0].ticker, 'BBAS3');
  assert.equal(viewModel.topPayers[0].label, 'Banco do Brasil');
  assert.equal(viewModel.topPayers[0].paymentCount, 1);
  assert.equal(formatReadonlyMoneyOrMissing(null), 'Nao informado');
  assert.match(formatReadonlyMoneyOrMissing(0), /R\$ 0,00/);
  assert.equal(Object.isFrozen(snapshot), false);
  assert.equal(snapshot.items[0].ticker, 'PETR4');
});

test('pagina readonly renderiza resumo, lista e estado vazio sem botao em modo estatico', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { IncomeReadonlyPage } = await viteServer.ssrLoadModule('/src/features/income/IncomeReadonlyPage.tsx');
    const html = renderToStaticMarkup(
      React.createElement(IncomeReadonlyPage, {
        adapter: createAdapter(createSnapshot()),
      }),
    );

    assert.match(html, /<h2 class="page-shell__title" id="page-income">Proventos e renda mensal<\/h2>/);
    assert.match(html, /Somente leitura/);
    assert.match(html, /Total recebido/);
    assert.match(html, /R\$[\s\u00a0]748,51/);
    assert.match(html, /Quantidade de pagamentos/);
    assert.match(html, /Destaques/);
    assert.match(html, /Distribuicao mensal/);
    assert.match(html, /Lista de proventos/);
    assert.match(html, /PETR4/);
    assert.match(html, /BBAS3/);
    assert.match(html, /ITSA4/);
    assert.match(html, /CDB26/);
    assert.equal(html.includes('Atualizar proventos'), false);
    assert.equal(html.includes('<button'), false);
  } finally {
    await viteServer.close();
  }
});

test('pagina readonly usa controller real quando presente e preserva ultimo snapshot valido', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { IncomeReadonlyPage } = await viteServer.ssrLoadModule('/src/features/income/IncomeReadonlyPage.tsx');
    let cursor = 0;
    const snapshots = [
      createSnapshot(),
      createSnapshot({
        generatedAt: '2026-07-14T11:00:00.000Z',
        notice: 'Snapshot atualizado readonly de proventos.',
      }),
    ];
    const controller = createRefreshController(() => snapshots[Math.min(cursor, snapshots.length - 1)]);
    const before = renderToStaticMarkup(
      React.createElement(IncomeReadonlyPage, {
        adapter: createAdapter(createSnapshot()),
        refreshController: controller,
      }),
    );

    cursor = 1;
    controller.refresh();

    const after = renderToStaticMarkup(
      React.createElement(IncomeReadonlyPage, {
        adapter: createAdapter(createSnapshot()),
        refreshController: controller,
      }),
    );

    assert.match(before, /Atualizar proventos/);
    assert.match(after, /Snapshot atualizado readonly de proventos\./);
    assert.match(after, /Leitura atualizada/);
    assert.match(after, /Snapshot atualizado readonly de proventos\./);
  } finally {
    await viteServer.close();
  }
});

test('runtime e host source de proventos usam fonte real e fallback controlado', async () => {
  const { createModernIncomeRuntime } = await loadRuntimeModule();
  const { createHostIncomeReadonlySource } = await loadSourceModule();

  const runtime = createModernIncomeRuntime();
  const demoSnapshot = runtime.incomeAdapter.getSnapshot();
  assert.equal(demoSnapshot.version, 1);
  assert.equal(demoSnapshot.items.length, 4);
  assert.equal(demoSnapshot.summary.totalReceived, 748.51);

  let incomeSnapshot = createSnapshot();
  const source = createHostIncomeReadonlySource({
    getIncomeSnapshot() {
      return incomeSnapshot;
    },
  });

  const firstSnapshot = source.getSnapshot();
  assert.equal(firstSnapshot.items.length, 4);
  assert.equal(firstSnapshot.summary.paymentCount, 4);
  assert.equal(firstSnapshot.items[0].ticker, 'PETR4');
  assert.equal(firstSnapshot.items[1].type, 'JCP');
  assert.equal(Object.isFrozen(firstSnapshot), true);

  incomeSnapshot = {
    ...incomeSnapshot,
    items: incomeSnapshot.items.map((item) => (item.id === 'inc-004' ? { ...item, receivedValue: 50.1 } : item)),
  };

  const secondSnapshot = source.getSnapshot();
  assert.notEqual(secondSnapshot, firstSnapshot);
  assert.equal(secondSnapshot.items.find((item) => item.id === 'inc-004')?.receivedValue, 50.1);

  const invalidSource = createHostIncomeReadonlySource({
    getIncomeSnapshot() {
      throw new Error('boom');
    },
  });
  const fallbackSnapshot = invalidSource.getSnapshot();

  assert.equal(fallbackSnapshot.version, 1);
  assert.equal(fallbackSnapshot.summary.paymentCount, 0);
  assert.equal(fallbackSnapshot.items.length, 0);
  assert.equal(Object.isFrozen(fallbackSnapshot), true);
});
