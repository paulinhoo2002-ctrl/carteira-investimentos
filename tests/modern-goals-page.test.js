const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { createServer } = require('vite');

let GoalsPage;

let viteServerPromise;
function getViteServer() {
  if (!viteServerPromise) {
    viteServerPromise = createServer({
      configFile: path.join(__dirname, '..', 'modern', 'vite.config.ts'),
      logLevel: 'error',
      server: { middlewareMode: true },
    });
  }
  return viteServerPromise;
}

test.after(async () => {
  if (viteServerPromise) {
    const server = await viteServerPromise;
    await server.close();
  }
});

async function loadModules() {
  const goalsModule = await (await getViteServer()).ssrLoadModule('/src/features/goals/GoalsPage.tsx');
  GoalsPage = goalsModule.GoalsPage;
}

test('GoalsPage permanece placeholder honesto', async () => {
  await loadModules();
  const html = renderToStaticMarkup(React.createElement(GoalsPage));
  assert.ok(html.includes('Integração readonly de metas ainda não disponível'));
  assert.ok(html.includes('nenhuma leitura direta de S.goals'));
  assert.ok(html.includes('nenhuma escrita'));
});

test('GoalsPage nao renderiza dados financeiros ficticios', async () => {
  await loadModules();
  const html = renderToStaticMarkup(React.createElement(GoalsPage));
  assert.ok(!html.includes('R$'));
  assert.ok(!html.includes('alcançada'));
  assert.ok(!html.includes('progress'));
});

test('GoalsPage nao possui formularios de escrita', async () => {
  await loadModules();
  const html = renderToStaticMarkup(React.createElement(GoalsPage));
  assert.ok(!html.includes('<input'));
  assert.ok(!html.includes('<button'));
  assert.ok(!html.includes('<form'));
});
