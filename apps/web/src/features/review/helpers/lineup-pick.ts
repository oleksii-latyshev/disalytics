/** What the reader has picked on the lineups map: a target, the variant shown, a stack held open. */
export interface LineupPick {
  selectedId: string | null;
  variantId: string | null;
  openStack: string | null;
}

export const NO_PICK: LineupPick = { selectedId: null, variantId: null, openStack: null };

/** A target picked from the list, the map or a stack: its first variant, no stack open. */
export function pickTarget(id: string): LineupPick {
  return { selectedId: id, variantId: null, openStack: null };
}

/** An empty click, `Escape` or the panel's close: nothing picked, so nothing is dimmed. */
export function clearPick(pick: LineupPick): LineupPick {
  return pick.selectedId === null && pick.variantId === null && pick.openStack === null
    ? pick
    : NO_PICK;
}
