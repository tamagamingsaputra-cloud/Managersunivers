import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/sim-core/kernel/index.ts';

function draw(seed: string | number, n: number): number[] {
  const r = createRng(seed);
  return Array.from({ length: n }, () => r.next());
}

describe('rng', () => {
  it('seed sama menghasilkan urutan sama, seed beda berbeda', () => {
    expect(draw('a', 10)).toEqual(draw('a', 10));
    expect(draw('a', 10)).not.toEqual(draw('b', 10));
  });

  it('seed angka sama dengan seed teks', () => {
    expect(draw(7, 5)).toEqual(draw('7', 5));
  });

  it('nilai golden tidak berubah (jaga kompatibilitas simpanan)', () => {
    const r = createRng('golden');
    expect([r.next(), r.next(), r.next()]).toEqual([0.29727144353091717, 0.2858339184895158, 0.40480322670191526]);
    const r2 = createRng('golden');
    expect([r2.int(1, 100), r2.int(1, 100), r2.int(1, 100), r2.int(1, 100), r2.int(1, 100)]).toEqual([30, 29, 41, 70, 3]);
    expect(createRng('golden').fork('worldgen').int(1, 1000)).toBe(4);
  });

  it('next() selalu di [0, 1)', () => {
    const r = createRng('range');
    for (let i = 0; i < 20000; i++) {
      const v = r.next();
      expect(v >= 0 && v < 1).toBe(true);
    }
  });

  it('rata-rata seragam mendekati 0,5', () => {
    const r = createRng('mean');
    let sum = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) sum += r.next();
    expect(Math.abs(sum / n - 0.5)).toBeLessThan(0.02);
  });

  it('state dapat dipulihkan dan melanjutkan urutan yang sama', () => {
    const r = createRng('state');
    for (let i = 0; i < 37; i++) r.next();
    const saved = r.getState();
    const expected = Array.from({ length: 10 }, () => r.next());
    const restored = createRng('state', saved);
    expect(Array.from({ length: 10 }, () => restored.next())).toEqual(expected);
  });

  it('fork tidak mengonsumsi induk dan tidak terpengaruh induk', () => {
    const a = createRng('fork');
    const b = createRng('fork');
    const forkA = a.fork('ns');
    for (let i = 0; i < 100; i++) b.next();
    const forkB = b.fork('ns');
    expect(forkA.next()).toBe(forkB.next());
    // induk a belum terpakai oleh fork
    expect(a.next()).toBe(createRng('fork').next());
  });

  it('namespace berbeda menghasilkan aliran berbeda', () => {
    const r = createRng('fork');
    expect(r.fork('x').next()).not.toBe(r.fork('y').next());
  });

  it('int inklusif dan mencapai kedua ujung', () => {
    const r = createRng('int');
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 10000; i++) {
      const v = r.int(3, 7);
      if (v < min) min = v;
      if (v > max) max = v;
      expect(Number.isInteger(v)).toBe(true);
    }
    expect(min).toBe(3);
    expect(max).toBe(7);
    expect(r.int(5, 5)).toBe(5);
  });

  it('int menolak rentang tidak valid', () => {
    const r = createRng('int-err');
    expect(() => r.int(5, 4)).toThrow(RangeError);
    expect(() => r.int(1.5, 3)).toThrow(RangeError);
  });

  it('shuffle adalah permutasi, deterministik, dan tidak mengubah input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = createRng('shuffle').shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
    expect(createRng('shuffle').shuffle(input)).toEqual(out);
  });

  it('pick menolak daftar kosong dan memilih dari daftar', () => {
    const r = createRng('pick');
    expect(() => r.pick([])).toThrow(RangeError);
    expect(['a', 'b', 'c']).toContain(r.pick(['a', 'b', 'c']));
  });

  it('chance di ujung 0 dan 1 pasti, dan menolak di luar [0, 1]', () => {
    const r = createRng('chance');
    for (let i = 0; i < 1000; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
    expect(() => r.chance(-0.1)).toThrow(RangeError);
    expect(() => r.chance(1.1)).toThrow(RangeError);
    expect(() => r.chance(Number.NaN)).toThrow(RangeError);
  });

  it('weighted menghormati bobot nol dan memvalidasi input', () => {
    const r = createRng('weighted');
    for (let i = 0; i < 500; i++) expect(r.weighted(['a', 'b', 'c'], [0, 1, 0])).toBe('b');
    expect(() => r.weighted(['a'], [0])).toThrow(RangeError);
    expect(() => r.weighted(['a', 'b'], [1])).toThrow(RangeError);
    expect(() => r.weighted(['a'], [-1])).toThrow(RangeError);
  });

  it('weighted mengikuti proporsi bobot secara kasar', () => {
    const r = createRng('weighted-dist');
    let hits = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (r.weighted(['x', 'y'], [1, 3]) === 'y') hits++;
    expect(Math.abs(hits / n - 0.75)).toBeLessThan(0.02);
  });

  it('normal mendekati rata-rata dan simpangan baku yang diminta', () => {
    const r = createRng('normal');
    const n = 20000;
    const xs = Array.from({ length: n }, () => r.normal(10, 2));
    const mean = xs.reduce((s, v) => s + v, 0) / n;
    const sd = Math.sqrt(xs.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
    expect(Math.abs(mean - 10)).toBeLessThan(0.1);
    expect(Math.abs(sd - 2)).toBeLessThan(0.1);
    expect(xs.every((v) => Number.isFinite(v))).toBe(true);
  });
});
