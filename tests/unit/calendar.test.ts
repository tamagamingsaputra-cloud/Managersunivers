import { describe, expect, it } from 'vitest';
import {
  addDays,
  asDay,
  asInstant,
  civilToDay,
  dayToCivil,
  daysBetween,
  daysInMonth,
  formatDay,
  instantDay,
  instantMinuteOfDay,
  isLeapYear,
  parseIsoDay,
  toInstant,
  weekday,
} from '../../src/sim-core/kernel/index.ts';

describe('calendar', () => {
  it('epoch dan tanggal acuan', () => {
    expect(civilToDay({ year: 1970, month: 1, day: 1 })).toBe(0);
    expect(civilToDay({ year: 1969, month: 12, day: 31 })).toBe(-1);
    expect(civilToDay({ year: 2000, month: 1, day: 1 })).toBe(10957);
    expect(civilToDay({ year: 2000, month: 3, day: 1 })).toBe(11017);
  });

  it('aturan tahun kabisat', () => {
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
  });

  it('menolak tanggal yang tidak ada', () => {
    expect(() => civilToDay({ year: 2023, month: 2, day: 29 })).toThrow(RangeError);
    expect(() => civilToDay({ year: 2026, month: 13, day: 1 })).toThrow(RangeError);
    expect(() => civilToDay({ year: 2026, month: 4, day: 31 })).toThrow(RangeError);
    expect(() => civilToDay({ year: 0, month: 1, day: 1 })).toThrow(RangeError);
    expect(civilToDay({ year: 2024, month: 2, day: 29 })).toBe(19782);
  });

  it('konversi bolak-balik di seluruh rentang tahun 1-9999', () => {
    const first = civilToDay({ year: 1, month: 1, day: 1 });
    const last = civilToDay({ year: 9999, month: 12, day: 31 });
    let count = 0;
    for (let d: number = first; d <= last; d += 37) {
      const civil = dayToCivil(asDay(d));
      expect(civilToDay(civil)).toBe(d);
      count++;
    }
    expect(count).toBeGreaterThan(90000);
    expect(dayToCivil(first)).toEqual({ year: 1, month: 1, day: 1 });
    expect(dayToCivil(last)).toEqual({ year: 9999, month: 12, day: 31 });
  });

  it('hari berurutan menghasilkan tanggal berurutan sepanjang beberapa tahun', () => {
    let prev = dayToCivil(civilToDay({ year: 2023, month: 12, day: 31 }));
    for (let d: number = civilToDay({ year: 2024, month: 1, day: 1 }); d <= civilToDay({ year: 2028, month: 12, day: 31 }); d++) {
      const cur = dayToCivil(asDay(d));
      const nextDay = prev.day + 1;
      const sameMonth = nextDay <= daysInMonth(prev.year, prev.month);
      if (sameMonth) expect(cur).toEqual({ year: prev.year, month: prev.month, day: nextDay });
      else if (prev.month === 12) expect(cur).toEqual({ year: prev.year + 1, month: 1, day: 1 });
      else expect(cur).toEqual({ year: prev.year, month: prev.month + 1, day: 1 });
      prev = cur;
    }
  });

  it('hari dalam pekan', () => {
    expect(weekday(asDay(0))).toBe(4); // Kamis
    expect(weekday(civilToDay({ year: 2000, month: 1, day: 1 }))).toBe(6); // Sabtu
    expect(weekday(civilToDay({ year: 2026, month: 11, day: 13 }))).toBe(5); // Jumat
    expect(weekday(asDay(-1))).toBe(3); // Rabu
  });

  it('addDays dan daysBetween melewati batas bulan dan tahun', () => {
    const d = civilToDay({ year: 2026, month: 12, day: 31 });
    expect(dayToCivil(addDays(d, 1))).toEqual({ year: 2027, month: 1, day: 1 });
    expect(dayToCivil(addDays(d, -365))).toEqual({ year: 2025, month: 12, day: 31 });
    expect(daysBetween(d, addDays(d, 10))).toBe(10);
    expect(() => addDays(d, 0.5)).toThrow(RangeError);
  });

  it('format dan parse ISO', () => {
    const parsed = parseIsoDay('2026-11-13');
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(formatDay(parsed.value)).toBe('2026-11-13');
    expect(formatDay(asDay(0))).toBe('1970-01-01');
    for (const bad of ['2026-13-01', '2026-02-30', 'abc', '2026-1-1', '', '2026-11-13T00:00']) {
      const r = parseIsoDay(bad);
      expect(r.ok).toBe(false);
    }
    const bad = parseIsoDay('2026-02-30');
    if (!bad.ok) expect(bad.error.code).toBe('invalid_date');
    const worse = parseIsoDay('x');
    if (!worse.ok) expect(worse.error.code).toBe('invalid_date_format');
  });

  it('instant: komposisi dan dekomposisi, termasuk nilai negatif', () => {
    const day = civilToDay({ year: 2026, month: 11, day: 13 });
    const i = toInstant(day, 90);
    expect(instantDay(i)).toBe(day);
    expect(instantMinuteOfDay(i)).toBe(90);
    const neg = toInstant(asDay(-1), 1439);
    expect(instantDay(neg)).toBe(-1);
    expect(instantMinuteOfDay(neg)).toBe(1439);
    expect(neg).toBe(-1);
    expect(instantDay(asInstant(0))).toBe(0);
    expect(() => toInstant(day, 1440)).toThrow(RangeError);
    expect(() => toInstant(day, -1)).toThrow(RangeError);
    expect(() => asInstant(1.5)).toThrow(RangeError);
  });
});
