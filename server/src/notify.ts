/**
 * Aviso a Telegram de cada opinión nueva.
 *
 * Sin esto las opiniones solo se veían entrando a /admin.html con un token
 * que nadie abre: desde fuera parecía que el buzón «no llegaba a ningún
 * sitio». Ahora cada una llega al móvil del fundador por el bot que ya usa
 * para otros avisos (@Walkie2talkiebot). Gratis, sin cuenta nueva.
 *
 * Si faltan las variables, no hace nada: la opinión se guarda igual.
 */
import type { Feedback } from './feedback.ts';

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

const KIND: Record<string, string> = {
  bug: '🐞 No funciona',
  idea: '💡 Idea',
  data: '📍 Dato mal',
  other: '💬 Otro',
};

export function feedbackText(f: Feedback): string {
  const meta = [f.platform, f.appVersion && `v${f.appVersion}`, f.lang, f.tab].filter(Boolean).join(' · ');
  const stars = f.rating ? ` ${'★'.repeat(f.rating)}` : '';
  return `Halal Kansai — ${KIND[f.kind] ?? f.kind}${stars}\n\n${f.message}\n\n${meta}`;
}

export async function notifyTelegram(cfg: TelegramConfig, f: Feedback): Promise<void> {
  if (!cfg.botToken || !cfg.chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Texto plano (sin parse_mode): lo escribe el público y no se interpreta.
      body: JSON.stringify({ chat_id: cfg.chatId, text: feedbackText(f), disable_web_page_preview: true }),
    });
  } catch {
    /* Telegram caído: la opinión ya está guardada */
  }
}
