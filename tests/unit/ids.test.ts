import { describe, expect, it } from 'vitest';
import { ID_PREFIXES, createIdGenerator, formatId, isId, parseId } from '../../src/sim-core/kernel/index.ts';

describe('ids', () => {
  it('memformat dengan nol di depan', () => {
    expect(formatId('athlete', 184)).toBe('ath_000184');
    expect(formatId('organization', 1)).toBe('org_000001');
    expect(formatId('event', 1234567)).toBe('evt_1234567');
  });

  it('menolak nomor tidak valid', () => {
    expect(() => formatId('athlete', 0)).toThrow(RangeError);
    expect(() => formatId('athlete', -3)).toThrow(RangeError);
    expect(() => formatId('athlete', 1.5)).toThrow(RangeError);
  });

  it('parse bolak-balik untuk semua tipe', () => {
    for (const kind of Object.keys(ID_PREFIXES) as (keyof typeof ID_PREFIXES)[]) {
      const id = formatId(kind, 42);
      expect(parseId(id)).toEqual({ kind, n: 42 });
      expect(isId(id, kind)).toBe(true);
    }
  });

  it('menolak ID tidak kanonis atau tidak dikenal', () => {
    expect(parseId('ath_0000001')).toBeUndefined();
    expect(parseId('xyz_000001')).toBeUndefined();
    expect(parseId('ath_1')).toBeUndefined();
    expect(parseId('ath_000000')).toBeUndefined();
    expect(parseId('')).toBeUndefined();
    expect(isId(123, 'athlete')).toBe(false);
    expect(isId('org_000001', 'athlete')).toBe(false);
  });

  it('prefiks unik', () => {
    const prefixes = Object.values(ID_PREFIXES);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('generator menghitung per tipe secara independen', () => {
    const gen = createIdGenerator();
    expect(gen.next('athlete')).toBe('ath_000001');
    expect(gen.next('athlete')).toBe('ath_000002');
    expect(gen.next('organization')).toBe('org_000001');
    expect(gen.snapshot()).toEqual({ athlete: 2, organization: 1 });
  });

  it('melanjutkan dari snapshot tanpa memakai ulang ID', () => {
    const gen = createIdGenerator();
    gen.next('athlete');
    gen.next('athlete');
    const restored = createIdGenerator(gen.snapshot());
    expect(restored.next('athlete')).toBe('ath_000003');
  });

  it('snapshot adalah salinan', () => {
    const gen = createIdGenerator();
    gen.next('city');
    const snap = gen.snapshot() as Record<string, number>;
    snap.city = 99;
    expect(gen.next('city')).toBe('cit_000002');
  });

  it('menolak penghitung awal yang tidak valid', () => {
    expect(() => createIdGenerator({ athlete: -1 })).toThrow(RangeError);
    expect(() => createIdGenerator({ athlete: 1.5 })).toThrow(RangeError);
    expect(() => createIdGenerator({ bogus: 1 } as never)).toThrow(RangeError);
  });
});
