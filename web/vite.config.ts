import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Some pre-compiled npm packages use __publicField (a TypeScript/esbuild helper)
    // without bundling it. Rewrite bare references to a globalThis property that
    // we polyfill in index.html before any module code runs.
    '__publicField': 'globalThis.__publicField',
  },
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
  server: {
    port: 5747,
    proxy: {
      '/api': {
        target: 'http://localhost:5446',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});