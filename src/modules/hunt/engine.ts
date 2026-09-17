/**
 * Motor de la búsqueda: una máquina de estados pura, sin DOM ni almacenamiento,
 * para poder probar las 20 pistas de principio a fin sin navegador.
 */
import { STEPS, type Signal, type Step } from './steps';

export interface HuntState {
  /** -1 = sin empezar; 0..19 = pista en curso; STEPS.length = terminada. */
  step: number;
  /** Repeticiones hechas de la pista en curso (para la que pide 33). */
  count: number;
  /** Toques seguidos al logo para empezar, con la hora del primero. */
  taps: number;
  firstTap: number;
}

export type HuntEvent =
  | { kind: 'none' }
  | { kind: 'started' }
  | { kind: 'progress'; done: number; remaining: number }
  | { kind: 'advanced'; solved: number }
  | { kind: 'finished' }
  | { kind: 'reminder' };

export const START_TAPS = 5;
export const START_WINDOW_MS = 4000;

export const INITIAL: HuntState = { step: -1, count: 0, taps: 0, firstTap: 0 };

export function isFinished(s: HuntState, steps: readonly Step[] = STEPS): boolean {
  return s.step >= steps.length;
}

/** Aplica una señal. Devuelve el estado nuevo y qué hay que enseñar. */
export function reduce(
  s: HuntState,
  signal: Signal,
  now: number,
  steps: readonly Step[] = STEPS,
): { state: HuntState; event: HuntEvent } {
  const none = { state: s, event: { kind: 'none' } as HuntEvent };

  // Sin empezar (o ya terminada): solo cuentan los toques rápidos al logo.
  if (s.step < 0 || isFinished(s, steps)) {
    if (signal !== 'logo') return none;
    const fresh = now - s.firstTap > START_WINDOW_MS;
    const taps = fresh ? 1 : s.taps + 1;
    const firstTap = fresh ? now : s.firstTap;
    if (taps < START_TAPS) return { state: { ...s, taps, firstTap }, event: { kind: 'none' } };
    if (isFinished(s, steps)) return { state: { ...s, taps: 0, firstTap: 0 }, event: { kind: 'finished' } };
    return { state: { step: 0, count: 0, taps: 0, firstTap: 0 }, event: { kind: 'started' } };
  }

  const step = steps[s.step];
  if (!step.matches(signal)) {
    // Tocar el logo a mitad de camino vuelve a enseñar la pista en curso.
    return signal === 'logo' ? { state: s, event: { kind: 'reminder' } } : none;
  }

  const count = s.count + 1;
  const times = step.times ?? 1;
  if (count < times) {
    return { state: { ...s, count }, event: { kind: 'progress', done: count, remaining: times - count } };
  }

  const next = s.step + 1;
  const state = { step: next, count: 0, taps: 0, firstTap: 0 };
  return { state, event: next >= steps.length ? { kind: 'finished' } : { kind: 'advanced', solved: next } };
}

/** Lee un estado guardado, sin fiarse de lo que haya en el almacenamiento. */
export function parseState(raw: string | null, steps: readonly Step[] = STEPS): HuntState {
  try {
    const v = JSON.parse(raw ?? '') as Partial<HuntState>;
    const step = Number.isInteger(v.step) ? Math.min(Math.max(v.step!, -1), steps.length) : -1;
    const count = Number.isInteger(v.count) && v.count! >= 0 ? v.count! : 0;
    return { ...INITIAL, step, count };
  } catch {
    return INITIAL;
  }
}
