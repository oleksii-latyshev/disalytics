import {
  FLAG_ALIVE,
  frameForTick,
  type ParsedDemo,
  type PlayerSlot,
  roundOpeningFrame,
  sampleAt,
  sidesBySlotAtRound,
  type Team,
  type TickTrack,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';

/**
 * How many bins the map is divided into on each axis. At 1024 radar pixels a bin is 8 of them,
 * which is about 60 world units — a little under a player's own width, so a corridor is several
 * bins across and a spawn is not one square.
 */
export const HEAT_GRID = 128;

/** Where the ramp's hot end sits in the lit bins' own distribution. Everything past it saturates. */
const HOT_QUANTILE = 0.95;

/** Which samples count towards the field. Both are `null` for the match as a whole. */
export interface PresenceScope {
  readonly side: Team | null;
  readonly subject: PlayerSlot | null;
}

export interface PresenceField {
  /** `HEAT_GRID²` weights in 0..1, row-major, densest bin at 1. */
  readonly bins: Float32Array;
  /** Seconds each slot spent alive inside the side scope, indexed by slot. */
  readonly secondsBySlot: Float32Array;
  /** Seconds the field itself is made of, which is what the reading above it states. */
  readonly seconds: number;
}

interface FieldWalk {
  readonly track: TickTrack;
  readonly overview: MapOverview;
  readonly scope: PresenceScope;
  readonly bins: Float32Array;
  readonly secondsBySlot: Float32Array;
  samples: number;
}

function binFrame(walk: FieldWalk, frame: number, sides: readonly (Team | undefined)[]): void {
  const { track, overview, scope, bins, secondsBySlot } = walk;
  const binScale = HEAT_GRID / RADAR_IMAGE_SIZE;
  const base = frame * track.slotCount;

  for (let slot = 0; slot < track.slotCount; slot++) {
    const sample = base + slot;

    if ((sampleAt(track.flags, sample) & FLAG_ALIVE) === 0) continue;
    if (scope.side !== null && sides[slot] !== scope.side) continue;

    secondsBySlot[slot] = sampleAt(secondsBySlot, slot) + 1 / track.sampleHz;
    if (scope.subject !== null && slot !== scope.subject) continue;

    const x = Math.floor(radarX(overview, sampleAt(track.posX, sample)) * binScale);
    const y = Math.floor(radarY(overview, sampleAt(track.posY, sample)) * binScale);
    if (x < 0 || y < 0 || x >= HEAT_GRID || y >= HEAT_GRID) continue;

    bins[y * HEAT_GRID + x] = sampleAt(bins, y * HEAT_GRID + x) + 1;
    walk.samples++;
  }
}

/** The sample count the ramp's hot end stands at, over the bins that were reached at all. */
function hotCeiling(bins: Float32Array): number {
  const lit = bins.filter((weight) => weight > 0).sort();
  if (lit.length === 0) return 0;

  return sampleAt(lit, Math.min(lit.length - 1, Math.floor(lit.length * HOT_QUANTILE)));
}

/**
 * Where the match was spent, as a grid of time rather than as a list of positions.
 *
 * **Only living samples count.** A body lies where it fell until the round ends, and counting it
 * would put the heaviest mark of every round on the spot somebody died on rather than on the ground
 * the round was played over.
 *
 * **A round is counted from the end of its freeze time**, which is `roundOpeningFrame`'s own
 * definition: the first moment its players stand where they chose to rather than where they
 * spawned. Counting from `startTick` puts twenty seconds of every round on two spawn points —
 * eight minutes of this match, and a tactical timeout in round 13 that holds ten players still for
 * another four. Warmup is not a round at all and is left out for the reason `matchDuels` leaves out
 * post-round kills: it is not the match. Sides swap, so `PlayerInfo.team` would put half the match
 * on the wrong side (`sidesBySlotAtRound`).
 *
 * **The field has no level.** A whole match stands on every floor the map has, so unlike one frame
 * (`busiestLevelIndex`) or one kill (§6.3's faded end) there is nothing to choose between: every
 * sample is binned where it stands on the plan, and a two-storey map reads as both floors at once.
 *
 * **The ramp tops out at a quantile rather than at the densest bin**, and that is what makes the
 * field a reading rather than a green wash. A match's time is spent very unevenly: measured over
 * this match's 5,946 lit bins the median holds 25 samples, the 95th percentile 148 and the single
 * densest 2,205, so against the peak alone half the ground resolves to a tenth of the ramp and
 * nothing but one plant spot is ever hot. Against `HOT_QUANTILE` the top 5% of the ground saturates
 * — 298 bins here, 955 above half the ramp — and the corridors between them keep their step.
 */
export function presenceField(
  demo: ParsedDemo,
  overview: MapOverview,
  scope: PresenceScope,
): PresenceField {
  const { track } = demo;
  const walk: FieldWalk = {
    track,
    overview,
    scope,
    bins: new Float32Array(HEAT_GRID * HEAT_GRID),
    secondsBySlot: new Float32Array(track.slotCount),
    samples: 0,
  };

  for (const [roundIndex, round] of demo.events.rounds.entries()) {
    const sides = sidesBySlotAtRound(demo, roundIndex);
    const lastFrame = frameForTick(track, round.endTick);

    for (let frame = roundOpeningFrame(demo, roundIndex); frame <= lastFrame; frame++) {
      binFrame(walk, frame, sides);
    }
  }

  const { bins, secondsBySlot, samples } = walk;
  const ceiling = hotCeiling(bins);

  for (let bin = 0; ceiling > 0 && bin < bins.length; bin++) {
    bins[bin] = Math.min(sampleAt(bins, bin) / ceiling, 1);
  }

  return { bins, secondsBySlot, seconds: samples / track.sampleHz };
}
