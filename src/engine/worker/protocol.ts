import type { NewGameOptions } from '../sim/newGame';
import type { GameState } from '../sim/state';
import type { GameView, Speed } from '../sim/view';

export type ToWorker =
  | { type: 'new'; options: NewGameOptions }
  | { type: 'load'; state: GameState }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'advance'; days: number }
  | { type: 'snapshot'; requestId: number };

export type FromWorker =
  | { type: 'view'; view: GameView }
  | { type: 'snapshot'; requestId: number; state: GameState }
  | { type: 'error'; message: string };
