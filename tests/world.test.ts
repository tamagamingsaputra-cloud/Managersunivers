import { describe, expect, it } from 'vitest';
import { IdGenerator } from '../src/engine/core/ids';
import { Rng } from '../src/engine/core/rng';
import { migrateState } from '../src/persistence/migrate';
import { Simulation } from '../src/engine/sim/simulation';
import { previewWorld, type NewGameOptions } from '../src/engine/sim/newGame';
import { validateState } from '../src/engine/sim/validate';
import { buildWorld } from '../src/engine/world/build';
import { GEO_SEED } from '../src/engine/world/geoSeed';
import { SPORTS } from '../src/engine/world/types';

const founder: NewGameOptions = {
  seed: 'seed-1', careerPath: 'founder', sport: 'football', country: 'ID', city: 'Jakarta', orgName: 'Garuda Sports Group',
};

function firstClub(seed: string, city: string) {
  const w = previewWorld(seed);
  const club = Object.values(w.organizations).find(
    (o) => o.kind === 'club' && o.sports.includes('football') && w.cities[o.cityId]?.name === city,
  );
  if (!club) throw new Error('klub tidak ditemukan');
  return club;
}

describe('buildWorld', () => {
  it('deterministik untuk seed sama, berbeda untuk seed lain', () => {
    const a = buildWorld(new IdGenerator(), Rng.fromSeed('s'));
    const b = buildWorld(new IdGenerator(), Rng.fromSeed('s'));
    const c = buildWorld(new IdGenerator(), Rng.fromSeed('t'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });

  it('setiap kota punya satu klub per cabor dengan nama unik', () => {
    const w = previewWorld('names');
    const cityCount = GEO_SEED.reduce((n, g) => n + g.cities.length, 0);
    const orgs = Object.values(w.organizations);
    expect(orgs).toHaveLength(cityCount * SPORTS.length);
    expect(new Set(orgs.map((o) => o.name)).size).toBe(orgs.length);
  });
});

describe('createGame', () => {
  it('jalur pendiri membuat perusahaan yang dikontrol pemain', () => {
    const sim = Simulation.create(founder);
    const org = sim.state.world.organizations[sim.state.playerOrgId];
    expect(org?.kind).toBe('company');
    expect(org?.name).toBe('Garuda Sports Group');
    expect(org?.controller).toBe('player');
    expect(validateState(sim.state)).toEqual([]);
  });

  it('jalur manajer mengambil alih klub yang sama dengan pratinjau dunia', () => {
    const club = firstClub('seed-m', 'Jakarta');
    const sim = Simulation.create({
      seed: 'seed-m', careerPath: 'manager', sport: 'football', country: 'ID', city: 'Jakarta', managedOrgId: club.id,
    });
    expect(sim.state.playerOrgId).toBe(club.id);
    const org = sim.state.world.organizations[club.id];
    expect(org?.name).toBe(club.name);
    expect(org?.controller).toBe('player');
    expect(org?.ai).toBe(null);
  });

  it('menolak input tidak valid', () => {
    const club = firstClub('seed-x', 'London');
    expect(() => Simulation.create({ ...founder, orgName: 'ab' })).toThrow('3..40');
    expect(() => Simulation.create({ ...founder, city: 'Atlantis' })).toThrow('Kota tidak ditemukan');
    expect(() => Simulation.create({ ...founder, country: 'XX' })).toThrow('Negara');
    expect(() => Simulation.create({ ...founder, seed: '   ' })).toThrow('Seed');
    expect(() =>
      Simulation.create({ seed: 'seed-x', careerPath: 'manager', sport: 'football', country: 'ID', city: 'Jakarta', managedOrgId: club.id }),
    ).toThrow('tidak sesuai');
  });
});

describe('Simulation', () => {
  it('tutup buku bulanan berjalan dan masuk log pemain', () => {
    const sim = Simulation.create(founder);
    sim.advanceDays(31); // 1 Juli -> 1 Agustus
    const report = sim.state.log.find((e) => e.level === 'report');
    expect(report).toBeDefined();
    expect(report?.text).toContain('Tutup buku Juli 2026');
  });

  it('seluruh dunia ikut disimulasikan di latar belakang', () => {
    const sim = Simulation.create(founder);
    const before = JSON.stringify(Object.values(sim.state.world.organizations).map((o) => o.cash));
    sim.advanceDays(40);
    const after = JSON.stringify(Object.values(sim.state.world.organizations).map((o) => o.cash));
    expect(after).not.toBe(before);
  });

  it('deterministik: dua simulasi dengan seed sama berakhir identik', () => {
    const a = Simulation.create(founder);
    const b = Simulation.create(founder);
    a.advanceDays(400);
    b.advanceDays(400);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it('save/load setia: lanjut dari snapshot = lanjut tanpa putus', () => {
    const a = Simulation.create(founder);
    a.advanceDays(45);
    const saved = JSON.parse(JSON.stringify(a.snapshot()));
    a.advanceDays(200);
    const b = new Simulation(migrateState(saved));
    b.advanceDays(200);
    expect(b.snapshot()).toEqual(a.snapshot());
  });

  it('state tetap valid setelah dua tahun dan log dibatasi', () => {
    const sim = Simulation.create(founder);
    sim.advanceDays(730);
    expect(validateState(sim.snapshot())).toEqual([]);
    expect(sim.state.log.length).toBeLessThanOrEqual(200);
  });

  it('menolak jumlah hari tidak valid', () => {
    const sim = Simulation.create(founder);
    expect(() => sim.advanceDays(-1)).toThrow('advanceDays');
    expect(() => sim.advanceDays(1.5)).toThrow('advanceDays');
  });

  it('menolak state dengan referensi rusak', () => {
    const state = Simulation.create(founder).snapshot();
    const orgId = state.playerOrgId;
    const org = state.world.organizations[orgId];
    if (!org) throw new Error('org hilang');
    org.cityId = 'cit_zzzzz';
    expect(validateState(state).length).toBeGreaterThan(0);
    expect(() => new Simulation(state)).toThrow('tidak valid');
  });
});

describe('migrateState', () => {
  it('menolak data rusak dan versi dari masa depan', () => {
    expect(() => migrateState(null)).toThrow('rusak');
    expect(() => migrateState({ schemaVersion: 'x' })).toThrow('versi skema');
    expect(() => migrateState({ schemaVersion: 99 })).toThrow('lebih baru');
    expect(() => migrateState({ schemaVersion: 1 })).toThrow('hilang');
  });
});
