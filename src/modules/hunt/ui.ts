/**
 * La búsqueda de las 20 pistas, en la pantalla.
 *
 * No toca ningún módulo: escucha los clics de todo el documento y los
 * traduce a señales con SIGNALS. Así la búsqueda puede cambiar sin que la
 * pestaña de la qibla o la de comida sepan que existe.
 */
import { getLang } from '../../i18n';
import { isNative } from '../../backend';
import { unlockTheme } from '../appearance';
import { INITIAL, parseState, reduce, type HuntEvent, type HuntState } from './engine';
import { STEPS, TEXT, type HuntLang, type Signal } from './steps';

const STATE_KEY = 'hk-hunt';
const TOLD_KEY = 'hk-hunt-told';

/** Selector → señal. Se usa el primero que coincide subiendo desde el clic. */
const SIGNALS: Array<[string, (el: Element) => Signal]> = [
  ['.brand', () => 'logo'],
  ['.tabbar [data-tab]', (el) => `tab:${(el as HTMLElement).dataset.tab}`],
  ['.qibla-card', () => 'qibla-degrees'],
  ['.mihrab-card', () => 'mihrab'],
  ['.week-card > summary', () => 'week'],
  ['.salat-settings > summary', () => 'settings'],
  ['.show-map', () => 'show-map'],
  ['.chip[data-example]', () => 'food-example'],
  ['[data-mode="phrases"]', () => 'phrases'],
  ['.phrase-item', () => 'phrase'],
  ['#tasbih-tap', () => 'tasbih'],
  ['#btn-appearance', () => 'appearance'],
  ['[data-theme-option]', () => 'theme'],
];

function lang(): HuntLang {
  const l = getLang();
  return l === 'es' || l === 'ar' || l === 'ja' ? l : 'en';
}

function tr(text: Partial<Record<HuntLang, string>> & { en: string }): string {
  return text[lang()] ?? text.en;
}

function load(): HuntState {
  try {
    return parseState(localStorage.getItem(STATE_KEY));
  } catch {
    return INITIAL;
  }
}

function save(s: HuntState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ step: s.step, count: s.count }));
  } catch {
    /* sin almacenamiento la búsqueda dura lo que dure la sesión */
  }
}

let state: HuntState = INITIAL;

export function signalFor(target: EventTarget | null): Signal | null {
  if (!(target instanceof Element)) return null;
  for (const [selector, toSignal] of SIGNALS) {
    const el = target.closest(selector);
    if (el) return toSignal(el);
  }
  return null;
}

/** Aplica una señal y pinta lo que toque. Exportada para las pruebas. */
export function emit(signal: Signal): HuntEvent {
  const { state: next, event } = reduce(state, signal, Date.now());
  state = next;
  if (event.kind !== 'none') save(state);
  show(event);
  return event;
}

function show(event: HuntEvent): void {
  switch (event.kind) {
    case 'started':
      buzz();
      return toast(`🗝️ ${tr(TEXT.intro)}`, clueLine(0));
    case 'advanced':
      buzz();
      return toast(`✅ ${event.solved}/${STEPS.length}`, clueLine(event.solved));
    case 'reminder':
      return toast('', clueLine(state.step));
    case 'progress':
      // Solo cada 11 cuentas, para no tapar el contador a cada toque.
      if (event.remaining % 11 === 0) toast('', `${event.done}/${event.done + event.remaining}`);
      return;
    case 'finished':
      unlockTheme('kiswah');
      buzz();
      return toast('🕋', tr(TEXT.done), true);
    default:
  }
}

function clueLine(step: number): string {
  return `${tr(TEXT.clue)} ${step + 1}/${STEPS.length} · ${tr(STEPS[step].clue)}`;
}

function toast(title: string, body: string, finale = false): void {
  document.querySelector('.hunt-toast')?.remove();
  const box = document.createElement('div');
  box.className = `hunt-toast${finale ? ' finale' : ''}`;
  box.setAttribute('role', 'status');
  box.dir = lang() === 'ar' ? 'rtl' : 'ltr';
  box.lang = lang();
  // textContent y no innerHTML: el texto es nuestro, pero así no hay duda.
  if (title) {
    const h = document.createElement('strong');
    h.textContent = title;
    box.appendChild(h);
  }
  const p = document.createElement('p');
  p.textContent = body;
  box.appendChild(p);

  const actions = document.createElement('div');
  actions.className = 'hunt-actions';
  if (finale && !told()) {
    const tell = document.createElement('button');
    tell.className = 'btn';
    tell.type = 'button';
    tell.textContent = tr(TEXT.tell);
    tell.addEventListener('click', () => void tellCreator(tell));
    actions.appendChild(tell);
  }
  const close = document.createElement('button');
  close.className = 'btn ghost';
  close.type = 'button';
  close.textContent = tr(TEXT.close);
  close.addEventListener('click', () => box.remove());
  actions.appendChild(close);
  box.appendChild(actions);

  document.body.appendChild(box);
}

function told(): boolean {
  try {
    return localStorage.getItem(TOLD_KEY) === '1';
  } catch {
    return false;
  }
}

/** Opcional y sin datos: solo que alguien llegó al final. */
async function tellCreator(btn: HTMLButtonElement): Promise<void> {
  btn.disabled = true;
  const { submitFeedback } = await import('../guide/feedback');
  const result = await submitFeedback({
    kind: 'other',
    message: '🏆 Alguien ha completado la búsqueda de las 20 pistas.',
    lang: getLang(),
    tab: 'guide',
  });
  if (result === 'rejected') {
    btn.disabled = false;
    return;
  }
  try {
    localStorage.setItem(TOLD_KEY, '1');
  } catch {
    /* no pasa nada */
  }
  btn.textContent = tr(TEXT.told);
}

function buzz(): void {
  if (isNative()) {
    void import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Medium }))
      .catch(() => undefined);
  } else {
    navigator.vibrate?.(30);
  }
}

/** Se llama una vez al arrancar. Captura: antes de que un repintado quite el botón. */
export function installHunt(): void {
  state = load();
  document.addEventListener(
    'click',
    (ev) => {
      if ((ev.target as Element | null)?.closest?.('.hunt-toast')) return;
      const signal = signalFor(ev.target);
      if (signal) emit(signal);
    },
    true,
  );
  document.addEventListener(
    'input',
    (ev) => {
      const el = ev.target as HTMLInputElement | null;
      if (el?.id === 'place-q') emit(`search:${el.value.trim().toLowerCase()}`);
    },
    true,
  );
  document.addEventListener(
    'change',
    (ev) => {
      if ((ev.target as HTMLElement | null)?.id === 'sel-target') emit('khutbah-lang');
    },
    true,
  );
}
