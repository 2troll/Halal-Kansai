// Uso: npm run build && npx vite preview --port 4179 &
//      Chrome headless con --remote-debugging-port=9333, y luego: node scripts/barrido-pantallas.mjs
// Sin salida (solo «fin») = sin fallos.
// Barrido: 19 idiomas × 2 anchos × 6 pestañas. Errores de consola, desbordes,
// textos recortados, elementos tapados por la barra y tiempos de pestaña.
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const p = new Map(); const errors = [];
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data); p.get(d.id)?.(d);
  if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text).split('\n')[0]);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('ERR ' + d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 160));
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !/tile|openstreetmap|fonts\.g/.test(d.params.entry.url ?? '')) errors.push('LOG ' + d.params.entry.text.slice(0, 120) + ' ' + (d.params.entry.url ?? ''));
});
const send = (method, params = {}) => new Promise((res) => { const i = ++id; p.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (e) => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send('Runtime.enable'); await send('Log.enable');
const LANGS = ['en','ja','ar','id','ur','bn','ms','tr','ne','vi','zh','ko','fil','pt','th','my','si','hi','es'];
const TABS = ['salat','qibla','places','food','khutbah','guide'];
const issues = new Map();
const add = (k, v) => { if (!issues.has(k)) issues.set(k, new Set()); issues.get(k).add(v); };
const SCAN = (W) => `(() => {
  const out = [];
  const pane = document.querySelector('.pane:not([hidden])');
  const vis = (e) => { const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && !e.closest('[hidden]'); };
  // En SVG, className es un SVGAnimatedString (salía «[object SVGAnimatedString]»).
  const clase = (e) => String(e.getAttribute('class') ?? '');
  for (const e of document.querySelectorAll('#app *')) {
    if (!vis(e) || e.closest('#map, .week-scroll, .chip-row, .filters, .leaflet-container')) continue;
    const r = e.getBoundingClientRect();
    if (r.width && (r.right > ${W} + 1 || r.left < -1)) out.push('DESBORDA ' + e.tagName + '.' + clase(e).slice(0,40));
    const s = getComputedStyle(e);
    // scrollWidth/clientWidth son de caja HTML. En SVG no significan nada: en
    // RTL Chrome devuelve un scrollWidth inflado para <text> y salían los
    // cardinales N/S/E/W de la brújula como «recortados» sin estarlo (se
    // midió: no se salen de la esfera y ocupan lo mismo que en inglés).
    // Para SVG el recorte de verdad es salirse de la caja del <svg>.
    if (e.ownerSVGElement) {
      const svg = e.ownerSVGElement.getBoundingClientRect();
      if (r.width && (r.left < svg.left - 0.5 || r.right > svg.right + 0.5 || r.top < svg.top - 0.5 || r.bottom > svg.bottom + 0.5))
        out.push('CORTADO(svg) ' + e.tagName + '.' + clase(e).slice(0,30) + ' «' + (e.textContent ?? '').trim().slice(0,30) + '»');
      continue;
    }
    if (e.children.length === 0 && e.textContent.trim() && (s.overflow === 'hidden' || s.textOverflow === 'ellipsis' || s.whiteSpace === 'nowrap') && e.scrollWidth > e.clientWidth + 2 && !e.closest('select, .place-card h3, .nearest-body')) out.push('CORTADO ' + e.tagName + '.' + clase(e).slice(0,30) + ' «' + e.textContent.trim().slice(0,30) + '»');
  }
  // Botones más pequeños de 40px (difíciles de tocar)
  for (const b of pane?.querySelectorAll('button, a.btn, select') ?? []) {
    if (!vis(b)) continue; const r = b.getBoundingClientRect();
    if (r.width && r.height < 36) out.push('PEQUEÑO ' + b.tagName + '.' + clase(b).slice(0,30) + ' ' + Math.round(r.height) + 'px');
  }
  return out;
})()`;
for (const W of [360, 411]) {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: W === 360 ? 640 : 911, deviceScaleFactor: 1, mobile: true });
  for (const lang of LANGS) {
    await send('Page.navigate', { url: 'http://localhost:4179/' }); await sleep(700);
    await js(`localStorage.clear(); localStorage.setItem('hk-lang','${lang}'); localStorage.setItem('hk-welcomed','1'); location.reload(); true`); await sleep(1500);
    for (const tab of TABS) {
      const ms = await js(`(async () => { const t0 = performance.now(); document.querySelector('.tabbar [data-tab=${tab}]').click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return Math.round(performance.now() - t0); })()`);
      if (ms > 120) add(`LENTO ${tab}`, `${lang}@${W}: ${ms}ms`);
      await sleep(tab === 'places' ? 900 : 250);
      for (const f of (await js(SCAN(W))) ?? []) add(`${tab}: ${f}`, `${lang}@${W}`);
    }
    for (const e of errors.splice(0)) add(e, `${lang}@${W}`);
  }
}
for (const [k, v] of [...issues].sort()) console.log(k, '→', [...v].slice(0, 8).join(' '), v.size > 8 ? `(+${v.size - 8})` : '');
ws.close();
