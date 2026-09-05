import {
  type Frame,
  frameForTick,
  grenadeEndTick,
  killWeaponClass,
  killWeaponIcon,
  killWeaponName,
  type ParsedDemo,
  sidesBySlotAtRound,
  type Tick,
  utilityKindOfGrenade,
} from '@disa/demo-core';
import type { RowEvent, RowFocus } from '@/core/events';

/**
 * How many rows the feed holds — DESIGN.md §5.4. It is a cap on what is *shown*, not on what is
 * derived: a round that runs past eight events keeps every one of them in the round's own list and
 * shows the last eight, so scrubbing backwards brings the earlier ones back rather than losing them.
 */
export const FEED_ROW_LIMIT = 8;

export interface FeedRow {
  /** Stable for the whole match, which is what identifies a row to React and to its arrival. */
  readonly id: string;
  readonly frame: Frame;
  /**
   * The last frame the row is shown on, or `null` for a row that has no ending.
   *
   * Only a grenade has one, and it is that grenade's own life: the row is on screen for exactly as
   * long as its mark is on the plate, which is what `ROADMAP.md` means by the row's window and what
   * keeps a buy phase's utility from holding the feed for the rest of the round. A kill, a plant and
   * a defuse are moments rather than objects, so they leave only when the reader scrubs past them or
   * a newer row pushes them out.
   */
  readonly untilFrame: Frame | null;
  /**
   * What the plate draws while this row is hovered or focused — §5.4's other half — or `null` for a
   * row that points at nothing there. Derived once per round with the row rather than at the
   * readout's rate, the way everything else on a row is.
   */
  readonly focus: RowFocus | null;
  readonly event: RowEvent;
}

interface RoundWindow {
  readonly startTick: Tick;
  readonly endTick: Tick;
}

function isInWindow(window: RoundWindow, tick: Tick): boolean {
  return tick >= window.startTick && tick <= window.endTick;
}

/**
 * Every event the feed can show for one round, oldest first, derived **once per round** — the same
 * rule `axisGlyphs` follows and for the same measured reason (#91): this must never run inside a
 * render at the 10 Hz readout's rate.
 *
 * The window closes at `Round.endTick` rather than at the next round's start, so the post-round
 * kills §7.3 refuses to count never reach the feed either. The rows stay on screen through the tail
 * after the round, because `visibleFeed` asks only that an event has already happened.
 *
 * **Only a completed defuse is an objective row.** A defuse that was aborted or interrupted is not
 * something that happened — and when a defuser was killed, the kill is already a row of its own.
 * §7.1's axis carries all three statuses; the axis is the round's record and the feed is its
 * headline.
 */
export function roundFeed(demo: ParsedDemo, roundIndex: number | undefined): readonly FeedRow[] {
  if (roundIndex === undefined) return [];

  const round = demo.events.rounds.at(roundIndex);
  if (round === undefined) return [];

  const window: RoundWindow = { startTick: round.startTick, endTick: round.endTick };
  const sides = sidesBySlotAtRound(demo, roundIndex);
  const rows: FeedRow[] = [];

  demo.events.kills.forEach((kill, index) => {
    if (!isInWindow(window, kill.tick)) return;

    const row = {
      id: `kill-${index}`,
      frame: frameForTick(demo.track, kill.tick),
      untilFrame: null,
      event: {
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
      },
    } satisfies Omit<FeedRow, 'focus'>;

    rows.push({ ...row, focus: focusOf(row) });
  });

  demo.events.plants.forEach((plant, index) => {
    if (!isInWindow(window, plant.tick)) return;

    rows.push({
      id: `plant-${index}`,
      frame: frameForTick(demo.track, plant.tick),
      untilFrame: null,
      focus: null,
      event: { kind: 'plant', planter: plant.planter },
    });
  });

  demo.events.defuses.forEach((defuse, index) => {
    if (defuse.outcome.status !== 'completed') return;
    if (!isInWindow(window, defuse.outcome.tick)) return;

    rows.push({
      id: `defuse-${index}`,
      frame: frameForTick(demo.track, defuse.outcome.tick),
      untilFrame: null,
      focus: null,
      event: { kind: 'defuse', defuser: defuse.defuser },
    });
  });

  // The throw rather than the detonation: a feed row is *who threw what*, and §7.1's glyph is what
  // hangs at the ending. The row's own window is `grenadeEndTick` — one definition of a grenade's
  // life, shared with the plate that draws it (#310).
  demo.events.grenades.forEach((grenade, index) => {
    if (!isInWindow(window, grenade.throwTick)) return;

    rows.push({
      id: `nade-${index}`,
      frame: frameForTick(demo.track, grenade.throwTick),
      untilFrame: frameForTick(demo.track, grenadeEndTick(grenade, demo.track.tickRate)),
      focus: { kind: 'grenade', index },
      event: {
        kind: 'grenade',
        thrower: grenade.thrower,
        throwerSide: sides[grenade.thrower],
        utility: utilityKindOfGrenade(grenade.type),
      },
    });
  });

  return rows.sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
}

/**
 * The last `FEED_ROW_LIMIT` events the playhead is inside, newest first — DESIGN.md §5.4.
 *
 * A function of the playhead rather than a log that accumulates, which is what makes scrubbing
 * backwards take rows away again. It walks one round's list, which is a few dozen events, so it is
 * cheap enough to run at the readout; what it must never do is walk the match.
 *
 * It walks past a row rather than stopping at one, because a grenade row expires (`untilFrame`) and
 * the row before it in time may still be live. The walk is still bounded by the round and stops as
 * soon as the limit is filled.
 */
export function visibleFeed(rows: readonly FeedRow[], frame: number): readonly FeedRow[] {
  const visible: FeedRow[] = [];

  for (let index = rows.length - 1; index >= 0 && visible.length < FEED_ROW_LIMIT; index -= 1) {
    const row = rows[index];
    if (row === undefined) continue;
    if (row.frame > frame) continue;
    if (row.untilFrame !== null && frame > row.untilFrame) continue;

    visible.push(row);
  }

  return visible;
}

/**
 * A kill's own line, which is the only focus that has to be *built* — a grenade already knows which
 * grenade it is, and an objective row points at nothing on the plate. A kill by the world points at
 * nothing either: it has no attacker and so no second end, which is not a case the plate has to be
 * told about.
 */
function focusOf(row: Omit<FeedRow, 'focus'>): RowFocus | null {
  const { event } = row;
  if (event.kind !== 'kill' || event.attacker === null) return null;

  return {
    kind: 'kill',
    line: {
      frame: row.frame,
      attacker: event.attacker,
      victim: event.victim,
      attackerSide: event.attackerSide,
      victimSide: event.victimSide,
    },
  };
}
