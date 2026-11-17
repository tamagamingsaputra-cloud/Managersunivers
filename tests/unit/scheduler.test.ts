import { describe, expect, it } from 'vitest';
import {
  asInstant,
  createClock,
  createScheduler,
  runUntil,
  type ScheduledItem,
  type Scheduler,
} from '../../src/sim-core/kernel/index.ts';

const t = (n: number) => asInstant(n);

function drain<P>(s: Scheduler<P>): ScheduledItem<P>[] {
  const out: ScheduledItem<P>[] = [];
  for (let item = s.pop(); item !== undefined; item = s.pop()) out.push(item);
  return out;
}

describe('scheduler', () => {
  it('mengurutkan berdasarkan waktu, prioritas, lalu urutan masuk', () => {
    const s = createScheduler<string>();
    s.schedule({ at: t(10), type: 'x', payload: 'c' });
    s.schedule({ at: t(5), type: 'x', payload: 'a' });
    s.schedule({ at: t(10), priority: -1, type: 'x', payload: 'b' });
    s.schedule({ at: t(10), type: 'x', payload: 'd' });
    expect(drain(s).map((i) => i.payload)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('cancel mencegah pengiriman dan mengembalikan false jika tidak ada', () => {
    const s = createScheduler<string>();
    const a = s.schedule({ at: t(1), type: 'x', payload: 'a' });
    s.schedule({ at: t(2), type: 'x', payload: 'b' });
    expect(s.size).toBe(2);
    expect(s.cancel(a.id)).toBe(true);
    expect(s.cancel(a.id)).toBe(false);
    expect(s.cancel(999)).toBe(false);
    expect(s.size).toBe(1);
    expect(s.peek()?.payload).toBe('b');
    expect(drain(s).map((i) => i.payload)).toEqual(['b']);
  });

  it('acara yang sudah dikirim tidak bisa dibatalkan', () => {
    const s = createScheduler<string>();
    const a = s.schedule({ at: t(1), type: 'x', payload: 'a' });
    s.pop();
    expect(s.cancel(a.id)).toBe(false);
  });

  it('snapshot terurut, dan restore menghasilkan urutan serta ID lanjutan yang sama', () => {
    const s = createScheduler<number>();
    for (const at of [30, 10, 20, 10]) s.schedule({ at: t(at), type: 'x', payload: at });
    const snap = s.snapshot();
    expect(snap.items.map((i) => i.at)).toEqual([10, 10, 20, 30]);
    const restored = createScheduler<number>(snap);
    expect(restored.size).toBe(4);
    const added = restored.schedule({ at: t(5), type: 'x', payload: 5 });
    expect(added.id).toBe(snap.nextId);
    expect(drain(restored).map((i) => i.at)).toEqual([5, 10, 10, 20, 30]);
  });

  it('snapshot tidak menyertakan acara yang dibatalkan', () => {
    const s = createScheduler<number>();
    const a = s.schedule({ at: t(1), type: 'x', payload: 1 });
    s.schedule({ at: t(2), type: 'x', payload: 2 });
    s.cancel(a.id);
    expect(s.snapshot().items.length).toBe(1);
  });

  it('restore menolak snapshot yang tidak konsisten', () => {
    const item = { id: 3, at: t(1), priority: 0, type: 'x', payload: 0 };
    expect(() => createScheduler({ items: [item, item], nextId: 10 })).toThrow(RangeError);
    expect(() => createScheduler({ items: [item], nextId: 3 })).toThrow(RangeError);
    expect(() => createScheduler({ items: [{ ...item, type: '' }], nextId: 10 })).toThrow(RangeError);
  });

  it('schedule menolak input tidak valid', () => {
    const s = createScheduler<number>();
    expect(() => s.schedule({ at: 1.5 as never, type: 'x', payload: 0 })).toThrow(RangeError);
    expect(() => s.schedule({ at: t(1), type: '', payload: 0 })).toThrow(RangeError);
    expect(() => s.schedule({ at: t(1), priority: Number.NaN, type: 'x', payload: 0 })).toThrow(RangeError);
    expect(s.size).toBe(0);
  });

  it('banyak acara acak tetap keluar terurut', () => {
    const s = createScheduler<number>();
    let seed = 12345;
    const rand = () => {
      seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff;
      return seed;
    };
    for (let i = 0; i < 2000; i++) s.schedule({ at: t(rand() % 500), priority: rand() % 3, type: 'x', payload: i });
    const out = drain(s);
    expect(out.length).toBe(2000);
    for (let i = 1; i < out.length; i++) {
      const p = out[i - 1] as ScheduledItem<number>;
      const c = out[i] as ScheduledItem<number>;
      const ordered = p.at < c.at || (p.at === c.at && (p.priority < c.priority || (p.priority === c.priority && p.id < c.id)));
      expect(ordered).toBe(true);
    }
  });
});

describe('runUntil', () => {
  it('memproses acara sampai target (inklusif) dan memajukan jam ke target', () => {
    const s = createScheduler<string>();
    for (const at of [5, 10, 15, 20]) s.schedule({ at: t(at), type: 'x', payload: String(at) });
    const clock = createClock(t(0));
    const seen: string[] = [];
    const r = runUntil(s, clock, t(15), (i) => {
      seen.push(`${i.payload}@${clock.now}`);
      return 'continue';
    });
    expect(seen).toEqual(['5@5', '10@10', '15@15']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ reachedTarget: true, processed: 3, stoppedAt: 15, reason: 'target' });
    expect(clock.now).toBe(15);
    expect(s.size).toBe(1);
  });

  it('acara baru yang dijadwalkan handler dalam jendela waktu ikut diproses', () => {
    const s = createScheduler<number>();
    s.schedule({ at: t(1), type: 'x', payload: 1 });
    const clock = createClock(t(0));
    const seen: number[] = [];
    runUntil(s, clock, t(10), (i) => {
      seen.push(i.payload);
      if (i.payload < 4) s.schedule({ at: t(i.at + 2), type: 'x', payload: i.payload + 1 });
      return 'continue';
    });
    expect(seen).toEqual([1, 2, 3, 4]);
    expect(clock.now).toBe(10);
  });

  it('interupsi berhenti pada waktu acara, tanpa memajukan jam ke target', () => {
    const s = createScheduler<number>();
    for (const at of [3, 6, 9]) s.schedule({ at: t(at), type: 'x', payload: at });
    const clock = createClock(t(0));
    const r = runUntil(s, clock, t(20), (i) => (i.payload === 6 ? 'interrupt' : 'continue'));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ reachedTarget: false, processed: 2, stoppedAt: 6, reason: 'interrupt' });
    expect(clock.now).toBe(6);
    expect(s.size).toBe(1);
  });

  it('target mundur menghasilkan galat', () => {
    const clock = createClock(t(10));
    const r = runUntil(createScheduler<number>(), clock, t(5), () => 'continue');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('time_backwards');
    expect(clock.now).toBe(10);
  });

  it('acara di masa lalu dijalankan pada waktu jam saat itu, jam tidak mundur', () => {
    const s = createScheduler<number>();
    s.schedule({ at: t(2), type: 'x', payload: 2 });
    const clock = createClock(t(10));
    const seen: number[] = [];
    runUntil(s, clock, t(12), () => {
      seen.push(clock.now);
      return 'continue';
    });
    expect(seen).toEqual([10]);
    expect(clock.now).toBe(12);
  });

  it('batas maxEvents menghentikan handler yang menjadwalkan tanpa akhir', () => {
    const s = createScheduler<number>();
    s.schedule({ at: t(1), type: 'x', payload: 0 });
    const clock = createClock(t(0));
    const r = runUntil(s, clock, t(5), (i) => {
      s.schedule({ at: i.at, type: 'x', payload: i.payload + 1 });
      return 'continue';
    }, { maxEvents: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.reason).toBe('max_events');
      expect(r.value.reachedTarget).toBe(false);
      expect(r.value.processed).toBe(100);
    }
  });

  it('clock.advanceTo menolak mundur dan nilai bukan bilangan bulat', () => {
    const clock = createClock(t(10));
    const back = clock.advanceTo(t(9));
    expect(back.ok).toBe(false);
    const frac = clock.advanceTo(10.5 as never);
    expect(frac.ok).toBe(false);
    expect(clock.advanceTo(t(10)).ok).toBe(true);
  });
});
