import type { Team } from '@disa/demo-core';
import { readCssToken } from '@/shared/lib';

export interface RadarColors {
  readonly team: Readonly<Record<Team, string>>;
  /** Drawn around every token so a player stays legible over bright radar imagery. */
  readonly outline: string;
}

export function readRadarColors(): RadarColors {
  return {
    team: { CT: readCssToken('--color-ct'), T: readCssToken('--color-t') },
    outline: readCssToken('--color-surface-0'),
  };
}
