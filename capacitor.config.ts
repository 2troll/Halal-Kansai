import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Una sola base de código para web, Android e iOS.
 *
 * `webDir` es el build de Vite SIN `dist/data/`: los 29 MB del Corán y las
 * traducciones Tanzil se sirven desde el Worker, no se meten en el paquete de
 * la app. Un APK de 30 MB por unos datos que ya están en la red no tiene
 * sentido, y menos para quien tiene el móvil lleno.
 *
 * Empaquetar con: npm run app:build
 */
const config: CapacitorConfig = {
  appId: 'app.halalkansai',
  appName: 'Halal Kansai',
  webDir: 'dist',

  // Sin `server.url`: la app arranca de su propio paquete y funciona sin
  // conexión (rezo, qibla y el lector de etiquetas son 100% locales). Solo
  // la jutba sale a la red, y ahí sí hace falta cobertura.
  android: {
    // El teclado no debe empujar el layout: la caja del 原材料名 es alta.
    adjustMarginsForEdgeToEdge: 'auto',
  },
  ios: {
    contentInset: 'automatic',
  },

  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#10211d',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#d8b26a',
    },
  },
};

export default config;
