/**
 * Kalender game berbasis aritmetika murni (kalender Gregorian proleptik).
 * Tidak memakai `Date`, jadi hasilnya sama di semua perangkat dan zona waktu.
 *
 * - `Day`: bilangan bulat hari sejak 1970-01-01 (UTC).
 * - `Instant`: bilangan bulat menit sejak 1970-01-01T00:00 UTC.
 * Konversi ke zona waktu lokal dilakukan oleh modul `world`, bukan di sini.
 */
import type { Result } from './result.ts';
import { err, ok } from './result.ts';

declare const dayBrand: unique symbol;
declare const instantBrand: unique symbol;
export type Day = number & { readonly [dayBrand]: true };
export type Instant = number & { readonly [instantBrand]: true };

export const MINUTES_PER_DAY = 1440;
export const MIN_YEAR = 1;
export const MAX_YEAR = 9999;

export interface CivilDate {
  readonly year: number;
  readonly month: number; // 1-12
  readonly day: number; // 1-31
}

export function asDay(n: number): Day {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Day harus bilangan bulat, diterima: ${String(n)}`);
  return n as Day;
}

export function asInstant(n: number): Instant {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Instant harus bilangan bulat, diterima: ${String(n)}`);
  return n as Instant;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Bulan tidak valid: ${String(month)}`);
  }
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1] as number;
}

export function isValidCivilDate(date: CivilDate): boolean {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function civilToDay(date: CivilDate): Day {
  if (!isValidCivilDate(date)) {
    throw new RangeError(`Tanggal tidak valid: ${date.year}-${date.month}-${date.day}`);
  }
  const m = date.month;
  const y = m <= 2 ? date.year - 1 : date.year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + date.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return (era * 146097 + doe - 719468) as Day;
}

export function dayToCivil(day: Day): CivilDate {
  const z = day + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return { year: y, month: m, day: d };
}

/** 0 = Minggu ... 6 = Sabtu. (1970-01-01 adalah hari Kamis.) */
export function weekday(day: Day): number {
  return (((day + 4) % 7) + 7) % 7;
}

export function addDays(day: Day, n: number): Day {
  if (!Number.isSafeInteger(n)) throw new RangeError(`Jumlah hari harus bilangan bulat, diterima: ${String(n)}`);
  return asDay(day + n);
}

export function daysBetween(from: Day, to: Day): number {
  return to - from;
}

export function formatDay(day: Day): string {
  const { year, month, day: d } = dayToCivil(day);
  if (year < MIN_YEAR || year > MAX_YEAR) throw new RangeError(`Tahun di luar jangkauan: ${year}`);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseIsoDay(text: string): Result<Day> {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (m === null) return err('invalid_date_format', `Format tanggal harus YYYY-MM-DD, diterima: ${text}`);
  const date: CivilDate = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (!isValidCivilDate(date)) return err('invalid_date', `Tanggal tidak ada di kalender: ${text}`);
  return ok(civilToDay(date));
}

export function toInstant(day: Day, minuteOfDay = 0): Instant {
  if (!Number.isInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay >= MINUTES_PER_DAY) {
    throw new RangeError(`Menit dalam hari harus 0-${MINUTES_PER_DAY - 1}, diterima: ${String(minuteOfDay)}`);
  }
  return asInstant(day * MINUTES_PER_DAY + minuteOfDay);
}

export function instantDay(instant: Instant): Day {
  return Math.floor(instant / MINUTES_PER_DAY) as Day;
}

export function instantMinuteOfDay(instant: Instant): number {
  return instant - Math.floor(instant / MINUTES_PER_DAY) * MINUTES_PER_DAY;
}
