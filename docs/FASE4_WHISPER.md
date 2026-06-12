# Fase 4 · Investigación: Whisper para la transcripción de la jutba

> Estado: investigación (junio 2026). El modo transmisor ya está implementado
> con Web Speech API en el móvil transmisor; este documento evalúa sustituir
> ese reconocimiento por Whisper en el backend, como prevé la spec §5.

## Por qué importa el modo transmisor para el coste

Con el modo transmisor, **solo hay UN flujo de audio por mezquita** (el móvil
junto al altavoz), independientemente de cuántos oyentes haya. El coste de
STT no escala con la comunidad, solo con los minutos de jutba.

Estimación de uso: 45 min/viernes × 4 mezquitas (Osaka, Kobe, Kioto, Ibaraki)
× 4,3 semanas ≈ **~13 horas/mes ≈ 780 minutos/mes**.

## Qué gana Whisper frente a Web Speech API

| | Web Speech API (actual) | Whisper (backend) |
|---|---|---|
| Coste | Gratis | Por minuto de audio |
| Acentos no nativos | Regular | Bueno |
| Mezcla de idiomas (urdu + árabe coránico) | Mala: un solo locale fijo | Buena: detección por segmento |
| Acústica de mezquita (eco, altavoz) | Mala | Mejor (modelos large) |
| Privacidad | Audio → Google | Audio → proveedor elegido |
| Soporte navegador | Solo Chrome/Android estable | Cualquiera (el navegador solo sube audio) |

El punto crítico para nosotros es la **mezcla de idiomas**: el jatib intercala
árabe coránico dentro del urdu/indonesio y Web Speech API lo destroza, lo que
degrada la detección de citas. Whisper transcribe el árabe intercalado mucho
mejor → más citas verificadas contra Tanzil.

## Opciones evaluadas

Precios aproximados a junio 2026 — **verificar antes de decidir**.

1. **Cloudflare Workers AI (whisper-large-v3-turbo)** — encaja con nuestro
   backend (ya estamos en Workers). No hay streaming nativo: el transmisor
   sube chunks de 5–10 s grabados con MediaRecorder y el worker los
   transcribe. Coste estimado: **< 1–2 €/mes** a nuestro volumen.
   Latencia: ~chunk + inferencia (2–4 s), aceptable para subtítulos de jutba.
2. **API de transcripción con streaming real (p. ej. Deepgram)** — WebSocket
   bidireccional, latencia < 1 s, buen multilingüe. **~4–8 €/mes** a nuestro
   volumen. Mejor experiencia, dependencia y coste algo mayores.
3. **Whisper autoalojado (faster-whisper en GPU)** — control total y sin coste
   por minuto, pero una GPU T4 24/7 (~150 €/mes) o arranque bajo demanda
   (complejidad operativa) no se justifican para 13 h/mes.

## Recomendación

**Opción 1 (Workers AI con chunks)** como siguiente paso: coste casi nulo,
misma plataforma, sin nueva cuenta. Arquitectura:

```
móvil transmisor ── MediaRecorder (chunks 5-10 s, webm/opus)
      │  POST /api/khutbah/audio?room=X  (o por el WS existente, binario)
      ▼
Worker ── Workers AI whisper-large-v3-turbo ── texto
      ▼
RoomHub.segment(texto)  →  flujo actual (LLM + verificación Tanzil + broadcast)
```

Lo único que cambia es la *fuente* del texto: todo el pipeline posterior
(clasificación, verificación coránica, traducción por idioma, WebSocket)
ya está construido y no se toca. Si la latencia por chunks resultara molesta
en la prueba de campo, reevaluar la opción 2.

## Pendiente para decidir

- [ ] Prueba de campo del modo transmisor actual un viernes (¿es suficiente
      Web Speech API con el móvil pegado al altavoz?).
- [ ] Verificar precios y disponibilidad actuales de Workers AI.
- [ ] Probar whisper-large-v3-turbo con audio real de jutba (urdu + árabe).
