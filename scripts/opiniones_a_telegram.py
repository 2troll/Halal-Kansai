#!/usr/bin/env python3
"""Reenvía a Telegram (@Walkie2talkiebot) las opiniones nuevas de Halal Kansai.

Por qué existe. La app guarda cada opinión en Cloudflare KV, pero de ahí no
salía hacia nadie: parecía que el buzón «no llegaba a ninguna parte». Este
script corre en el Mac cada 10 minutos (LaunchAgent), lee la lista con la
sesión de wrangler que ya existe (solo lectura) y manda las que no ha mandado
antes. No necesita desplegar el Worker ni guardar secretos en Cloudflare.

Uso: python3 scripts/opiniones_a_telegram.py [--probar]
  --probar  manda un mensaje de prueba aunque no haya opiniones nuevas.
"""
import json
import pathlib
import subprocess
import sys
import urllib.parse
import urllib.request

RAIZ = pathlib.Path(__file__).resolve().parent.parent
KV_ID = "1f8bfbfa5b2043e7b87f621d705380e3"
ENV_TELEGRAM = pathlib.Path.home() / "projects" / "claude-code-telegram" / ".env"
ESTADO = pathlib.Path.home() / ".local" / "state" / "halal-kansai" / "opiniones-enviadas.json"

TIPO = {"bug": "🐞 No funciona", "idea": "💡 Idea", "data": "📍 Dato mal", "other": "💬 Otro"}


def leer_env(ruta: pathlib.Path) -> dict[str, str]:
    if not ruta.exists():
        raise SystemExit(f"ERROR: no encuentro {ruta}: sin el bot no puedo avisar.")
    env = {}
    for linea in ruta.read_text().splitlines():
        linea = linea.strip()
        if linea and not linea.startswith("#") and "=" in linea:
            clave, valor = linea.split("=", 1)
            env[clave.strip()] = valor.strip().strip('"').strip("'")
    return env


def leer_opiniones() -> list[dict]:
    r = subprocess.run(
        ["npx", "wrangler", "kv", "key", "get", "feedback", f"--namespace-id={KV_ID}", "--remote"],
        cwd=RAIZ, capture_output=True, text=True, timeout=120,
    )
    salida = r.stdout.strip()
    if r.returncode != 0 or not salida.startswith("["):
        # «Value not found» = todavía nadie ha escrito: no es un error.
        if "not found" in (r.stdout + r.stderr).lower():
            return []
        raise SystemExit(f"ERROR leyendo KV (¿sesión de wrangler caducada? `npx wrangler login`):\n{r.stderr[-500:]}")
    return json.loads(salida)


def texto(f: dict) -> str:
    meta = " · ".join(x for x in [f.get("platform"), f.get("appVersion") and f"v{f['appVersion']}", f.get("lang"), f.get("tab")] if x)
    estrellas = " " + "★" * int(f["rating"]) if f.get("rating") else ""
    return f"Halal Kansai — {TIPO.get(f.get('kind'), f.get('kind'))}{estrellas}\n\n{f.get('message', '')}\n\n{meta}\n{f.get('createdAt', '')}"


def enviar(mensaje: str) -> bool:
    env = leer_env(ENV_TELEGRAM)
    token, chats = env.get("TELEGRAM_BOT_TOKEN"), env.get("NOTIFICATION_CHAT_IDS", "")
    if not token or not chats:
        raise SystemExit("ERROR: falta TELEGRAM_BOT_TOKEN o NOTIFICATION_CHAT_IDS en el .env")
    todo_ok = True
    for chat in [c.strip() for c in chats.split(",") if c.strip()]:
        datos = urllib.parse.urlencode({"chat_id": chat, "text": mensaje}).encode()
        try:
            with urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", data=datos, timeout=20) as r:
                todo_ok = todo_ok and bool(json.load(r).get("ok"))
        except Exception as e:
            print(f"ERROR enviando a Telegram: {e}", file=sys.stderr)
            todo_ok = False
    return todo_ok


def main() -> None:
    enviadas = set(json.loads(ESTADO.read_text())) if ESTADO.exists() else set()
    opiniones = leer_opiniones()
    nuevas = [f for f in opiniones if f.get("id") not in enviadas]
    for f in sorted(nuevas, key=lambda x: x.get("createdAt", "")):
        # Solo se marca como enviada si Telegram la aceptó: si falla, se
        # reintenta en la siguiente pasada en vez de perderse.
        if enviar(texto(f)):
            enviadas.add(f["id"])
    if "--probar" in sys.argv:
        enviar(f"✅ Buzón de Halal Kansai conectado. Hay {len(opiniones)} opinión(es) guardada(s); las nuevas llegarán aquí cada 10 minutos.")
    ESTADO.parent.mkdir(parents=True, exist_ok=True)
    ESTADO.write_text(json.dumps(sorted(enviadas)))
    print(f"{len(opiniones)} guardadas · {len(nuevas)} nuevas reenviadas")


if __name__ == "__main__":
    main()
