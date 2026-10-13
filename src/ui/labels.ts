import type { LogLevel } from '../engine/sim/state';
import type { Sport } from '../engine/world/types';

export const SPORT_LABEL: Record<Sport, string> = {
  football: 'Sepak bola',
  volleyball: 'Voli',
  basketball: 'Basket',
  motorsport: 'Motorsport',
};

export const LEVEL_LABEL: Record<LogLevel, string> = {
  info: 'Informasi',
  warning: 'Peringatan',
  decision: 'Keputusan',
  report: 'Laporan',
};

export const LEVEL_CLASS: Record<LogLevel, string> = {
  info: 'bg-accent/15 text-accent',
  warning: 'bg-warn/15 text-warn',
  decision: 'bg-danger/15 text-danger',
  report: 'bg-white/10 text-mute',
};
