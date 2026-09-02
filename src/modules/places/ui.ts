import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PLACES, type Place, type PlaceType } from './data';
import { fetchCommunityPlaces, submitSuggestion } from './community';
import { getCoords } from '../salat/ui';
import { t } from '../../i18n';

type Filter = PlaceType | 'all';

let map: L.Map | null = null;
let markers: L.LayerGroup | null = null;
let filter: Filter = 'all';
/** Lugares de fábrica + comunitarios aprobados (se rellena al renderizar). */
let allPlaces: Place[] = [...PLACES];

const TYPE_LABEL: Record<PlaceType, () => string> = {
  mosque: () => t('typeMosque'),
  restaurant: () => t('typeRestaurant'),
  shop: () => t('typeShop'),
};

const TYPE_ICON: Record<PlaceType, string> = {
  mosque: '🕌',
  restaurant: '🍜',
  shop: '🛒',
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

function filtered(): Place[] {
  return filter === 'all' ? allPlaces : allPlaces.filter((p) => p.type === filter);
}

function renderList(listEl: HTMLElement): void {
  const here = getCoords();
  listEl.innerHTML = filtered()
    .map((p) => {
      const distance =
        p.lat !== undefined && p.lng !== undefined
          ? `<span>${distanceKm(here.lat, here.lng, p.lat, p.lng).toFixed(1)} ${t('kmAway')}</span>`
          : '';
      return `
      <article class="place-card" data-id="${p.id}">
        <h3>${TYPE_ICON[p.type]} ${p.name}</h3>
        <div class="meta">
          <span class="badge ${p.type}">${TYPE_LABEL[p.type]()}</span>
          <span>${p.city}</span>
          ${distance}
          ${p.verified ? '' : `<span class="badge warn">⚠ ${t('unverified')}</span>`}
        </div>
      </article>`;
    })
    .join('');

  listEl.querySelectorAll<HTMLElement>('.place-card').forEach((card) => {
    card.addEventListener('click', () => {
      const p = allPlaces.find((x) => x.id === card.dataset.id);
      if (p && map && p.lat !== undefined && p.lng !== undefined) {
        map.setView([p.lat, p.lng], 15);
      }
    });
  });
}

function placeIcon(type: PlaceType): L.DivIcon {
  // divIcon evita el problema clásico de rutas de iconos de Leaflet con bundlers.
  return L.divIcon({
    html: `<span style="font-size:22px;line-height:1">${TYPE_ICON[type]}</span>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 22],
  });
}

function renderMarkers(): void {
  if (!map) return;
  if (markers) markers.remove();
  markers = L.layerGroup(
    filtered()
      .filter((p) => p.lat !== undefined && p.lng !== undefined)
      .map((p) =>
        L.marker([p.lat!, p.lng!], { icon: placeIcon(p.type) }).bindPopup(
          `<strong>${TYPE_ICON[p.type]} ${p.name}</strong><br>${p.address ?? p.city}`,
        ),
      ),
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
          <option value="restaurant">${t('typeRestaurant')}</option>
          <option value="shop">${t('typeShop')}</option>
        </select>
        <input name="city" required maxlength="60" placeholder="${t('city')}" />
        <input name="address" maxlength="200" placeholder="${t('fieldAddress')}" />
        <textarea name="note" maxlength="500" placeholder="${t('fieldNote')}"></textarea>
        <label class="attach">
          <input type="checkbox" name="attach" checked /> 📍 ${t('attachLocation')}
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
    { value: 'restaurant', label: t('filterRestaurant') },
    { value: 'shop', label: t('filterShop') },
  ];

  container.innerHTML = `
    <h2>${t('placesTitle')}</h2>
    <div class="filters" role="group">
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
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
  }).addTo(map);

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
