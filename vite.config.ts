import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // La versión viaja con cada opinión enviada: sin ella no se sabe si un fallo
  // ya está arreglado en la versión que tiene quien lo cuenta.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
        // Hoja de revisión de las 49 reglas, para enviar a una certificadora.
        revision: 'revision.html',
      },
    },
  },
  server: {
    // host:true expone el dev server en la red local para probar desde el móvil.
    host: true,
    // Dominios de túnel (demos puntuales a terceros); Vite bloquea el resto.
    allowedHosts: ['.lhr.life', '.localhost.run', '.trycloudflare.com'],
    proxy: {
      // El backend (Fase 2) vive en otro proceso durante el desarrollo.
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        ws: true, // modo transmisor (WebSocket)
      },
    },
  },
  // `vite preview` sirve el build real: es lo que se enseña a terceros por
  // un túnel, porque no depende del websocket de HMR.
  preview: {
    host: true,
    allowedHosts: ['.lhr.life', '.localhost.run', '.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  test: {
    environment: 'node',
  },
});
