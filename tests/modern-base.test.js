const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const modernRoot = path.join(__dirname, '..', 'modern');
const sourceFiles = [
  'index.html',
  'README.md',
  'vite.config.ts',
  'tsconfig.json',
  'src/App.tsx',
  'src/main.tsx',
  'src/styles.css',
  'src/components/AppHeader.tsx',
  'src/components/Sidebar.tsx',
  'src/components/PagePlaceholder.tsx',
  'src/features/reports/AssetsReportPreview.tsx',
  'src/features/reports/reportsSnapshotAdapter.ts',
  'src/types/navigation.ts',
];

function read(relativePath) {
  return fs.readFileSync(path.join(modernRoot, relativePath), 'utf8');
}

function allSourceText() {
  return sourceFiles
    .filter((file) => file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.html') || file.endsWith('.md'))
    .map((file) => read(file))
    .join('\n');
}

test('modern shell exists and stays isolated', () => {
  for (const file of sourceFiles) {
    assert.equal(fs.existsSync(path.join(modernRoot, file)), true, `Missing file: ${file}`);
  }

  const indexHtml = read('index.html');
  const readme = read('README.md');
  const appTsx = read('src/App.tsx');
  const mainTsx = read('src/main.tsx');
  const stylesCss = read('src/styles.css');
  const headerTsx = read('src/components/AppHeader.tsx');
  const sidebarTsx = read('src/components/Sidebar.tsx');
  const placeholderTsx = read('src/components/PagePlaceholder.tsx');
  const reportsPreviewTsx = read('src/features/reports/AssetsReportPreview.tsx');
  const reportsAdapterTs = read('src/features/reports/reportsSnapshotAdapter.ts');
  const navigationTs = read('src/types/navigation.ts');
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

  assert.match(indexHtml, /<title>Carteira de Investimentos \| Shell moderno isolado<\/title>/);
  assert.match(indexHtml, /Shell moderno isolado em React, TypeScript e Vite para a Fase 2\./);
  assert.match(readme, /# Shell moderno isolado/);
  assert.match(readme, /Relatorios consome snapshot somente leitura por adaptador explicito/);
  assert.match(appTsx, /READ_ONLY_REPORTS_ADAPTER/);
  assert.match(appTsx, /adapter=\{READ_ONLY_REPORTS_ADAPTER\}/);
  assert.match(appTsx, /activePageId === 'reports'/);
  assert.match(mainTsx, /createRoot/);
  assert.match(stylesCss, /\.modern-menu-button:focus-visible/);
  assert.match(stylesCss, /--color-background:/);
  assert.match(stylesCss, /--color-surface:/);
  assert.match(stylesCss, /--color-text:/);
  assert.match(stylesCss, /--color-text-muted:/);
  assert.match(stylesCss, /--color-border:/);
  assert.match(stylesCss, /--color-focus:/);
  assert.match(stylesCss, /--space-4:/);
  assert.match(stylesCss, /--radius-lg:/);
  assert.match(stylesCss, /--shadow-shell:/);
  assert.match(stylesCss, /--motion-fast:/);
  assert.match(stylesCss, /outline: 3px solid var\(--color-focus\)/);
  assert.match(stylesCss, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(stylesCss, /\.assets-report__table caption/);
  assert.match(stylesCss, /\.assets-report__mobile-list/);
  assert.match(stylesCss, /font-variant-numeric: tabular-nums/);
  assert.equal(stylesCss.includes('!important'), false);
  assert.equal(stylesCss.includes('url('), false);
  assert.equal(stylesCss.includes('--shell-bg'), false);
  assert.equal(stylesCss.includes('--panel-bg'), false);
  assert.match(headerTsx, /aria-controls="modern-sidebar"/);
  assert.match(headerTsx, /aria-expanded=\{isMenuOpen\}/);
  assert.match(sidebarTsx, /aria-current=\{isActive \? 'page' : undefined\}/);
  assert.match(sidebarTsx, /Secoes da base moderna/);
  assert.match(placeholderTsx, /Funcionalidade real ainda nao foi migrada\./);
  assert.match(reportsPreviewTsx, /Previa somente leitura de Relatorios/);
  assert.match(reportsPreviewTsx, /adapter: ReadOnlyReportsAdapter/);
  assert.match(reportsPreviewTsx, /const snapshot = adapter.getSnapshot\(\)/);
  assert.match(reportsPreviewTsx, /snapshot\.notice/);
  assert.match(reportsPreviewTsx, /snapshot\.summary\.totalValue/);
  assert.match(reportsPreviewTsx, /snapshot\.items\.map/);
  assert.match(reportsAdapterTs, /export interface ReadOnlyReportsSnapshot/);
  assert.match(reportsAdapterTs, /export interface ReadOnlyReportsAdapter/);
  assert.match(reportsAdapterTs, /createReadOnlyReportsAdapter/);
  assert.match(reportsAdapterTs, /READ_ONLY_REPORTS_ADAPTER/);
  assert.match(reportsAdapterTs, /Snapshot controlado por adaptador somente leitura/);
  assert.match(reportsAdapterTs, /deepFreeze/);
  assert.match(reportsAdapterTs, /DEMO-ALFA11/);
  assert.match(reportsAdapterTs, /DEMO-BETA34/);
  assert.match(reportsAdapterTs, /DEMO-GAMA3/);
  assert.match(reportsAdapterTs, /DEMO-DELTA5/);
  assert.match(navigationTs, /Visao geral/);
  assert.match(navigationTs, /Configuracoes/);
  assert.match(navigationTs, /Snapshot somente leitura controlado por adaptador explicito/);
  assert.match(navigationTs, /Snapshot de leitura segura/);
  assert.equal(packageJson.scripts.build, "node -e \"const fs=require('fs'); const files=['index.html','manifest.json','sw.js']; for (const f of files) { if (!fs.existsSync(f)) { throw new Error('Missing file: ' + f); } } console.log('Build OK: static app validated.');\"");
  assert.equal(packageJson.scripts.test.includes('test:modern'), false);
  assert.equal(packageJson.scripts['dev:modern'], 'vite --config modern/vite.config.ts');
  assert.equal(packageJson.scripts['build:modern'], 'vite build --config modern/vite.config.ts');
  assert.equal(packageJson.scripts['test:modern'], 'node --test tests/modern-base.test.js');
  assert.equal(fs.existsSync(path.join(modernRoot, 'dist')), true, 'Expected modern/dist to remain present after modern build');

  const allText = allSourceText();
  for (const forbidden of [
    'firebase',
    'auth',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'sync',
    'backup',
    'fetch(',
    'axios',
    'XMLHttpRequest',
  ]) {
    assert.equal(allText.includes(forbidden), false, `Forbidden reference found: ${forbidden}`);
  }

  for (const file of [appTsx, mainTsx, headerTsx, sidebarTsx, placeholderTsx, reportsPreviewTsx, reportsAdapterTs, navigationTs]) {
    assert.equal(/from\s+['"`]\.\.\/\.\.\//.test(file), false, 'Legacy import path found');
    assert.equal(/from\s+['"`]\/(?!node_modules)/.test(file), false, 'Absolute import path found');
  }
});

test('modern shell exposes seven navigation options', () => {
  const navigationTs = read('src/types/navigation.ts');
  const labels = ['Visao geral', 'Ativos', 'Renda fixa', 'Proventos', 'Aportes', 'Relatorios', 'Configuracoes'];

  for (const label of labels) {
    assert.match(navigationTs, new RegExp(label));
  }

  assert.match(navigationTs, /export type ModernPageId/);
  assert.match(navigationTs, /export interface ModernPage/);
  assert.match(navigationTs, /export const MODERN_PAGES/);
  assert.match(navigationTs, /export const OVERVIEW_CARDS/);
});

test('modern reports adapter returns frozen read-only snapshot', () => {
  const adapterFile = read('src/features/reports/reportsSnapshotAdapter.ts');
  assert.match(adapterFile, /FALLBACK_SNAPSHOT/);
  assert.match(adapterFile, /createReadOnlyReportsAdapter/);
  assert.match(adapterFile, /cloneSnapshot/);
  assert.match(adapterFile, /isSnapshotLike/);
  assert.match(adapterFile, /deepFreeze/);
  assert.match(adapterFile, /React nao escreve na fonte/);
  assert.match(adapterFile, /readonly/);
  assert.equal(adapterFile.includes('localStorage'), false);
  assert.equal(adapterFile.includes('sessionStorage'), false);
  assert.equal(adapterFile.includes('indexedDB'), false);
});
