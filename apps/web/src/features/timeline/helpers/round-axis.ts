import {
  asFrame,
  type DefuseOutcome,
  type Frame,
  frameForTick,
  killWeaponClass,
  killWeaponIcon,
  killWeaponName,
  lastFrame,
  type ParsedDemo,
  type PlayerSlot,
  sidesBySlotAtRound,
  type Team,
  type Tick,
  type UtilityKind,
  utilityKindOfGrenade,
} from '@disa/demo-core';
import type { KillRow } from '@/core/events';

/**
 * How much room one glyph needs before a row of them stops being a row of symbols — DESIGN.md §7.1's
 * collapse threshold. Measured against the average pitch rather than the narrowest gap on the axis:
 * two kills in the same second are a double kill and happen in most rounds, and letting one pair
 * decide the form would put a whole round's axis back to marks for a reason nobody can see.
 *
 * It is one glyph's width, so it moves with the glyph: the symbols are 24px since the owner read the
 * built axis as unreadably small, and a threshold left at the old 12px box would have drawn them
 * overlapping instead of collapsing.
 */
export const GLYPH_PITCH_PX = 24;

/**
 * The stretch of match the timeline is scoped to — one round, or the warm-up before the first one.
 *
 * It runs to where the *next* round starts rather than to `Round.endTick`, and that is a deliberate
 * departure from §7.1's letter. The two are five to seven seconds apart, the clock passes through
 * them at the end of every round, and a strip that stops at `endTick` parks its playhead against the
 * right edge for all of it — once per round. The round's own close is drawn on the axis instead, and
 * glyphs still stop at `endTick`, so the tail is time the reader can reach rather than round.
 */
export interface TimelineSegment {
  /** `null` during warm-up, which no round covers. */
  readonly roundNumber: number | null;
  readonly startFrame: Frame;
  readonly endFrame: Frame;
  /** Where the buy phase ends, as a fraction of the segment. `null` during warm-up. */
  readonly buyEndFraction: number | null;
  /** Where the round itself closed, as a fraction of the segment. `null` during warm-up. */
  readonly closeFraction: number | null;
}

/**
 * A kill on the axis is the same `KillRow` §5.4's feed draws, because §7.1's tooltip draws that row.
 * `victimSide` is what tints the skull; the rest of it is the tooltip's, and none of it costs
 * anything at the readout — `axisGlyphs` runs once per round.
 */
export type AxisEvent =
  | ({ readonly kind: 'kill' } & KillRow)
  | { readonly kind: 'plant'; readonly planter: PlayerSlot }
  | {
      readonly kind: 'defuse';
      readonly defuser: PlayerSlot;
      readonly status: DefuseOutcome['status'];
    }
  | { readonly kind: 'grenade'; readonly thrower: PlayerSlot; readonly utility: UtilityKind };

export interface AxisGlyph {
  /** Stable across renders inside one round, which is what identifies a glyph to React. */
  readonly id: string;
  readonly frame: Frame;
  /** Where the glyph sits along the segment, in [0, 1]. */
  readonly fraction: number;
  readonly event: AxisEvent;
}

interface RoundWindow {
  readonly startTick: Tick;
  readonly endTick: Tick;
  readonly startFrame: Frame;
  readonly span: number;
}

function clamped(fraction: number): number {
  return fraction < 0 ? 0 : fraction > 1 ? 1 : fraction;
}

function fractionOf(frame: number, startFrame: number, span: number): number {
  return span <= 0 ? 0 : clamped((frame - startFrame) / span);
}

function warmupSegment(demo: ParsedDemo): TimelineSegment {
  const first = demo.events.rounds.at(0);

  return {
    roundNumber: null,
    startFrame: asFrame(0),
    endFrame:
      first === undefined ? lastFrame(demo.track) : frameForTick(demo.track, first.startTick),
    buyEndFraction: null,
    closeFraction: null,
  };
}

/** The stretch the axis covers for the round a sample position falls in. */
export function timelineSegment(demo: ParsedDemo, roundIndex: number | undefined): TimelineSegment {
  if (roundIndex === undefined) return warmupSegment(demo);

  const round = demo.events.rounds.at(roundIndex);
  if (round === undefined) return warmupSegment(demo);

  const next = demo.events.rounds.at(roundIndex + 1);
  const startFrame = frameForTick(demo.track, round.startTick);
  const endFrame =
    next === undefined ? lastFrame(demo.track) : frameForTick(demo.track, next.startTick);
  const span = endFrame - startFrame;

  return {
    roundNumber: round.number,
    startFrame,
    endFrame,
    buyEndFraction: fractionOf(frameForTick(demo.track, round.freezeTimeEndTick), startFrame, span),
    closeFraction: fractionOf(frameForTick(demo.track, round.endTick), startFrame, span),
  };
}

/** Where the playhead sits along a segment drawn `widthPx` wide. */
export function positionInSegment(
  frame: number,
  segment: TimelineSegment,
  widthPx: number,
): number {
  return fractionOf(frame, segment.startFrame, segment.endFrame - segment.startFrame) * widthPx;
}

/**
 * Whether the glyphs have room to be symbols. Below it they collapse to marks — §7.1 — which keeps
 * every event on the axis and loses only the shape that says which kind it was.
 */
export function hasRoomForGlyphs(count: number, widthPx: number): boolean {
  return count === 0 || widthPx / count >= GLYPH_PITCH_PX;
}

/** The tick a defuse is marked at: where it finished, or where it began when it never did. */
function defuseTick(outcome: DefuseOutcome, startTick: Tick): Tick {
  return outcome.status === 'interrupted' ? startTick : outcome.tick;
}

function glyphAt(
  demo: ParsedDemo,
  window: RoundWindow,
  tick: Tick,
  id: string,
  event: AxisEvent,
): AxisGlyph {
  const frame = frameForTick(demo.track, tick);

  return { id, frame, fraction: fractionOf(frame, window.startFrame, window.span), event };
}

function isInWindow(window: RoundWindow, tick: Tick): boolean {
  return tick >= window.startTick && tick <= window.endTick;
}

function killGlyphs(
  demo: ParsedDemo,
  window: RoundWindow,
  sides: readonly (Team | undefined)[],
): AxisGlyph[] {
  const glyphs: AxisGlyph[] = [];

  demo.events.kills.forEach((kill, index) => {
    if (!isInWindow(window, kill.tick)) return;

    glyphs.push(
      glyphAt(demo, window, kill.tick, `kill-${index}`, {
        kind: 'kill',
        attacker: kill.attacker,
        victim: kill.victim,
        attackerSide: kill.attacker === null ? undefined : sides[kill.attacker],
        victimSide: sides[kill.victim],
        weapon: killWeaponClass(kill.weapon),
        weaponIcon: killWeaponIcon(kill.weapon),
        weaponName: killWeaponName(kill.weapon),
        isHeadshot: kill.isHeadshot,
        isWallbang: kill.isWallbang,
        isThroughSmoke: kill.isThroughSmoke,
      }),
    );
  });

  return glyphs;
}

function plantGlyphs(demo: ParsedDemo, window: RoundWindow): AxisGlyph[] {
  const glyphs: AxisGlyph[] = [];

  demo.events.plants.forEach((plant, index) => {
    if (!isInWindow(window, plant.tick)) return;

    glyphs.push(
      glyphAt(demo, window, plant.tick, `plant-${index}`, {
        kind: 'plant',
        planter: plant.planter,
      }),
    );
  });

  return glyphs;
}

function defuseGlyphs(demo: ParsedDemo, window: RoundWindow): AxisGlyph[] {
  const glyphs: AxisGlyph[] = [];

  demo.events.defuses.forEach((defuse, index) => {
    const tick = defuseTick(defuse.outcome, defuse.startTick);
    if (!isInWindow(window, tick)) return;

    glyphs.push(
      glyphAt(demo, window, tick, `defuse-${index}`, {
        kind: 'defuse',
        defuser: defuse.defuser,
        status: defuse.outcome.status,
      }),
    );
  });

  return glyphs;
}

function grenadeGlyphs(demo: ParsedDemo, window: RoundWindow): AxisGlyph[] {
  const glyphs: AxisGlyph[] = [];

  // Where the utility took effect, falling back to the throw. A `null` detonation is an ending the
  // demo never recorded rather than a grenade still in the air (#175), so the throw is what is left.
  demo.events.grenades.forEach((grenade, index) => {
    const tick = grenade.detonationTick ?? grenade.throwTick;
    if (!isInWindow(window, tick)) return;

    glyphs.push(
      glyphAt(demo, window, tick, `nade-${index}`, {
        kind: 'grenade',
        thrower: grenade.thrower,
        utility: utilityKindOfGrenade(grenade.type),
      }),
    );
  });

  return glyphs;
}

/**
 * Every event the round holds, in the order they happened, derived once per round — never inside a
 * draw or a render running at the readout's rate (#91).
 *
 * The window closes at `Round.endTick` rather than at the segment's end: the seconds after a round
 * belong to the next buy, and the kills in them are the post-round kills §7.3 refuses to count.
 */
export function axisGlyphs(
  demo: ParsedDemo,
  roundIndex: number | undefined,
  segment: TimelineSegment,
): readonly AxisGlyph[] {
  if (roundIndex === undefined) return [];

  const round = demo.events.rounds.at(roundIndex);
  if (round === undefined) return [];

  const window: RoundWindow = {
    startTick: round.startTick,
    endTick: round.endTick,
    startFrame: segment.startFrame,
    span: segment.endFrame - segment.startFrame,
  };
  const sides = sidesBySlotAtRound(demo, roundIndex);

  return [
    ...killGlyphs(demo, window, sides),
    ...plantGlyphs(demo, window),
    ...defuseGlyphs(demo, window),
    ...grenadeGlyphs(demo, window),
  ].sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
}

/** What §7.1's tooltip needs of a glyph: where to hang, and the row to draw there. */
export interface NamedKill {
  readonly fraction: number;
  readonly event: Extract<AxisEvent, { kind: 'kill' }>;
}

/**
 * The glyph a tooltip is owed, which is a kill and only a kill — §7.1.
 *
 * §9.2 is what draws the line rather than taste: the tooltip is permitted because §5.4's feed draws
 * the same row, and pressing a glyph seeks to it, so the row is always reachable without hovering. A
 * grenade is on no feed at all, and an aborted or interrupted defuse is on the axis alone, so a
 * tooltip for either would be the only route to its own fact.
 *
 * It takes the glyph's id rather than its position: a round turning over replaces the whole list
 * under a held pointer, and an index into the old one names a different event in the new one.
 */
export function namedKill(glyphs: readonly AxisGlyph[], id: string | null): NamedKill | undefined {
  if (id === null) return undefined;

  const glyph = glyphs.find((candidate) => candidate.id === id);
  if (glyph === undefined || glyph.event.kind !== 'kill') return undefined;

  return { fraction: glyph.fraction, event: glyph.event };
}
