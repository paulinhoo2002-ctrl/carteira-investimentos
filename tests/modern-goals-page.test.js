const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appTsxPath = path.join(__dirname, '..', 'modern', 'src', 'App.tsx');

function readAppTsx() {
  return fs.readFileSync(appTsxPath, 'utf8');
}

test('App.tsx importa GoalsReadonlyPage no lugar do GoalsPage antigo', () => {
  const appTsx = readAppTsx();

  assert.match(appTsx, /import\s*{\s*GoalsReadonlyPage\s*}\s*from\s*['"]\.\/features\/goals\/GoalsReadonlyPage['"]/);
  assert.equal(/import\s*{\s*GoalsPage\s*}\s*from/.test(appTsx), false, 'App.tsx nao deve importar GoalsPage');
});

test('App.tsx rota goals renderiza GoalsReadonlyPage com adapter e refreshController', () => {
  const appTsx = readAppTsx();

  const goalsRoute = appTsx.match(/activePageId\s*===\s*['"]goals['"]\s*\?\s*\(?\s*<GoalsReadonlyPage[\s\S]*?\/>/);
  assert.ok(goalsRoute, 'Deve existir JSX <GoalsReadonlyPage .../> na rota goals');

  assert.match(goalsRoute[0], /adapter=\{goalsAdapter\}/);
  assert.match(goalsRoute[0], /refreshController=\{goalsRefreshController\}/);
  assert.equal(/<GoalsPage\s/.test(appTsx), false, 'App.tsx nao deve renderizar JSX <GoalsPage');
});
