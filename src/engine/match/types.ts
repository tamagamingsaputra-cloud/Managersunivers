import type { Rng } from '../core/rng';
import type { Sport } from '../world/types';

/**
 * KONTRAK mesin pertandingan. Belum ada implementasi (tahap 4+).
 * Setiap cabor mengimplementasikan antarmuka ini; hasil pertandingan wajib lahir dari
 * rangkaian kejadian (events), bukan dari skor acak.
 */
export interface MatchEvent {
  /** Waktu dalam unit cabor (menit, set/poin, lap, dll). */
  t: number;
  type: string;
  data: Record<string, unknown>;
}

export interface MatchStepResult<S> {
  state: S;
  events: MatchEvent[];
  finished: boolean;
}

export interface MatchEngine<Setup, S, Decision, Result> {
  readonly sport: Sport;
  init(setup: Setup, rng: Rng): S;
  /** Satu langkah simulasi; `decision` dari manajer manual/delegasi/AI, atau null. */
  step(state: S, decision: Decision | null, rng: Rng): MatchStepResult<S>;
  result(state: S): Result;
}
