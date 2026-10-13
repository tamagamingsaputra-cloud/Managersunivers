import { IdGenerator } from '../core/ids';
import { clamp, Rng } from '../core/rng';
import { GEO_SEED } from './geoSeed';
import { SPORTS, type City, type Country, type Organization, type WorldState } from './types';

/** Akhiran nama klub fiktif. Nama kota nyata + akhiran fiktif; tidak merujuk klub nyata. */
const CLUB_SUFFIXES = [
  'Meridian', 'Vanguard', 'Falcons', 'Ironworks', 'Tidehawks', 'Nova',
  'Sentinels', 'Aurora', 'Harbor', 'Summit', 'Cobalt', 'Embers',
] as const;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Membangun dunia awal secara deterministik dari rng + ids.
 * Satu klub AI per kota per cabor. Urutan pembuatan menentukan ID, jadi jangan diubah
 * tanpa menaikkan versi skema.
 */
export function buildWorld(ids: IdGenerator, rng: Rng): WorldState {
  const world: WorldState = { countries: {}, cities: {}, organizations: {}, athletes: {} };
  const usedNames = new Set<string>();

  for (const g of GEO_SEED) {
    const country: Country = { id: ids.next('cty'), iso2: g.iso2, name: g.name };
    world.countries[country.id] = country;

    for (const gc of g.cities) {
      const city: City = { id: ids.next('cit'), countryId: country.id, name: gc.name, lat: gc.lat, lon: gc.lon };
      world.cities[city.id] = city;

      for (const sport of SPORTS) {
        let name = '';
        for (let tries = 0; tries < 20; tries++) {
          const candidate = `${city.name} ${rng.pick(CLUB_SUFFIXES)}`;
          if (!usedNames.has(candidate)) { name = candidate; break; }
        }
        if (name === '') name = `${city.name} ${rng.pick(CLUB_SUFFIXES)} ${usedNames.size}`;
        usedNames.add(name);

        const org: Organization = {
          id: ids.next('org'),
          kind: 'club',
          name,
          sports: [sport],
          cityId: city.id,
          cash: rng.int(2, 20) * 1_000_000,
          debt: 0,
          reputation: Math.round(clamp(rng.gaussian(50, 15), 15, 90)),
          controller: 'ai',
          ai: {
            ambition: round2(rng.float(0.2, 0.9)),
            frugality: round2(rng.float(0.2, 0.9)),
            patience: round2(rng.float(0.2, 0.9)),
          },
          parentId: null,
        };
        world.organizations[org.id] = org;
      }
    }
  }
  return world;
}
