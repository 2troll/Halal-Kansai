import { describe, expect, it } from 'vitest';
import { withAppLink } from '../src/ui/share.ts';
import { APP_URL } from '../src/config.ts';

describe('compartir', () => {
  it('añade el enlace de la app una sola vez', () => {
    const once = withAppLink('Horas de rezo\n');
    expect(once).toContain(APP_URL);
    expect(withAppLink(once)).toBe(once);
    expect(APP_URL).toMatch(/^https:\/\//);
  });
});
