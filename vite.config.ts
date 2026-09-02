import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Base relativa para GitHub Pages (subruta /Halal-Kansai/) cuando se pasa
  // PAGES_BASE; en Cloudflare/dev se mantiene la raíz.
  base: process.env.PAGES_BASE ?? '/',
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
    // host:true expone el dev server en la red local para probar desde el móvil.
    host: true,
    proxy: {
      // El backend (Fase 2) vive en otro proceso durante el desarrollo.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        ws: true, // modo transmisor (WebSocket)
      },
    },
  },
  test: {
    environment: 'node',
  },
});
