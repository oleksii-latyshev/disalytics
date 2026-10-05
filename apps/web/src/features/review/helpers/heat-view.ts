import {
  type HeatMode,
  type HeatPoints,
  type HeatScope,
  type HeatTally,
  type ParsedDemo,
  replayHeatPoints,
  walkHeat,
} from '@disa/demo-core';
import type { MapOverview } from '@disa/map-data';
import {
  differencePicture,
  fieldPicture,
  type HeatField,
  type HeatIdentity,
  type HeatPicture,
  type HeatSource,
  heatDifference,
  heatFieldOf,
  heatRingsOf,
  ringPicture,
  routesOverlap,
} from '@/features/radar';

/** What the reader chose to see: where a player stood, or where they died. */
export type HeatReading = 'stood' | 'died';

/** Two compared players on two plates, or on one, as the difference between them. */
export type HeatCompareView = 'side' | 'difference';

/** One plate of the screen: what is drawn on it, whose it is, and the figure that goes beside it. */
export interface HeatPlateSpec {
  /** `null` for the plate of a comparison the difference of which cannot be told. */
  readonly picture: HeatPicture | null;
  readonly identity: HeatIdentity;
  readonly total: number;
}

export interface HeatView {
  readonly plates: readonly HeatPlateSpec[];
  /** The first player's own figures, read for every seat of the roster. */
  readonly roster: HeatTally;
  /** How much of the two players' routes lie on the same ground, in 0..1; `null` for one player. */
  readonly overlap: number | null;
}

/**
 * The second player of a comparison, as what is kept of them: their points, and which match they
 * are from. The match itself is not kept — it was dropped when these were collected.
 */
export interface HeatSecond {
  readonly points: HeatPoints;
  readonly name: string;
  /** Whether they are from the match on screen or from another one of the library. */
  readonly origin: 'this' | 'library';
}

export interface HeatViewInput {
  readonly demo: ParsedDemo;
  readonly overview: MapOverview;
  readonly reading: HeatReading;
  /** The side, the buy and the part of the round, which apply to both players; and the first one. */
  readonly scope: HeatScope;
  /** What is kept of the second player, `null` when nobody is compared. */
  readonly second: HeatPoints | null;
  readonly view: HeatCompareView;
}

const NO_SLOTS = new Float32Array(0);

function readOf(reading: HeatReading): HeatMode {
  return reading === 'stood' ? 'presence' : 'deaths';
}

function sourceOfDemo(input: HeatViewInput, read: HeatMode): HeatSource {
  return (visit) => walkHeat(input.demo, read, input.scope, visit);
}

function sourceOfPoints(points: HeatPoints, read: HeatMode, scope: HeatScope): HeatSource {
  const { side, buy, window } = scope;

  return (visit) => ({
    bySlot: NO_SLOTS,
    total: replayHeatPoints(points, read, { side, buy, window }, visit),
  });
}

function fieldPlate(field: HeatField, identity: HeatIdentity): HeatPlateSpec {
  return { picture: fieldPicture(field, identity), identity, total: field.total };
}

function onePlayer(input: HeatViewInput): HeatView {
  const { overview, reading } = input;
  const source = sourceOfDemo(input, readOf(reading));

  if (reading === 'stood') {
    const field = heatFieldOf(overview, source);

    return { plates: [fieldPlate(field, 'field')], roster: field, overlap: null };
  }

  const marks = heatRingsOf(overview, source);

  return {
    plates: [
      {
        picture: ringPicture(marks, 'field'),
        identity: 'field',
        total: marks.total,
      },
    ],
    roster: marks,
    overlap: null,
  };
}

/** Two players, each narrowed by the same side, buy and part of the round. */
function twoPlayers(input: HeatViewInput, second: HeatPoints): HeatView {
  const { overview, reading, scope, view } = input;
  const read = readOf(reading);

  const presenceFirst = heatFieldOf(overview, sourceOfDemo(input, 'presence'));
  const presenceSecond = heatFieldOf(overview, sourceOfPoints(second, 'presence', scope));
  const overlap = routesOverlap(presenceFirst, presenceSecond);

  if (reading === 'stood' && view === 'side') {
    return {
      plates: [fieldPlate(presenceFirst, 'first'), fieldPlate(presenceSecond, 'second')],
      roster: presenceFirst,
      overlap,
    };
  }

  if (reading === 'died' && view === 'side') {
    const first = heatRingsOf(overview, sourceOfDemo(input, read));
    const other = heatRingsOf(overview, sourceOfPoints(second, read, scope));
    const ring = (marks: typeof first, identity: HeatIdentity): HeatPlateSpec => ({
      picture: ringPicture(marks, identity),
      identity,
      total: marks.total,
    });

    return { plates: [ring(first, 'first'), ring(other, 'second')], roster: first, overlap };
  }

  // The difference of where they stood is the difference of the routes; of where they died, of the
  // blurred deaths. Either way each side is divided by its own total first.
  const first =
    reading === 'stood' ? presenceFirst : heatFieldOf(overview, sourceOfDemo(input, read));
  const other =
    reading === 'stood'
      ? presenceSecond
      : heatFieldOf(overview, sourceOfPoints(second, read, scope));
  const difference = heatDifference(first, other);

  return {
    plates: [
      {
        picture: difference === null ? null : differencePicture(difference),
        identity: 'first',
        total: first.total,
      },
    ],
    roster: first,
    overlap,
  };
}

/**
 * Everything the heat screen draws and states, from the match, the narrowing and what is kept of
 * the second player. Pure and synchronous, and run when a choice changes — never in a draw — so a
 * press costs one field per player and a repaint costs none.
 */
export function buildHeatView(input: HeatViewInput): HeatView {
  return input.second === null ? onePlayer(input) : twoPlayers(input, input.second);
}
