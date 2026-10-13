import type { EntityId } from '../core/ids';

export type Sport = 'football' | 'volleyball' | 'basketball' | 'motorsport';
export const SPORTS: readonly Sport[] = ['football', 'volleyball', 'basketball', 'motorsport'];

export interface Country {
  id: EntityId<'cty'>;
  iso2: string;
  name: string;
}

export interface City {
  id: EntityId<'cit'>;
  countryId: EntityId<'cty'>;
  name: string;
  lat: number;
  lon: number;
}

export type OrgKind = 'company' | 'club';
export const ORG_KINDS: readonly OrgKind[] = ['company', 'club'];

/** Semua nilai 0..1. */
export interface AiProfile {
  ambition: number;
  frugality: number;
  patience: number;
}

export interface Organization {
  id: EntityId<'org'>;
  kind: OrgKind;
  name: string;
  sports: Sport[];
  cityId: EntityId<'cit'>;
  cash: number;
  debt: number;
  /** 0..100 */
  reputation: number;
  controller: 'player' | 'ai';
  /** Non-null jika dan hanya jika controller === 'ai'. */
  ai: AiProfile | null;
  /** Perusahaan induk (jalur pendiri -> klub/divisi miliknya). */
  parentId: EntityId<'org'> | null;
}

/** Kerangka minimal; atribut, kepribadian, kontrak, dll ditambahkan di tahap atlet. */
export interface Athlete {
  id: EntityId<'ath'>;
  name: string;
  sport: Sport;
  birthDay: number;
  nationalityId: EntityId<'cty'>;
  orgId: EntityId<'org'> | null;
}

export interface WorldState {
  countries: Record<EntityId<'cty'>, Country>;
  cities: Record<EntityId<'cit'>, City>;
  organizations: Record<EntityId<'org'>, Organization>;
  athletes: Record<EntityId<'ath'>, Athlete>;
}
