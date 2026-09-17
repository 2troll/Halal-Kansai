/**
 * Guardián de los temas: cada combinación de texto y fondo que la app usa de
 * verdad tiene que llegar al 4,5:1 de WCAG AA. Un tema nuevo es copiar quince
 * líneas y cambiar colores; así es muy fácil dejar un gris sobre gris que en
 * el móvil de alguien mayor no se lee. Este test lo impide.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEMES } from '../src/modules/appearance/index.ts';

const css = ['themes.css', 'refined.css', 'modern.css']
  .map((f) => readFileSync(new URL(`../src/styles/${f}`, import.meta.url), 'utf8'))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Variables de un tema, en el orden de la cascada (lo último gana). */
function vars(theme: string, tone: 'light' | 'dark'): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const [, sel, body] of css.matchAll(re)) {
    const selectors = sel.split(',').map((s) => s.trim());
    const applies = selectors.some(
      (s) =>
        s === `[data-theme='${theme}']` ||
        (s === `[data-tone='${tone}']`) ||
        (theme === 'night' && (s === ':root' || s === ':root:not([data-theme])')),
    );
    if (!applies) continue;
    for (const [, k, v] of body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) out[k] = v;
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const LIGHT = new Set(['paper', 'sand', 'sakura', 'matcha']);
const PAIRS: Array<[string, string]> = [
  ['on-surface', 'night'],
  ['on-surface', 'night-soft'],
  ['on-surface-dim', 'night'],
  ['ink', 'paper'],
  ['ink-soft', 'paper'],
];

describe('contraste de los temas', () => {
  for (const theme of THEMES) {
    it(`${theme}: texto legible (≥ 4,5:1)`, () => {
      const v: Record<string, string> = { 'on-accent': '#f6f1e6', ...vars(theme, LIGHT.has(theme) ? 'light' : 'dark') };
      const pairs = [...PAIRS, ['on-accent', 'emerald'] as [string, string]];
      const fails = pairs
        .map(([fg, bg]) => ({ fg, bg, ratio: contrast(v[fg], v[bg]) }))
        .filter((p) => !(p.ratio >= 4.5));
      expect(fails).toEqual([]);
    });
  }
});
