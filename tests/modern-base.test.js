const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const modernRoot = path.join(__dirname, '..', 'modern');

function read(relativePath) {
  return fs.readFileSync(path.join(modernRoot, relativePath), 'utf8');
}

test('modern base files exist and stay isolated', () => {
  const files = [
    'index.html',
    'README.md',
    'vite.config.ts',
    'tsconfig.json',
    path.join('src', 'App.tsx'),
    path.join('src', 'main.tsx'),
    path.join('src', 'styles.css'),
  ];

  for (const file of files) {
    assert.equal(fs.existsSync(path.join(modernRoot, file)), true, `Missing file: ${file}`);
  }

  const indexHtml = read('index.html');
  const appTsx = read(path.join('src', 'App.tsx'));
  const mainTsx = read(path.join('src', 'main.tsx'));
  const stylesCss = read(path.join('src', 'styles.css'));

  assert.match(indexHtml, /<title>Carteira de Investimentos \| Base moderna isolada<\/title>/);
  assert.match(indexHtml, /<script type="module" src="\/src\/main\.tsx"><\/script>/);
  assert.match(appTsx, /Base moderna isolada com React, TypeScript e Vite\./);
  assert.match(appTsx, /Nenhuma leitura ou gravação de dados reais\./);
  assert.match(mainTsx, /createRoot/);
  assert.match(stylesCss, /:focus-visible/);

  for (const forbidden of [
    'localStorage',
    'sessionStorage',
    'firebase',
    'auth',
    'backup',
    'sync',
    'finance-core.js',
    'persistence-core.js',
    'report-asset-row.js',
  ]) {
    assert.equal(
      [indexHtml, appTsx, mainTsx].some((content) => content.includes(forbidden)),
      false,
      `Forbidden reference found: ${forbidden}`,
    );
  }
});
