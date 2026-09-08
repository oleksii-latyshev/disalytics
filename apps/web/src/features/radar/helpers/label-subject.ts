import type { PlayerInfo, WeaponClass, WeaponIconId } from '@disa/demo-core';

/*
 * What a label pass is given: the names, and the frame's own answers about each slot. It is a
 * module of its own because three things read it — the token layer that answers the subject, the
 * name pass and the hit's figure — and two of those are now separate files.
 *
 * Nothing here draws. A file that both described a subject and painted one would put the two passes
 * back in one place, which is the split this is half of.
 */

/** What the label pass needs to know about a slot, answered by whoever is drawing the tokens. */
export interface LabelSubject {
  isNamed(slot: number): boolean;
  x(slot: number): number;
  y(slot: number): number;
  alpha(slot: number): number;
  /** What the slot is holding this frame, or `null` where no sample ever saw it holding anything. */
  weapon(slot: number): WeaponClass | null;
  /**
   * The model of what it is holding, where the match's own weapon table names one. Utility, the
   * bomb and a weapon nobody here has drawn all answer `undefined` and are drawn by their class.
   */
  icon(slot: number): WeaponIconId | undefined;
  /**
   * The round's numbers for this slot, already formatted and translated, or `null` for every slot
   * that is not the selected one. It arrives as a finished string because a canvas cannot reach the
   * message catalogue and a draw may not allocate one.
   */
  detail(slot: number): string | null;
  /** What this slot has just taken, in whole health, or 0 where it has taken nothing lately. */
  damage(slot: number): number;
  /** How much of that figure's life is left — 1 while it holds, 0 once it has gone. */
  damageLife(slot: number): number;
}

/**
 * A nick long enough to cover a bombsite stops being a label. The rails carry the full name, which
 * is what `CODE_REQUIREMENTS.md` §10 asks of a truncation.
 */
const MAX_LABEL_CHARS = 14;

function shorten(name: string): string {
  const characters = [...name];

  return characters.length <= MAX_LABEL_CHARS
    ? name
    : `${characters.slice(0, MAX_LABEL_CHARS - 1).join('')}…`;
}

/** The text drawn beside each token, indexed by slot. An unnamed slot holds an empty string. */
export function labelsBySlot(players: readonly PlayerInfo[], slotCount: number): readonly string[] {
  const labels: string[] = new Array(slotCount).fill('');

  for (const player of players) {
    if (player.slot < slotCount) labels[player.slot] = shorten(player.name);
  }

  return labels;
}
