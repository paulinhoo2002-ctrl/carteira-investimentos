const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const pageModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'contributions',
  'ContributionsReadonlyPage.tsx',
);
const viewModelModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'contributions',
  'readonlyContributionsViewModel.ts',
);
const contractModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'features',
  'contributions',
  'contributionsReadonlyContract.mjs',
);
const runtimeModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'bootstrap',
  'modernContributionsRuntime.ts',
);

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

function createSnapshot(overrides = {}) {
  return {
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa real',
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de aportes. React nao escreve na fonte.',
    summary: {
      itemCount: 4,
      classCount: 3,
      monthCount: 2,
      candidateCount: 2,
      insufficientCount: 1,
      avoidedCount: 1,
      latestContributionDate: '2026-07-14',
    },
    items: [
      {
        id: 'ap-001',
        sourceEventId: 'evt-001',
        sourceEventKind: 'aporte',
        assetId: 'PETR4',
        date: '2026-06-15',
        ticker: 'PETR4',
        assetName: 'Petrobras',
        assetClass: 'Acao',
        amount: 1000,
        quantity: 10,
        unitPrice: 100,
        operation: 'compra',
        source: 'manual',
        note: 'Aporte em acao',
        createdAt: '2026-06-15T10:30:00.000Z',
        updatedAt: null,
      },
      {
        id: 'ap-002',
        sourceEventId: 'evt-002',
        sourceEventKind: 'aporte',
        assetId: 'MXRF11',
        date: '2026-06-28',
        ticker: 'MXRF11',
        assetName: 'Maxi Renda',
        assetClass: 'FII',
        amount: 0,
        quantity: 5,
        unitPrice: 100,
        operation: 'compra',
        source: 'manual',
        note: 'Aporte zero real',
        createdAt: '2026-06-28T10:30:00.000Z',
        updatedAt: null,
      },
      {
        id: 'ap-003',
        sourceEventId: 'evt-003',
        sourceEventKind: 'aporte',
        assetId: 'CDB26',
        date: '2026-07-03',
        ticker: 'CDB26',
        assetName: 'CDB 2026',
        assetClass: 'Renda Fixa',
        amount: 4000,
        quantity: 1,
        unitPrice: 4000,
        operation: 'compra',
        source: 'legado',
        note: 'Aporte renda fixa',
        createdAt: '2026-07-03T10:30:00.000Z',
        updatedAt: null,
      },
      {
        id: 'ap-004',
        sourceEventId: 'evt-004',
        sourceEventKind: 'aporte',
        assetId: 'BOVA11',
        date: '2026-07-14',
        ticker: 'BOVA11',
        assetName: 'BOVA',
        assetClass: 'ETF',
        amount: 200,
        quantity: 2,
        unitPrice: 100,
        operation: 'compra',
        source: 'legado',
        note: 'Aporte ETF',
        createdAt: '2026-07-14T10:30:00.000Z',
        updatedAt: null,
      },
    ],
    classDistribution: [
      { label: 'Acao', itemCount: 1, latestContributionDate: '2026-06-15' },
      { label: 'ETF', itemCount: 1, latestContributionDate: '2026-07-14' },
      { label: 'FII', itemCount: 1, latestContributionDate: '2026-06-28' },
    ],
    monthDistribution: [
      { monthKey: '2026-06', label: 'Junho de 2026', itemCount: 2 },
      { monthKey: '2026-07', label: 'Julho de 2026', itemCount: 2 },
    ],
    suggestion: {
      status: 'available',
      generatedAt: '2026-07-14T10:30:00.000Z',
      strategyName: 'Analise prudente do legado',
      candidates: [
        {
          assetId: 'PETR4',
          ticker: 'PETR4',
          assetName: 'Petrobras',
          assetClass: 'Acao',
          sector: 'Energia',
          score: 42,
          share: 8.5,
          pct: 4.2,
          dy: 5.7,
          idealWeightPct: 12,
          typeGapPct: 3.4,
          signalLabel: 'Pode estudar aporte',
          signalTone: 'positive',
          reasons: [
            {
              code: 'signal',
              label: 'Pode estudar aporte',
              detail: 'Sinal prudente favoravel ao estudo',
              sourceField: 'signal.label',
              value: 'Pode estudar aporte',
              unit: null,
            },
            {
              code: 'type-gap',
              label: 'Abaixo do peso ideal',
              detail: 'Abaixo do peso ideal',
              sourceField: 'typeGapPct',
              value: '3.4 p.p.',
              unit: 'p.p.',
            },
          ],
          warnings: [],
        },
        {
          assetId: 'MXRF11',
          ticker: 'MXRF11',
          assetName: 'Maxi Renda',
          assetClass: 'FII',
          sector: 'Imobiliario',
          score: 18,
          share: 4.1,
          pct: -1.5,
          dy: 11.2,
          idealWeightPct: 9,
          typeGapPct: 1.0,
          signalLabel: 'Acompanhar',
          signalTone: 'neutral',
          reasons: [
            {
              code: 'signal',
              label: 'Acompanhar',
              detail: 'Ativo em acompanhamento',
              sourceField: 'signal.label',
              value: 'Acompanhar',
              unit: null,
            },
          ],
          warnings: ['Acompanhar'],
        },
      ],
      warnings: ['Concentracao acima do limite prudente em parte dos ativos'],
      inputs: ['S.aportes', 'prudentContributionAnalysis()', 'assetAnalysisRows()'],
      limitations: ['Nao executa compra', 'Nao recalcula nova recomendacao'],
    },
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
  const listeners = new Set();
  let currentSnapshot = snapshotFactory();
  let currentStatus = 'idle';
  let currentError = null;

  return {
    getSnapshot() {
      return currentSnapshot;
    },
    getState() {
      return {
        snapshot: currentSnapshot,
        errorMessage: currentError,
        refreshStatus: currentStatus,
      };
    },
    refresh() {
      currentSnapshot = snapshotFactory();
      currentStatus = 'updated';
      currentError = null;
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

test('contrato readonly de aportes aceita snapshot valido e preserva zero real', async () => {
  const { normalizeReadonlyContributionsSnapshot, isReadonlyContributionsSnapshot } = await loadContractModule();
  const snapshot = normalizeReadonlyContributionsSnapshot(createSnapshot());

  assert.equal(isReadonlyContributionsSnapshot(createSnapshot()), true);
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.summary.itemCount, 4);
  assert.equal(snapshot.items[0].sourceEventKind, 'aporte');
  assert.equal(snapshot.items[1].amount, 0);
  assert.equal(snapshot.items[1].sourceEventKind, 'aporte');
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.summary), true);
  assert.equal(Object.isFrozen(snapshot.items), true);
});

test('contrato readonly de aportes rejeita item vazio e aceita identidade minima', async () => {
  const { normalizeReadonlyContributionsSnapshot, CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT } =
    await loadContractModule();

  const emptySnapshot = normalizeReadonlyContributionsSnapshot({
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa real',
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de aportes. React nao escreve na fonte.',
    summary: {
      itemCount: 1,
      classCount: 0,
      monthCount: 0,
      candidateCount: 0,
      insufficientCount: 0,
      avoidedCount: 0,
      latestContributionDate: null,
    },
    items: [
      {
        id: null,
        sourceEventId: null,
        sourceEventKind: null,
        assetId: null,
        date: null,
        ticker: null,
        assetName: null,
        assetClass: null,
        amount: null,
        quantity: null,
        unitPrice: null,
        operation: null,
        source: null,
        note: null,
        createdAt: null,
        updatedAt: null,
      },
    ],
    classDistribution: [],
    monthDistribution: [],
    suggestion: {
      status: 'unavailable',
      generatedAt: '2026-07-14T10:30:00.000Z',
      strategyName: null,
      candidates: [],
      warnings: [],
      inputs: [],
      limitations: [],
    },
  });

  const idOnlySnapshot = normalizeReadonlyContributionsSnapshot({
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa real',
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de aportes. React nao escreve na fonte.',
    summary: {
      itemCount: 1,
      classCount: 1,
      monthCount: 1,
      candidateCount: 0,
      insufficientCount: 0,
      avoidedCount: 0,
      latestContributionDate: '2026-07-14',
    },
    items: [
      {
        id: 'ap-id-only',
        sourceEventId: null,
        sourceEventKind: null,
        assetId: null,
        date: null,
        ticker: null,
        assetName: null,
        assetClass: null,
        amount: null,
        quantity: null,
        unitPrice: null,
        operation: null,
        source: null,
        note: null,
        createdAt: null,
        updatedAt: null,
      },
    ],
    classDistribution: [
      { label: 'Sem classe', itemCount: 1, latestContributionDate: null },
    ],
    monthDistribution: [
      { monthKey: '2026-07', label: 'Julho de 2026', itemCount: 1 },
    ],
    suggestion: {
      status: 'unavailable',
      generatedAt: '2026-07-14T10:30:00.000Z',
      strategyName: null,
      candidates: [],
      warnings: [],
      inputs: [],
      limitations: [],
    },
  });

  const sourceEventOnlySnapshot = normalizeReadonlyContributionsSnapshot({
    version: 1,
    originMode: 'real-wallet',
    originLabel: 'Carteira ativa real',
    generatedAt: '2026-07-14T10:30:00.000Z',
    notice: 'Snapshot legado somente leitura de aportes. React nao escreve na fonte.',
    summary: {
      itemCount: 1,
      classCount: 1,
      monthCount: 1,
      candidateCount: 0,
      insufficientCount: 0,
      avoidedCount: 0,
      latestContributionDate: '2026-07-14',
    },
    items: [
      {
        id: null,
        sourceEventId: 'evt-only',
        sourceEventKind: 'aporte',
        assetId: null,
        date: '2026-07-14',
        ticker: null,
        assetName: null,
        assetClass: null,
        amount: 0,
        quantity: null,
        unitPrice: null,
        operation: null,
        source: null,
        note: null,
        createdAt: null,
        updatedAt: null,
      },
    ],
    classDistribution: [
      { label: 'Sem classe', itemCount: 1, latestContributionDate: '2026-07-14' },
    ],
    monthDistribution: [
      { monthKey: '2026-07', label: 'Julho de 2026', itemCount: 1 },
    ],
    suggestion: {
      status: 'unavailable',
      generatedAt: '2026-07-14T10:30:00.000Z',
      strategyName: null,
      candidates: [],
      warnings: [],
      inputs: [],
      limitations: [],
    },
  });

  assert.equal(emptySnapshot, CONTRIBUTIONS_READONLY_FALLBACK_SNAPSHOT);
  assert.equal(idOnlySnapshot.items.length, 1);
  assert.equal(idOnlySnapshot.items[0].id, 'ap-id-only');
  assert.equal(sourceEventOnlySnapshot.items[0].sourceEventId, 'evt-only');
  assert.equal(sourceEventOnlySnapshot.items[0].amount, 0);
});

test('view model readonly de aportes filtra e ordena sem soma financeira', async () => {
  const { createReadonlyContributionsViewModel } = await loadViewModelModule();
  const snapshot = createSnapshot();

  const viewModel = createReadonlyContributionsViewModel(snapshot, {
    query: 'pet',
    year: '2026',
    month: '2026-06',
    assetClass: 'Acao',
    source: 'manual',
    sortBy: 'amount',
  });

  assert.equal(viewModel.itemCount, 4);
  assert.equal(viewModel.hasResults, true);
  assert.equal(viewModel.filteredItems.length, 1);
  assert.equal(viewModel.filteredItems[0].ticker, 'PETR4');
  assert.deepEqual(viewModel.classes, ['Acao', 'ETF', 'FII', 'Renda Fixa']);
  assert.deepEqual(viewModel.sources, ['legado', 'manual']);
  assert.deepEqual(viewModel.months.map((month) => month.key), ['2026-07', '2026-06']);
  assert.equal(viewModel.classDistribution.length, 4);
  assert.equal(viewModel.monthDistribution.length, 2);
  assert.equal(viewModel.latestItem?.ticker, 'BOVA11');
});

test('score readonly preserva null e zero sem tratar ausente como zero', async () => {
  const { formatReadonlyScoreOrMissing, sortContributionCandidatesByScore } = await loadViewModelModule();

  assert.equal(formatReadonlyScoreOrMissing(null), 'Nao informado');
  assert.equal(formatReadonlyScoreOrMissing(0), '0');
  assert.equal(formatReadonlyScoreOrMissing(8.5), '8,5');

  const ordered = sortContributionCandidatesByScore([
    {
      assetId: 'NULL',
      ticker: 'NULL',
      assetName: 'Sem score',
      assetClass: 'Acao',
      sector: null,
      score: null,
      share: null,
      pct: null,
      dy: null,
      idealWeightPct: null,
      typeGapPct: null,
      signalLabel: 'Acompanhar',
      signalTone: 'neutral',
      reasons: [],
      warnings: [],
    },
    {
      assetId: 'ZERO',
      ticker: 'ZERO',
      assetName: 'Score zero',
      assetClass: 'Acao',
      sector: null,
      score: 0,
      share: null,
      pct: null,
      dy: null,
      idealWeightPct: null,
      typeGapPct: null,
      signalLabel: 'Acompanhar',
      signalTone: 'neutral',
      reasons: [],
      warnings: [],
    },
    {
      assetId: 'ALTA',
      ticker: 'ALTA',
      assetName: 'Score alto',
      assetClass: 'Acao',
      sector: null,
      score: 12,
      share: null,
      pct: null,
      dy: null,
      idealWeightPct: null,
      typeGapPct: null,
      signalLabel: 'Acompanhar',
      signalTone: 'neutral',
      reasons: [],
      warnings: [],
    },
  ]);

  assert.deepEqual(ordered.map((item) => item.score), [12, 0, null]);
});

test('pagina readonly de aportes renderiza snapshot valido e refresh controlado', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { ContributionsReadonlyPage } = await viteServer.ssrLoadModule('/src/features/contributions/ContributionsReadonlyPage.tsx');
    const staticHtml = renderToStaticMarkup(
      React.createElement(ContributionsReadonlyPage, {
        adapter: createAdapter(createSnapshot()),
      }),
    );

    assert.match(staticHtml, /<h2 class="page-shell__title" id="page-contributions">Aportes<\/h2>/);
    assert.match(staticHtml, /Historico e sugestao explicavel/);
    assert.match(staticHtml, /Somente leitura/);
    assert.equal(staticHtml.includes('Atualizar aportes'), false);
    assert.match(staticHtml, /Sugestao explicavel disponivel/);
    assert.match(staticHtml, /Leitura do legado/);
    assert.match(staticHtml, /Lista de aportes/);
    assert.match(staticHtml, /PETR4/);
    assert.match(staticHtml, /MXRF11/);
    assert.match(staticHtml, /CDB26/);
    assert.match(staticHtml, /BOVA11/);
    assert.match(staticHtml, /Nao executa nenhuma compra/);

    const mutableSnapshot = createSnapshot();
    const controller = createRefreshController(() => mutableSnapshot);
    const refreshableHtml = renderToStaticMarkup(
      React.createElement(ContributionsReadonlyPage, {
        adapter: createAdapter(mutableSnapshot),
        refreshController: controller,
      }),
    );

    assert.match(refreshableHtml, /Atualizar aportes/);
    assert.equal(refreshableHtml.includes('button'), true);

    mutableSnapshot.items = [
      {
        ...mutableSnapshot.items[0],
        amount: 1500,
      },
    ];
    controller.refresh();

    const refreshedHtml = renderToStaticMarkup(
      React.createElement(ContributionsReadonlyPage, {
        adapter: createAdapter(controller.getSnapshot()),
      }),
    );

    assert.equal(controller.getSnapshot().items[0].amount, 1500);
    assert.match(refreshedHtml, /1\.500,00/);

    const scoreSnapshot = createSnapshot();
    scoreSnapshot.suggestion = {
      ...scoreSnapshot.suggestion,
      candidates: [
        {
          ...scoreSnapshot.suggestion.candidates[0],
          score: null,
          reasons: [],
        },
        {
          ...scoreSnapshot.suggestion.candidates[1],
          score: 0,
          reasons: [],
        },
      ],
    };

    const scoreHtml = renderToStaticMarkup(
      React.createElement(ContributionsReadonlyPage, {
        adapter: createAdapter(scoreSnapshot),
      }),
    );

    assert.match(scoreHtml, /score 0/);
    assert.match(scoreHtml, /Nao informado/);
    assert.ok(scoreHtml.indexOf('score 0') < scoreHtml.indexOf('Nao informado'));
    assert.match(scoreHtml, /O legado nao forneceu uma justificativa detalhada\./);
  } finally {
    await viteServer.close();
  }
});

test('runtime de aportes usa demo sem fonte real e controller com fonte real', async () => {
  const { createModernContributionsRuntime } = await loadRuntimeModule();

  const demoRuntime = createModernContributionsRuntime();
  assert.equal(demoRuntime.contributionsRefreshController, null);
  assert.equal(demoRuntime.contributionsAdapter.getSnapshot().originMode, 'fallback-readonly');
  assert.equal(demoRuntime.contributionsAdapter.getSnapshot().items.length, 0);

  let snapshot = createSnapshot();
  const runtime = createModernContributionsRuntime({
    contributionsSource: {
      getSnapshot() {
        return snapshot;
      },
    },
  });

  assert.equal(typeof runtime.contributionsRefreshController?.refresh, 'function');
  assert.equal(runtime.contributionsAdapter.getSnapshot().summary.itemCount, 4);

  snapshot = {
    ...snapshot,
    items: [
      {
        ...snapshot.items[0],
        amount: 1600,
      },
    ],
    summary: {
      ...snapshot.summary,
      itemCount: 1,
    },
  };

  runtime.contributionsRefreshController?.refresh();
  assert.equal(runtime.contributionsAdapter.getSnapshot().items[0].amount, 1600);
});
