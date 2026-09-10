/**
 * Pruebas de humo contra el despliegue REAL.
 *
 * Por qué existe este archivo, que es la lección más cara de este proyecto:
 *
 * En un solo día aparecieron siete fallos, y los siete tenían la misma forma.
 * Ninguno rompía un test. Ninguno rompía la compilación. El lint estaba
 * limpio. Y aun así:
 *
 *   · el código QR de la sala no lo leía ningún lector
 *   · el panel de moderación salía con el texto negro sobre negro
 *   · «sugerir un lugar» devolvía 503 desde que se montó el despliegue
 *   · la sala de transmisión NUNCA había traducido una palabra
 *   · si el transmisor perdía cobertura, nadie se enteraba
 *   · el mensaje de error del proveedor se enseñaba como si fuera la traducción
 *   · el traductor se atascaba repitiendo una frase ochenta veces
 *
 * Los tests unitarios prueban que las piezas funcionan. Esto prueba que el
 * SISTEMA DESPLEGADO hace lo que promete, que es otra cosa. Cada caso de aquí
 * corresponde a un fallo que llegó a producción; están para que no vuelvan.
 *
 *   npm run smoke                     # contra producción
 *   BASE=http://localhost:5173 npm run smoke
 *   ADMIN_TOKEN=... npm run smoke     # incluye el ciclo de moderación
 */

const BASE = process.env.BASE ?? 'https://halal-kansai.2troll-p.workers.dev';
const WS_BASE = BASE.replace(/^http/, 'ws');
const ADMIN = process.env.ADMIN_TOKEN;

/**
 * Workers AI solo existe en el despliegue. Contra un servidor local, las
 * comprobaciones que dependen de él fallarían siempre y por un motivo que no
 * es un fallo: se marcan como «no aplica» para que un rojo signifique
 * siempre algo roto de verdad.
 */
const LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

let passed = 0;
let skipped = 0;
const failures = [];

/**
 * Comprobación que puede fallar por lentitud puntual, no por estar rota.
 *
 * El motor grande compite contra un plazo de 2,5 s: de vez en cuando lo pasa
 * y se usa el de respaldo, que es el comportamiento DISEÑADO. Medido, 4 de 4
 * salieron con el bueno, pero una vez cayó.
 *
 * Se reintenta antes de dar rojo. Así «rojo» sigue significando roto —que es
 * lo único que hace útil a una prueba de humo— y no «hoy iba lento».
 */
async function checkEventually(name, intento, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    const { ok, detail } = await intento();
    if (ok) {
      check(name, true);
      return;
    }
    if (i === intentos - 1) check(name, false, `${detail} (tras ${intentos} intentos)`);
    else await wait(3000);
  }
}

function checkDeployed(name, ok, detail = '') {
  if (LOCAL) {
    skipped++;
    console.log(`  · ${name} (no aplica en local)`);
    return;
  }
  check(name, ok, detail);
}

function check(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

/**
 * Un rojo tiene que decir POR QUÉ. «undefined» no vale: la primera vez que
 * esta suite se puso roja de verdad, el motivo era un 429 de nuestro propio
 * límite de peticiones, y el mensaje no lo decía.
 */
function describe(r) {
  if (r.status === 429) return 'HTTP 429 — límite de peticiones, no un fallo';
  if (r.status !== 200) return `HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 60)}`;
  return r.body.translationSource ?? JSON.stringify(r.body).slice(0, 60);
}

async function translate(text, target, source = 'ar-SA') {
  const res = await fetch(`${BASE}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source, target }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

/** Abre una conexión de sala y recoge lo que llega durante `ms`. */
function room(roomId, role, lang, ms = 2500) {
  return new Promise((resolve) => {
    const events = [];
    const ws = new WebSocket(`${WS_BASE}/api/khutbah/ws?room=${roomId}`);
    ws.addEventListener('open', () =>
      ws.send(
        JSON.stringify({
          type: 'hello',
          role,
          room: roomId,
          lang,
          source: role === 'transmitter' ? 'ar-SA' : undefined,
        }),
      ),
    );
    ws.addEventListener('message', (e) => events.push(JSON.parse(e.data)));
    ws.addEventListener('error', () => events.push({ type: 'error', code: 'connection' }));
    setTimeout(() => resolve({ ws, events }), ms);
  });
}

const rid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────── La app se sirve ──
section('La aplicación');
{
  const res = await fetch(BASE + '/');
  const html = await res.text();
  check('la página carga', res.status === 200, `HTTP ${res.status}`);
  check('trae el bundle de la app', /assets\/main-[\w-]+\.js/.test(html));
  check('sin emojis en la interfaz', !/[\u{1F300}-\u{1FAFF}]/u.test(html));

  const admin = await fetch(BASE + '/admin.html');
  check('el panel de moderación carga', admin.status === 200, `HTTP ${admin.status}`);
}

// ───────────────────────────────── La hoja que revisa la certificadora ──
section('Hoja de revisión de las reglas');
{
  // Este enlace está en un correo enviado a JHCPO pidiéndoles que corrijan
  // los dictámenes. Si un día devuelve 404, o sale sin reglas, se entera
  // primero una organización certificadora — y a través de un correo nuestro.
  const res = await fetch(`${BASE}/revision`, { redirect: 'follow' });
  check('la hoja de revisión responde', res.status === 200, `HTTP ${res.status}`);

  // Es una página que se pinta con JavaScript, así que el HTML no trae las
  // reglas. Y el build parte el código en varios trozos: los textos viven en
  // otro archivo distinto del de la página. Se recorren TODOS los que carga.
  const html = await res.text();
  const chunks = [...html.matchAll(/["'](\/assets\/[\w.-]+\.js)["']/g)].map((m) => m[1]);
  check('la página carga sus bundles', chunks.length > 0, `${chunks.length} archivos`);

  let fuente = '';
  for (const chunk of chunks) {
    const r = await fetch(BASE + chunk);
    if (r.ok) fuente += await r.text();
  }

  // Los tres compromisos que se le enseñan a la certificadora tienen que
  // seguir ahí: son lo que se prometió por escrito.
  check(
    'los tres compromisos siguen en la página',
    fuente.includes('ファトワー') && fuente.includes('お墨付き'),
  );

  // Y las reglas: el correo habla de «las 49», y la numeración que use Kato
  // para corregir depende de que sigan siendo esas.
  // El minificador usa acentos graves para las cadenas, no comillas dobles:
  // el patrón tiene que aceptar los dos o la cuenta sale a cero y el aviso
  // sería falso, que es peor que no comprobar nada.
  const ids = new Set(
    [...fuente.matchAll(/id:\s*["'`]([a-z0-9-]+)["'`]/g)].map((m) => m[1]),
  );
  check('la hoja sigue trayendo las 49 reglas', ids.size >= 49, `${ids.size} encontradas`);

  // El número de reglas se anuncia en el correo («las 49»): si cambia sin que
  // nadie avise, la numeración que use Kato para corregir deja de cuadrar.
  const reglas = await fetch(`${BASE}/`).then((r) => r.text());
  check('la app sigue publicada junto a la hoja', reglas.includes('<div id="app">'));
}

// ───────────────────────────────── La promesa de funcionar sin red ──
section('Funcionar sin conexión');
{
  const sw = await fetch(`${BASE}/sw.js`);
  const src = await sw.text();
  check('el service worker se sirve', sw.status === 200, `HTTP ${sw.status}`);

  // El fallo real: un icono desapareció al regenerarlos, la lista de precarga
  // seguía nombrándolo, y `addAll` —que es todo-o-nada— dejaba la caché VACÍA
  // sin avisar. La app llevaba prometiendo en pantalla que funciona sin
  // conexión mientras no tenía nada guardado.
  const lista = src.match(/const PRECACHE = \[([^\]]+)\]/)?.[1] ?? '';
  const rutas = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  check('la lista de precarga no está vacía', rutas.length > 0);

  const rotas = [];
  for (const ruta of rutas) {
    const r = await fetch(BASE + ruta, { method: 'HEAD' });
    if (!r.ok) rotas.push(`${ruta} → ${r.status}`);
  }
  check('todo lo que se precarga existe', rotas.length === 0, rotas.join(', '));

  // El HTML tiene que apuntar a archivos que existan: un favicon roto es un
  // 404 en cada carga, y fue justo el que tumbó la caché entera.
  const html = await (await fetch(BASE + '/')).text();
  const refs = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|png|svg|webmanifest))"/g)]
    .map((m) => m[1])
    .filter((u) => !u.startsWith('http'));
  const faltan = [];
  for (const ref of refs) {
    const r = await fetch(new URL(ref, BASE + '/').href, { method: 'HEAD' });
    if (!r.ok) faltan.push(`${ref} → ${r.status}`);
  }
  check('el HTML no referencia nada que falte', faltan.length === 0, faltan.join(', '));
}

// ─────────────────────────────────────────────────── Traducción ──
section('Traducción de la jutba');
{
  await checkEventually('una aleya sale de Tanzil, no de un traductor', async () => {
    const r = await translate('الحمد لله رب العالمين', 'es');
    return {
      ok: r.body.translationSource === 'tanzil' && r.body.verified === true,
      detail: describe(r),
    };
  });

  const frase = await translate('اعلموا أن الصلاة عمود الدين', 'es');
  check(
    'una frase normal se traduce de verdad',
    !!frase.body.translation && !frase.body.translation.includes('الصلاة'),
    frase.body.translation?.slice(0, 40),
  );

  if (LOCAL) {
    skipped += 2;
    console.log('  · usa el modelo bueno (no aplica en local)');
    console.log('  · el glosario impone ザカート (no aplica en local)');
  } else {
    await checkEventually('usa el modelo bueno, no el de respaldo', async () => {
      const r = await translate('اعلموا أن الصلاة عمود الدين', 'es');
      return { ok: r.body.translationSource === 'llm', detail: describe(r) };
    });

    await checkEventually('el glosario impone ザカート (y no ヤクザ)', async () => {
      const r = await translate('ومن أدى الزكاة طهر ماله', 'ja');
      const t = r.body.translation ?? '';
      return { ok: /ザカート/.test(t) && !/ヤクザ/.test(t), detail: t.slice(0, 40) };
    });
  }

  // El fallo del «QUERY LENGTH LIMIT EXCEEDED» y el del atasco repetido.
  const largo = await translate('السلام عليكم '.repeat(90), 'es');
  const t = largo.body.translation ?? '';
  check('un texto largo no devuelve el error del proveedor', !/LIMIT EXCEEDED|INVALID LANGUAGE/i.test(t), t.slice(0, 40));
  check(
    'un texto largo no devuelve una frase repetida sin fin',
    !/(.{6,})\1{3,}/.test(t.replace(/\s+/g, ' ')) || t.trim().startsWith('السلام'),
    t.slice(0, 40),
  );

  const vacio = await translate('', 'es');
  check('un texto vacío se rechaza con 400', vacio.status === 400, `HTTP ${vacio.status}`);
}

// ────────────────────────────────────────── La sala de la mezquita ──
section('Sala de transmisión');
{
  const id = rid('smoke');
  const tx = await room(id, 'transmitter', 'ar');
  const rx = await Promise.all([room(id, 'receiver', 'es'), room(id, 'receiver', 'ja')]);
  check('el transmisor entra', tx.events.some((e) => e.type === 'joined'));
  check('los oyentes entran', rx.every((r) => r.events.some((e) => e.type === 'joined')));

  tx.ws.send(JSON.stringify({ type: 'segment', text: 'ومن أدى الزكاة طهر ماله' }));
  await wait(9000);

  const seg = (r) => r.events.filter((e) => e.type === 'segment').at(-1)?.segment;
  const es = seg(rx[0]);
  const ja = seg(rx[1]);
  check('la sala TRADUCE (no reenvía el árabe)', !!es && !/الزكاة/.test(es.translation), es?.translation?.slice(0, 40));
  check('cada oyente lo recibe en SU idioma', !!ja && ja.translation !== es?.translation, ja?.translation?.slice(0, 30));
  if (LOCAL) {
    skipped++;
    console.log('  · la sala usa el modelo bueno (no aplica en local)');
  } else {
    await checkEventually(
      'la sala usa el modelo bueno',
      async () => {
        const otro = rid('smoke');
        const t2 = await room(otro, 'transmitter', 'ar');
        const r2 = await room(otro, 'receiver', 'es');
        t2.ws.send(JSON.stringify({ type: 'segment', text: 'اعلموا أن الصلاة عمود الدين' }));
        await wait(9000);
        const g = r2.events.filter((e) => e.type === 'segment').at(-1)?.segment;
        t2.ws.close();
        r2.ws.close();
        return { ok: g?.translationSource === 'llm', detail: g?.translationSource ?? 'sin segmento' };
      },
      2,
    );
  }

  // Dos transmisores en la misma sala.
  const dup = await room(id, 'transmitter', 'ar');
  check(
    'un segundo transmisor es rechazado',
    dup.events.some((e) => e.type === 'error' && e.code === 'roomTaken'),
  );
  dup.ws.close();

  // El transmisor pierde la cobertura.
  tx.ws.close();
  await wait(2500);
  check(
    'si el transmisor cae, se avisa a los oyentes',
    rx[0].events.some((e) => e.type === 'broadcasterLeft'),
  );
  for (const r of rx) r.ws.close();
}

// ────────────────────────────────────────────── Lugares y comida ──
section('Lugares');
{
  const res = await fetch(`${BASE}/api/places`);
  const body = await res.json().catch(() => null);
  check('el mapa responde', res.status === 200 && Array.isArray(body?.places), `HTTP ${res.status}`);

  const bad = await fetch(`${BASE}/api/places/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'sin ciudad', type: 'shop' }),
  });
  // 400 = el almacén está atado y valida. 503 = el almacén NO está atado,
  // que es exactamente como estuvo roto sin que nadie lo notara.
  check('sugerir un lugar está habilitado', bad.status !== 503, `HTTP ${bad.status}`);

  if (ADMIN) {
    const cola = await fetch(`${BASE}/api/admin/suggestions?status=pending`, {
      headers: { Authorization: `Bearer ${ADMIN}` },
    });
    check('el panel de moderación autentica', cola.status === 200, `HTTP ${cola.status}`);
  } else {
    console.log('  · ciclo de moderación omitido (sin ADMIN_TOKEN)');
  }
}

// ─────────────────────────────────────────────────────── Resumen ──
console.log(
  `\n${passed} comprobaciones pasadas, ${failures.length} fallidas` +
    (skipped > 0 ? `, ${skipped} no aplican aquí` : ''),
);
if (failures.length > 0) {
  console.log('\nFallos:');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
