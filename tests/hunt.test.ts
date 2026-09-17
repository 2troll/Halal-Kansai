import { describe, expect, it } from 'vitest';
import { INITIAL, START_TAPS, START_WINDOW_MS, parseState, reduce, type HuntState } from '../src/modules/hunt/engine.ts';
import { STEPS, TEXT } from '../src/modules/hunt/steps.ts';

/** Una acción que resuelve cada pista, en orden: el recorrido de quien juega. */
const SOLUTION = [
  'tab:qibla', 'qibla-degrees', 'tab:salat', 'mihrab', 'week', 'settings', 'tab:places',
  'search:kobe', 'show-map', 'tab:food', 'food-example', 'phrases', 'phrase', 'tab:khutbah',
  'khutbah-lang', 'tab:guide', ...Array(33).fill('tasbih'), 'appearance', 'theme', 'logo',
];

function start(): HuntState {
  let s = INITIAL;
  for (let i = 0; i < START_TAPS; i++) s = reduce(s, 'logo', 1000 + i * 100).state;
  return s;
}

describe('búsqueda de las 20 pistas', () => {
  it('tiene 20 pistas, cada una en inglés, español, árabe y japonés', () => {
    expect(STEPS).toHaveLength(20);
    for (const step of STEPS) {
      for (const l of ['en', 'es', 'ar', 'ja'] as const) expect(step.clue[l]?.length).toBeGreaterThan(10);
    }
    for (const text of Object.values(TEXT)) expect(Object.keys(text).sort()).toEqual(['ar', 'en', 'es', 'ja']);
  });

  it('empieza con cinco toques rápidos al logo, no con cuatro ni con toques lentos', () => {
    let s = INITIAL;
    for (let i = 0; i < START_TAPS - 1; i++) s = reduce(s, 'logo', i).state;
    expect(s.step).toBe(-1);
    let slow = INITIAL;
    for (let i = 0; i < START_TAPS; i++) slow = reduce(slow, 'logo', i * (START_WINDOW_MS / 2)).state;
    expect(slow.step).toBe(-1);
    expect(reduce(s, 'logo', START_TAPS).event.kind).toBe('started');
  });

  it('antes de empezar, nada avanza', () => {
    expect(reduce(INITIAL, 'tab:qibla', 0)).toEqual({ state: INITIAL, event: { kind: 'none' } });
  });

  it('se completa de principio a fin y cada pista lleva a la siguiente', () => {
    let s = start();
    const events: string[] = [];
    for (const signal of SOLUTION) {
      const r = reduce(s, signal, 99_999);
      s = r.state;
      events.push(r.event.kind);
    }
    expect(events.filter((e) => e === 'advanced')).toHaveLength(19);
    expect(events[events.length - 1]).toBe('finished');
    expect(s.step).toBe(20);
  });

  it('una acción equivocada no avanza; el logo recuerda la pista', () => {
    const s = start();
    expect(reduce(s, 'tab:food', 0).state).toBe(s);
    expect(reduce(s, 'logo', 0).event.kind).toBe('reminder');
  });

  it('el tasbih pide 33 toques', () => {
    let s: HuntState = { ...INITIAL, step: 16 };
    for (let i = 0; i < 32; i++) s = reduce(s, 'tasbih', 0).state;
    expect(s.step).toBe(16);
    expect(reduce(s, 'tasbih', 0).state.step).toBe(17);
  });

  it('la búsqueda de Kobe vale en japonés y en árabe', () => {
    for (const q of ['search:神戸', 'search:كوبي', 'search:kobe mosque']) {
      expect(reduce({ ...INITIAL, step: 7 }, q, 0).state.step).toBe(8);
    }
  });

  it('terminada, cinco toques vuelven a enseñar el final', () => {
    let s: HuntState = { ...INITIAL, step: 20 };
    let last = '';
    for (let i = 0; i < START_TAPS; i++) {
      const r = reduce(s, 'logo', i);
      s = r.state;
      last = r.event.kind;
    }
    expect(last).toBe('finished');
  });

  it('no se fía de un estado guardado roto o manipulado', () => {
    expect(parseState(null)).toEqual(INITIAL);
    expect(parseState('{no json')).toEqual(INITIAL);
    expect(parseState('{"step":999,"count":-4}')).toMatchObject({ step: 20, count: 0 });
    expect(parseState('{"step":"5"}').step).toBe(-1);
  });
});
