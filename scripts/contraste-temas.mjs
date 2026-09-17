// Uso: npm run build && npx vite preview --port 4179 &
//      Chrome headless con --remote-debugging-port=9333, y luego: node scripts/contraste-temas.mjs
// Sin salida (solo «fin») = sin fallos.
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const p = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); p.get(d.id)?.(d); });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; p.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 911, deviceScaleFactor: 1, mobile: true });
const SCAN = `(() => {
  const parse = (c) => { const m = c.match(/[\\d.]+/g)?.map(Number) ?? [0,0,0,1]; if (c.startsWith('color(srgb')) return [m[0]*255,m[1]*255,m[2]*255,m[3] ?? 1]; return [m[0],m[1],m[2],m[3] ?? 1]; };
  const lum = ([r,g,b]) => { const f = (v) => { v/=255; return v<=0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4; }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const bgOf = (el) => { const layers = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor); if (cs.backgroundImage !== 'none' && c[3] === 0 && e !== document.body && e !== document.documentElement) return null; if (c[3] > 0) layers.push(c); if (c[3] >= 1) break; }
    let base = parse(getComputedStyle(document.documentElement).getPropertyValue('--night').trim() ? getComputedStyle(document.body).backgroundColor : 'rgb(16,33,29)'); if (base[3] === 0) { const n = getComputedStyle(document.documentElement).getPropertyValue('--night').trim(); const h = n.replace('#',''); base = [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), 1]; }
    for (const l of layers.reverse()) base = [0,1,2].map(i => l[i]*l[3] + base[i]*(1-l[3])); return base; };
  const bad = new Set();
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own || !el.getClientRects().length || el.closest('[hidden], .leaflet-container, option, select')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity < 0.2) continue;
    const bg = bgOf(el); if (!bg) continue;
    const fg = parse(cs.color);
    const a = lum(fg), b = lum(bg), ratio = (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    // opacidad acumulada de los padres (la barra usa opacity)
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const eff = op < 1 ? 1 + (ratio - 1) * op : ratio;
    if (eff < need - 0.05) bad.add(eff.toFixed(2) + '/' + need + ' ' + el.tagName.toLowerCase() + '.' + String(el.className).slice(0,30) + ' «' + el.textContent.trim().slice(0,24) + '»');
  }
  return [...bad];
})()`;
const saved = JSON.stringify([{ id: 'k1', startedAt: '2026-09-18T03:40:00Z', source: 'ar-SA', target: 'es', segments: [{ kind: 'speech', translation: 'Queridos hermanos.', original: 'أيها الإخوة', verified: true }, { kind: 'quran', translation: 'Allah está con los pacientes.', original: 'ان الله مع الصابرين', arabicVerified: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ', reference: '2:153', verified: true, translationSource: 'tanzil' }, { kind: 'quran', translation: 'x', original: 'واعتصموا', verified: false }, { kind: 'hadith', translation: 'Hadiz de prueba.', original: 'حديث', verified: true }] }]);
const STATES = [
  ['salat', `document.querySelector('.tabbar [data-tab=salat]').click(); document.querySelectorAll('[data-pane=salat] details').forEach(d => d.open = true); true`],
  ['qibla', `document.querySelector('.tabbar [data-tab=qibla]').click(); true`],
  ['places', `document.querySelector('.tabbar [data-tab=places]').click(); true`],
  ['food', `document.querySelector('.tabbar [data-tab=food]').click(); [...document.querySelectorAll('.chip[data-example]')].at(-1)?.click(); true`],
  ['khutbah', `document.querySelector('.tabbar [data-tab=khutbah]').click(); document.querySelector('.khutbah-more').open = true; document.querySelector('.history-item')?.click(); true`],
  ['guide', `document.querySelector('.tabbar [data-tab=guide]').click(); document.querySelectorAll('[data-pane=guide] details').forEach(d => d.open = true); true`],
  ['ajustes', `document.querySelector('#btn-appearance').click(); document.querySelectorAll('.settings-section').forEach(d => d.open = true); true`],
];
for (const theme of ['night','paper','sand','indigo','contrast','amoled','sakura','matcha','ramadan','kiswah']) {
  await send('Page.navigate', { url: 'http://localhost:4179/' }); await sleep(800);
  await js(`localStorage.clear(); localStorage.setItem('hk-lang','es'); localStorage.setItem('hk-unlocked-themes','kiswah'); localStorage.setItem('hk-theme','${theme}'); localStorage.setItem('hk-khutbah-history', ${JSON.stringify(saved)}); location.reload(); true`); await sleep(1800);
  // bienvenida y pista
  await js(`[...Array(5)].forEach(() => document.querySelector('.brand').click()); true`); await sleep(300);
  let bad = await js(SCAN); if (bad?.length) console.log(theme, 'bienvenida+pista', JSON.stringify(bad));
  await js(`document.querySelector('.welcome-start')?.click(); document.querySelector('.hunt-toast')?.remove(); true`);
  for (const [name, act] of STATES) {
    await js(act); await sleep(name === 'places' ? 1500 : 500);
    bad = await js(SCAN);
    if (bad?.length) console.log(theme, name, JSON.stringify(bad));
    if (name === 'ajustes') await js(`document.querySelector('.sheet-close')?.click(); true`);
  }
}
console.log('fin'); ws.close();
