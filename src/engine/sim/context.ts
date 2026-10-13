import type { EntityId, IdGenerator } from '../core/ids';
import type { Rng } from '../core/rng';
import type { EventQueue, ScheduledEvent } from '../time/eventQueue';
import type { GameState, LogLevel } from './state';

/** Satu-satunya pintu modul ke state, rng, id, antrean kejadian, dan log. */
export interface SimContext {
  readonly state: GameState;
  readonly rng: Rng;
  readonly ids: IdGenerator;
  readonly queue: EventQueue;
  log(level: LogLevel, text: string, orgId?: EntityId<'org'> | null): void;
}

export type Handler = (ctx: SimContext, event: ScheduledEvent) => void;
