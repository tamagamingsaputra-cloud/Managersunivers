/** Kalender game: hari = jumlah hari sejak 1970-01-01 (UTC). Tanpa jam; satu langkah = satu hari. */

export type GameDay = number;

const MS_PER_DAY = 86_400_000;

export const GAME_START_ISO = '2026-07-01';

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export function dayToISO(day: GameDay): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

export function isoToDay(iso: string): GameDay {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new RangeError(`Format tanggal tidak valid: ${iso}`);
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const day = Math.round(ms / MS_PER_DAY);
  if (dayToISO(day) !== iso) throw new RangeError(`Tanggal tidak ada: ${iso}`);
  return day;
}

export function addDays(day: GameDay, n: number): GameDay {
  return day + n;
}

export function ymd(day: GameDay): { year: number; month: number; date: number } {
  const d = new Date(day * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, date: d.getUTCDate() };
}

/** 0 = Minggu ... 6 = Sabtu. */
export function weekday(day: GameDay): number {
  return new Date(day * MS_PER_DAY).getUTCDay();
}

/** Hari pertama bulan berikutnya (selalu > day). */
export function firstOfNextMonth(day: GameDay): GameDay {
  const d = new Date(day * MS_PER_DAY);
  return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / MS_PER_DAY);
}

export function monthLabel(day: GameDay): string {
  const { year, month } = ymd(day);
  return `${MONTH_NAMES_ID[month - 1]} ${year}`;
}
