import {
  type Frame,
  frameForTick,
  killWeaponClass,
  type ParsedDemo,
  type PlayerSlot,
  sidesBySlotAtRound,
  type Team,
  type Tick,
  type WeaponClass,
  type WeaponId,
} from '@disa/demo-core';

/**
 * How many rows the feed holds — DESIGN.md §5.4. It is a cap on what is *shown*, not on what is
 * derived: a round that runs past eight events keeps every one of them in the round's own list and
 * shows the last eight, so scrubbing backwards brings the earlier ones back rather than losing them.
 */
export const FEED_ROW_LIMIT = 8;

export type FeedEvent =
  | {
      readonly kind: 'kill';
      /** `null` when the world did the killing — fall damage, or the `kill` command. */
      readonly attacker: PlayerSlot | null;
      readonly victim: PlayerSlot;
      readonly attackerSide: Team | undefined;
      readonly victimSide: Team | undefined;
      /** From `killWeaponClass`: `Kill.weapon` is the internal vocabulary, not the display one. */
      readonly weapon: WeaponClass;
      /**
       * The weapon as the demo named it, for the row's accessible name. Game vocabulary reaches a
       * label untranslated, the way a team row's does (§5.3) — and this is the *kill* vocabulary,
       * so it reads `ak47` where a team row reads `AK-47` until #53 makes them one.
       */
      readonly weaponName: WeaponId;
      readonly isHeadshot: boolean;
      readonly isWallbang: boolean;
      readonly isThroughSmoke: boolean;
    }
  | { readonly kind: 'plant'; readonly planter: PlayerSlot }
  | { readonly kind: 'defuse'; readonly defuser: PlayerSlot };

export interface FeedRow {
  /** Stable for the whole match, which is what identifies a row to React and to its arrival. */
  readonly id: string;
  readonly frame: Frame;
  readonly event: FeedEvent;
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

    rows.push({
      id: `kill-${index}`,
      frame: frameForTick(demo.track, kill.tick),
      event: {
        kind: 'kill',
        attacker: kill.attacker,
        victim: kill.victim,
        attackerSide: kill.attacker === null ? undefined : sides[kill.attacker],
        victimSide: sides[kill.victim],
        weapon: killWeaponClass(kill.weapon),
        weaponName: kill.weapon,
        isHeadshot: kill.isHeadshot,
        isWallbang: kill.isWallbang,
        isThroughSmoke: kill.isThroughSmoke,
      },
    });
  });

  demo.events.plants.forEach((plant, index) => {
    if (!isInWindow(window, plant.tick)) return;

    rows.push({
      id: `plant-${index}`,
      frame: frameForTick(demo.track, plant.tick),
      event: { kind: 'plant', planter: plant.planter },
    });
  });

  demo.events.defuses.forEach((defuse, index) => {
    if (defuse.outcome.status !== 'completed') return;
    if (!isInWindow(window, defuse.outcome.tick)) return;

    rows.push({
      id: `defuse-${index}`,
      frame: frameForTick(demo.track, defuse.outcome.tick),
      event: { kind: 'defuse', defuser: defuse.defuser },
    });
  });

  return rows.sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
}

/**
 * The last `FEED_ROW_LIMIT` events before the playhead, newest first — DESIGN.md §5.4.
 *
 * A function of the playhead rather than a log that accumulates, which is what makes scrubbing
 * backwards take rows away again. It walks one round's list, which is a dozen events, so it is
 * cheap enough to run at the readout; what it must never do is walk the match.
 */
export function visibleFeed(rows: readonly FeedRow[], frame: number): readonly FeedRow[] {
  let end = rows.length;
  while (end > 0 && (rows[end - 1]?.frame ?? 0) > frame) end -= 1;

  const start = Math.max(end - FEED_ROW_LIMIT, 0);
  const visible: FeedRow[] = [];

  for (let index = end - 1; index >= start; index -= 1) {
    const row = rows[index];
    if (row !== undefined) visible.push(row);
  }

  return visible;
}
