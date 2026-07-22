const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

async function loadSelectModule(viteServer) {
  return viteServer.ssrLoadModule('/src/components/Select/Select.tsx');
}

async function loadAssetsPageModule(viteServer) {
  return viteServer.ssrLoadModule('/src/features/reports/AssetsReadonlyPage.tsx');
}

function createSnapshot() {
  return {
    version: 1,
    generatedAt: '2026-07-22T10:00:00.000Z',
    notice: 'Snapshot readonly do piloto de componentes.',
    summary: {
      totalValue: 125000,
      itemCount: 2,
      averageVariationPct: 1.2,
    },
    items: [
      {
        ticker: 'PETR4',
        name: 'Petrobras',
        category: 'Acoes',
        quantity: 100,
        averagePrice: 30,
        currentValue: 3500,
        variationPct: 16.6,
        allocationPct: 28,
        trend: 'positive',
      },
      {
        ticker: 'MXRF11',
        name: 'Maxi Renda',
        category: 'FIIs',
        quantity: 50,
        averagePrice: 10,
        currentValue: 500,
        variationPct: -4.5,
        allocationPct: 12,
        trend: 'negative',
      },
    ],
  };
}

test('Select oficial carrega contrato acessivel e native', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { Select } = await loadSelectModule(viteServer);

    const html = renderToStaticMarkup(
      React.createElement(
        Select,
        {
          id: 'category',
          label: 'Categoria',
          helperText: 'Selecao oficial da componente library.',
          error: 'Categoria invalida',
          required: true,
          value: 'all',
          onChange: () => {},
        },
        React.createElement('option', { value: 'all' }, 'Todas'),
        React.createElement('option', { value: 'acoes' }, 'Acoes'),
      ),
    );

    assert.match(html, /class="[^"]*ui-select/);
    assert.match(html, /for="category"/);
    assert.match(html, /id="category"/);
    assert.match(html, /aria-describedby="category-helper category-error"/);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-required="true"/);
    assert.match(html, /Categoria invalida/);
    assert.match(html, /Selecao oficial da componente library\./);
    assert.match(html, /<option value="all" selected="">Todas<\/option>/);
    assert.match(html, /<option value="acoes">Acoes<\/option>/);

    const disabledHtml = renderToStaticMarkup(
      React.createElement(
        Select,
        {
          id: 'sort',
          label: 'Ordenar por',
          disabled: true,
          value: 'currentValue',
          onChange: () => {},
        },
        React.createElement('option', { value: 'currentValue' }, 'Valor atual'),
      ),
    );

    assert.match(disabledHtml, /disabled/);
    assert.doesNotMatch(disabledHtml, /aria-invalid="true"/);
  } finally {
    await viteServer.close();
  }
});

test('AssetsReadonlyPage usa Select no fluxo piloto', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { AssetsReadonlyPage } = await loadAssetsPageModule(viteServer);
    const { createReportsRefreshController } = await viteServer.ssrLoadModule('/src/features/reports/reportsRefreshController.ts');

    const snapshot = createSnapshot();
    const refreshController = createReportsRefreshController({
      source: {
        getSnapshot() {
          return snapshot;
        },
      },
      onRefresh() {},
    });

    const html = renderToStaticMarkup(
      React.createElement(AssetsReadonlyPage, {
        adapter: {
          getSnapshot() {
            return snapshot;
          },
        },
        refreshController,
      }),
    );

    assert.match(html, /ui-select/);
    assert.match(html, /Categoria/);
    assert.match(html, /Ordenar por/);
    assert.match(html, /assets-readonly__controls/);
  } finally {
    await viteServer.close();
  }
});
