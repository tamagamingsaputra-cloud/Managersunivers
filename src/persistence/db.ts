import Dexie, { type Table } from 'dexie';
import type { GameState } from '../engine/sim/state';
import { migrateState } from './migrate';

export interface SaveMeta {
  id: string;
  name: string;
  updatedAt: number;
  day: number;
  schemaVersion: number;
}

interface SaveData {
  id: string;
  state: GameState;
}

/** Metadata dan data dipisah agar daftar save tidak memuat seluruh dunia ke memori. */
class SmsDb extends Dexie {
  saveMeta!: Table<SaveMeta, string>;
  saveData!: Table<SaveData, string>;

  constructor() {
    super('sports-manager-sim');
    this.version(1).stores({ saveMeta: 'id, updatedAt', saveData: 'id' });
  }
}

let db: SmsDb | null = null;
function getDb(): SmsDb {
  if (!db) db = new SmsDb();
  return db;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function listSaves(): Promise<SaveMeta[]> {
  return getDb().saveMeta.orderBy('updatedAt').reverse().toArray();
}

/** Menulis save baru (id null) atau menimpa yang ada. Mengembalikan id. */
export async function writeSave(id: string | null, name: string, state: GameState): Promise<string> {
  const d = getDb();
  const saveId = id ?? newId();
  const meta: SaveMeta = { id: saveId, name, updatedAt: Date.now(), day: state.day, schemaVersion: state.schemaVersion };
  await d.transaction('rw', d.saveMeta, d.saveData, async () => {
    await d.saveData.put({ id: saveId, state });
    await d.saveMeta.put(meta);
  });
  return saveId;
}

export async function readSave(id: string): Promise<{ meta: SaveMeta; state: GameState }> {
  const d = getDb();
  const [meta, data] = await Promise.all([d.saveMeta.get(id), d.saveData.get(id)]);
  if (!meta || !data) throw new Error('Save tidak ditemukan');
  return { meta, state: migrateState(data.state) };
}

export async function deleteSave(id: string): Promise<void> {
  const d = getDb();
  await d.transaction('rw', d.saveMeta, d.saveData, async () => {
    await d.saveData.delete(id);
    await d.saveMeta.delete(id);
  });
}
