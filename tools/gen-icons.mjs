/**
 * Genera los iconos PNG de la PWA (192, 512 y maskable 512) sin dependencias:
 * rasteriza el arco mihrab de la marca y codifica PNG con node:zlib.
 * Uso: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons');

const NIGHT = [0x10, 0x21, 0x1d, 255];
const EMERALD = [0x1d, 0x6a, 0x55, 255];
const GOLD = [0xc9, 0xa2, 0x4b, 255];
const PAPER = [0xf6, 0xf1, 0xe6, 255];

/** ¿(x,y) dentro de un arco mihrab (rectángulo + media circunferencia)? */
function inArch(x, y, cx, halfW, topCy, baseY) {
  if (y > baseY) return false;
  if (Math.abs(x - cx) > halfW) return false;
  if (y >= topCy) return true;
  return (x - cx) ** 2 + (y - topCy) ** 2 <= halfW ** 2;
}

function inCircle(x, y, cx, cy, r) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
}

function inRoundedRect(x, y, size, radius) {
  const r = radius;
  const lx = Math.max(r - x, x - (size - r), 0);
  const ly = Math.max(r - y, y - (size - r), 0);
  return lx * lx + ly * ly <= r * r;
}

/** Color del diseño en coordenadas 0–512 (escala interna fija). */
function colorAt(x, y, maskable) {
  const s = maskable ? 0.78 : 1; // zona segura maskable
  const tx = 256 + (x - 256) / s;
  const ty = 256 + (y - 256) / s;

  if (inCircle(tx, ty, 256, 252, 26)) return GOLD;
  if (inArch(tx, ty, 256, 78, 280, 428)) return PAPER;
  if (inArch(tx, ty, 256, 115, 262, 422)) return EMERALD;
  if (inArch(tx, ty, 256, 129, 262, 436)) return GOLD;

  if (maskable) return NIGHT; // fondo a sangre completa
  return inRoundedRect(x, y, 512, 96) ? NIGHT : [0, 0, 0, 0];
}

/** Render con sobremuestreo 2× para suavizar bordes. */
function render(size, maskable) {
  const px = new Uint8Array(size * size * 4);
  const scale = 512 / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const c = colorAt((x + dx) * scale, (y + dy) * scale, maskable);
        r += c[0]; g += c[1]; b += c[2]; a += c[3];
      }
      const i = (y * size + x) * 4;
      px[i] = r / 4; px[i + 1] = g / 4; px[i + 2] = b / 4; px[i + 3] = a / 4;
    }
  }
  return px;
}

// --- Codificador PNG mínimo (RGBA8) ---

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(pixels, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 6; // RGBA
  // filas con byte de filtro 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [file, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
]) {
  writeFileSync(join(OUT_DIR, file), encodePNG(render(size, maskable), size));
  console.log(`✓ ${file}`);
}
