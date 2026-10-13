'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EntityId } from '../engine/core/ids';
import { previewWorld } from '../engine/sim/newGame';
import type { CareerPath } from '../engine/sim/state';
import { GEO_SEED } from '../engine/world/geoSeed';
import { SPORTS, type Sport } from '../engine/world/types';
import { useGame } from './gameClient';
import { BackIcon } from './icons';
import { SPORT_LABEL } from './labels';

const randomSeed = (): string => Math.random().toString(36).slice(2, 10);

export function NewGame({ onBack }: { onBack: () => void }) {
  const startNew = useGame((s) => s.startNew);
  const [seed, setSeed] = useState('');
  const [path, setPath] = useState<CareerPath>('manager');
  const [sport, setSport] = useState<Sport>('football');
  const [iso, setIso] = useState('ID');
  const [city, setCity] = useState('Jakarta');
  const [orgName, setOrgName] = useState('');
  const [managedId, setManagedId] = useState<EntityId<'org'> | ''>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Seed acak dibuat di klien setelah mount agar tidak beda dengan hasil render server.
  useEffect(() => setSeed(randomSeed()), []);

  const cities = GEO_SEED.find((c) => c.iso2 === iso)?.cities ?? [];
  const cityName = cities.some((c) => c.name === city) ? city : (cities[0]?.name ?? '');

  const world = useMemo(() => (seed.trim() ? previewWorld(seed.trim()) : null), [seed]);
  const clubs = useMemo(() => {
    if (!world) return [];
    return Object.values(world.organizations).filter(
      (o) => o.kind === 'club' && o.sports.includes(sport) && world.cities[o.cityId]?.name === cityName,
    );
  }, [world, sport, cityName]);
  const managed = clubs.find((c) => c.id === managedId) ?? clubs[0];

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    setFormError(null);
    if (!seed.trim()) return setFormError('Seed tidak boleh kosong.');
    if (path === 'founder') {
      const name = orgName.trim();
      if (name.length < 3 || name.length > 40) return setFormError('Nama perusahaan harus 3 sampai 40 karakter.');
      return startNew({ seed: seed.trim(), careerPath: 'founder', sport, country: iso, city: cityName, orgName: name }, name);
    }
    if (!managed) return setFormError('Tidak ada klub di kota dan cabor ini.');
    startNew(
      { seed: seed.trim(), careerPath: 'manager', sport, country: iso, city: cityName, managedOrgId: managed.id },
      managed.name,
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-xl p-4 pb-10">
      <button className="btn mb-4" onClick={onBack}><BackIcon /> Kembali</button>
      <h1 className="text-2xl font-semibold tracking-tight">Game baru</h1>

      <form onSubmit={submit} className="mt-5 flex flex-col gap-5">
        <fieldset>
          <legend className="label">Jalur karier</legend>
          <div className="grid grid-cols-2 gap-3">
            {([
              ['manager', 'Manajer klub', 'Kelola klub yang sudah ada.'],
              ['founder', 'Pendiri perusahaan', 'Mulai dari perusahaan baru.'],
            ] as const).map(([value, title, desc]) => (
              <label
                key={value}
                className={`card cursor-pointer text-sm ${path === value ? 'border-accent' : ''}`}
              >
                <input type="radio" name="path" className="sr-only" checked={path === value} onChange={() => setPath(value)} />
                <span className="block font-medium">{title}</span>
                <span className="text-xs text-mute">{desc}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="sport">Cabang olahraga</label>
          <select id="sport" className="input" value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
            {SPORTS.map((s) => <option key={s} value={s}>{SPORT_LABEL[s]}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="country">Negara</label>
            <select id="country" className="input" value={iso} onChange={(e) => setIso(e.target.value)}>
              {GEO_SEED.map((c) => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="city">Kota</label>
            <select id="city" className="input" value={cityName} onChange={(e) => setCity(e.target.value)}>
              {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {path === 'founder' ? (
          <div>
            <label className="label" htmlFor="orgName">Nama perusahaan</label>
            <input id="orgName" className="input" value={orgName} maxLength={40} onChange={(e) => setOrgName(e.target.value)} placeholder="mis. Nusantara Sports Group" />
          </div>
        ) : (
          <div>
            <label className="label" htmlFor="club">Klub yang dikelola</label>
            {clubs.length === 0 ? (
              <p className="card text-sm text-mute">Belum ada klub di kota dan cabor ini.</p>
            ) : (
              <select id="club" className="input" value={managed?.id ?? ''} onChange={(e) => setManagedId(e.target.value as EntityId<'org'>)}>
                {clubs.map((c) => <option key={c.id} value={c.id}>{c.name} (reputasi {c.reputation})</option>)}
              </select>
            )}
          </div>
        )}

        <div>
          <label className="label" htmlFor="seed">Seed dunia</label>
          <div className="flex gap-2">
            <input id="seed" className="input" value={seed} maxLength={64} onChange={(e) => setSeed(e.target.value)} />
            <button type="button" className="btn shrink-0" onClick={() => setSeed(randomSeed())}>Acak</button>
          </div>
          <p className="mt-1 text-xs text-mute">Seed yang sama menghasilkan dunia dan klub yang sama.</p>
        </div>

        {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
        <button type="submit" className="btn btn-primary" disabled={!seed.trim()}>Mulai</button>
      </form>
    </main>
  );
}
