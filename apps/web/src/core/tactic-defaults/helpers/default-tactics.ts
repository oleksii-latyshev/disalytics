import { parseTacticFile, type Tactic } from '@disa/demo-core';
import mirageMagnolia from '../data/de_mirage-magnolia.json?raw';

/**
 * The tactics bundled with the app, exported from the board as they are. They are the built-ins a
 * device shows until it has heard from the API, and the ones it keeps when the API is unreachable
 * and nothing was ever stored. Their text is the author's and stays in the language it was written in.
 */
export function defaultTactics(): readonly Tactic[] {
  return parseTacticFile(mirageMagnolia);
}
