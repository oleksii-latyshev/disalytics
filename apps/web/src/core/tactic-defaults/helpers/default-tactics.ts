import { parseTacticFile, type Tactic } from '@disa/demo-core';
import { openTacticStore, type TacticStore, type TacticStoreOptions } from '@disa/demo-store';
import mirageMagnolia from '../data/de_mirage-magnolia.json?raw';

/**
 * The tactics a library starts with, exported from the board as they are. Their text is the
 * author's and stays in the language it was written in, like a reader's own tactic.
 */
export function defaultTactics(): readonly Tactic[] {
  return parseTacticFile(mirageMagnolia);
}

/** The tactic store, which plants `defaultTactics` the first time this browser opens it. */
export function openTactics(options?: TacticStoreOptions): Promise<TacticStore | null> {
  return openTacticStore({ ...options, seed: defaultTactics });
}
