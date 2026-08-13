import type { Team } from '@disa/demo-core';
import { readCssToken } from '@/shared/lib';

export interface RadarColors {
  readonly team: Readonly<Record<Team, string>>;
  /** A dead player keeps its position and gives up its side, its facing and its name — §6.1. */
  readonly dead: string;
  /**
   * §6.1 asks for a white ring around the selected token. `--ink` is the palette's white; a token
   * of its own for one ring would be a change to `docs/DESIGN.md` §2, which is not this PR's.
   */
  readonly selectionRing: string;
  /** The ring's inner edge, which is what keeps it legible over both side colours. */
  readonly selectionEdge: string;
  /** Behind the name rather than around it: a halo, not the chip #111 shipped — §6.1. */
  readonly labelHalo: string;
  readonly labelInk: string;
  /** The flash a token carries for a moment of match time after its player is hit. */
  readonly damage: string;
  /** What is left of a flashbang, counted down on the token it blinded. */
  readonly blind: string;
  /** Planting and defusing: the one moment a round is decided, so it gets the objective colour. */
  readonly objective: string;
}

export function readRadarColors(): RadarColors {
  return {
    team: { CT: readCssToken('--color-ct'), T: readCssToken('--color-t') },
    dead: readCssToken('--color-ink-faint'),
    selectionRing: readCssToken('--color-ink'),
    selectionEdge: readCssToken('--color-accent'),
    labelHalo: readCssToken('--color-surface-0'),
    labelInk: readCssToken('--color-ink-dim'),
    damage: readCssToken('--color-damage'),
    blind: readCssToken('--color-nade-flash'),
    objective: readCssToken('--color-objective'),
  };
}
