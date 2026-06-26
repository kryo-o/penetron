import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API + /welcome to the Express app on :4000.
// Production build emits to dist/, which Express serves at :4000 (single origin).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/welcome': 'http://localhost:4000',
    },
  },
  build: { outDir: 'dist' },
});
