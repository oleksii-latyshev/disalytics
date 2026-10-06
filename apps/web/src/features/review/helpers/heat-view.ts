import {
  type HeatMode,
  type HeatPoints,
  type HeatScope,
  type HeatTally,
  heatWindowOfBins,
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
  type HeatRings,
  type HeatSource,
  heatBinsOf,
  heatDifference,
  heatFieldOf,
  heatFieldOfBins,
  heatRingsOf,
  overlayPicture,
  ringPicture,
  routesOverlap,
  warmBin,
} from '@/features/radar';

/** The two readings the screen leads with, and the four it keeps under *More*. */
export const OTHER_READINGS = ['damageDealt', 'damageTaken', 'kills', 'utility'] as const;

export type HeatReading = 'stood' | 'died' | (typeof OTHER_READINGS)[number];

/**
 * Two compared players on two plates, on one plate laid over each other, or on one as the
 * difference between them.
 */
export type HeatCompareView = 'side' | 'overlay' | 'difference';

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

type Who = 'first' | 'second';

/** Where the fields and rings of a view come from: built on the spot, or summed from kept steps. */
interface Provider {
  field(who: Who, read: HeatMode): HeatField;
  rings(who: Who, read: HeatMode): HeatRings;
}

const NO_SLOTS = new Float32Array(0);

export function readOf(reading: HeatReading): HeatMode {
  if (reading === 'stood') return 'presence';

  return reading === 'died' ? 'deaths' : reading;
}

function sourceOfDemo(demo: ParsedDemo, read: HeatMode, scope: HeatScope): HeatSource {
  return (visit) => walkHeat(demo, read, scope, visit);
}

function sourceOfPoints(points: HeatPoints, read: HeatMode, scope: HeatScope): HeatSource {
  const { side, buy, window } = scope;

  return (visit) => ({
    bySlot: NO_SLOTS,
    total: replayHeatPoints(points, read, { side, buy, window }, visit),
  });
}

function sourceOf(input: HeatViewInput, who: Who, read: HeatMode, scope: HeatScope): HeatSource {
  return who === 'first' || input.second === null
    ? sourceOfDemo(input.demo, read, scope)
    : sourceOfPoints(input.second, read, scope);
}

function directProvider(input: HeatViewInput): Provider {
  const fields = new Map<string, HeatField>();

  return {
    field(who, read) {
      const key = `${who}:${read}`;
      const known = fields.get(key);
      if (known !== undefined) return known;

      const made = heatFieldOf(input.overview, sourceOf(input, who, read, input.scope));
      fields.set(key, made);

      return made;
    },
    rings: (who, read) => heatRingsOf(input.overview, sourceOf(input, who, read, input.scope)),
  };
}

function fieldPlate(field: HeatField, identity: HeatIdentity): HeatPlateSpec {
  return { picture: fieldPicture(field, identity), identity, total: field.total };
}

function ringPlate(rings: HeatRings, identity: HeatIdentity): HeatPlateSpec {
  return { picture: ringPicture(rings, identity), identity, total: rings.total };
}

/** Both players on one plate: the second striped, or dashed for rings, so hue is not all that tells them apart. */
function overlayPlate(first: HeatPicture, second: HeatPicture, total: number): HeatPlateSpec {
  return { picture: overlayPicture(first, second), identity: 'first', total };
}

function onePlayer(reading: HeatReading, provider: Provider): HeatView {
  const read = readOf(reading);

  if (reading === 'died') {
    const rings = provider.rings('first', read);

    return { plates: [ringPlate(rings, 'field')], roster: rings, overlap: null };
  }

  const field = provider.field('first', read);

  return { plates: [fieldPlate(field, 'field')], roster: field, overlap: null };
}

/** Two players, each narrowed by the same side, buy and part of the round. */
function twoPlayers(reading: HeatReading, view: HeatCompareView, provider: Provider): HeatView {
  const read = readOf(reading);
  const overlap = routesOverlap(
    provider.field('first', 'presence'),
    provider.field('second', 'presence'),
  );

  if (view === 'overlay' && reading === 'died') {
    const first = provider.rings('first', read);
    const second = provider.rings('second', read);

    return {
      plates: [
        overlayPlate(ringPicture(first, 'first'), ringPicture(second, 'second', true), first.total),
      ],
      roster: first,
      overlap,
    };
  }

  if (view === 'side' && reading === 'died') {
    const first = provider.rings('first', read);

    return {
      plates: [ringPlate(first, 'first'), ringPlate(provider.rings('second', read), 'second')],
      roster: first,
      overlap,
    };
  }

  const first = provider.field('first', read);
  const second = provider.field('second', read);

  if (view === 'side') {
    return {
      plates: [fieldPlate(first, 'first'), fieldPlate(second, 'second')],
      roster: first,
      overlap,
    };
  }

  if (view === 'overlay') {
    return {
      plates: [
        overlayPlate(
          fieldPicture(first, 'first'),
          fieldPicture(second, 'second', true),
          first.total,
        ),
      ],
      roster: first,
      overlap,
    };
  }

  // Divided by its own total first, each: what is compared is the share of a player's time or marks.
  const difference = heatDifference(first, second);

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

function compose(input: HeatViewInput, provider: Provider): HeatView {
  return input.second === null
    ? onePlayer(input.reading, provider)
    : twoPlayers(input.reading, input.view, provider);
}

/**
 * Everything the heat screen draws and states, from the match, the narrowing and what is kept of
 * the second player. Pure and synchronous, and run when a choice changes — never in a draw — so a
 * press costs one field per player and a repaint costs none.
 */
export function buildHeatView(input: HeatViewInput): HeatView {
  return compose(input, directProvider(input));
}

/**
 * *Play round*'s source of views. The match and the second player are walked once, into the steps
 * of the round-time axis; a window is then the sum of the steps it covers, so a step of the play
 * costs a sum and a repaint and not a walk.
 *
 * `warm` smooths a step ahead of the playhead, in a task of its own, so that no step has to.
 * Created when the play starts and dropped when it ends: it holds a grid per step per player.
 */
export interface HeatPlayer {
  view(first: number, last: number): HeatView;
  warm(step: number): void;
}

export function createHeatPlayer(input: HeatViewInput): HeatPlayer {
  const { demo, overview, scope } = input;
  const everyone = { ...scope, subject: null, window: null };
  const bins = new Map<string, ReturnType<typeof heatBinsOf>>();

  const binsOf = (who: Who, read: HeatMode) => {
    const key = `${who}:${read}`;
    const known = bins.get(key);
    if (known !== undefined) return known;

    const made =
      who === 'first' || input.second === null
        ? heatBinsOf(
            overview,
            sourceOfDemo(demo, read, everyone),
            scope.subject,
            demo.track.slotCount,
          )
        : heatBinsOf(overview, sourceOfPoints(input.second, read, everyone), null, 1);
    bins.set(key, made);

    return made;
  };

  return {
    view(first, last) {
      const window = heatWindowOfBins(first, last);
      const stepInput = { ...input, scope: { ...scope, window } };
      const rings = directProvider(stepInput);
      const fields = new Map<string, HeatField>();

      return compose(input, {
        rings: rings.rings,
        field(who, read) {
          const key = `${who}:${read}`;
          const known = fields.get(key);
          if (known !== undefined) return known;

          const made = heatFieldOfBins(binsOf(who, read), first, last);
          fields.set(key, made);

          return made;
        },
      });
    },
    warm(step) {
      for (const made of bins.values()) warmBin(made, step);
    },
  };
}
