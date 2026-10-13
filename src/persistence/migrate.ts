import { SCHEMA_VERSION, type GameState } from '../engine/sim/state';
import { assertValidState } from '../engine/sim/validate';

/**
 * Mengubah data mentah dari penyimpanan menjadi GameState valid.
 * Saat SCHEMA_VERSION dinaikkan, tambahkan langkah migrasi per versi di sini
 * (mis. if (v === 1) { raw = v1ToV2(raw); v = 2; }) sebelum validasi akhir.
 */
export function migrateState(raw: unknown): GameState {
  if (typeof raw !== 'object' || raw === null) throw new Error('Data save rusak: bukan objek');
  const r = raw as Record<string, unknown>;
  const v = r.schemaVersion;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1) throw new Error('Data save rusak: versi skema tidak valid');
  if (v > SCHEMA_VERSION) throw new Error('Save berasal dari versi game yang lebih baru');
  for (const key of ['world', 'queue', 'log', 'idCounters']) {
    if (typeof r[key] !== 'object' || r[key] === null) throw new Error(`Data save rusak: bagian ${key} hilang`);
  }
  const state = raw as GameState;
  assertValidState(state);
  return state;
}
