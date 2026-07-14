import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'modern',
  plugins: [react()],
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
      input: {
        index: resolve(rootDir, 'index.html'),
        host: resolve(rootDir, 'host.html'),
      },
    },
  },
});
