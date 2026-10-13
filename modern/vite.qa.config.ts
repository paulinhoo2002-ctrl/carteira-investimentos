import { mergeConfig } from 'vite';
import productionConfig from './vite.config';

// QA uses the production inputs/plugins without rewriting the protected dist.
export default mergeConfig(productionConfig, {
  build: { outDir: '../.qa-state/modern-build', emptyOutDir: false },
});
