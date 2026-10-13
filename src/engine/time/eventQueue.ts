import type { GameDay } from './calendar';

export interface ScheduledEvent<P = unknown> {
  seq: number;
  day: GameDay;
  type: string;
  payload: P;
}

export interface QueueSnapshot {
  nextSeq: number;
  events: ScheduledEvent[];
}

/**
 * Antrean kejadian terjadwal, terurut (day, seq). Kejadian di hari yang sama diproses FIFO.
 * Implementasi: array terurut + pencarian biner. Cukup untuk ribuan kejadian;
 * ganti ke heap bila profil performa menuntut (antarmuka tidak berubah).
 */
export class EventQueue {
  private events: ScheduledEvent[];
  private nextSeq: number;

  constructor(snapshot?: QueueSnapshot) {
    this.events = snapshot ? snapshot.events.map((e) => ({ ...e })) : [];
    this.nextSeq = snapshot ? snapshot.nextSeq : 1;
  }

  get size(): number {
    return this.events.length;
  }

  schedule<P = unknown>(day: GameDay, type: string, payload: P = {} as P): ScheduledEvent<P> {
    const ev: ScheduledEvent<P> = { seq: this.nextSeq++, day, type, payload };
    // upper bound: indeks pertama dengan day > ev.day
    let lo = 0;
    let hi = this.events.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((this.events[mid] as ScheduledEvent).day <= day) lo = mid + 1;
      else hi = mid;
    }
    this.events.splice(lo, 0, ev);
    return ev;
  }

  peekDay(): GameDay | null {
    const first = this.events[0];
    return first ? first.day : null;
  }

  /** Ambil (dan hapus) semua kejadian dengan day <= `day`, sesuai urutan. */
  popDue(day: GameDay): ScheduledEvent[] {
    let k = 0;
    while (k < this.events.length && (this.events[k] as ScheduledEvent).day <= day) k++;
    return this.events.splice(0, k);
  }

  snapshot(): QueueSnapshot {
    return { nextSeq: this.nextSeq, events: this.events.map((e) => ({ ...e })) };
  }
}
