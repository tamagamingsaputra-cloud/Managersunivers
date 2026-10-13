import type { EntityId } from '../core/ids';
import { dayToISO } from '../time/calendar';
import type { OrgKind } from '../world/types';
import type { Simulation } from './simulation';
import type { LogEntry } from './state';

/** Hari per detik di dunia game. 0 = jeda. */
export type Speed = 0 | 1 | 2 | 4 | 8;
export const SPEEDS: readonly Speed[] = [0, 1, 2, 4, 8];

/** Potongan kecil state untuk UI. Tidak pernah memuat seluruh dunia. */
export interface GameView {
  day: number;
  dateISO: string;
  speed: Speed;
  player: {
    id: EntityId<'org'>;
    name: string;
    kind: OrgKind;
    cash: number;
    debt: number;
    reputation: number;
  };
  log: LogEntry[];
}

const VIEW_LOG = 40;

export function makeView(sim: Simulation, speed: Speed): GameView {
  const s = sim.state;
  const org = s.world.organizations[s.playerOrgId];
  if (!org) throw new Error('Organisasi pemain hilang dari state');
  return {
    day: s.day,
    dateISO: dayToISO(s.day),
    speed,
    player: { id: org.id, name: org.name, kind: org.kind, cash: org.cash, debt: org.debt, reputation: org.reputation },
    log: s.log.slice(-VIEW_LOG).map((e) => ({ ...e })),
  };
}
