import { beforeEach, describe, expect, it, vi } from 'vitest';

const scheduled = vi.hoisted(() => [] as Array<{ id: number; title: string; body: string; schedule: { at: Date } }>);

vi.mock('../src/backend', () => ({ isNative: () => true }));
vi.mock('../src/i18n', () => ({ t: (k: string) => (k === 'jumuahReminderBody' ? 'Mezquita más cercana:' : k) }));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: async () => ({ display: 'granted' }),
    getPending: async () => ({ notifications: [] }),
    cancel: async () => {},
    schedule: async ({ notifications }: { notifications: typeof scheduled }) => void scheduled.push(...notifications),
  },
}));

import { schedulePrayerNotifications } from '../src/native';

const TIMES = { fajr: 4.3, sunrise: 5.7, dhuhr: 11.9, asr: 15.3, maghrib: 18, isha: 19.3 };

beforeEach(() => {
  scheduled.length = 0;
  const m = new Map([['hk-notify-prayers', '1']]);
  vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: () => {} });
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 17, 6, 0)); // jueves 17/09/2026
});

describe('aviso del jumu‘ah', () => {
  it('el viernes avisa 45 min antes del dhuhr con la mezquita más cercana', async () => {
    const days = [0, 1, 2].map((i) => ({ date: new Date(2026, 8, 17 + i), times: TIMES }));
    await schedulePrayerNotifications(days, 'Osaka Masjid');
    const fridays = scheduled.filter((n) => n.title === 'jumuahReminderTitle');
    expect(fridays).toHaveLength(1);
    const at = fridays[0]!.schedule.at;
    expect(at.getDay()).toBe(5);
    expect(at.getHours() * 60 + at.getMinutes()).toBe(Math.round(11.9 * 60) - 45);
    expect(fridays[0]!.body).toBe('Mezquita más cercana: Osaka Masjid');
  });

  it('los ids del aviso no chocan con los de los cinco rezos', async () => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ date: new Date(2026, 8, 17 + i), times: TIMES }));
    await schedulePrayerNotifications(days, 'Osaka Masjid');
    const ids = scheduled.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
