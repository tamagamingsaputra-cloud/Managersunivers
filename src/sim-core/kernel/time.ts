/** Jam game dan pemroses acara sampai waktu target. */
import type { Instant } from './calendar.ts';
import type { Result } from './result.ts';
import { err, ok } from './result.ts';
import type { ScheduledItem, Scheduler } from './scheduler.ts';

export interface GameClock {
  readonly now: Instant;
  advanceTo(target: Instant): Result<void>;
}

export function createClock(start: Instant): GameClock {
  if (!Number.isSafeInteger(start)) throw new RangeError(`Waktu awal harus bilangan bulat: ${String(start)}`);
  let now = start;
  return {
    get now() {
      return now;
    },
    advanceTo(target) {
      if (!Number.isSafeInteger(target)) return err('invalid_time', `Waktu target harus bilangan bulat: ${String(target)}`);
      if (target < now) return err('time_backwards', 'Jam game tidak boleh mundur', { now, target });
      now = target;
      return ok(undefined);
    },
  };
}

export type RunControl = 'continue' | 'interrupt';

export interface RunOptions {
  /** Pengaman terhadap handler yang terus menjadwalkan acara pada waktu yang sama. Default 1.000.000. */
  readonly maxEvents?: number;
}

export interface RunOutcome {
  /** true jika jam mencapai target; false jika berhenti karena interupsi atau batas acara. */
  readonly reachedTarget: boolean;
  readonly processed: number;
  readonly stoppedAt: Instant;
  readonly reason: 'target' | 'interrupt' | 'max_events';
}

/**
 * Memproses semua acara dengan `at <= target` secara berurutan.
 * Jam maju ke waktu tiap acara sebelum handler dipanggil (tidak pernah mundur: acara yang
 * dijadwalkan di masa lalu dijalankan pada waktu jam saat itu). Handler boleh menjadwalkan acara baru.
 * Jika handler melempar error, error diteruskan; acara tersebut sudah dikeluarkan dari antrean.
 */
export function runUntil<P>(
  scheduler: Scheduler<P>,
  clock: GameClock,
  target: Instant,
  handler: (item: ScheduledItem<P>) => RunControl,
  options: RunOptions = {},
): Result<RunOutcome> {
  if (target < clock.now) return err('time_backwards', 'Target lebih awal dari jam game', { now: clock.now, target });
  const maxEvents = options.maxEvents ?? 1_000_000;
  let processed = 0;

  for (;;) {
    const next = scheduler.peek();
    if (next === undefined || next.at > target) break;
    if (processed >= maxEvents) {
      return ok({ reachedTarget: false, processed, stoppedAt: clock.now, reason: 'max_events' });
    }
    scheduler.pop();
    if (next.at > clock.now) {
      const moved = clock.advanceTo(next.at);
      if (!moved.ok) return moved;
    }
    processed += 1;
    if (handler(next) === 'interrupt') {
      return ok({ reachedTarget: false, processed, stoppedAt: clock.now, reason: 'interrupt' });
    }
  }

  const arrived = clock.advanceTo(target);
  if (!arrived.ok) return arrived;
  return ok({ reachedTarget: true, processed, stoppedAt: clock.now, reason: 'target' });
}
