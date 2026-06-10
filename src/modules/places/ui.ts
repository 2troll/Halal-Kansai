import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PLACES, type Place, type PlaceType } from './data';
import { getCoords } from '../salat/ui';
import { t } from '../../i18n';

type Filter = PlaceType | 'all';

let map: L.Map | null = null;
let markers: L.LayerGroup | null = null;
let filter: Filter = 'all';

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
  return filter === 'all' ? PLACES : PLACES.filter((p) => p.type === filter);
}

function renderList(listEl: HTMLElement): void {
  const here = getCoords();
  listEl.innerHTML = filtered()
    .map((p) => {
      const d = distanceKm(here.lat, here.lng, p.lat, p.lng);
      return `
      <article class="place-card" data-id="${p.id}">
        <h3>${TYPE_ICON[p.type]} ${p.name}</h3>
        <div class="meta">
          <span class="badge ${p.type}">${TYPE_LABEL[p.type]()}</span>
          <span>${p.city}</span>
          <span>${d.toFixed(1)} ${t('kmAway')}</span>
          ${p.verified ? '' : `<span class="badge warn">⚠ ${t('unverified')}</span>`}
        </div>
      </article>`;
    })
    .join('');

  listEl.querySelectorAll<HTMLElement>('.place-card').forEach((card) => {
    card.addEventListener('click', () => {
      const p = PLACES.find((x) => x.id === card.dataset.id);
      if (p && map) map.setView([p.lat, p.lng], 15);
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
    filtered().map((p) =>
      L.marker([p.lat, p.lng], { icon: placeIcon(p.type) }).bindPopup(
        `<strong>${TYPE_ICON[p.type]} ${p.name}</strong><br>${p.address ?? p.city}`,
      ),
    ),
  ).addTo(map);
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
