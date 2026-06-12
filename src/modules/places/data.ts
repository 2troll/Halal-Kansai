export type PlaceType = 'mosque' | 'restaurant' | 'shop';

export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  /** Los lugares comunitarios aprobados pueden venir sin coordenadas:
   *  salen en la lista pero no en el mapa. */
  lat?: number;
  lng?: number;
  city: string;
  address?: string;
  /** false hasta que Luigi verifique coordenadas y datos in situ (pendiente del fundador). */
  verified: boolean;
}

/**
 * 10 lugares iniciales de Kansai. Coordenadas aproximadas:
 * TODAS pendientes de verificación in situ antes del lanzamiento.
 */
export const PLACES: Place[] = [
  {
    id: 'osaka-masjid',
    name: 'Osaka Masjid',
    type: 'mosque',
    lat: 34.7146,
    lng: 135.4534,
    city: 'Osaka',
    address: 'Nishiyodogawa-ku, Osaka',
    verified: false,
  },
  {
    id: 'kobe-mosque',
    name: 'Kobe Muslim Mosque',
    type: 'mosque',
    lat: 34.6983,
    lng: 135.1897,
    city: 'Kobe',
    address: 'Nakayamate-dori, Chuo-ku, Kobe',
    verified: false,
  },
  {
    id: 'kyoto-masjid',
    name: 'Kyoto Masjid (Islamic Cultural Center)',
    type: 'mosque',
    lat: 35.0254,
    lng: 135.7783,
    city: 'Kioto',
    address: 'Kamigyo-ku, Kioto',
    verified: false,
  },
  {
    id: 'ibaraki-mosque',
    name: 'Osaka Ibaraki Mosque',
    type: 'mosque',
    lat: 34.8164,
    lng: 135.5746,
    city: 'Ibaraki',
    address: 'Toyokawa, Ibaraki, Osaka',
    verified: false,
  },
  {
    id: 'alis-kitchen',
    name: "Ali's Kitchen",
    type: 'restaurant',
    lat: 34.6736,
    lng: 135.4993,
    city: 'Osaka',
    address: 'Shinsaibashi, Chuo-ku, Osaka',
    verified: false,
  },
  {
    id: 'naritaya-kyoto',
    name: 'Naritaya Halal Ramen',
    type: 'restaurant',
    lat: 35.0035,
    lng: 135.7765,
    city: 'Kioto',
    address: 'Gion, Higashiyama-ku, Kioto',
    verified: false,
  },
  {
    id: 'ayam-ya-kyoto',
    name: 'AYAM-YA Karasuma',
    type: 'restaurant',
    lat: 34.9899,
    lng: 135.76,
    city: 'Kioto',
    address: 'Shimogyo-ku, Kioto',
    verified: false,
  },
  {
    id: 'nasco-halal',
    name: 'NASCO Halal Food',
    type: 'shop',
    lat: 34.7129,
    lng: 135.4546,
    city: 'Osaka',
    address: 'Nishiyodogawa-ku, Osaka (junto a Osaka Masjid)',
    verified: false,
  },
  {
    id: 'kobe-halal-food',
    name: 'Kobe Halal Food',
    type: 'shop',
    lat: 34.697,
    lng: 135.1912,
    city: 'Kobe',
    address: 'Chuo-ku, Kobe (cerca de la mezquita)',
    verified: false,
  },
  {
    id: 'gtc-halal-kyoto',
    name: 'GTC Halal Shop',
    type: 'shop',
    lat: 35.0023,
    lng: 135.7585,
    city: 'Kioto',
    address: 'Shimogyo-ku, Kioto',
    verified: false,
  },
];
