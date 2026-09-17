#!/usr/bin/env bash
# Conecta el buzón de opiniones con Telegram (@Walkie2talkiebot).
# Lee el token y el chat del .env de claude-code-telegram y los guarda como
# secretos del Worker. No imprime el token. Después: npm run deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
E="$HOME/projects/claude-code-telegram/.env"
[ -f "$E" ] || { echo "No existe $E"; exit 1; }
TOK=$(grep -E '^TELEGRAM_BOT_TOKEN=' "$E" | head -1 | cut -d= -f2- | tr -d "\"' ")
CHAT=$(grep -E '^NOTIFICATION_CHAT_IDS=' "$E" | head -1 | cut -d= -f2- | tr -d "\"' []" | cut -d, -f1)
[ -n "$TOK" ] && [ -n "$CHAT" ] || { echo "Faltan TELEGRAM_BOT_TOKEN o NOTIFICATION_CHAT_IDS en $E"; exit 1; }
printf '%s' "$TOK" | npx wrangler secret put TELEGRAM_BOT_TOKEN
printf '%s' "$CHAT" | npx wrangler secret put TELEGRAM_CHAT_ID
echo "✓ Secretos guardados. Ahora: npm run deploy"
