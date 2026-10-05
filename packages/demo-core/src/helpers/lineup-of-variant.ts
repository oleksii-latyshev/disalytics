import type { Lineup } from './lineups';
import type { LineupVariant } from './match-lineups';

export interface LineupOfVariantOptions {
  readonly map: string;
  readonly title: string;
  readonly targetCallout: string | undefined;
  readonly createdAt: number;
}

/**
 * The id a variant is saved under: the map and the variant's own identity, so saving the same
 * variant of a match again replaces the lineup rather than adding a second one.
 */
export function savedLineupId(map: string, variant: LineupVariant): string {
  return `demo:${map}:${variant.id}`;
}

/** A variant as the lineup it would be saved as, with everything the throw recorded filled in. */
export function lineupOfVariant(variant: LineupVariant, options: LineupOfVariantOptions): Lineup {
  const { detail } = variant.representative;
  const { landing } = variant;

  return {
    id: savedLineupId(options.map, variant),
    title: options.title,
    map: options.map,
    side: variant.side,
    kind: variant.kind,
    ...(options.targetCallout === undefined ? {} : { targetCallout: options.targetCallout }),
    origin: variant.origin,
    landing,
    pitch: detail.pitch,
    yaw: detail.yaw,
    throwType: variant.throwType,
    movementKeys: variant.movementKeys,
    movementKeysSummary: detail.movementKeysSummary,
    command: variant.command,
    landingCommand: `setpos ${landing.x.toFixed(2)} ${landing.y.toFixed(2)} ${landing.z.toFixed(2)}`,
    fromDemo: true,
    isBuiltIn: false,
    createdAt: options.createdAt,
  };
}
