import type { IdCounters, EntityId } from '../core/ids';
import type { QueueSnapshot } from '../time/eventQueue';
import type { WorldState } from '../world/types';

/** Naikkan saat bentuk save berubah, lalu tambahkan langkah di persistence/migrate.ts. */
export const SCHEMA_VERSION = 1;
export const LOG_LIMIT = 200;

export type CareerPath = 'founder' | 'manager';
export type LogLevel = 'info' | 'warning' | 'decision' | 'report';

export interface LogEntry {
  day: number;
  level: LogLevel;
  text: string;
  orgId: EntityId<'org'> | null;
}

export interface GameState {
  schemaVersion: number;
  seed: string;
  careerPath: CareerPath;
  playerOrgId: EntityId<'org'>;
  day: number;
  rngState: number;
  idCounters: IdCounters;
  queue: QueueSnapshot;
  world: WorldState;
  log: LogEntry[];
}
