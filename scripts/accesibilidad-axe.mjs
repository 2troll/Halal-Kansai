// Auditoría de accesibilidad con axe-core (MPL-2.0). Mismo arranque que
// scripts/contraste-temas.mjs. Solo «fin» = sin fallos.
import { readFileSync } from 'node:fs';
const AXE = readFileSync(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const p = new Map();
ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); p.get(d.id)?.(d); });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; p.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send('Emulation.setDeviceMetricsOverride', { width: 411, height: 911, deviceScaleFactor: 1, mobile: true });
const found = new Map();
const saved = JSON.stringify([{ id: 'k1', startedAt: '2026-09-18T03:40:00Z', source: 'ar-SA', target: 'es', segments: [{ kind: 'speech', translation: 'Hola', original: 'مرحبا', verified: true }] }]);
const STATES = [
  ['bienvenida', `true`],
  ['salat', `document.querySelector('.welcome-start')?.click(); document.querySelector('.tabbar [data-tab=salat]').click(); true`],
  ['qibla', `document.querySelector('.tabbar [data-tab=qibla]').click(); true`],
  ['places', `document.querySelector('.tabbar [data-tab=places]').click(); true`],
  ['food', `document.querySelector('.tabbar [data-tab=food]').click(); [...document.querySelectorAll('.chip[data-example]')].at(-1)?.click(); true`],
  ['frases', `document.querySelector('[data-mode=phrases]').click(); true`],
  ['khutbah', `document.querySelector('.tabbar [data-tab=khutbah]').click(); document.querySelector('.khutbah-more').open = true; true`],
  ['historial', `document.querySelector('.history-item')?.click(); true`],
  ['guide', `document.querySelector('.tabbar [data-tab=guide]').click(); document.querySelectorAll('[data-pane=guide] details').forEach(d => d.open = true); true`],
  ['ajustes', `document.querySelector('#btn-appearance').click(); document.querySelectorAll('.settings-section').forEach(d => d.open = true); true`],
];
for (const lang of ['es', 'ar']) {
  await send('Page.navigate', { url: 'http://localhost:4179/' }); await sleep(800);
  await js(`localStorage.clear(); localStorage.setItem('hk-lang','${lang}'); localStorage.setItem('hk-khutbah-history', ${JSON.stringify(saved)}); location.reload(); true`); await sleep(1800);
  await js(AXE + '; true');
  for (const [name, act] of STATES) {
    await js(act); await sleep(name === 'places' ? 1500 : 500);
    const res = await js(`axe.run(document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } }).then(r => r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map(n => n.target.join(' ') + ' :: ' + n.html.slice(0, 90)) })))`);
    for (const v of res ?? []) {
      const k = `${v.impact} ${v.id} — ${v.help}`;
      if (!found.has(k)) found.set(k, new Set());
      v.nodes.forEach((n) => found.get(k).add(`[${lang}/${name}] ${n}`));
    }
  }
}
for (const [k, v] of found) { console.log('\n' + k); [...v].slice(0, 6).forEach((x) => console.log('   ' + x)); }
console.log('\nfin');
ws.close();
