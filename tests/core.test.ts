import { describe, expect, it } from 'vitest';
import { IdGenerator, isEntityId } from '../src/engine/core/ids';
import { Rng } from '../src/engine/core/rng';
import { addDays, dayToISO, firstOfNextMonth, isoToDay, monthLabel, weekday } from '../src/engine/time/calendar';
import { EventQueue } from '../src/engine/time/eventQueue';

describe('Rng', () => {
  it('menghasilkan urutan sama untuk seed sama', () => {
    const a = Rng.fromSeed('abc');
    const b = Rng.fromSeed('abc');
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('seed berbeda menghasilkan urutan berbeda', () => {
    expect(Rng.fromSeed('abc').next()).not.toBe(Rng.fromSeed('abd').next());
  });

  it('dapat dilanjutkan dari state yang disimpan', () => {
    const a = Rng.fromSeed('x');
    for (let i = 0; i < 10; i++) a.next();
    const b = new Rng(a.state);
    for (let i = 0; i < 20; i++) expect(b.next()).toBe(a.next());
  });

  it('int tetap dalam rentang dan menjangkau kedua ujung', () => {
    const r = Rng.fromSeed('range');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('pick pada daftar kosong melempar error', () => {
    expect(() => Rng.fromSeed('e').pick([])).toThrow('kosong');
  });
});

describe('IdGenerator', () => {
  it('berurutan, unik, dan berprefiks', () => {
    const g = new IdGenerator();
    const a = g.next('org');
    const b = g.next('org');
    const c = g.next('ath');
    expect(a).toBe('org_00001');
    expect(b).toBe('org_00002');
    expect(c).toBe('ath_00001');
    expect(isEntityId(a, 'org')).toBe(true);
    expect(isEntityId(a, 'ath')).toBe(false);
    expect(isEntityId('org_1')).toBe(false);
    expect(isEntityId(42)).toBe(false);
  });

  it('melanjutkan dari penghitung yang disimpan', () => {
    const g = new IdGenerator();
    g.next('org');
    const g2 = new IdGenerator(g.snapshot());
    expect(g2.next('org')).toBe('org_00002');
  });
});

describe('calendar', () => {
  it('konversi ISO <-> hari bolak-balik', () => {
    expect(dayToISO(isoToDay('2026-07-01'))).toBe('2026-07-01');
    expect(dayToISO(isoToDay('2028-02-29'))).toBe('2028-02-29');
    expect(isoToDay('1970-01-02')).toBe(1);
  });

  it('menolak tanggal tidak valid', () => {
    expect(() => isoToDay('2026-02-30')).toThrow('tidak ada');
    expect(() => isoToDay('26-1-1')).toThrow('Format');
  });

  it('hari pertama bulan berikutnya, termasuk pergantian tahun', () => {
    expect(dayToISO(firstOfNextMonth(isoToDay('2026-07-01')))).toBe('2026-08-01');
    expect(dayToISO(firstOfNextMonth(isoToDay('2026-12-31')))).toBe('2027-01-01');
  });

  it('hari dalam seminggu dan label bulan', () => {
    expect(weekday(isoToDay('2026-07-01'))).toBe(3); // Rabu
    expect(monthLabel(addDays(isoToDay('2026-08-01'), -1))).toBe('Juli 2026');
  });
});

describe('EventQueue', () => {
  it('terurut per hari, FIFO di hari yang sama', () => {
    const q = new EventQueue();
    q.schedule(10, 'b');
    q.schedule(5, 'a');
    q.schedule(10, 'c');
    q.schedule(7, 'd');
    expect(q.peekDay()).toBe(5);
    expect(q.popDue(7).map((e) => e.type)).toEqual(['a', 'd']);
    expect(q.popDue(10).map((e) => e.type)).toEqual(['b', 'c']);
    expect(q.size).toBe(0);
  });

  it('snapshot dapat dipulihkan dan nextSeq berlanjut', () => {
    const q = new EventQueue();
    q.schedule(3, 'x');
    q.schedule(4, 'y');
    const q2 = new EventQueue(JSON.parse(JSON.stringify(q.snapshot())));
    const e = q2.schedule(3, 'z');
    expect(e.seq).toBe(3);
    expect(q2.popDue(4).map((v) => v.type)).toEqual(['x', 'z', 'y']);
  });
});
