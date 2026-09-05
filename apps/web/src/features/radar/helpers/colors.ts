import type { Team } from '@disa/demo-core';
import type { Palette } from '@/core/settings';
import { readCssToken } from '@/shared/lib';
import type { LabelColors } from './labels';

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
  readonly label: LabelColors;
  /**
   * The hole a walking player is drawn with — the plate's own ground, so a quiet player reads as a
   * token with its middle taken out. The same token the label halo cuts with, and named separately
   * because the two are different marks that would be changed for different reasons.
   */
  readonly hollow: string;
  /** The spur past a needle's tip on the frame a trigger was pulled — §6.1, and white like §6.2's
   * trajectory: gunfire belongs to no side's colour and to no piece of utility. */
  readonly gunfire: string;
  /**
   * The seconds a smoke or a fire has left, in its own middle. The palette's white rather than the
   * `--color-ink-dim` a player's name is set in: a name sits on the plate's ground with nothing
   * behind it, and this sits *inside* a body drawn over the map, so it needs the step the name
   * gives up.
   */
  readonly countdown: string;
  /** The hit a token carries for a moment of match time after its player is hit. */
  readonly damage: string;
  /** What is left of a flashbang, counted down on the token it blinded. */
  readonly blind: string;
  /** Planting and defusing: the one moment a round is decided, so it gets the objective colour. */
  readonly objective: string;
  /** HE expanding ring and static glyph — §6.2. */
  readonly nadeHe: string;
  /** Smoke cloud disc and depleting ring — §6.2. */
  readonly nadeSmoke: string;
  /** Molotov / incendiary fire area — §6.2. */
  readonly nadeMolotov: string;
  /** Decoy pulsing mark — §6.2. */
  readonly nadeDecoy: string;
  /** Trajectory line — white, §6.2 says "not in the utility's colour". */
  readonly trajectory: string;
  /** The line between a hovered kill's two ends — white, for the reason a trajectory is (§5.4). */
  readonly killLine: string;
}

function readRadarColors(): RadarColors {
  return {
    team: { CT: readCssToken('--color-ct'), T: readCssToken('--color-t') },
    dead: readCssToken('--color-ink-faint'),
    selectionRing: readCssToken('--color-ink'),
    selectionEdge: readCssToken('--color-surface-0'),
    label: {
      halo: readCssToken('--color-surface-0'),
      ink: readCssToken('--color-ink-dim'),
      damage: readCssToken('--color-damage'),
    },
    hollow: readCssToken('--color-surface-0'),
    gunfire: readCssToken('--color-ink'),
    countdown: readCssToken('--color-ink'),
    damage: readCssToken('--color-damage'),
    blind: readCssToken('--color-nade-flash'),
    objective: readCssToken('--color-objective'),
    nadeHe: readCssToken('--color-nade-he'),
    nadeSmoke: readCssToken('--color-nade-smoke'),
    nadeMolotov: readCssToken('--color-nade-molotov'),
    nadeDecoy: readCssToken('--color-nade-decoy'),
    trajectory: readCssToken('--color-ink'),
    killLine: readCssToken('--color-ink'),
  };
}

let cached: { readonly palette: Palette; readonly colors: RadarColors } | null = null;

/**
 * The data colours as the document currently resolves them, held until the palette changes.
 *
 * The palette is a token swap (`docs/DESIGN.md` §2.7), so nothing here branches on it — it is the
 * cache key, and the one thing that can make sixteen `getComputedStyle` reads worth doing again.
 * Holding the result matters because the callers pass it into a layer array: a new object every
 * render would rebuild every layer on the plate ten times a second.
 */
export function radarColors(palette: Palette): RadarColors {
  if (cached !== null && cached.palette === palette) return cached.colors;

  const colors = readRadarColors();
  cached = { palette, colors };

  return colors;
}
