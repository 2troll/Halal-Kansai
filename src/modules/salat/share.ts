/**
 * Compartir los horarios de salat como imagen (canvas) — pensado para
 * grupos de WhatsApp de la comunidad. Mantiene la identidad visual.
 */
import { formatTime, type PrayerTimes } from './calculator';
import { getLang, t } from '../../i18n';

const W = 1080;
const H = 1350;

const NIGHT = '#10211d';
const NIGHT_SOFT = '#1a312b';
const EMERALD = '#1d6a55';
const GOLD = '#c9a24b';
const GOLD_SOFT = '#e0c684';
const PAPER = '#f6f1e6';

const ORDER: Array<keyof PrayerTimes> = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function drawArch(ctx: CanvasRenderingContext2D, cx: number, top: number, halfW: number, bottom: number) {
  ctx.beginPath();
  ctx.moveTo(cx - halfW, bottom);
  ctx.lineTo(cx - halfW, top + halfW);
  ctx.arc(cx, top + halfW, halfW, Math.PI, 0);
  ctx.lineTo(cx + halfW, bottom);
  ctx.closePath();
}

export function renderTimesImage(times: PrayerTimes, date: Date): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Fondo noche con degradado sutil.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, NIGHT_SOFT);
  bg.addColorStop(0.35, NIGHT);
  bg.addColorStop(1, NIGHT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Arco mihrab de fondo.
  drawArch(ctx, W / 2, 150, 380, H - 110);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.stroke();
  const fill = ctx.createLinearGradient(0, 150, 0, H - 110);
  fill.addColorStop(0, EMERALD);
  fill.addColorStop(1, NIGHT_SOFT);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';

  // Marca.
  ctx.fillStyle = PAPER;
  ctx.font = '600 76px Fraunces, Amiri, serif';
  ctx.fillText(t('appName'), W / 2, 290);
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = '400 34px Inter, sans-serif';
  const dateStr = date.toLocaleDateString(getLang() === 'ar' ? 'ar' : getLang(), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  ctx.fillText(dateStr, W / 2, 360);
  ctx.fillText(t('salatMethod'), W / 2, 412);

  // Horarios.
  const startY = 520;
  const rowH = 108;
  ctx.font = '400 46px Inter, sans-serif';
  ORDER.forEach((name, i) => {
    const y = startY + i * rowH;
    ctx.fillStyle = 'rgba(246, 241, 230, 0.08)';
    ctx.fillRect(W / 2 - 330, y - 56, 660, 84);
    ctx.fillStyle = PAPER;
    ctx.textAlign = getLang() === 'ar' ? 'right' : 'left';
    ctx.fillText(t(name), getLang() === 'ar' ? W / 2 + 290 : W / 2 - 290, y);
    ctx.fillStyle = GOLD_SOFT;
    ctx.textAlign = getLang() === 'ar' ? 'left' : 'right';
    ctx.font = '600 46px Inter, sans-serif';
    ctx.fillText(formatTime(times[name]), getLang() === 'ar' ? W / 2 - 290 : W / 2 + 290, y);
    ctx.font = '400 46px Inter, sans-serif';
  });

  // Pie.
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD_SOFT;
  ctx.font = '400 30px Inter, sans-serif';
  ctx.fillText(t('tagline'), W / 2, H - 56);

  return canvas;
}

/** Comparte vía Web Share API; si no se puede, descarga el PNG. */
export async function shareTimesImage(times: PrayerTimes, date: Date): Promise<void> {
  const canvas = renderTimesImage(times, date);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob falló');

  const file = new File([blob], 'halal-kansai-salat.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: t('appName') });
      return;
    } catch (err) {
      // El usuario canceló el diálogo: no es un error.
      if ((err as DOMException).name === 'AbortError') return;
    }
  }
  // Fallback: descarga directa.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'halal-kansai-salat.png';
  a.click();
  URL.revokeObjectURL(url);
}
