import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Keep the portable preview self-contained; the PDF worker remains a separate
  // normal-site asset and is embedded by scripts/build-preview.mjs.
  build: { rollupOptions: { output: { inlineDynamicImports: true } } },
  test: { include: ['tests/**/*.test.ts'] },
});
