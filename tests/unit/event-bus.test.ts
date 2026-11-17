import { describe, expect, it } from 'vitest';
import { createEventBus } from '../../src/sim-core/kernel/index.ts';

interface Ev {
  readonly type: 'a' | 'b';
  readonly n: number;
}

describe('event bus', () => {
  it('mengirim ke semua pelanggan sesuai urutan berlangganan', () => {
    const bus = createEventBus<Ev>();
    const log: string[] = [];
    bus.subscribe((e) => log.push(`1:${e.type}${e.n}`));
    bus.subscribe((e) => log.push(`2:${e.type}${e.n}`));
    bus.publish({ type: 'a', n: 1 });
    expect(log).toEqual(['1:a1', '2:a1']);
  });

  it('filter hanya meneruskan event yang cocok', () => {
    const bus = createEventBus<Ev>();
    const seen: number[] = [];
    bus.subscribe((e) => seen.push(e.n), (e) => e.type === 'b');
    bus.publish({ type: 'a', n: 1 });
    bus.publish({ type: 'b', n: 2 });
    expect(seen).toEqual([2]);
  });

  it('unsubscribe menghentikan pengiriman, termasuk di tengah publish', () => {
    const bus = createEventBus<Ev>();
    const log: string[] = [];
    let off2: () => void = () => undefined;
    bus.subscribe(() => {
      log.push('1');
      off2();
    });
    off2 = bus.subscribe(() => log.push('2'));
    bus.publish({ type: 'a', n: 1 });
    bus.publish({ type: 'a', n: 2 });
    expect(log).toEqual(['1', '1']);
  });

  it('pelanggan yang ditambah saat publish baru menerima event berikutnya', () => {
    const bus = createEventBus<Ev>();
    const log: string[] = [];
    bus.subscribe(() => {
      bus.subscribe(() => log.push('late'));
    });
    bus.publish({ type: 'a', n: 1 });
    expect(log).toEqual([]);
    bus.publish({ type: 'a', n: 2 });
    expect(log).toEqual(['late']);
  });

  it('error handler tidak menghalangi handler lain, lalu dilempar sebagai AggregateError', () => {
    const bus = createEventBus<Ev>();
    const log: number[] = [];
    bus.subscribe(() => {
      throw new Error('gagal');
    });
    bus.subscribe((e) => log.push(e.n));
    expect(() => bus.publish({ type: 'a', n: 7 })).toThrow(AggregateError);
    expect(log).toEqual([7]);
  });

  it('onHandlerError menangani error tanpa melempar', () => {
    const errors: string[] = [];
    const bus = createEventBus<Ev>({ onHandlerError: (e) => errors.push((e as Error).message) });
    const log: number[] = [];
    bus.subscribe(() => {
      throw new Error('gagal');
    });
    bus.subscribe((e) => log.push(e.n));
    bus.publish({ type: 'b', n: 3 });
    expect(errors).toEqual(['gagal']);
    expect(log).toEqual([3]);
  });
});
