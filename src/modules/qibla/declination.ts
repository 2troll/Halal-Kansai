/**
 * Declinación magnética con el World Magnetic Model 2025 (NOAA/BGS).
 *
 * Por qué hace falta. El sensor de Android da el rumbo respecto al NORTE
 * MAGNÉTICO; la qibla se calcula respecto al norte geográfico. En Osaka la
 * diferencia ronda los 8° al oeste, más que el margen de 5° con el que la app
 * da la qibla por buena: con la brújula apuntando bien, decía que no.
 *
 * Coeficientes: WMM2025.COF, dominio público (www.ncei.noaa.gov), válidos
 * 2025–2030. Mismo algoritmo del informe técnico del WMM; comprobado contra
 * los valores de prueba oficiales (tests/declination.test.ts). Funciona sin
 * red y en cualquier país.
 */

const EPOCH = 2025.0;

// [n, m, g, h, dg/dt, dh/dt] en nT y nT/año.
const COEFS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [1, 0, -29351.8, 0.0, 12.0, 0.0],
  [1, 1, -1410.8, 4545.4, 9.7, -21.5],
  [2, 0, -2556.6, 0.0, -11.6, 0.0],
  [2, 1, 2951.1, -3133.6, -5.2, -27.7],
  [2, 2, 1649.3, -815.1, -8.0, -12.1],
  [3, 0, 1361.0, 0.0, -1.3, 0.0],
  [3, 1, -2404.1, -56.6, -4.2, 4.0],
  [3, 2, 1243.8, 237.5, 0.4, -0.3],
  [3, 3, 453.6, -549.5, -15.6, -4.1],
  [4, 0, 895.0, 0.0, -1.6, 0.0],
  [4, 1, 799.5, 278.6, -2.4, -1.1],
  [4, 2, 55.7, -133.9, -6.0, 4.1],
  [4, 3, -281.1, 212.0, 5.6, 1.6],
  [4, 4, 12.1, -375.6, -7.0, -4.4],
  [5, 0, -233.2, 0.0, 0.6, 0.0],
  [5, 1, 368.9, 45.4, 1.4, -0.5],
  [5, 2, 187.2, 220.2, 0.0, 2.2],
  [5, 3, -138.7, -122.9, 0.6, 0.4],
  [5, 4, -142.0, 43.0, 2.2, 1.7],
  [5, 5, 20.9, 106.1, 0.9, 1.9],
  [6, 0, 64.4, 0.0, -0.2, 0.0],
  [6, 1, 63.8, -18.4, -0.4, 0.3],
  [6, 2, 76.9, 16.8, 0.9, -1.6],
  [6, 3, -115.7, 48.8, 1.2, -0.4],
  [6, 4, -40.9, -59.8, -0.9, 0.9],
  [6, 5, 14.9, 10.9, 0.3, 0.7],
  [6, 6, -60.7, 72.7, 0.9, 0.9],
  [7, 0, 79.5, 0.0, -0.0, 0.0],
  [7, 1, -77.0, -48.9, -0.1, 0.6],
  [7, 2, -8.8, -14.4, -0.1, 0.5],
  [7, 3, 59.3, -1.0, 0.5, -0.8],
  [7, 4, 15.8, 23.4, -0.1, 0.0],
  [7, 5, 2.5, -7.4, -0.8, -1.0],
  [7, 6, -11.1, -25.1, -0.8, 0.6],
  [7, 7, 14.2, -2.3, 0.8, -0.2],
  [8, 0, 23.2, 0.0, -0.1, 0.0],
  [8, 1, 10.8, 7.1, 0.2, -0.2],
  [8, 2, -17.5, -12.6, 0.0, 0.5],
  [8, 3, 2.0, 11.4, 0.5, -0.4],
  [8, 4, -21.7, -9.7, -0.1, 0.4],
  [8, 5, 16.9, 12.7, 0.3, -0.5],
  [8, 6, 15.0, 0.7, 0.2, -0.6],
  [8, 7, -16.8, -5.2, -0.0, 0.3],
  [8, 8, 0.9, 3.9, 0.2, 0.2],
  [9, 0, 4.6, 0.0, -0.0, 0.0],
  [9, 1, 7.8, -24.8, -0.1, -0.3],
  [9, 2, 3.0, 12.2, 0.1, 0.3],
  [9, 3, -0.2, 8.3, 0.3, -0.3],
  [9, 4, -2.5, -3.3, -0.3, 0.3],
  [9, 5, -13.1, -5.2, 0.0, 0.2],
  [9, 6, 2.4, 7.2, 0.3, -0.1],
  [9, 7, 8.6, -0.6, -0.1, -0.2],
  [9, 8, -8.7, 0.8, 0.1, 0.4],
  [9, 9, -12.9, 10.0, -0.1, 0.1],
  [10, 0, -1.3, 0.0, 0.1, 0.0],
  [10, 1, -6.4, 3.3, 0.0, 0.0],
  [10, 2, 0.2, 0.0, 0.1, -0.0],
  [10, 3, 2.0, 2.4, 0.1, -0.2],
  [10, 4, -1.0, 5.3, -0.0, 0.1],
  [10, 5, -0.6, -9.1, -0.3, -0.1],
  [10, 6, -0.9, 0.4, 0.0, 0.1],
  [10, 7, 1.5, -4.2, -0.1, 0.0],
  [10, 8, 0.9, -3.8, -0.1, -0.1],
  [10, 9, -2.7, 0.9, -0.0, 0.2],
  [10, 10, -3.9, -9.1, -0.0, -0.0],
  [11, 0, 2.9, 0.0, 0.0, 0.0],
  [11, 1, -1.5, 0.0, -0.0, -0.0],
  [11, 2, -2.5, 2.9, 0.0, 0.1],
  [11, 3, 2.4, -0.6, 0.0, -0.0],
  [11, 4, -0.6, 0.2, 0.0, 0.1],
  [11, 5, -0.1, 0.5, -0.1, -0.0],
  [11, 6, -0.6, -0.3, 0.0, -0.0],
  [11, 7, -0.1, -1.2, -0.0, 0.1],
  [11, 8, 1.1, -1.7, -0.1, -0.0],
  [11, 9, -1.0, -2.9, -0.1, 0.0],
  [11, 10, -0.2, -1.8, -0.1, 0.0],
  [11, 11, 2.6, -2.3, -0.1, 0.0],
  [12, 0, -2.0, 0.0, 0.0, 0.0],
  [12, 1, -0.2, -1.3, 0.0, -0.0],
  [12, 2, 0.3, 0.7, -0.0, 0.0],
  [12, 3, 1.2, 1.0, -0.0, -0.1],
  [12, 4, -1.3, -1.4, -0.0, 0.1],
  [12, 5, 0.6, -0.0, -0.0, -0.0],
  [12, 6, 0.6, 0.6, 0.1, -0.0],
  [12, 7, 0.5, -0.1, -0.0, -0.0],
  [12, 8, -0.1, 0.8, 0.0, 0.0],
  [12, 9, -0.4, 0.1, 0.0, -0.0],
  [12, 10, -0.2, -1.0, -0.1, -0.0],
  [12, 11, -1.3, 0.1, -0.0, 0.0],
  [12, 12, -0.7, 0.2, -0.1, -0.1],
];

const N = 12;
const A = 6371.2; // radio geomagnético de referencia (km)
const WGS84_A = 6378.137;
const WGS84_F = 1 / 298.257223563;

/** Declinación en grados (positiva = norte magnético al ESTE del geográfico). */
export function magneticDeclination(latDeg: number, lngDeg: number, date: Date = new Date(), altKm = 0): number {
  const year = date.getUTCFullYear() + (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / (365.25 * 86400000);
  return declinationAt(latDeg, lngDeg, year, altKm);
}

export function declinationAt(latDeg: number, lngDeg: number, decimalYear: number, altKm = 0): number {
  const dt = decimalYear - EPOCH;
  const rad = Math.PI / 180;
  const lat = latDeg * rad;
  const lng = lngDeg * rad;

  // Geodésica (WGS84) → geocéntrica esférica.
  const e2 = WGS84_F * (2 - WGS84_F);
  const sinLat = Math.sin(lat);
  const rc = WGS84_A / Math.sqrt(1 - e2 * sinLat * sinLat);
  const xp = (rc + altKm) * Math.cos(lat);
  const zp = (rc * (1 - e2) + altKm) * sinLat;
  const r = Math.sqrt(xp * xp + zp * zp);
  const latc = Math.asin(zp / r);

  // Coeficientes a la fecha.
  const g: number[][] = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  const h: number[][] = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  for (const [n, m, gn, hn, gd, hd] of COEFS) {
    g[n]![m] = gn + gd * dt;
    h[n]![m] = hn + hd * dt;
  }

  // Funciones de Gauss P(cos θ) y dP/dθ, con los factores de Schmidt aparte.
  const theta = Math.PI / 2 - latc;
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const P: number[][] = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  const dP: number[][] = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  const S: number[][] = Array.from({ length: N + 1 }, () => new Array(N + 1).fill(0));
  P[0]![0] = 1;
  S[0]![0] = 1;
  for (let n = 1; n <= N; n++) {
    S[n]![0] = (S[n - 1]![0]! * (2 * n - 1)) / n;
    for (let m = 1; m <= n; m++) {
      S[n]![m] = S[n]![m - 1]! * Math.sqrt(((n - m + 1) * (m === 1 ? 2 : 1)) / (n + m));
    }
    for (let m = 0; m <= n; m++) {
      if (m === n) {
        P[n]![m] = st * P[n - 1]![m - 1]!;
        dP[n]![m] = st * dP[n - 1]![m - 1]! + ct * P[n - 1]![m - 1]!;
      } else if (n === 1) {
        P[n]![m] = ct * P[n - 1]![m]!;
        dP[n]![m] = ct * dP[n - 1]![m]! - st * P[n - 1]![m]!;
      } else {
        const K = ((n - 1) * (n - 1) - m * m) / ((2 * n - 1) * (2 * n - 3));
        P[n]![m] = ct * P[n - 1]![m]! - K * P[n - 2]![m]!;
        dP[n]![m] = ct * dP[n - 1]![m]! - st * P[n - 1]![m]! - K * dP[n - 2]![m]!;
      }
    }
  }

  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let n = 1; n <= N; n++) {
    const ar = Math.pow(A / r, n + 2);
    for (let m = 0; m <= n; m++) {
      const cm = Math.cos(m * lng);
      const sm = Math.sin(m * lng);
      const gs = g[n]![m]! * S[n]![m]!;
      const hs = h[n]![m]! * S[n]![m]!;
      const gh = gs * cm + hs * sm;
      X += ar * gh * dP[n]![m]!;
      Y += ar * m * (gs * sm - hs * cm) * P[n]![m]!;
      Z -= ar * (n + 1) * gh * P[n]![m]!;
    }
  }

  Y = st === 0 ? 0 : Y / st;
  // Girar de geocéntrico a geodésico (solo afecta a X y Z; Y es igual).
  const psi = latc - lat;
  const Xg = X * Math.cos(psi) - Z * Math.sin(psi);
  return Math.atan2(Y, Xg) / rad;
}
