/**
 * Diagnóstico del aparato: qué funciona AQUÍ y qué no.
 *
 * Por qué existe. Esta app depende de cosas que cambian de un teléfono a
 * otro: micrófono, reconocimiento de voz, voces instaladas, cámara, permisos,
 * conexión. Cuando algo falle será un viernes, en una mezquita, con el sermón
 * empezando y sin nadie a quien preguntar.
 *
 * Sin esto, el usuario solo puede decir «no funciona», que no es información.
 * Con esto puede decir «el reconocimiento de voz sale en rojo», que sí lo es
 * — y muchas veces él mismo verá que le falta conceder un permiso o instalar
 * una voz, y lo arreglará sin escribir a nadie.
 *
 * Cada comprobación mide lo que HAY, no lo que debería haber, y ninguna pide
 * permisos por su cuenta: preguntar por el micrófono a quien solo quería mirar
 * un diagnóstico sería una encerrona.
 */
import { apiUrl, isNative } from '../../backend';
import { t } from '../../i18n';
import { speechOutputSupported, voicesFor } from '../khutbah/speak';
import { isSpeechSupported } from '../khutbah/speech';
import { barcodeSupported } from '../ingredients/scan';
import { nativeScanAvailable } from '../ingredients/scan-native';
import { ocrAvailable } from '../ingredients/ocr';

export type Estado = 'ok' | 'aviso' | 'fallo';

export interface Comprobacion {
  nombre: string;
  estado: Estado;
  detalle: string;
}

/** Permiso ya concedido, denegado o sin preguntar. Nunca lo solicita. */
async function permiso(nombre: PermissionName): Promise<string> {
  try {
    const res = await navigator.permissions?.query({ name: nombre });
    return res?.state ?? 'desconocido';
  } catch {
    return 'desconocido';
  }
}

export async function ejecutarDiagnostico(idiomaVoz: string): Promise<Comprobacion[]> {
  const out: Comprobacion[] = [];

  // ---------- Dónde corre ----------
  out.push({
    nombre: t('diagPlatform'),
    estado: 'ok',
    detalle: isNative() ? t('diagPlatformApp') : t('diagPlatformWeb'),
  });

  // ---------- El servidor de la jutba ----------
  const t0 = performance.now();
  try {
    const res = await fetch(apiUrl('/api/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Una frase corriente, NO una aleya: «السلام عليكم» casaba con el
      // Corán y el diagnóstico medía la búsqueda en Tanzil en vez del
      // traductor, que es lo que puede fallar el viernes.
      body: JSON.stringify({
        text: 'اليوم نتحدث عن الصدق في المعاملة',
        source: 'ar-SA',
        target: 'es',
      }),
    });
    const ms = Math.round(performance.now() - t0);
    const body = (await res.json().catch(() => null)) as { translationSource?: string } | null;

    if (!res.ok) {
      out.push({ nombre: t('diagServer'), estado: 'fallo', detalle: `HTTP ${res.status}` });
    } else {
      // Más de tres segundos con el sermón en marcha ya estorba.
      out.push({
        nombre: t('diagServer'),
        estado: ms > 3000 ? 'aviso' : 'ok',
        detalle: `${ms} ms · ${body?.translationSource ?? '—'}`,
      });
    }
  } catch {
    out.push({ nombre: t('diagServer'), estado: 'fallo', detalle: t('diagNoConnection') });
  }

  // ---------- Oír ----------
  out.push({
    nombre: t('diagSpeechIn'),
    estado: isSpeechSupported() ? 'ok' : 'fallo',
    detalle: isSpeechSupported() ? t('diagAvailable') : t('diagUseRoomMode'),
  });

  out.push({
    nombre: t('diagMic'),
    estado: (await permiso('microphone' as PermissionName)) === 'denied' ? 'fallo' : 'ok',
    detalle: await permiso('microphone' as PermissionName),
  });

  // ---------- Hablar ----------
  const voces = voicesFor(idiomaVoz);
  out.push({
    nombre: t('diagVoices'),
    // Sin voz del idioma, la traducción se lee con acento equivocado: se
    // entiende, pero mal. Es aviso, no fallo.
    estado: !speechOutputSupported() ? 'fallo' : voces.length === 0 ? 'aviso' : 'ok',
    detalle: !speechOutputSupported()
      ? t('diagNotSupported')
      : voces.length === 0
        ? t('voiceNone')
        : `${voces.length} · ${voces[0]!.name}`,
  });

  // ---------- Ver ----------
  const camara = nativeScanAvailable() || barcodeSupported();
  out.push({
    nombre: t('diagBarcode'),
    estado: camara ? 'ok' : 'aviso',
    detalle: camara ? t('diagAvailable') : t('diagTypeInstead'),
  });

  out.push({
    nombre: t('diagPhoto'),
    estado: ocrAvailable() ? 'ok' : 'aviso',
    detalle: ocrAvailable() ? t('diagAvailable') : t('diagOnlyInApp'),
  });

  // ---------- Avisos y pantalla ----------
  out.push({
    nombre: t('diagNotifications'),
    estado: isNative() ? 'ok' : 'aviso',
    detalle: isNative() ? t('diagAvailable') : t('diagOnlyInApp'),
  });

  out.push({
    nombre: t('diagWakeLock'),
    estado: 'wakeLock' in navigator ? 'ok' : 'aviso',
    detalle: 'wakeLock' in navigator ? t('diagAvailable') : t('diagScreenMaySleep'),
  });

  // ---------- Sin conexión ----------
  try {
    const nombres = await caches.keys();
    let entradas = 0;
    for (const n of nombres) entradas += (await (await caches.open(n)).keys()).length;
    out.push({
      nombre: t('diagOffline'),
      // Cero entradas significa que la promesa de funcionar sin red es falsa
      // en ESTE teléfono, aunque el código esté bien.
      estado: entradas === 0 ? 'fallo' : 'ok',
      detalle: `${entradas} ${t('diagCachedFiles')}`,
    });
  } catch {
    out.push({ nombre: t('diagOffline'), estado: 'aviso', detalle: t('diagNotSupported') });
  }

  return out;
}
