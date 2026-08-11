import type { Team } from '@disa/demo-core';
import { readCssToken } from '@/shared/lib';

export interface RadarColors {
  readonly team: Readonly<Record<Team, string>>;
  /** Drawn around every token so a player stays legible over bright radar imagery. */
  readonly outline: string;
  /** A dead player keeps its position and gives up its side, its facing and its name — §7. */
  readonly dead: string;
  readonly labelChip: string;
  /** Text on glass over the plate is `--ink` and never `--ink-dim` — DESIGN.md §2. */
  readonly labelInk: string;
  /** The flash a token carries for a moment of match time after its player is hit. */
  readonly damage: string;
  /** Planting and defusing: the one moment a round is decided, so it gets the objective colour. */
  readonly objective: string;
}

export function readRadarColors(): RadarColors {
  return {
    team: { CT: readCssToken('--color-ct'), T: readCssToken('--color-t') },
    outline: readCssToken('--color-surface-0'),
    dead: readCssToken('--color-ink-faint'),
    labelChip: readCssToken('--color-glass-raised'),
    labelInk: readCssToken('--color-ink'),
    damage: readCssToken('--color-damage'),
    objective: readCssToken('--color-objective'),
  };
}
