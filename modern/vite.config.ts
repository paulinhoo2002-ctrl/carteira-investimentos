import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const legacyReportsReadonlySourcePath = fileURLToPath(
  new URL('../legacy/reports-readonly-source.js', import.meta.url),
);

export default defineConfig({
  root: 'modern',
  base: './',
  resolve: {
    alias: {
      '@legacy-reports-readonly-source': legacyReportsReadonlySourcePath,
    },
  },
  optimizeDeps: {
    include: ['@legacy-reports-readonly-source'],
  },
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
  },
});
