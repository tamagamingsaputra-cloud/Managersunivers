import { isEntityId } from '../core/ids';
import { ORG_KINDS, SPORTS } from '../world/types';
import { LOG_LIMIT, SCHEMA_VERSION, type GameState } from './state';

/** Mengembalikan daftar masalah integritas (kosong = valid). Maksimal 50 pesan. */
export function validateState(s: GameState): string[] {
  const errors: string[] = [];
  const bad = (m: string): void => {
    if (errors.length < 50) errors.push(m);
  };

  if (s.schemaVersion !== SCHEMA_VERSION) bad(`schemaVersion ${s.schemaVersion} != ${SCHEMA_VERSION}`);
  if (!Number.isInteger(s.day)) bad('day bukan integer');
  if (!Number.isInteger(s.rngState) || s.rngState < 0 || s.rngState > 0xffffffff) bad('rngState tidak valid');
  if (!Array.isArray(s.log)) bad('log bukan array');
  else if (s.log.length > LOG_LIMIT) bad('log melebihi batas');

  const { countries, cities, organizations, athletes } = s.world;

  for (const [key, c] of Object.entries(countries)) {
    if (key !== c.id || !isEntityId(key, 'cty')) bad(`negara ${key}: id tidak cocok`);
  }
  for (const [key, c] of Object.entries(cities)) {
    if (key !== c.id || !isEntityId(key, 'cit')) bad(`kota ${key}: id tidak cocok`);
    if (!countries[c.countryId]) bad(`kota ${key}: negara ${c.countryId} tidak ada`);
    if (!(c.lat >= -90 && c.lat <= 90 && c.lon >= -180 && c.lon <= 180)) bad(`kota ${key}: koordinat di luar rentang`);
  }

  let playerControlled = 0;
  for (const [key, o] of Object.entries(organizations)) {
    if (key !== o.id || !isEntityId(key, 'org')) bad(`organisasi ${key}: id tidak cocok`);
    if (!cities[o.cityId]) bad(`organisasi ${key}: kota ${o.cityId} tidak ada`);
    if (!ORG_KINDS.includes(o.kind)) bad(`organisasi ${key}: kind tidak dikenal`);
    if (o.sports.length === 0 || o.sports.some((sp) => !SPORTS.includes(sp))) bad(`organisasi ${key}: cabor tidak valid`);
    if (!Number.isFinite(o.cash) || !Number.isFinite(o.debt) || o.debt < 0) bad(`organisasi ${key}: keuangan tidak valid`);
    if (!(o.reputation >= 0 && o.reputation <= 100)) bad(`organisasi ${key}: reputasi di luar 0..100`);
    if (o.controller === 'player') playerControlled++;
    if ((o.controller === 'ai') !== (o.ai !== null)) bad(`organisasi ${key}: profil AI tidak sesuai controller`);
    if (o.parentId !== null && !organizations[o.parentId]) bad(`organisasi ${key}: induk ${o.parentId} tidak ada`);
  }

  for (const [key, a] of Object.entries(athletes)) {
    if (key !== a.id || !isEntityId(key, 'ath')) bad(`atlet ${key}: id tidak cocok`);
    if (!SPORTS.includes(a.sport)) bad(`atlet ${key}: cabor tidak valid`);
    if (!countries[a.nationalityId]) bad(`atlet ${key}: kewarganegaraan tidak ada`);
    if (a.orgId !== null && !organizations[a.orgId]) bad(`atlet ${key}: organisasi ${a.orgId} tidak ada`);
  }

  const player = organizations[s.playerOrgId];
  if (!player) bad(`playerOrgId ${s.playerOrgId} tidak ada`);
  else if (player.controller !== 'player') bad('organisasi pemain tidak dikontrol pemain');
  if (playerControlled !== 1) bad(`harus tepat satu organisasi pemain, ditemukan ${playerControlled}`);

  const evs = s.queue.events;
  let maxSeq = 0;
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i] as (typeof evs)[number];
    if (i > 0) {
      const p = evs[i - 1] as (typeof evs)[number];
      if (e.day < p.day || (e.day === p.day && e.seq <= p.seq)) bad('antrean kejadian tidak terurut');
    }
    maxSeq = Math.max(maxSeq, e.seq);
  }
  if (s.queue.nextSeq <= maxSeq) bad('queue.nextSeq tidak valid');

  return errors;
}

export function assertValidState(s: GameState): void {
  const errors = validateState(s);
  if (errors.length > 0) {
    throw new Error(`State game tidak valid: ${errors.slice(0, 5).join('; ')}`);
  }
}
