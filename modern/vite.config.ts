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
    writeBundle() {
      if (!existsSync(readonlyReportPageContractSource)) {
        throw new Error('Missing readonly report page contract source file.');
      }

      mkdirSync(dirname(readonlyReportPageContractDist), { recursive: true });
      writeFileSync(readonlyReportPageContractDist, readFileSync(readonlyReportPageContractSource, 'utf8'));
    },
  };
}

export default defineConfig({
  root: 'modern',
  base: './',
  plugins: [react(), copyReadonlyReportPageContract()],
  optimizeDeps: {
    include: [resolve(rootDir, '..', 'legacy', 'reports-readonly-source.js'), resolve(rootDir, '..', 'report-asset-row.js')],
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
      },
    },
  },
});
