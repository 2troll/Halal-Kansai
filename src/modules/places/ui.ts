import L from 'leaflet';
import { searchRank } from './search';
import 'leaflet/dist/leaflet.css';
import { PLACES, type Place, type PlaceType } from './data';
import { fetchCommunityPlaces, submitSuggestion } from './community';
import { getCoords } from '../salat/ui';
import { t } from '../../i18n';
import { icon } from '../../ui/icons';
import { escapeHtml } from '../escape';
import { directionsUrl } from './directions';

type Filter = PlaceType | 'all';

let map: L.Map | null = null;
let markers: L.LayerGroup | null = null;
let filter: Filter = 'all';
/** Lugares de fábrica + comunitarios aprobados (se rellena al renderizar). */
let allPlaces: Place[] = [...PLACES];

const TYPE_LABEL: Record<PlaceType, () => string> = {
  mosque: () => t('typeMosque'),
  prayer: () => t('typePrayer'),
  restaurant: () => t('typeRestaurant'),
  shop: () => t('typeShop'),
};

/** Mismo trazo que la barra de pestañas: la app se ve de una pieza. */
const TYPE_ICON: Record<PlaceType, string> = {
  mosque: icon('salat', 20),
  prayer: icon('prayer', 20),
  restaurant: icon('food', 20),
  shop: icon('places', 20),
};

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Texto de búsqueda actual (nombre, ciudad, dirección o notas). */
let query = '';

/**
 * Lo que toca enseñar: filtro, búsqueda y, sobre todo, lo más cercano
 * primero. Con decenas de lugares en seis prefecturas, una lista en el orden
 * en que se escribieron obligaba a leerla entera para encontrar la mezquita
 * de tu barrio.
 */
function visiblePlaces(): Array<{ place: Place; rank: number; km?: number }> {
  const here = getCoords();
  return allPlaces
    .filter((p) => filter === 'all' || p.type === filter)
    .map((place) => ({ place, rank: searchRank(place, query) }))
    .filter((r): r is { place: Place; rank: number } => r.rank !== null)
    .map(({ place, rank }) => ({
      place,
      rank,
      km:
        place.lat !== undefined && place.lng !== undefined
          ? distanceKm(here.lat, here.lng, place.lat, place.lng)
          : undefined,
    }))
    .sort((a, b) => a.rank - b.rank || (a.km ?? Infinity) - (b.km ?? Infinity));
}

function formatKm(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km));
}

function cardHtml({ place: p, km }: { place: Place; km?: number }): string {
  const hasCoords = p.lat !== undefined && p.lng !== undefined;
  const meta = [escapeHtml(p.city), km !== undefined ? `${formatKm(km)} ${t('kmAway')}` : '']
    .filter(Boolean)
    .join(' · ');
  return `
    <article class="place-card type-${p.type}" data-id="${escapeHtml(p.id)}">
      <div class="place-icon" aria-hidden="true">${TYPE_ICON[p.type]}</div>
      <div class="place-body">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="meta"><span class="badge ${p.type}">${TYPE_LABEL[p.type]()}</span><span>${meta}</span></div>
        ${p.address ? `<p class="place-address">${escapeHtml(p.address)}</p>` : ''}
        ${p.notes ? `<p class="place-notes">${escapeHtml(p.notes)}</p>` : ''}
        ${p.jumuah ? `<p class="place-jumuah">${icon('salat', 15)}${t('jumuah')}: ${escapeHtml(p.jumuah)}</p>` : ''}
        ${p.verified ? '' : `<span class="badge warn">${t('unverified')}</span>`}
        ${
          hasCoords
            ? `<div class="place-actions">
                 <a class="btn directions" href="${directionsUrl(p.lat!, p.lng!)}" target="_blank" rel="noopener">${icon('location', 16)}${t('directions')}</a>
                 <button class="btn ghost show-map" type="button">${icon('map', 16)}${t('showOnMap')}</button>
                 <button class="btn ghost share-place" type="button" aria-label="${t('share')}">${icon('share', 16)}</button>
               </div>`
            : ''
        }
      </div>
    </article>`;
}

function renderList(listEl: HTMLElement): void {
  const items = visiblePlaces();
  listEl.innerHTML = items.length
    ? items.map(cardHtml).join('')
    : `<p class="note empty">${t('noPlacesFound')}</p>`;

  listEl.querySelectorAll<HTMLButtonElement>('.share-place').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest<HTMLElement>('.place-card')?.dataset.id;
      const p = allPlaces.find((x) => x.id === id);
      if (!p) return;
      const { shareText } = await import('../../ui/share');
      const result = await shareText(
        p.name,
        [
          `📍 ${p.name}`,
          p.address ?? p.city,
          p.jumuah ? `${t('jumuah')}: ${p.jumuah}` : '',
          p.lat !== undefined && p.lng !== undefined ? directionsUrl(p.lat, p.lng) : '',
        ]
          .filter(Boolean)
          .join('\n'),
      );
      if (result === 'copied' || result === 'failed') {
        btn.textContent = result === 'copied' ? '✓' : '✕';
        setTimeout(() => (btn.innerHTML = icon('share', 16)), 1800);
      }
    });
  });
  listEl.querySelectorAll<HTMLButtonElement>('.show-map').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest<HTMLElement>('.place-card')?.dataset.id;
      const p = allPlaces.find((x) => x.id === id);
      if (!p || !map || p.lat === undefined || p.lng === undefined) return;
      map.setView([p.lat, p.lng], 16);
      document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      markerById.get(p.id)?.openPopup();
    });
  });
}

/** Marcadores por id, para abrir el globo desde «Ver en el mapa». */
const markerById = new Map<string, L.Marker>();

function placeIcon(type: PlaceType): L.DivIcon {
  // divIcon evita el problema clásico de rutas de iconos de Leaflet con bundlers.
  return L.divIcon({
    html: `<span class="pin type-${type}">${TYPE_ICON[type]}</span>`,
    className: 'pin-wrap',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function renderMarkers(): void {
  if (!map) return;
  if (markers) markers.remove();
  markerById.clear();
  markers = L.layerGroup(
    visiblePlaces()
      .map(({ place: p }) => p)
      .filter((p) => p.lat !== undefined && p.lng !== undefined)
      .map((p) => {
        // Escapado: los lugares de la comunidad vienen del servidor, y un
        // nombre con HTML se ejecutaba en el globo del mapa.
        const marker = L.marker([p.lat!, p.lng!], { icon: placeIcon(p.type), title: p.name, alt: p.name }).bindPopup(
          `<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.address ?? p.city)}<br>
           <a href="${directionsUrl(p.lat!, p.lng!)}" target="_blank" rel="noopener">${t('directions')}</a>`,
        );
        markerById.set(p.id, marker);
        return marker;
      }),
  ).addTo(map);
}

function suggestFormHtml(): string {
  return `
    <details class="suggest" id="suggest-box">
      <summary class="btn">➕ ${t('suggestPlace')}</summary>
      <form id="suggest-form" class="suggest-form">
        <input name="name" required maxlength="120" placeholder="${t('fieldName')}" />
        <select name="type">
          <option value="mosque">${t('typeMosque')}</option>
          <option value="prayer">${t('typePrayer')}</option>
          <option value="restaurant">${t('typeRestaurant')}</option>
          <option value="shop">${t('typeShop')}</option>
        </select>
        <input name="city" required maxlength="60" placeholder="${t('city')}" />
        <input name="address" maxlength="200" placeholder="${t('fieldAddress')}" />
        <textarea name="note" maxlength="500" placeholder="${t('fieldNote')}"></textarea>
        <label class="attach">
          <input type="checkbox" name="attach" checked /> ${icon('location', 17)}${t('attachLocation')}
        </label>
        <button class="btn" type="submit">${t('send')}</button>
        <p class="note" id="suggest-note"></p>
      </form>
    </details>`;
}

function wireSuggestForm(container: HTMLElement): void {
  const form = container.querySelector<HTMLFormElement>('#suggest-form')!;
  const noteEl = container.querySelector<HTMLElement>('#suggest-note')!;

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = new FormData(form);

    const send = (lat?: number, lng?: number) => {
      submitSuggestion({
        name: String(data.get('name') ?? ''),
        type: String(data.get('type')) as PlaceType,
        city: String(data.get('city') ?? ''),
        address: String(data.get('address') ?? '') || undefined,
        note: String(data.get('note') ?? '') || undefined,
        lat,
        lng,
      })
        .then(() => {
          form.reset();
          noteEl.textContent = `✅ ${t('suggestThanks')}`;
        })
        .catch(() => {
          noteEl.textContent = `⚠ ${t('suggestError')}`;
        });
    };

    if (data.get('attach')) {
      navigator.geolocation.getCurrentPosition(
        (pos) => send(pos.coords.latitude, pos.coords.longitude),
        () => send(), // sin ubicación también vale: el moderador la completa
        { timeout: 8000 },
      );
    } else {
      send();
    }
  });
}

/** El mapa se creó con la pestaña oculta: al mostrarla hay que recalcular su tamaño. */
export function refreshMapSize(): void {
  requestAnimationFrame(() => map?.invalidateSize());
}

export function renderPlaces(container: HTMLElement): void {
  // Leaflet no sobrevive a innerHTML: destruir y recrear.
  if (map) {
    map.remove();
    map = null;
    markers = null;
  }

  const filters: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: t('filterAll') },
    { value: 'mosque', label: t('filterMosque') },
    { value: 'prayer', label: t('filterPrayer') },
    { value: 'restaurant', label: t('filterRestaurant') },
    { value: 'shop', label: t('filterShop') },
  ];

  container.innerHTML = `
    <h2>${t('placesTitle')}</h2>
    <label class="place-search">
      ${icon('search', 18)}
      <input type="search" id="place-q" placeholder="${t('searchPlaces')}" value="${escapeHtml(query)}" autocomplete="off" />
    </label>
    <div class="filters chip-row" role="group">
      ${filters
        .map(
          (f) =>
            `<button data-filter="${f.value}" aria-pressed="${String(f.value === filter)}">${f.label}</button>`,
        )
        .join('')}
    </div>
    <div id="map" dir="ltr"></div>
    <div id="place-list"></div>
    ${suggestFormHtml()}
  `;

  const listEl = container.querySelector<HTMLElement>('#place-list')!;

  map = L.map(container.querySelector<HTMLElement>('#map')!, {
    center: [34.75, 135.5],
    zoom: 9,
    attributionControl: true,
  });
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);

  // Sin esto, sin red el mapa era un recuadro vacío y parecía roto. Si en unos
  // segundos no ha llegado ninguna imagen, se dice por qué y que la lista sirve.
  let loaded = 0;
  tiles.on('tileload', () => {
    loaded++;
    container.querySelector('#map-offline')?.remove();
  });
  window.setTimeout(() => {
    if (loaded > 0 || !map || container.querySelector('#map-offline')) return;
    container
      .querySelector('#map')
      ?.insertAdjacentHTML('afterend', `<p class="note map-offline" id="map-offline" role="status">${t('mapOffline')}</p>`);
  }, 8000);

  renderMarkers();
  renderList(listEl);
  wireSuggestForm(container);

  // Lugares comunitarios aprobados: red si hay, caché si no.
  void fetchCommunityPlaces().then((community) => {
    if (community.length === 0) return;
    allPlaces = [...PLACES, ...community.filter((c) => !PLACES.some((p) => p.id === c.id))];
    renderMarkers();
    renderList(listEl);
  });

  let typing: ReturnType<typeof setTimeout> | undefined;
  container.querySelector<HTMLInputElement>('#place-q')!.addEventListener('input', (ev) => {
    clearTimeout(typing);
    typing = setTimeout(() => {
      query = (ev.target as HTMLInputElement).value;
      renderMarkers();
      renderList(listEl);
    }, 150);
  });

  container.querySelectorAll<HTMLButtonElement>('.filters button').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter as Filter;
      container
        .querySelectorAll<HTMLButtonElement>('.filters button')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      renderMarkers();
      renderList(listEl);
    });
  });
}
