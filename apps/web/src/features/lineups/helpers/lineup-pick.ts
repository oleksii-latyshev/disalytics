/** What the reader has picked on the map: a target, the position shown, a stack held open. */
export interface LineupPick {
  readonly targetId: string | null;
  readonly variantId: string | null;
  readonly openStack: string | null;
}

export const NO_PICK: LineupPick = { targetId: null, variantId: null, openStack: null };

/** A target picked from the list, the map or a stack: its first position, no stack open. */
export function pickTarget(id: string): LineupPick {
  return { targetId: id, variantId: null, openStack: null };
}

/** An empty press, `Escape` or the panel's close: nothing picked, so nothing is dimmed. */
export function clearPick(pick: LineupPick): LineupPick {
  return pick.targetId === null && pick.variantId === null && pick.openStack === null
    ? pick
    : NO_PICK;
}
