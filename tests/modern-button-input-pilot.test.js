const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

const buttonModulePath = path.join(__dirname, '..', 'modern', 'src', 'components', 'Button', 'Button.tsx');
const inputModulePath = path.join(__dirname, '..', 'modern', 'src', 'components', 'Input', 'Input.tsx');
const assetsPageModulePath = path.join(__dirname, '..', 'modern', 'src', 'features', 'reports', 'AssetsReadonlyPage.tsx');

async function loadButtonModule(viteServer) {
  return viteServer.ssrLoadModule('/src/components/Button/Button.tsx');
}

async function loadInputModule(viteServer) {
  return viteServer.ssrLoadModule('/src/components/Input/Input.tsx');
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

test('Button carrega contrato pequeno e previsivel', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { Button } = await loadButtonModule(viteServer);

    const defaultHtml = renderToStaticMarkup(React.createElement(Button, null, 'Salvar'));
    assert.match(defaultHtml, /class="[^"]*ui-button/);
    assert.match(defaultHtml, /type="button"/);
    assert.match(defaultHtml, /data-variant="primary"/);
    assert.match(defaultHtml, /data-size="md"/);

    const secondaryHtml = renderToStaticMarkup(
      React.createElement(Button, { variant: 'secondary', size: 'lg', type: 'submit' }, 'Continuar'),
    );
    assert.match(secondaryHtml, /data-variant="secondary"/);
    assert.match(secondaryHtml, /data-size="lg"/);
    assert.match(secondaryHtml, /type="submit"/);

    const loadingHtml = renderToStaticMarkup(
      React.createElement(Button, { loading: true, 'aria-label': 'Atualizar ativos' }, 'Atualizar'),
    );
    assert.match(loadingHtml, /disabled/);
    assert.match(loadingHtml, /aria-busy="true"/);
    assert.match(loadingHtml, /data-loading="true"/);

    const iconOnlyHtml = renderToStaticMarkup(
      React.createElement(Button, {
        icon: React.createElement('span', null, '+'),
        'aria-label': 'Adicionar ativo',
      }),
    );
    assert.match(iconOnlyHtml, /aria-label="Adicionar ativo"/);
    assert.match(iconOnlyHtml, /ui-button__icon/);
  } finally {
    await viteServer.close();
  }
});
test('Input carrega label, helper e erro com contrato acessivel', async () => {
  const viteServer = await createServer({
    configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const { Input } = await loadInputModule(viteServer);

    const html = renderToStaticMarkup(
      React.createElement(Input, {
        id: 'query',
        label: 'Buscar por ticker ou nome',
        helperText: 'Apenas estado visual local, sem persistencia.',
        error: 'Campo invalido',
        placeholder: 'PETR4',
        required: true,
        value: 'PETR4',
        onChange: () => {},
      }),
    );

    assert.match(html, /class="[^"]*ui-input/);
    assert.match(html, /for="query"/);
    assert.match(html, /id="query"/);
    assert.match(html, /aria-describedby="query-helper query-error"/);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /aria-required="true"/);
    assert.match(html, /Campo invalido/);
    assert.match(html, /Apenas estado visual local, sem persistencia\./);

    const readonlyHtml = renderToStaticMarkup(
      React.createElement(Input, {
        id: 'readonly-query',
        label: 'Somente leitura',
        readOnly: true,
        value: 'Valor travado',
        onChange: () => {},
      }),
    );

    assert.match(readonlyHtml, /readonly/);
    assert.doesNotMatch(readonlyHtml, /aria-invalid="true"/);
  } finally {
    await viteServer.close();
  }
});

test('AssetsReadonlyPage usa Button e Input no fluxo piloto', async () => {
  // Mantem piloto Button/Input separado do Select oficial.
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

    assert.match(html, /ui-button/);
    assert.match(html, /ui-input/);
    assert.match(html, /Atualizar ativos/);
    assert.match(html, /Buscar por ticker ou nome/);
    assert.match(html, /Apenas estado visual local, sem persistencia\./);
    assert.match(html, /assets-readonly__controls/);
  } finally {
    await viteServer.close();
  }
});
