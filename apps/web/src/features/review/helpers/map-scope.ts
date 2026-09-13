import {
  asFrame,
  type Duel,
  type Frame,
  frameForTick,
  killWeaponClass,
  killWeaponIcon,
  killWeaponName,
  type ParsedDemo,
  type PlayerSlot,
  type Team,
  WEAPON_NONE,
  type WeaponClass,
  type WeaponIconId,
  weaponClass,
  weaponIcon,
  weaponName,
} from '@disa/demo-core';

/** `all` is not a side, and it is first because the match is what a map screen opens on. */
export type SideScope = 'all' | Team;

/**
 * What a map screen is narrowed to: a side, and the players whose tags are on. No tag on is every
 * player, which is what the screen opens on.
 */
export interface MapNarrowing {
  readonly side: SideScope;
  readonly players: readonly PlayerSlot[];
}

export const WHOLE_MATCH: MapNarrowing = { side: 'all', players: [] };

/**
 * Whether a mark belongs to the narrowing. **A mark belongs to whoever made it** — the attacker of a
 * duel, the thrower of a grenade — which is `isBySubject`'s rule on the round axis.
 */
export function isInNarrowing(
  narrowing: MapNarrowing,
  side: Team | undefined,
  slot: PlayerSlot,
): boolean {
  if (narrowing.side !== 'all' && side !== narrowing.side) return false;

  return narrowing.players.length === 0 || narrowing.players.includes(slot);
}

/** A tag pressed: on if it was off, off if it was on. */
export function togglePlayer(
  players: readonly PlayerSlot[],
  slot: PlayerSlot,
): readonly PlayerSlot[] {
  return players.includes(slot) ? players.filter((each) => each !== slot) : [...players, slot];
}

/**
 * How long before a kill "Open on the stage" lands — #387. Enough to see the two players find each
 * other, short enough that the kill is the next thing that happens.
 */
export const DUEL_LEAD_IN_SECONDS = 3;

/**
 * Where the stage opens for a duel: `DUEL_LEAD_IN_SECONDS` before it, but never before its round
 * started, so the round the reader lands in is the duel's own.
 */
export function stageFrameForDuel(demo: ParsedDemo, duel: Duel): Frame {
  const round = demo.events.rounds.at(duel.roundIndex);
  const roundStart = round === undefined ? 0 : frameForTick(demo.track, round.startTick);

  return asFrame(Math.max(roundStart, duel.frame - DUEL_LEAD_IN_SECONDS * demo.track.sampleHz));
}

export interface DuelEnd {
  readonly slot: PlayerSlot;
  readonly side: Team | undefined;
  /** `null` when the recording saw nothing in hand. */
  readonly weapon: {
    readonly name: string;
    readonly weaponClass: WeaponClass;
    readonly icon: WeaponIconId | undefined;
  } | null;
  readonly health: number;
  readonly armour: number;
}

export interface DuelDetail {
  readonly attacker: DuelEnd;
  readonly victim: DuelEnd;
  readonly isHeadshot: boolean;
  readonly isWallbang: boolean;
  readonly isThroughSmoke: boolean;
}

/**
 * What both players were holding and how much they had left — #387's hover.
 *
 * The killer's weapon is the kill's own (`Kill.weapon`), which is what did it. The victim's is what
 * `TickTrack` saw in their hand, and **both players' health and armour are read one sample before the
 * kill**: on the kill's own sample the victim is already dead and holds nothing.
 */
export function duelDetail(demo: ParsedDemo, duel: Duel): DuelDetail | undefined {
  const kill = demo.events.kills[duel.killIndex];
  if (kill === undefined) return undefined;

  const { track, header } = demo;
  const before = Math.max(duel.frame - 1, 0) * track.slotCount;

  const vitals = (slot: PlayerSlot) => ({
    health: track.health[before + slot] ?? 0,
    armour: track.armour[before + slot] ?? 0,
  });

  const held = track.weapon[before + duel.victim] ?? WEAPON_NONE;
  const victimWeapon = held === WEAPON_NONE ? undefined : header.weapons[held];

  return {
    attacker: {
      slot: duel.attacker,
      side: duel.attackerSide,
      weapon: {
        name: killWeaponName(kill.weapon),
        weaponClass: killWeaponClass(kill.weapon),
        icon: killWeaponIcon(kill.weapon),
      },
      ...vitals(duel.attacker),
    },
    victim: {
      slot: duel.victim,
      side: duel.victimSide,
      weapon:
        victimWeapon === undefined
          ? null
          : {
              name: weaponName(victimWeapon),
              weaponClass: weaponClass(victimWeapon),
              icon: weaponIcon(victimWeapon),
            },
      ...vitals(duel.victim),
    },
    isHeadshot: kill.isHeadshot,
    isWallbang: kill.isWallbang,
    isThroughSmoke: kill.isThroughSmoke,
  };
}
