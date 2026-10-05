import {
  grenadeRadiusUnits,
  type LineupTarget,
  type LineupVariant,
  type UtilityThrow,
} from '@disa/demo-core';
import { type MapOverview, plateX, plateY } from '@disa/map-data';
import type { RadarColors } from './colors';
import { grenadeColor } from './grenades';
import type { DotPlot, SelectionPlot } from './target-layer';
import type { StackPoint } from './target-stacks';

/** Where each target lands on the plate, most used first as given. */
export function targetPoints(
  overview: MapOverview,
  targets: readonly LineupTarget[],
): readonly StackPoint[] {
  return targets.map(({ id, landing }) => ({
    id,
    x: plateX(overview, landing.x, landing.z),
    y: plateY(overview, landing.y, landing.z),
  }));
}

/** The throws on the move, as plate positions in the colour of what was thrown. */
export function dotPlot(
  overview: MapOverview,
  throws: readonly UtilityThrow[],
  colors: RadarColors,
): DotPlot {
  const plot = new Float32Array(throws.length * 2);

  throws.forEach(({ landing }, index) => {
    plot[index * 2] = plateX(overview, landing.x, landing.z);
    plot[index * 2 + 1] = plateY(overview, landing.y, landing.z);
  });

  return { plot, colors: throws.map(({ grenade }) => grenadeColor(grenade.type, colors)) };
}

/** What the canvas draws for a picked target: its ground, and an arc from every origin to it. */
export function selectionPlot(
  overview: MapOverview,
  target: LineupTarget,
  activeVariant: LineupVariant | undefined,
  colors: RadarColors,
): SelectionPlot | null {
  const lead = target.variants[0];
  if (lead === undefined) return null;

  const { type } = lead.representative.thrown.grenade;
  const origins = new Float32Array(target.variants.length * 2);

  target.variants.forEach(({ origin }, index) => {
    origins[index * 2] = plateX(overview, origin.x, origin.z);
    origins[index * 2 + 1] = plateY(overview, origin.y, origin.z);
  });

  return {
    landingX: plateX(overview, target.landing.x, target.landing.z),
    landingY: plateY(overview, target.landing.y, target.landing.z),
    radiusPlatePx: grenadeRadiusUnits(type) / overview.scale,
    color: grenadeColor(type, colors),
    origins,
    active: Math.max(0, activeVariant === undefined ? 0 : target.variants.indexOf(activeVariant)),
  };
}
