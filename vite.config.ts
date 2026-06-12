import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    target: 'es2020',
    // Móviles Android baratos: bundle pequeño, sin sourcemaps en producción.
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'index.html',
        // Panel de moderación interno (Fase 3), fuera de la navegación de la PWA.
        admin: 'admin.html',
      },
    },
  },
  server: {
    proxy: {
      // El backend (Fase 2) vive en otro proceso durante el desarrollo.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
  },
});
