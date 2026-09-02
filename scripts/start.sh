#!/usr/bin/env bash
# Lanzador para probar Halal Kansai en local (Mac/Linux) con traducción real.
# Un comando: instala, pide la clave si hace falta, y arranca backend + frontend.
#
#   ./scripts/start.sh           (o: npm start)
#
# Luego abre http://localhost:5173 en el Mac (transmisor) y, desde el móvil
# en la misma WiFi, la URL "Network" que imprime Vite (oyente).
set -euo pipefail
cd "$(dirname "$0")/.."

# 1) Clave de Anthropic (necesaria para la traducción). Orden: variable de
#    entorno → archivo .env → preguntar. La clave nunca se escribe en el repo.
if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -f .env ]; then
  set -a; . ./.env; set +a
fi
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Sin ANTHROPIC_API_KEY la app arranca, pero la jutba no traducirá."
  read -rsp "Pega tu clave de Anthropic (sk-ant-...) y Enter, o Enter para omitir: " key
  echo
  [ -n "$key" ] && export ANTHROPIC_API_KEY="$key"
fi

# 2) Dependencias
[ -d node_modules ] || npm install

# 3) Backend (API + WebSocket del modo transmisor) en segundo plano
npm run dev:server &
BACK=$!
trap 'kill "$BACK" 2>/dev/null || true' EXIT INT TERM

# 4) Frontend (Vite expone la URL de red para el móvil)
echo
echo "→ En el Mac:    http://localhost:5173   (modo «Transmitir a una sala»)"
echo "→ En el móvil:  abre la URL 'Network' de abajo  (modo «Unirse a una transmisión»)"
echo "  Usad el MISMO código de sala (ej. test-osaka)."
echo
npm run dev
