/**
 * Panel de moderación de lugares sugeridos (/admin.html).
 * Herramienta interna del fundador: solo en castellano, protegida por el
 * token Bearer del backend (ADMIN_TOKEN). El token se guarda en
 * sessionStorage: se pide una vez por sesión de navegador.
 */
import './styles/main.css';

interface Suggestion {
  id: string;
  name: string;
  type: string;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  note?: string;
  status: string;
  createdAt: string;
}

const root = document.getElementById('admin')!;

function getToken(): string | null {
  return sessionStorage.getItem('hk-admin-token');
}

function renderLogin(message = ''): void {
  root.innerHTML = `
    <main style="max-width:420px;margin:4rem auto;padding:0 1rem">
      <h2>Moderación · Halal Kansai</h2>
      <form id="login" class="suggest-form">
        <input type="password" name="token" placeholder="Token de administración" required />
        <button class="btn" type="submit">Entrar</button>
        <p class="note">${message}</p>
      </form>
    </main>`;
  root.querySelector<HTMLFormElement>('#login')!.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const token = String(new FormData(ev.target as HTMLFormElement).get('token') ?? '');
    sessionStorage.setItem('hk-admin-token', token);
    void renderQueue();
  });
}

async function moderate(id: string, action: 'approve' | 'reject'): Promise<void> {
  await fetch(`/api/admin/suggestions/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ action }),
  });
  await renderQueue();
}

async function renderQueue(): Promise<void> {
  const res = await fetch('/api/admin/suggestions?status=pending', {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 401) {
    sessionStorage.removeItem('hk-admin-token');
    renderLogin('Token incorrecto.');
    return;
  }
  if (!res.ok) {
    renderLogin(`Backend no disponible (HTTP ${res.status}).`);
    return;
  }
  const { suggestions } = (await res.json()) as { suggestions: Suggestion[] };

  root.innerHTML = `
    <main style="max-width:560px;margin:2rem auto;padding:0 1rem">
      <h2>Sugerencias pendientes (${suggestions.length})</h2>
      <div id="queue" class="transcript"></div>
    </main>`;

  const queue = root.querySelector<HTMLElement>('#queue')!;
  if (suggestions.length === 0) {
    queue.innerHTML = '<p class="note">No hay sugerencias pendientes. 🎉</p>';
    return;
  }

  for (const s of suggestions) {
    const card = document.createElement('div');
    card.className = 'bubble';
    const maps =
      s.lat !== undefined
        ? `<a href="https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=17/${s.lat}/${s.lng}" target="_blank" rel="noopener">mapa</a>`
        : 'sin coordenadas';
    card.innerHTML = `
      <strong>${s.name}</strong> · ${s.type} · ${s.city}<br>
      <span class="orig">${s.address ?? ''} ${s.note ? `— «${s.note}»` : ''} (${maps})</span><br>
      <button class="btn" data-action="approve">✅ Aprobar</button>
      <button class="btn stop" data-action="reject">✖ Rechazar</button>`;
    card.querySelectorAll<HTMLButtonElement>('button').forEach((btn) =>
      btn.addEventListener('click', () => void moderate(s.id, btn.dataset.action as 'approve' | 'reject')),
    );
    queue.appendChild(card);
  }
}

if (getToken()) {
  void renderQueue();
} else {
  renderLogin();
}
