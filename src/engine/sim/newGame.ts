import { IdGenerator, type EntityId } from '../core/ids';
import { Rng } from '../core/rng';
import { MONTHLY_CLOSE } from '../economy/monthlyClose';
import { firstOfNextMonth, GAME_START_ISO, isoToDay } from '../time/calendar';
import { EventQueue } from '../time/eventQueue';
import { buildWorld } from '../world/build';
import type { Organization, Sport, WorldState } from '../world/types';
import { SPORTS } from '../world/types';
import { assertValidState } from './validate';
import { SCHEMA_VERSION, type CareerPath, type GameState } from './state';

export interface NewGameOptions {
  seed: string;
  careerPath: CareerPath;
  sport: Sport;
  /** Kode ISO-2 negara awal, mis. 'ID'. */
  country: string;
  /** Nama kota awal sesuai data geografi. */
  city: string;
  /** Wajib untuk jalur 'founder' (3..40 karakter). */
  orgName?: string;
  /** Wajib untuk jalur 'manager': ID klub dari previewWorld(seed). */
  managedOrgId?: EntityId<'org'>;
}

export const FOUNDER_START_CASH = 5_000_000;

function initWorld(seed: string): { rng: Rng; ids: IdGenerator; world: WorldState } {
  const rng = Rng.fromSeed(seed);
  const ids = new IdGenerator();
  const world = buildWorld(ids, rng);
  return { rng, ids, world };
}

/** Dunia awal untuk seed tertentu (identik dengan dunia yang dipakai createGameState). */
export function previewWorld(seed: string): WorldState {
  return initWorld(seed).world;
}

export function createGameState(options: NewGameOptions): GameState {
  const seed = options.seed.trim();
  if (seed.length === 0 || seed.length > 64) throw new RangeError('Seed harus 1..64 karakter');
  if (!SPORTS.includes(options.sport)) throw new RangeError(`Cabor tidak dikenal: ${options.sport}`);

  const { rng, ids, world } = initWorld(seed);

  const country = Object.values(world.countries).find((c) => c.iso2 === options.country);
  if (!country) throw new RangeError(`Negara tidak ditemukan: ${options.country}`);
  const city = Object.values(world.cities).find((c) => c.countryId === country.id && c.name === options.city);
  if (!city) throw new RangeError(`Kota tidak ditemukan: ${options.city}`);

  const day = isoToDay(GAME_START_ISO);
  let playerOrg: Organization;
  let welcome: string;

  if (options.careerPath === 'founder') {
    const name = (options.orgName ?? '').trim();
    if (name.length < 3 || name.length > 40) throw new RangeError('Nama perusahaan harus 3..40 karakter');
    playerOrg = {
      id: ids.next('org'),
      kind: 'company',
      name,
      sports: [options.sport],
      cityId: city.id,
      cash: FOUNDER_START_CASH,
      debt: 0,
      reputation: 10,
      controller: 'player',
      ai: null,
      parentId: null,
    };
    world.organizations[playerOrg.id] = playerOrg;
    welcome = `Kamu mendirikan ${name} di ${city.name}.`;
  } else {
    const club = options.managedOrgId ? world.organizations[options.managedOrgId] : undefined;
    if (!club) throw new RangeError('Klub yang dikelola tidak ditemukan');
    if (club.kind !== 'club' || !club.sports.includes(options.sport) || club.cityId !== city.id) {
      throw new RangeError('Klub tidak sesuai dengan kota/cabor yang dipilih');
    }
    club.controller = 'player';
    club.ai = null;
    playerOrg = club;
    welcome = `Kamu ditunjuk sebagai manajer ${club.name}.`;
  }

  const queue = new EventQueue();
  queue.schedule(firstOfNextMonth(day), MONTHLY_CLOSE, {});

  const state: GameState = {
    schemaVersion: SCHEMA_VERSION,
    seed,
    careerPath: options.careerPath,
    playerOrgId: playerOrg.id,
    day,
    rngState: rng.state,
    idCounters: ids.snapshot(),
    queue: queue.snapshot(),
    world,
    log: [{ day, level: 'info', text: welcome, orgId: playerOrg.id }],
  };
  assertValidState(state);
  return state;
}
