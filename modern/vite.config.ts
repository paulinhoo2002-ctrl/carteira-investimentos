import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const readonlyReportPageContractSource = resolve(rootDir, '..', 'readonly-report-page-contract.js');
const readonlyReportPageContractDist = resolve(rootDir, 'dist', 'readonly-report-page-contract.js');

function copyReadonlyReportPageContract() {
  return {
    name: 'copy-readonly-report-page-contract',
    writeBundle(_outputOptions, bundle) {
      if (!existsSync(readonlyReportPageContractSource)) {
        throw new Error('Missing readonly report page contract source file.');
      }

      mkdirSync(dirname(readonlyReportPageContractDist), { recursive: true });
      writeFileSync(readonlyReportPageContractDist, readFileSync(readonlyReportPageContractSource, 'utf8'));

      const modernStyles = Object.values(bundle).find(
        (item) => item.type === 'asset' && item.fileName.endsWith('.css'),
      );
      if (!modernStyles) {
        throw new Error('Missing modern host stylesheet asset.');
      }

      writeFileSync(resolve(rootDir, 'dist', 'active-wallet-host.css'), modernStyles.source);
    },
  };
}

export default defineConfig({
  root: 'modern',
  base: './',
  plugins: [react(), copyReadonlyReportPageContract()],
  resolve: {
    alias: {
      'portfolio-history-core': resolve(rootDir, '..', 'portfolio-history-core.js'),
      'persistence-core': resolve(rootDir, '..', 'persistence-core.js'),
    },
  },
  optimizeDeps: {
    include: [
      resolve(rootDir, '..', 'legacy', 'reports-readonly-source.js'),
      resolve(rootDir, '..', 'report-asset-row.js'),
      resolve(rootDir, '..', 'portfolio-history-core.js'),
      resolve(rootDir, '..', 'persistence-core.js'),
    ],
  },
  ssr: {
    external: [
      /\/src\/features\/reports\/reportsReadonlyContract\.js$/,
      /\/src\/features\/reports\/reportsReadonlyBridge\.js$/,
      /\/src\/features\/reports\/reportsSnapshotAdapter\.js$/,
      /\/src\/types\/navigation\.js$/,
    ],
  },
  server: {
    fs: {
      allow: [resolve(rootDir, '..')],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
      },
      input: {
        index: resolve(rootDir, 'index.html'),
        host: resolve(rootDir, 'host.html'),
        'host-bootstrap': resolve(rootDir, 'src/bootstrap/hostBootstrap.ts'),
        'v262-legacy-diagnostics': resolve(rootDir, 'src/features/fixed-income/v262LegacyDiagnostics.ts'),
      },
    },
  },
});
