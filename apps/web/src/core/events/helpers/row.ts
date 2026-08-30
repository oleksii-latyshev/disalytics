import type { Frame, PlayerSlot, Team, WeaponClass, WeaponIconId, WeaponId } from '@disa/demo-core';

/**
 * One kill, as both readers of the row need it — §5.4's feed and §7.1's tooltip on the round axis.
 *
 * It is one type rather than two that agree, which is the whole point: the two surfaces draw the
 * same row, so a field either exists for both of them or for neither. The four marks the schema
 * also carries — `isNoScope`, `isAttackerBlind`, `isVictimBlind`, `distanceUnits` — are absent by
 * decision rather than by oversight: §7.1 leaves them to the stats view.
 */
export interface KillRow {
  /** `null` when the world did the killing — fall damage, or the `kill` command. */
  readonly attacker: PlayerSlot | null;
  readonly victim: PlayerSlot;
  /** The sides held *that* round, never `PlayerInfo.team`, which is read at the end of the match. */
  readonly attackerSide: Team | undefined;
  readonly victimSide: Team | undefined;
  /** From `killWeaponClass`: `Kill.weapon` is the internal vocabulary, not the display one. */
  readonly weapon: WeaponClass;
  /**
   * The model's own outline, where the product has one. It sits beside the class rather than
   * replacing it because a kill by the world, by utility or by a weapon nobody has drawn still has
   * a class to fall back on.
   */
  readonly weaponIcon: WeaponIconId | undefined;
  /**
   * The weapon as the demo named it, for whatever accessible name the caller builds. Game
   * vocabulary reaches a label untranslated, the way a team row's does (§5.3) — and this is the
   * *kill* vocabulary, so it reads `ak47` where a team row reads `AK-47` until #53 makes them one.
   */
  readonly weaponName: WeaponId;
  readonly isHeadshot: boolean;
  readonly isWallbang: boolean;
  readonly isThroughSmoke: boolean;
}

/** What a row can be. The axis carries grenades too; a grenade is never a row (§7.1). */
export type RowEvent =
  | ({ readonly kind: 'kill' } & KillRow)
  | { readonly kind: 'plant'; readonly planter: PlayerSlot }
  | { readonly kind: 'defuse'; readonly defuser: PlayerSlot };

/**
 * How a row turns a slot into a name. It stays the caller's own because the empty answer is: the
 * feed says one thing for a slot it cannot name and the axis says another, in their own namespaces.
 */
export type NameOfSlot = (slot: PlayerSlot | null) => string;

/**
 * The one kill the plate is drawing a line for — §5.4's hover, handed from the feed to the radar.
 *
 * It is a separate type from `KillRow` rather than the same one because the two answer different
 * questions. A row says *what happened*; a line says *where*, so it carries the frame the two
 * positions are read at and drops every mark that qualifies the kill. Its `attacker` is a slot
 * rather than `PlayerSlot | null`: the world has no position on the plate, so a world kill has no
 * line and never reaches here.
 *
 * The sides travel with it instead of being looked up at draw time. The feed is clipped to the
 * round being played, so the round's own sides would give the same answer today — and would
 * silently give the wrong one the day anything hands over a kill from another round.
 */
export interface KillLine {
  readonly frame: Frame;
  readonly attacker: PlayerSlot;
  readonly victim: PlayerSlot;
  readonly attackerSide: Team | undefined;
  readonly victimSide: Team | undefined;
}
