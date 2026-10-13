import { IdGenerator } from '../core/ids';
import { Rng } from '../core/rng';
import { MONTHLY_CLOSE, monthlyClose } from '../economy/monthlyClose';
import { EventQueue } from '../time/eventQueue';
import type { Handler, SimContext } from './context';
import { createGameState, type NewGameOptions } from './newGame';
import { LOG_LIMIT, type GameState } from './state';
import { assertValidState } from './validate';

const MAX_ADVANCE_DAYS = 3650;
const MAX_EVENTS_PER_DAY = 10_000;

/**
 * Inti simulasi. Tidak tahu apa pun soal UI, worker, atau penyimpanan.
 * Semua perubahan state terjadi lewat handler kejadian terjadwal -> deterministik untuk seed yang sama.
 */
export class Simulation {
  readonly state: GameState;
  private readonly rng: Rng;
  private readonly ids: IdGenerator;
  private readonly queue: EventQueue;
  private readonly ctx: SimContext;
  private readonly handlers = new Map<string, Handler>();

  /** Memegang `state` by reference; berikan salinan jika pemanggil masih memakainya. */
  constructor(state: GameState) {
    assertValidState(state);
    this.state = state;
    this.rng = new Rng(state.rngState);
    this.ids = new IdGenerator(state.idCounters);
    this.queue = new EventQueue(state.queue);
    this.ctx = {
      state,
      rng: this.rng,
      ids: this.ids,
      queue: this.queue,
      log: (level, text, orgId = null) => {
        state.log.push({ day: state.day, level, text, orgId });
        if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
      },
    };
    this.register(MONTHLY_CLOSE, monthlyClose);
  }

  static create(options: NewGameOptions): Simulation {
    return new Simulation(createGameState(options));
  }

  register(type: string, handler: Handler): void {
    this.handlers.set(type, handler);
  }

  advanceDays(n: number): void {
    if (!Number.isInteger(n) || n < 0 || n > MAX_ADVANCE_DAYS) {
      throw new RangeError(`advanceDays: n harus integer 0..${MAX_ADVANCE_DAYS}`);
    }
    for (let i = 0; i < n; i++) this.stepDay();
  }

  private stepDay(): void {
    this.state.day += 1;
    let processed = 0;
    for (;;) {
      const due = this.queue.popDue(this.state.day);
      if (due.length === 0) break;
      for (const ev of due) {
        if (++processed > MAX_EVENTS_PER_DAY) throw new Error('Terlalu banyak kejadian dalam satu hari (loop?)');
        const handler = this.handlers.get(ev.type);
        if (!handler) throw new Error(`Handler kejadian tidak terdaftar: ${ev.type}`);
        handler(this.ctx, ev);
      }
    }
  }

  /** Salinan state yang aman disimpan/dikirim (rng dan antrean disinkronkan dulu). */
  snapshot(): GameState {
    this.state.rngState = this.rng.state;
    this.state.queue = this.queue.snapshot();
    return structuredClone(this.state);
  }
}
