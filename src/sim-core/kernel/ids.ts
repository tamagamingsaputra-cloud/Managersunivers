/**
 * ID entitas unik dan deterministik.
 * Bentuk: `<prefix>_<nomor>` (contoh `ath_000184`). Nomor berasal dari penghitung per tipe,
 * tidak pernah dipakai ulang, dan tidak bergantung pada waktu atau RNG.
 */

export const ID_PREFIXES = {
  country: 'cty',
  city: 'cit',
  facility: 'fac',
  organization: 'org',
  division: 'div',
  athlete: 'ath',
  staff: 'stf',
  contract: 'ctr',
  vehicle: 'veh',
  competition: 'cmp',
  season: 'ssn',
  event: 'evt',
  eventResult: 'res',
  ledgerEntry: 'led',
  sponsor: 'spn',
  message: 'msg',
} as const;

export type EntityKind = keyof typeof ID_PREFIXES;

declare const idBrand: unique symbol;
export type Id<K extends EntityKind> = string & { readonly [idBrand]: K };

export type CountryId = Id<'country'>;
export type CityId = Id<'city'>;
export type FacilityId = Id<'facility'>;
export type OrganizationId = Id<'organization'>;
export type DivisionId = Id<'division'>;
export type AthleteId = Id<'athlete'>;
export type StaffId = Id<'staff'>;
export type ContractId = Id<'contract'>;
export type VehicleId = Id<'vehicle'>;
export type CompetitionId = Id<'competition'>;
export type SeasonId = Id<'season'>;
export type EventId = Id<'event'>;
export type EventResultId = Id<'eventResult'>;
export type LedgerEntryId = Id<'ledgerEntry'>;
export type SponsorId = Id<'sponsor'>;
export type MessageId = Id<'message'>;

const ALL_KINDS = Object.keys(ID_PREFIXES) as EntityKind[];

const KIND_BY_PREFIX: ReadonlyMap<string, EntityKind> = new Map(
  ALL_KINDS.map((kind): [string, EntityKind] => [ID_PREFIXES[kind], kind]),
);

const ID_PATTERN = /^([a-z]{3})_(\d{6,})$/;

export function formatId<K extends EntityKind>(kind: K, n: number): Id<K> {
  if (!Number.isSafeInteger(n) || n < 1) {
    throw new RangeError(`Nomor ID harus bilangan bulat >= 1, diterima: ${String(n)}`);
  }
  return `${ID_PREFIXES[kind]}_${String(n).padStart(6, '0')}` as Id<K>;
}

export interface ParsedId {
  readonly kind: EntityKind;
  readonly n: number;
}

/** Mengembalikan undefined jika bukan ID kanonis yang dikenal. */
export function parseId(value: string): ParsedId | undefined {
  const m = ID_PATTERN.exec(value);
  if (m === null) return undefined;
  const kind = KIND_BY_PREFIX.get(m[1] as string);
  if (kind === undefined) return undefined;
  const n = Number(m[2]);
  if (!Number.isSafeInteger(n) || n < 1) return undefined;
  // Tolak bentuk tidak kanonis (misalnya angka nol berlebih).
  if (formatId(kind, n) !== value) return undefined;
  return { kind, n };
}

export function isId<K extends EntityKind>(value: unknown, kind: K): value is Id<K> {
  if (typeof value !== 'string') return false;
  return parseId(value)?.kind === kind;
}

/** Nomor terakhir yang sudah diterbitkan per tipe. */
export type IdCounters = Readonly<Partial<Record<EntityKind, number>>>;

export interface IdGenerator {
  next<K extends EntityKind>(kind: K): Id<K>;
  snapshot(): IdCounters;
}

export function createIdGenerator(initial: IdCounters = {}): IdGenerator {
  const counters: Partial<Record<EntityKind, number>> = {};
  for (const key of Object.keys(initial)) {
    if (!KIND_BY_PREFIX.has(ID_PREFIXES[key as EntityKind] ?? '')) {
      throw new RangeError(`Tipe entitas tidak dikenal pada penghitung: ${key}`);
    }
    const value = initial[key as EntityKind];
    if (value === undefined) continue;
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`Penghitung ${key} harus bilangan bulat >= 0, diterima: ${String(value)}`);
    }
    counters[key as EntityKind] = value;
  }
  return {
    next<K extends EntityKind>(kind: K): Id<K> {
      const n = (counters[kind] ?? 0) + 1;
      const id = formatId(kind, n);
      counters[kind] = n;
      return id;
    },
    snapshot(): IdCounters {
      return { ...counters };
    },
  };
}
