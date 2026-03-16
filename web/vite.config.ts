import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
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
  optimizeDeps: {
    esbuildOptions: {
      // maplibre-gl v5 distributes bundles that reference __publicField and
      // other esbuild class-field helpers without defining them. Setting
      // target to esnext tells esbuild to emit native class fields instead
      // of helper-based transforms, which avoids the missing-symbol error.
      // See: https://github.com/maplibre/maplibre-gl-js/issues/6680
      target: 'esnext',
    },
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
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
